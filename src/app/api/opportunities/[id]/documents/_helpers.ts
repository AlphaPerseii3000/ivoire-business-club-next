import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { DocumentAccessSession } from "@/lib/document-access";
export { canManageDocuments } from "@/lib/document-access";

export type DocumentSession = DocumentAccessSession;

export async function getDocumentSession(): Promise<DocumentSession | NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  return {
    userId: session.user.id,
    role: String((session.user as unknown as Record<string, unknown>).role ?? "MEMBER"),
  };
}

export async function getOpportunityForDocuments(opportunityId: string) {
  return prisma.opportunity.findUnique({
    where: { id: opportunityId },
    select: { id: true, authorId: true },
  });
}

export function documentAccessDenied() {
  return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
}

export function documentAccessDeniedNoRequest() {
  return NextResponse.json(
    { error: "Accès refusé — demandez l'accès à ce document" },
    { status: 403 },
  );
}

export function documentNotFound() {
  return NextResponse.json({ error: "Document introuvable" }, { status: 404 });
}

export function serializeDocument(document: {
  id: string;
  opportunityId: string;
  uploadedById: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  r2Key?: string;
  publicUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
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
  };
}
