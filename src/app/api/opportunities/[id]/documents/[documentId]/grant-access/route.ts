import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AUDIT_ACTIONS, safeCreateAuditLog } from "@/lib/audit-log";
import { canManageDocuments } from "@/lib/document-access";
import { sanitizeError } from "@/lib/sanitize-log";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; documentId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userId = session.user.id;
    const userRole = String((session.user as unknown as Record<string, unknown>).role ?? "MEMBER");
    const userStatus = (session.user as unknown as Record<string, unknown>).status ?? "ACTIVE";

    const { id: opportunityId, documentId } = await params;

    // Verify the document exists and belongs to the opportunity
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: { opportunity: { select: { id: true, authorId: true } } },
    });

    if (!document || document.opportunityId !== opportunityId) {
      return NextResponse.json({ error: "Document introuvable" }, { status: 404 });
    }

    // Verify user is author or admin
    const isAuthorOrAdmin = canManageDocuments({ userId, role: userRole }, document.opportunity.authorId);
    if (!isAuthorOrAdmin) {
      return NextResponse.json(
        { error: "Accès refusé — vous n'êtes pas autorisé à gérer les demandes d'accès." },
        { status: 403 },
      );
    }

    // If admin, check not suspended
    if (userRole === "ADMIN" && userStatus === "SUSPENDED") {
      return NextResponse.json(
        { error: "Compte suspendu" },
        { status: 403 },
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const { requestIds, action } = body;

    if (!Array.isArray(requestIds) || requestIds.length === 0) {
      return NextResponse.json(
        { error: "requestIds doit être un tableau non vide de chaînes de caractères." },
        { status: 400 },
      );
    }

    if (action !== "approve" && action !== "deny") {
      return NextResponse.json(
        { error: "L'action doit être \"approve\" ou \"deny\"." },
        { status: 400 },
      );
    }

    const targetStatus = action === "approve" ? "APPROVED" : "DENIED";
    const auditAction = action === "approve" ? AUDIT_ACTIONS.DOCUMENT_ACCESS_APPROVED : AUDIT_ACTIONS.DOCUMENT_ACCESS_DENIED;

    // Process each request
    let processed = 0;

    for (const requestId of requestIds) {
      if (typeof requestId !== "string") continue;

      const accessRequest = await prisma.documentAccessRequest.findUnique({
        where: { id: requestId },
        select: { id: true, status: true, requesterId: true, documentId: true },
      });

      if (!accessRequest) continue;
      if (accessRequest.documentId !== documentId) continue;

      // Idempotent: skip if already processed (not PENDING)
      if (accessRequest.status !== "PENDING") continue;

      // Update status — only when status actually changes
      await prisma.documentAccessRequest.update({
        where: { id: requestId },
        data: {
          status: targetStatus,
          reviewedById: userId,
          reviewedAt: new Date(),
        },
      });

      // Audit log only for actual status changes
      await safeCreateAuditLog({
        actorId: userId,
        action: auditAction,
        entityType: "DocumentAccessRequest",
        entityId: requestId,
        metadata: {
          requesterId: accessRequest.requesterId,
          documentId: accessRequest.documentId,
          opportunityId,
          newStatus: targetStatus,
        },
      });

      processed++;
    }

    return NextResponse.json({ data: { processed } });
  } catch (error) {
    console.error("[grant-access]", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}