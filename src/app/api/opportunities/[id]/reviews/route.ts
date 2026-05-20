import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { canUserAccessOpportunity } from "@/lib/opportunity-visibility";
import { prisma } from "@/lib/prisma";
import { sanitizeError } from "@/lib/sanitize-log";
import { getUserPremiumAccess } from "@/lib/subscription-access";
import { reviewCreateSchema } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };
type PrismaLikeError = { code?: string };

const REVIEW_DELAY_MS = 7 * 24 * 60 * 60 * 1000;
const DUPLICATE_REVIEW_MESSAGE = "Vous avez déjà laissé un avis pour ce deal.";

function isUniqueConstraintError(error: unknown) {
  return typeof error === "object" && error !== null && (error as PrismaLikeError).code === "P2002";
}

export async function POST(req: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Vous devez être connecté pour laisser un avis." }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const parsed = reviewCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", code: "VALIDATION_ERROR", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const userId = session.user.id;
    const [access, currentUser, opportunity] = await Promise.all([
      getUserPremiumAccess(userId),
      prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, tier: true } }),
      prisma.opportunity.findUnique({
        where: { id },
        select: {
          id: true,
          authorId: true,
          requiredTier: true,
          verificationStatus: true,
          interests: { where: { userId }, select: { id: true, createdAt: true }, take: 1 },
          reviews: { where: { reviewerId: userId }, select: { id: true }, take: 1 },
        },
      }),
    ]);

    if (!currentUser) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 401 });
    }

    if (!opportunity) {
      return NextResponse.json({ error: "Opportunité introuvable." }, { status: 404 });
    }

    if (opportunity.verificationStatus !== "VERIFIED") {
      return NextResponse.json({ error: "Opportunité introuvable." }, { status: 404 });
    }

    const isAuthor = opportunity.authorId === userId;
    if (isAuthor) {
      return NextResponse.json({ error: "Vous ne pouvez pas laisser un avis sur votre propre deal." }, { status: 409 });
    }

    if (!access.hasAccess && currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Votre abonnement doit être actif pour laisser un avis." }, { status: 403 });
    }

    const hasTierAccess = canUserAccessOpportunity(opportunity.requiredTier, currentUser.tier);
    if (!hasTierAccess && currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Votre tier actuel ne permet pas de laisser un avis sur ce deal." }, { status: 403 });
    }

    const interest = opportunity.interests[0];
    if (!interest) {
      return NextResponse.json({ error: "Vous devez d'abord avoir marqué votre intérêt pour ce deal." }, { status: 403 });
    }

    const earliestReviewAt = new Date(Date.now() - REVIEW_DELAY_MS);
    if (interest.createdAt > earliestReviewAt) {
      return NextResponse.json({ error: "Vous pourrez laisser un avis 7 jours après avoir marqué votre intérêt." }, { status: 403 });
    }

    if (opportunity.reviews.length > 0) {
      return NextResponse.json({ error: DUPLICATE_REVIEW_MESSAGE }, { status: 409 });
    }

    try {
      const review = await prisma.review.create({
        data: {
          reviewerId: userId,
          revieweeId: opportunity.authorId,
          opportunityId: opportunity.id,
          rating: parsed.data.rating,
          comment: parsed.data.comment,
        },
        select: {
          id: true,
          reviewerId: true,
          revieweeId: true,
          opportunityId: true,
          rating: true,
          comment: true,
          createdAt: true,
        },
      });

      revalidatePath(`/dashboard/opportunities/${opportunity.id}`);
      revalidatePath(`/members/${opportunity.authorId}`);

      return NextResponse.json({ data: { review } }, { status: 201 });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return NextResponse.json({ error: DUPLICATE_REVIEW_MESSAGE }, { status: 409 });
      }
      throw error;
    }
  } catch (error) {
    console.error("[opportunity-review]", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
