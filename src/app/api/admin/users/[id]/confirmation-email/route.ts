import { NextResponse } from "next/server";

import { AUDIT_ACTIONS, safeCreateAuditLog } from "@/lib/audit-log";
import { auth } from "@/lib/auth";
import { sendAdminSubscriptionConfirmationEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { sanitizeError } from "@/lib/sanitize-log";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });
  if (admin?.role !== "ADMIN") return NextResponse.json({ error: "Interdit" }, { status: 403 });

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      tier: true,
      subscriptions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, status: true, tier: true, providerRef: true, createdAt: true },
      },
    },
  });

  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  if (!user.email) {
    return NextResponse.json(
      { error: "Cet utilisateur n'a pas d'adresse email utilisable.", code: "EMAIL_MISSING" },
      { status: 400 }
    );
  }

  const latestSubscription = user.subscriptions[0] ?? null;
  const tier = latestSubscription?.tier ?? user.tier;

  try {
    await sendAdminSubscriptionConfirmationEmail({
      to: user.email,
      name: user.name,
      tier,
    });
  } catch (error) {
    console.error("[admin-confirmation-email]", {
      targetUserId: user.id,
      error: sanitizeError(error),
    });
    return NextResponse.json(
      { error: "L'email de confirmation n'a pas pu être envoyé.", code: "EMAIL_FAILED" },
      { status: 500 }
    );
  }

  await safeCreateAuditLog({
    actorId: session.user.id,
    action: AUDIT_ACTIONS.USER_CONFIRMATION_EMAIL_SEND,
    entityType: "User",
    entityId: id,
    metadata: {
      targetUserId: user.id,
      subscriptionId: latestSubscription?.id,
      subscriptionStatus: latestSubscription?.status,
      tier,
      emailSent: true,
    },
  });

  return NextResponse.json({ data: { ok: true, emailSent: true } });
}
