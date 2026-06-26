import { NextResponse } from "next/server";

import { AUDIT_ACTIONS, safeCreateAuditLog } from "@/lib/audit-log";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeError } from "@/lib/sanitize-log";
import { sendReminderEmail } from "@/lib/email";
import { sendVerificationEmailToUser } from "@/lib/verification-email.server";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const admin = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, status: true },
  });
  if (admin?.role !== "ADMIN") {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }
  if (admin?.status === "SUSPENDED") {
    return NextResponse.json({ error: "Compte administrateur suspendu." }, { status: 403 });
  }

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      onboardingCompletedAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  if (!user.email) {
    return NextResponse.json(
      { error: "Cet utilisateur n'a pas d'adresse email utilisable.", code: "EMAIL_MISSING" },
      { status: 400 }
    );
  }

  const emailVerified = user.emailVerified === true;
  const profileCompleted = user.onboardingCompletedAt !== null;

  if (emailVerified && profileCompleted) {
    return NextResponse.json(
      { error: "L'utilisateur a déjà complété son onboarding.", code: "ALREADY_COMPLETE" },
      { status: 400 }
    );
  }

  const reminderType = emailVerified ? "PROFILE_COMPLETION" : "EMAIL_VERIFICATION";

  await safeCreateAuditLog({
    actorId: session.user.id,
    action: AUDIT_ACTIONS.USER_REMINDER_SEND,
    entityType: "User",
    entityId: id,
    metadata: {
      targetUserId: user.id,
      reminderType,
      emailSent: false,
    },
  });

  try {
    if (reminderType === "EMAIL_VERIFICATION") {
      const result = await sendVerificationEmailToUser(user.id);
      if (!result.sent) {
        return NextResponse.json(
          { error: "Impossible d'envoyer l'email de vérification.", code: "EMAIL_FAILED", reason: result.reason },
          { status: 500 }
        );
      }
    } else {
      await sendReminderEmail({
        to: user.email,
        name: user.name,
        type: "PROFILE_COMPLETION",
      });
    }
  } catch (error) {
    console.error("[admin-user-reminder]", {
      targetUserId: user.id,
      reminderType,
      error: sanitizeError(error),
    });
    return NextResponse.json(
      { error: "L'email de relance n'a pas pu être envoyé.", code: "EMAIL_FAILED" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { sent: true, type: reminderType } });
}
