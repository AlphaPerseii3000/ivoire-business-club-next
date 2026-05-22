import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { AUDIT_ACTIONS, safeCreateAuditLog } from "@/lib/audit-log";
import { sendSubscriptionActivatedEmail, sendSubscriptionRejectedEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { sanitizeError } from "@/lib/sanitize-log";

const adminSubscriptionActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("validate") }),
  z.object({ action: z.literal("reject"), reason: z.string().trim().min(1, "La justification est obligatoire pour refuser un abonnement.") }),
  z.object({ action: z.literal("suspend"), reason: z.string().trim().optional() }),
]);

type Params = { params: Promise<{ id: string }> };

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Non autorisé" }, { status: 401 }) };
  }

  const admin = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (admin?.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Interdit" }, { status: 403 }) };
  }

  return { sessionUserId: session.user.id };
}

function transitionError(action: string, status: string) {
  if (action === "suspend") {
    return `transition invalide : seul un abonnement actif peut être suspendu. Statut actuel : ${status}.`;
  }

  return `transition invalide : seul un abonnement en attente peut être traité. Statut actuel : ${status}.`;
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const admin = await requireAdmin();
    if (admin.error) return admin.error;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const parsed = adminSubscriptionActionSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors as { reason?: string[] };
      const reasonError = fieldErrors.reason?.[0];
      return NextResponse.json(
        { error: reasonError ?? "Action invalide", details: fieldErrors },
        { status: 400 }
      );
    }

    const { id } = await params;
    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    if (!subscription) {
      return NextResponse.json({ error: "Abonnement introuvable" }, { status: 404 });
    }

    const action = parsed.data.action;
    if ((action === "validate" || action === "reject") && subscription.status !== "PENDING") {
      return NextResponse.json({ error: transitionError(action, subscription.status), code: "INVALID_TRANSITION" }, { status: 409 });
    }

    if (action === "suspend" && subscription.status !== "ACTIVE") {
      return NextResponse.json({ error: transitionError(action, subscription.status), code: "INVALID_TRANSITION" }, { status: 409 });
    }

    const paymentWhere = subscription.providerRef
      ? { userId: subscription.userId, providerRef: subscription.providerRef }
      : { userId: subscription.userId };

    const updatedSubscription = await prisma.$transaction(async (tx) => {
      if (action === "validate") {
        const updated = await tx.subscription.update({
          where: { id },
          data: { status: "ACTIVE" },
          include: { user: { select: { id: true, name: true, email: true } } },
        });
        await tx.payment.updateMany({ where: paymentWhere, data: { status: "succeeded" } });
        return updated;
      }

      if (action === "reject") {
        const updated = await tx.subscription.update({
          where: { id },
          data: { status: "CANCELLED" },
          include: { user: { select: { id: true, name: true, email: true } } },
        });
        await tx.payment.updateMany({ where: paymentWhere, data: { status: "failed" } });
        return updated;
      }

      return tx.subscription.update({
        where: { id },
        data: { status: "CANCELLED" },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
    });

    const auditAction =
      action === "validate"
        ? AUDIT_ACTIONS.SUBSCRIPTION_VALIDATE
        : action === "reject"
          ? AUDIT_ACTIONS.SUBSCRIPTION_REJECT
          : AUDIT_ACTIONS.SUBSCRIPTION_SUSPEND;
    // Audit log MUST be created immediately after DB mutation, before email side effects,
    // so that email failures don't skip compliance logging (AC4/AC5).
    await safeCreateAuditLog({
      actorId: admin.sessionUserId,
      action: auditAction,
      entityType: "Subscription",
      entityId: id,
      metadata: {
        previousStatus: subscription.status,
        nextStatus: updatedSubscription.status,
        tier: subscription.tier,
        amount: undefined,
        providerRef: subscription.providerRef,
        paymentStatus: action === "validate" ? "succeeded" : action === "reject" ? "failed" : undefined,
      },
    });

    try {
      if (action === "validate") {
        await sendSubscriptionActivatedEmail({
          to: subscription.user.email,
          name: subscription.user.name,
          tier: subscription.tier,
        });
      }

      if (action === "reject") {
        await sendSubscriptionRejectedEmail({
          to: subscription.user.email,
          name: subscription.user.name,
          tier: subscription.tier,
          reason: parsed.data.reason,
        });
      }
    } catch (emailError) {
      console.error("Subscription email error:", sanitizeError(emailError));
      return NextResponse.json(
        { error: "Abonnement mis à jour, mais l'email n'a pas pu être envoyé.", code: "EMAIL_FAILED" },
        { status: 500 }
      );
    }

    console.info("Admin subscription action", {
      action,
      subscriptionId: id,
      userId: subscription.userId,
      previousStatus: subscription.status,
      nextStatus: updatedSubscription.status,
    });

    return NextResponse.json({ data: updatedSubscription });
  } catch (error) {
    console.error("Admin subscription PATCH error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
