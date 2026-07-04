import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RegistrationStatus } from "@/generated/prisma/client";
import { AUDIT_ACTIONS, safeCreateAuditLog } from "@/lib/audit-log";

const VALID_STATUSES = ["REGISTERED", "ATTENDED", "CANCELLED", "NO_SHOW"];

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; registrationId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { id, registrationId } = await params;
    const body = await req.json().catch(() => ({}));

    const { status, payOnSite, amountPaid } = body;

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Statut d'inscription invalide" }, { status: 400 });
    }

    const existing = await prisma.eventRegistration.findFirst({
      where: { id: registrationId, eventId: id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Inscription introuvable" }, { status: 404 });
    }

    const updated = await prisma.eventRegistration.update({
      where: { id: registrationId },
      data: {
        ...(status ? { status: status as RegistrationStatus } : {}),
        ...(payOnSite !== undefined ? { payOnSite: Boolean(payOnSite) } : {}),
        ...(amountPaid !== undefined ? { amountPaid: amountPaid !== null ? Number(amountPaid) : null } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    await safeCreateAuditLog({
      actorId: session.user.id,
      action: AUDIT_ACTIONS.EVENT_REGISTRATION_UPDATE,
      entityType: "EVENT_REGISTRATION",
      entityId: registrationId,
      metadata: {
        eventId: id,
        previousStatus: existing.status,
        newStatus: updated.status,
      },
    });

    return NextResponse.json({ registration: updated });
  } catch (error: unknown) {
    console.error("PUT registration error:", error);
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
