import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { onboardingFormSchema } from "@/lib/validations";
import { AUDIT_ACTIONS, safeCreateAuditLog } from "@/lib/audit-log";
import { sanitizeError } from "@/lib/sanitize-log";

const onboardingSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  country: true,
  onboardingForm: true,
  onboardingCompletedAt: true,
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
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        onboardingForm: parsed.data,
        onboardingCompletedAt: now,
      },
      select: onboardingSelect,
    });

    // Audit log créé immédiatement après la mutation DB, avant tout effet de bord.
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
      },
    });
  } catch (error) {
    console.error("Onboarding PUT error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
