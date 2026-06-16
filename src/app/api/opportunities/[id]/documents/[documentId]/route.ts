import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { AUDIT_ACTIONS, safeCreateAuditLog } from "@/lib/audit-log";
import { createDownloadSignedUrl, deleteR2Object, getMissingR2Env } from "@/lib/r2";
import { sanitizeError } from "@/lib/sanitize-log";
import {
  canManageDocuments,
  hasApprovedAccess,
} from "@/lib/document-access";
import {
  documentAccessDenied,
  documentAccessDeniedNoRequest,
  documentNotFound,
  getDocumentSession,
} from "../_helpers";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; documentId: string }> }) {
  try {
    const session = await getDocumentSession();
    if (session instanceof NextResponse) return session;

    const { id, documentId } = await params;
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: { opportunity: { select: { id: true, authorId: true } } },
    });

    if (!document || document.opportunityId !== id) return documentNotFound();
    if (!canManageDocuments(session, document.opportunity.authorId)) return documentAccessDenied();

    await prisma.document.delete({ where: { id: documentId } });

    if (getMissingR2Env().length === 0) {
      try {
        await deleteR2Object(document.r2Key);
      } catch (error) {
        console.error("Delete R2 object error:", error instanceof Error ? error.message : "unknown");
      }
    }

    if (session.role === "ADMIN") {
      await safeCreateAuditLog({
        actorId: session.userId,
        action: AUDIT_ACTIONS.DOCUMENT_DELETE,
        entityType: "Document",
        entityId: documentId,
        metadata: { opportunityId: id, uploadedById: document.uploadedById, size: document.size, mimeType: document.mimeType },
      });
    }

    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    console.error("Delete document error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; documentId: string }> }) {
  try {
    const session = await getDocumentSession();
    if (session instanceof NextResponse) return session;

    const { id, documentId } = await params;
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: { opportunity: { select: { id: true, authorId: true } } },
    });

    if (!document || document.opportunityId !== id) return documentNotFound();

    const isAuthorOrAdmin = canManageDocuments(session, document.opportunity.authorId);

    // If not author/admin, check for approved access request
    if (!isAuthorOrAdmin) {
      const approved = await hasApprovedAccess(session.userId, documentId);
      if (!approved) {
        return documentAccessDeniedNoRequest();
      }
    }

    if (getMissingR2Env().length > 0) {
      return NextResponse.json(
        { error: "Stockage des documents indisponible. Configuration R2 manquante." },
        { status: 503 },
      );
    }

    const signedUrl = await createDownloadSignedUrl({
      key: document.r2Key,
      fileName: document.originalName,
      mimeType: document.mimeType,
    });

    // Audit log for non-author/non-admin access
    if (!isAuthorOrAdmin) {
      await safeCreateAuditLog({
        actorId: session.userId,
        action: AUDIT_ACTIONS.DOCUMENT_VIEWED,
        entityType: "Document",
        entityId: documentId,
        metadata: { requesterId: session.userId, opportunityId: id },
      });
    }

    return NextResponse.json({ data: { signedUrl, expiresIn: 180 } });
  } catch (error) {
    console.error("Preview document error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}