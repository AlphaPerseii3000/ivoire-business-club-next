import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { onboardingFormSchema } from "@/lib/validations";
import { AUDIT_ACTIONS, safeCreateAuditLog } from "@/lib/audit-log";
import { sanitizeError } from "@/lib/sanitize-log";
import { autoTransitionVerificationStatus } from "@/lib/verification.server";

const onboardingSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  country: true,
  location: true,
  bio: true,
  tier: true,
  onboardingForm: true,
  onboardingCompletedAt: true,
  verificationStatus: true,
};

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Requête malformée." }, { status: 400 });
    }

    const parsed = onboardingFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const now = new Date();
    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: session.user.id },
        data: {
          onboardingForm: parsed.data,
          onboardingCompletedAt: now,
          // Synchronisation des champs User depuis le formulaire d'onboarding
          name: parsed.data.fullName,
          phone: parsed.data.phone || null,
          location: parsed.data.address || null,
          country: parsed.data.country || null,
          bio: parsed.data.activity || null,
          tier: parsed.data.tier,
        },
        select: onboardingSelect,
      });

      const transition = await autoTransitionVerificationStatus(session.user.id, tx);
      if (transition.changed) {
        user.verificationStatus = transition.status;
      }

      return user;
    });

    // Audit log créé hors transaction (pattern existant — l'audit gère ses propres erreurs).
    await safeCreateAuditLog({
      actorId: session.user.id,
      action: AUDIT_ACTIONS.ONBOARDING_COMPLETED,
      entityType: "User",
      entityId: session.user.id,
      metadata: { completedAt: now.toISOString() },
    });

    return NextResponse.json({
      data: {
        onboardingForm: updatedUser.onboardingForm,
        onboardingCompletedAt: updatedUser.onboardingCompletedAt,
        name: updatedUser.name,
        phone: updatedUser.phone,
        location: updatedUser.location,
        country: updatedUser.country,
        bio: updatedUser.bio,
        tier: updatedUser.tier,
        verificationStatus: updatedUser.verificationStatus,
      },
    });
  } catch (error) {
    console.error("Onboarding PUT error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
