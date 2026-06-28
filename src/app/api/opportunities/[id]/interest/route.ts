import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { canUserAccessOpportunity } from "@/lib/opportunity-visibility";
import { prisma } from "@/lib/prisma";
import { sanitizeError } from "@/lib/sanitize-log";
import { getUserPremiumAccess } from "@/lib/subscription-access";
import { posthogServer } from "@/lib/posthog-server";

type RouteContext = { params: Promise<{ id: string }> };

type PrismaLikeError = { code?: string };

function isUniqueConstraintError(error: unknown) {
  return typeof error === "object" && error !== null && (error as PrismaLikeError).code === "P2002";
}

export async function POST(_req: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Vous devez être connecté pour marquer votre intérêt." }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const { id } = await params;
    const [access, currentUser, opportunity] = await Promise.all([
      getUserPremiumAccess(userId),
      prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, role: true, tier: true } }),
      prisma.opportunity.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          authorId: true,
          requiredTier: true,
          verificationStatus: true,
          author: { select: { id: true } },
        },
      }),
    ]);

    if (!currentUser) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 401 });
    }

    if (!opportunity) {
      return NextResponse.json({ error: "Opportunité introuvable." }, { status: 404 });
    }

    const isAuthor = opportunity.authorId === userId;
    const isAdmin = currentUser.role === "ADMIN";
    const isPublishedToMember = opportunity.verificationStatus === "VERIFIED";

    if (isAuthor) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas marquer votre intérêt pour votre propre deal." },
        { status: 409 },
      );
    }

    if (!isAdmin && !isPublishedToMember) {
      return NextResponse.json({ error: "Opportunité introuvable." }, { status: 404 });
    }

    if (!access.hasAccess && !isAdmin) {
      return NextResponse.json(
        { error: "Votre abonnement doit être actif pour marquer votre intérêt." },
        { status: 403 },
      );
    }

    const hasTierAccess = canUserAccessOpportunity(opportunity.requiredTier, currentUser.tier);
    if (!hasTierAccess && !isAdmin) {
      return NextResponse.json(
        { error: "Votre tier actuel ne permet pas de marquer votre intérêt pour ce deal." },
        { status: 403 },
      );
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        const interest = await tx.opportunityInterest.create({
          data: {
            userId,
            opportunityId: opportunity.id,
          },
          select: { id: true, createdAt: true },
        });

        const memberName = currentUser.name?.trim() ? currentUser.name : "Un membre";
        const message = `${memberName} est intéressé(e) par votre deal ${opportunity.title}`;
        await tx.notification.create({
          data: {
            userId: opportunity.authorId,
            type: "OPPORTUNITY_INTEREST",
            title: message,
            body: message,
            href: `/dashboard/opportunities/${opportunity.id}?highlight=interests`,
          },
        });

        return interest;
      });

      posthogServer.capture({
        distinctId: userId,
        event: "opportunity_interest_recorded",
        properties: {
          opportunity_id: opportunity.id,
          opportunity_title: opportunity.title,
          user_tier: currentUser.tier,
          required_tier: opportunity.requiredTier,
        },
      });

      return NextResponse.json({ data: { created: true, interest: result } }, { status: 201 });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return NextResponse.json({ data: { created: false }, message: "Votre intérêt est déjà enregistré." });
      }
      throw error;
    }
  } catch (error) {
    console.error("[opportunity-interest]", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
