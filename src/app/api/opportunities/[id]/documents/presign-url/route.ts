import { NextResponse } from "next/server";

import { documentPresignSchema } from "@/lib/validations";
import { createDocumentR2Key, createUploadSignedUrl, getMissingR2Env } from "@/lib/r2";
import {
  canManageDocuments,
  documentAccessDenied,
  documentNotFound,
  getDocumentSession,
  getOpportunityForDocuments,
} from "../_helpers";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getDocumentSession();
    if (session instanceof NextResponse) return session;

    const { id } = await params;
    const opportunity = await getOpportunityForDocuments(id);
    if (!opportunity) return documentNotFound();
    if (!canManageDocuments(session, opportunity.authorId)) return documentAccessDenied();

    const body = await req.json();
    const parsed = documentPresignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides" },
        { status: 400 },
      );
    }

    const missing = getMissingR2Env();
    if (missing.length > 0) {
      return NextResponse.json(
        { error: "Stockage des documents indisponible. Configuration R2 manquante." },
        { status: 503 },
      );
    }

    const r2Key = createDocumentR2Key(id, parsed.data.fileName, parsed.data.mimeType);
    const signedUrl = await createUploadSignedUrl({ key: r2Key, mimeType: parsed.data.mimeType });
    const fileName = r2Key.split("/").at(-1) ?? parsed.data.fileName;

    return NextResponse.json({ data: { signedUrl, r2Key, fileName, expiresIn: 300 } });
  } catch (error) {
    console.error("Document presign error:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
