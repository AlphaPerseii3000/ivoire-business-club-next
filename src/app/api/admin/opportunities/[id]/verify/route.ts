import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { sendOpportunityRejectedEmail, sendOpportunityVerifiedEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { sanitizeError } from "@/lib/sanitize-log";
import { opportunityAdminActionSchema, type VerificationStatusInput } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };
type VerificationStatus = VerificationStatusInput;
type AdminAction = "verify" | "reject" | "start_review" | "move";

const FINAL_STATUSES = ["VERIFIED", "REJECTED"] as const;

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
      include: { author: { select: { id: true, name: true, email: true } } },
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

    const now = new Date();
    const data =
      nextStatus === "VERIFIED"
        ? {
            verificationStatus: "VERIFIED" as const,
            verifiedAt: now,
            verifiedById: authResult.sessionUserId,
            rejectionNote: null,
            adminNote: note?.trim() ? note.trim() : opportunity.adminNote,
          }
        : nextStatus === "REJECTED"
          ? {
              verificationStatus: "REJECTED" as const,
              verifiedAt: null,
              verifiedById: null,
              rejectionNote: note?.trim() ?? null,
              adminNote: note?.trim() ?? opportunity.adminNote,
            }
          : nextStatus === "EN_COURS"
            ? {
                verificationStatus: "EN_COURS" as const,
                verifiedAt: null,
                reviewNotes: appendReviewNote(opportunity.reviewNotes, authResult.sessionUserId, note),
              }
            : {
                verificationStatus: "PENDING" as const,
                verifiedAt: null,
              };

    const updated = await prisma.opportunity.update({
      where: { id },
      data,
      include: { author: { select: { id: true, name: true, email: true } }, _count: { select: { documents: true } } },
    });

    console.info("[admin-opportunity-status]", {
      opportunityId: id,
      adminId: authResult.sessionUserId,
      action: parsed.data.action,
      from: currentStatus,
      to: nextStatus,
    });

    try {
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
    } catch (error) {
      console.error("[admin-opportunity-email]", { opportunityId: id, status: nextStatus, error: sanitizeError(error) });
      if (FINAL_STATUSES.includes(nextStatus as (typeof FINAL_STATUSES)[number])) {
        return NextResponse.json(
          { error: "Le statut a été mis à jour, mais l'email n'a pas pu être envoyé.", code: "EMAIL_FAILED", data: updated },
          { status: 502 },
        );
      }
    }

    return NextResponse.json({ data: updated });
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
