import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { sendOpportunityMatchedEmail, sendOpportunityRejectedEmail, sendOpportunityVerifiedEmail } from "@/lib/email";
import { canUserAccessOpportunity } from "@/lib/opportunity-visibility";
import type { SelectedTag } from "@/lib/tags";
import { prisma } from "@/lib/prisma";
import { sanitizeError } from "@/lib/sanitize-log";
import { opportunityAdminActionSchema, type VerificationStatusInput } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };
type VerificationStatus = VerificationStatusInput;
type AdminAction = "verify" | "reject" | "start_review" | "move";

function isAllowedTransition(current: VerificationStatus, next: VerificationStatus) {
  if (current === next) return true;
  if (current === "PENDING" && ["EN_COURS", "VERIFIED", "REJECTED"].includes(next)) return true;
  if (current === "EN_COURS" && ["PENDING", "VERIFIED", "REJECTED"].includes(next)) return true;
  return false;
}

function normalizeAction(action: AdminAction, status?: VerificationStatus) {
  if (action === "verify") return "VERIFIED";
  if (action === "reject") return "REJECTED";
  if (action === "start_review") return "EN_COURS";
  return status ?? "PENDING";
}

function appendReviewNote(existing: string | null | undefined, adminId: string, note?: string) {
  const timestamp = new Date().toISOString();
  const safeNote = note?.trim();
  const entry = safeNote ? `${timestamp} — ${adminId} — ${safeNote}` : `${timestamp} — ${adminId} — revue démarrée`;
  return existing ? `${existing}\n${entry}` : entry;
}

function appendDoubleVerificationNote(existing: string | null | undefined, adminId: string) {
  const timestamp = new Date().toISOString();
  const entry = `${timestamp} — ${adminId} — première validation enregistrée, en attente d'un second admin`;
  return existing ? `${existing}\n${entry}` : entry;
}

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Non autorisé" }, { status: 401 }) };
  }

  const admin = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, role: true } });
  if (admin?.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Interdit" }, { status: 403 }) };
  }

  return { sessionUserId: session.user.id };
}

async function notifyMatchedMembers(updated: {
  id: string;
  title: string;
  authorId: string;
  requiredTier: unknown;
  tags?: Array<SelectedTag>;
}) {
  const opportunityTags = updated.tags ?? [];
  if (opportunityTags.length === 0) {
    return;
  }

  const tagOrFilters = opportunityTags.map((tag) => ({ category: tag.category, value: tag.value }));
  const members = await prisma.user.findMany({
    where: {
      id: { not: updated.authorId },
      tags: { some: { OR: tagOrFilters } },
    },
    select: { id: true, email: true, name: true, tier: true, role: true },
  });

  const eligibleMembers = members.filter((member) => member.role === "ADMIN" || canUserAccessOpportunity(updated.requiredTier, member.tier));
  if (eligibleMembers.length === 0) {
    return;
  }

  const message = `Nouvelle opportunité matchée : ${updated.title}`;
  await prisma.notification.createMany({
    data: eligibleMembers.map((member) => ({
      userId: member.id,
      type: "OPPORTUNITY_MATCHED",
      title: message,
      body: message,
      href: `/dashboard/opportunities/${updated.id}`,
    })),
  });

  const emailResults = await Promise.allSettled(eligibleMembers.map((member) => sendOpportunityMatchedEmail({
    to: member.email,
    name: member.name,
    opportunityId: updated.id,
    title: updated.title,
  })));
  const failedEmailCount = emailResults.filter((result) => result.status === "rejected").length;
  if (failedEmailCount > 0) {
    console.error("[opportunity-matched-email]", { opportunityId: updated.id, failedEmailCount });
  }
}

async function sendFinalEmail(nextStatus: VerificationStatus, updated: { author: { email: string; name: string }; id: string; title: string; rejectionNote?: string | null }) {
  if (nextStatus === "VERIFIED") {
    await sendOpportunityVerifiedEmail({
      to: updated.author.email,
      name: updated.author.name,
      opportunityId: updated.id,
      title: updated.title,
    });
  }
  if (nextStatus === "REJECTED") {
    await sendOpportunityRejectedEmail({
      to: updated.author.email,
      name: updated.author.name,
      opportunityId: updated.id,
      title: updated.title,
      note: updated.rejectionNote ?? "Aucune note fournie.",
    });
  }
}

