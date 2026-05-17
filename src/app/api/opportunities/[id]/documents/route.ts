import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { documentCompleteSchema } from "@/lib/validations";
import { createPublicDocumentUrl, getMissingR2Env } from "@/lib/r2";
import {
  canManageDocuments,
  documentAccessDenied,
  documentNotFound,
  getDocumentSession,
  getOpportunityForDocuments,
  serializeDocument,
} from "./_helpers";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getDocumentSession();
    if (session instanceof NextResponse) return session;

    const { id } = await params;
    const opportunity = await getOpportunityForDocuments(id);
    if (!opportunity) return documentNotFound();
    if (!canManageDocuments(session, opportunity.authorId)) return documentAccessDenied();

    const documents = await prisma.document.findMany({
      where: { opportunityId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: documents.map(serializeDocument) });
  } catch (error) {
    console.error("List documents error:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getDocumentSession();
    if (session instanceof NextResponse) return session;

    const { id } = await params;
    const opportunity = await getOpportunityForDocuments(id);
    if (!opportunity) return documentNotFound();
    if (!canManageDocuments(session, opportunity.authorId)) return documentAccessDenied();

    const parsed = documentCompleteSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides" },
        { status: 400 },
      );
    }

    const missing = getMissingR2Env();
    const publicUrl = missing.length > 0 ? null : createPublicDocumentUrl(parsed.data.r2Key);

    const document = await prisma.document.create({
      data: {
        opportunityId: id,
        uploadedById: session.userId,
        fileName: parsed.data.fileName,
        originalName: parsed.data.originalName,
        mimeType: parsed.data.mimeType,
        size: parsed.data.size,
        r2Key: parsed.data.r2Key,
        publicUrl,
      },
    });

    return NextResponse.json({ data: serializeDocument(document) }, { status: 201 });
  } catch (error) {
    console.error("Complete document upload error:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
