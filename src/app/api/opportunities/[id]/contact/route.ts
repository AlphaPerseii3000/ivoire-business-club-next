import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { canUserAccessOpportunity } from "@/lib/opportunity-visibility";
import { prisma } from "@/lib/prisma";
import { sanitizeError } from "@/lib/sanitize-log";
import { getUserPremiumAccess } from "@/lib/subscription-access";
import { buildWhatsAppSupportLink } from "@/lib/whatsapp";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/auth/signin", _req.url), 302);
  }

  const userId = session.user.id;

  try {
    const { id } = await params;
    const [access, currentUser, opportunity] = await Promise.all([
      getUserPremiumAccess(userId),
      prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, tier: true } }),
      prisma.opportunity.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          authorId: true,
          requiredTier: true,
          verificationStatus: true,
          author: { select: { id: true, phone: true } },
        },
      }),
    ]);

    if (!currentUser) {
      return NextResponse.redirect(new URL("/auth/signin", _req.url), 302);
    }

    if (!opportunity) {
      return NextResponse.json({ error: "Opportunité introuvable." }, { status: 404 });
    }

    const isAuthor = opportunity.authorId === userId;
    const isAdmin = currentUser.role === "ADMIN";
    const isPublishedToMember = opportunity.verificationStatus === "VERIFIED";

    if (isAuthor) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas contacter le porteur de votre propre opportunité." },
        { status: 409 },
      );
    }

    if (!isAdmin && !isPublishedToMember) {
      return NextResponse.json({ error: "Opportunité introuvable." }, { status: 404 });
    }

    if (!access.hasAccess && !isAdmin) {
      return NextResponse.json(
        { error: "Votre abonnement doit être actif pour contacter le porteur." },
        { status: 403 },
      );
    }

    const hasTierAccess = canUserAccessOpportunity(opportunity.requiredTier, currentUser.tier);
    if (!hasTierAccess && !isAdmin) {
      return NextResponse.json(
        { error: "Votre tier actuel ne permet pas de contacter le porteur de ce deal." },
        { status: 403 },
      );
    }

    const phone = opportunity.author.phone;
    if (!phone?.trim()) {
      return NextResponse.json(
        { error: "Numéro WhatsApp du porteur non disponible." },
        { status: 400 },
      );
    }

    try {
      await prisma.contactLog.create({
        data: { userId, opportunityId: opportunity.id },
      });
    } catch (logError) {
      console.error("[opportunity-contact] ContactLog creation failed:", sanitizeError(logError));
    }

    const whatsappHref = buildWhatsAppSupportLink({
      phoneNumber: phone,
      message: `Bonjour, je suis intéressé(e) par votre deal ${opportunity.title} sur IBC.`,
    });

    if (!whatsappHref) {
      return NextResponse.json(
        { error: "Numéro WhatsApp du porteur non disponible." },
        { status: 400 },
      );
    }

    return NextResponse.redirect(whatsappHref, 302);
  } catch (error) {
    console.error("[opportunity-contact]", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
