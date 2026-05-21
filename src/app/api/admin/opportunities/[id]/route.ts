import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteR2Object, getMissingR2Env } from "@/lib/r2";
import { sanitizeError } from "@/lib/sanitize-log";
import { opportunityAdminUpdateSchema } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };

type AdminAuthResult =
  | { sessionUserId: string; error?: never }
  | { sessionUserId?: never; error: NextResponse };

async function requireAdmin(): Promise<AdminAuthResult> {
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

function serializeOpportunity(opportunity: Awaited<ReturnType<typeof loadOpportunityForResponse>>, currentAdminId: string) {
  if (!opportunity) return null;
  return {
    id: opportunity.id,
    title: opportunity.title,
    description: opportunity.description,
    category: opportunity.category,
    amount: opportunity.amount,
    requiredTier: opportunity.requiredTier,
    verificationStatus: opportunity.verificationStatus,
    createdAt: opportunity.createdAt.toISOString(),
    updatedAt: opportunity.updatedAt.toISOString(),
    verifiedAt: opportunity.verifiedAt ? opportunity.verifiedAt.toISOString() : null,
    rejectionNote: opportunity.rejectionNote,
    reviewNotes: opportunity.reviewNotes,
    adminNote: opportunity.adminNote,
    author: {
      id: opportunity.author.id,
      name: opportunity.author.name,
      email: opportunity.author.email,
      image: opportunity.author.image,
    },
    documents: opportunity.documents.map((document) => ({
      id: document.id,
      opportunityId: document.opportunityId,
      uploadedById: document.uploadedById,
      fileName: document.fileName,
      originalName: document.originalName,
      mimeType: document.mimeType,
      size: document.size,
      publicUrl: document.publicUrl,
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
    })),
    documentCount: opportunity._count.documents,
    requiresDoubleVerification: opportunity.requiresDoubleVerification,
    approvalCount: opportunity._count.verificationApprovals,
    currentAdminApproved: opportunity.verificationApprovals.some((approval) => approval.adminId === currentAdminId),
  };
}

function loadOpportunityForResponse(id: string) {
  return prisma.opportunity.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true, email: true, image: true } },
      documents: { orderBy: { createdAt: "desc" } },
      verificationApprovals: { select: { adminId: true }, orderBy: { createdAt: "asc" } },
      _count: { select: { documents: true, verificationApprovals: true } },
    },
  });
}

function shouldRequireDoubleVerification(params: {
  amount: number | null | undefined;
  currentRequiresDoubleVerification: boolean;
  existingApprovalCount: number;
  verificationStatus: string;
}) {
  if (typeof params.amount === "number" && params.amount > 50000) {
    return true;
  }

  const hasComplianceContext = params.existingApprovalCount >= 2 || params.verificationStatus === "VERIFIED";
  if (params.currentRequiresDoubleVerification && hasComplianceContext) {
    return true;
  }

  return false;
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
      return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
    }

    const parsed = opportunityAdminUpdateSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json({ error: firstError?.message ?? "Données invalides" }, { status: 400 });
    }

    const opportunity = await prisma.opportunity.findUnique({
      where: { id },
      include: { verificationApprovals: { select: { adminId: true } } },
    });
    if (!opportunity) {
      return NextResponse.json({ error: "Opportunité introuvable" }, { status: 404 });
    }

    const requiresDoubleVerification = shouldRequireDoubleVerification({
      amount: parsed.data.amount,
      currentRequiresDoubleVerification: opportunity.requiresDoubleVerification,
      existingApprovalCount: opportunity.verificationApprovals.length,
      verificationStatus: opportunity.verificationStatus,
    });

    await prisma.opportunity.update({
      where: { id },
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        category: parsed.data.category,
        amount: parsed.data.amount ?? null,
        requiredTier: parsed.data.requiredTier,
        requiresDoubleVerification,
      },
    });

    const updated = await loadOpportunityForResponse(id);
    return NextResponse.json({ data: serializeOpportunity(updated, authResult.sessionUserId) });
  } catch (error) {
    console.error("[admin-opportunity-update]", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const authResult = await requireAdmin();
  if (authResult.error) return authResult.error;

  try {
    const { id } = await params;
    const opportunity = await prisma.opportunity.findUnique({
      where: { id },
      include: { documents: { select: { id: true, r2Key: true } } },
    });
    if (!opportunity) {
      return NextResponse.json({ error: "Opportunité introuvable" }, { status: 404 });
    }

    const documentKeys = opportunity.documents.map((document) => document.r2Key);
    await prisma.opportunity.delete({ where: { id } });

    if (getMissingR2Env().length === 0) {
      const deletionResults = await Promise.allSettled(documentKeys.map((key) => deleteR2Object(key)));
      const failedDeletionCount = deletionResults.filter((result) => result.status === "rejected").length;
      if (failedDeletionCount > 0) {
        console.error("[admin-opportunity-delete-r2]", { opportunityId: id, failedDeletionCount });
      }
    }

    console.info("[admin-opportunity-delete]", { opportunityId: id, adminId: authResult.sessionUserId });
    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    console.error("[admin-opportunity-delete]", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

export const adminOpportunityRequiresDoubleVerification = shouldRequireDoubleVerification;