export async function PATCH(req: Request, { params }: RouteContext) {
  const authResult = await requireAdmin();
  if (authResult.error) return authResult.error;

  try {
    const { id } = await params;
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const parsed = opportunityAdminActionSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json({ error: firstError?.message ?? "Données invalides" }, { status: 400 });
    }

    const opportunity = await prisma.opportunity.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true, email: true } },
        tags: { select: { category: true, value: true } },
        verificationApprovals: { select: { adminId: true }, orderBy: { createdAt: "asc" } },
      },
    });
    if (!opportunity) {
      return NextResponse.json({ error: "Opportunité introuvable" }, { status: 404 });
    }

    const currentStatus = opportunity.verificationStatus as VerificationStatus;
    const nextStatus = normalizeAction(parsed.data.action, parsed.data.action === "move" ? parsed.data.status : undefined);
    const note = "note" in parsed.data ? parsed.data.note : undefined;

    if (nextStatus === "REJECTED" && !note?.trim()) {
      return NextResponse.json({ error: "La note est obligatoire pour refuser un deal." }, { status: 400 });
    }

    if (!isAllowedTransition(currentStatus, nextStatus)) {
      return NextResponse.json(
        { error: "Transition de statut invalide", code: "INVALID_TRANSITION" },
        { status: 409 },
      );
    }

    const approvalAdminIds = new Set(opportunity.verificationApprovals.map((approval) => approval.adminId));
    const existingApprovalCount = approvalAdminIds.size;

    if (nextStatus === "VERIFIED" && opportunity.requiresDoubleVerification && parsed.data.action === "move" && existingApprovalCount < 2) {
      return NextResponse.json(
        { error: "Deux validations admin distinctes sont requises avant de vérifier ce deal.", code: "DOUBLE_VERIFICATION_REQUIRED" },
        { status: 409 },
      );
    }

    let effectiveNextStatus = nextStatus;
    let pendingSecondVerification = false;

    if (parsed.data.action === "verify" && opportunity.requiresDoubleVerification) {
      if (approvalAdminIds.has(authResult.sessionUserId)) {
        return NextResponse.json(
          { error: "Un même admin ne peut pas valider deux fois ce deal.", code: "DOUBLE_VERIFICATION_SAME_ADMIN" },
          { status: 409 },
        );
      }

      await prisma.opportunityVerificationApproval.create({
        data: {
          opportunityId: id,
          adminId: authResult.sessionUserId,
          note: note?.trim() ? note.trim() : null,
        },
      });

      const approvalCount = existingApprovalCount + 1;
      pendingSecondVerification = approvalCount < 2;
      effectiveNextStatus = pendingSecondVerification ? "EN_COURS" : "VERIFIED";
    }

    const now = new Date();
    const data =
      effectiveNextStatus === "VERIFIED"
        ? {
            verificationStatus: "VERIFIED" as const,
            verifiedAt: now,
            verifiedById: authResult.sessionUserId,
            rejectionNote: null,
            adminNote: note?.trim() ? note.trim() : opportunity.adminNote,
          }
        : effectiveNextStatus === "REJECTED"
          ? {
              verificationStatus: "REJECTED" as const,
              verifiedAt: null,
              verifiedById: null,
              rejectionNote: note?.trim() ?? null,
              adminNote: note?.trim() ?? opportunity.adminNote,
            }
          : effectiveNextStatus === "EN_COURS"
            ? {
                verificationStatus: "EN_COURS" as const,
                verifiedAt: null,
                reviewNotes: pendingSecondVerification
                  ? appendDoubleVerificationNote(opportunity.reviewNotes, authResult.sessionUserId)
                  : appendReviewNote(opportunity.reviewNotes, authResult.sessionUserId, note),
              }
            : {
                verificationStatus: "PENDING" as const,
                verifiedAt: null,
              };

    const updated = await prisma.opportunity.update({
      where: { id },
      data,
      include: {
        author: { select: { id: true, name: true, email: true } },
        tags: { select: { category: true, value: true } },
        verificationApprovals: { select: { adminId: true, createdAt: true }, orderBy: { createdAt: "asc" } },
        _count: { select: { documents: true, verificationApprovals: true } },
      },
    });

    console.info("[admin-opportunity-status]", {
      opportunityId: id,
      adminId: authResult.sessionUserId,
      action: parsed.data.action,
      from: currentStatus,
      to: effectiveNextStatus,
      pendingSecondVerification,
    });

    try {
      if (!pendingSecondVerification) {
        await sendFinalEmail(effectiveNextStatus, updated);
      }
    } catch (error) {
      console.error("[admin-opportunity-email]", { opportunityId: id, status: effectiveNextStatus, error: sanitizeError(error) });
    }

    if (!pendingSecondVerification && effectiveNextStatus === "VERIFIED") {
      try {
        await notifyMatchedMembers(updated);
      } catch (error) {
        console.error("[opportunity-matched-notification]", { opportunityId: id, error: sanitizeError(error) });
      }
    }

    return NextResponse.json({ data: updated, pendingSecondVerification });
  } catch (error) {
    console.error("[admin-opportunity-status]", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

export async function POST(req: Request, context: RouteContext) {
  const formData = await req.formData();
  const rawAction = formData.get("action");
  const action = rawAction === "approve" ? "verify" : rawAction === "start_review" ? "start_review" : rawAction === "reject" ? "reject" : null;
  if (!action) {
    return NextResponse.json({ error: "Action invalide" }, { status: 400 });
  }

  const note = formData.get("note");
  const body = action === "reject" ? { action, note: typeof note === "string" ? note : "" } : { action, note: typeof note === "string" ? note : undefined };

  return PATCH(
    new Request(req.url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    context,
  );
}
