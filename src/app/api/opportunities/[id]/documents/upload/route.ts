import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { documentPresignSchema } from "@/lib/validations";
import { createDocumentR2Key, createPublicDocumentUrl, getMissingR2Env, uploadObjectToS3 } from "@/lib/r2";
import {
  canManageDocuments,
  documentAccessDenied,
  documentNotFound,
  getDocumentSession,
  getOpportunityForDocuments,
  serializeDocument,
} from "../_helpers";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getDocumentSession();
    if (session instanceof NextResponse) return session;

    const { id } = await params;
    const opportunity = await getOpportunityForDocuments(id);
    if (!opportunity) return documentNotFound();
    if (!canManageDocuments(session, opportunity.authorId)) return documentAccessDenied();

    const missing = getMissingR2Env();
    if (missing.length > 0) {
      return NextResponse.json(
        { error: "Stockage des documents indisponible. Configuration R2/S3 manquante." },
        { status: 503 },
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
    }

    const parsed = documentPresignSchema.safeParse({
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides" },
        { status: 400 },
      );
    }

    const r2Key = createDocumentR2Key(id, parsed.data.fileName, parsed.data.mimeType);
    const fileName = r2Key.split("/").at(-1) ?? parsed.data.fileName;
    const buffer = Buffer.from(await file.arrayBuffer());

    await uploadObjectToS3(r2Key, buffer, parsed.data.mimeType);

    const document = await prisma.document.create({
      data: {
        opportunityId: id,
        uploadedById: session.userId,
        fileName,
        originalName: parsed.data.fileName,
        mimeType: parsed.data.mimeType,
        size: parsed.data.size,
        r2Key,
        publicUrl: createPublicDocumentUrl(r2Key),
      },
    });

    return NextResponse.json({ data: serializeDocument(document) }, { status: 201 });
  } catch (error) {
    console.error("Proxy document upload error:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
