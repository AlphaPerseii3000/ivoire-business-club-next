import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { documentCompleteSchema } from "@/lib/validations";
import { createPublicDocumentUrl, getMissingR2Env } from "@/lib/r2";
import { getUserPremiumAccess } from "@/lib/subscription-access";
import { canUserAccessOpportunity } from "@/lib/opportunity-visibility";
import { canManageDocuments, getAccessStatusForDocuments } from "@/lib/document-access";
import { sanitizeError } from "@/lib/sanitize-log";
import {
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

    const isAuthorOrAdmin = canManageDocuments(session, opportunity.authorId);

    // For non-author/non-admin, verify active subscription and tier access
    if (!isAuthorOrAdmin) {
      const premiumAccess = await getUserPremiumAccess(session.userId);
      if (!premiumAccess.hasAccess) {
        return NextResponse.json(
          { error: "Abonnement actif requis pour accéder aux documents." },
          { status: 403 },
        );
      }

      // Get user tier for opportunity access check
      const fullSession = await auth();
      const userTier = (fullSession?.user as unknown as Record<string, unknown>)?.tier ?? "AFFRANCHI";

      // Fetch opportunity with requiredTier
      const oppWithTier = await prisma.opportunity.findUnique({
        where: { id },
        select: { requiredTier: true },
      });
      if (!oppWithTier || !canUserAccessOpportunity(oppWithTier.requiredTier, userTier)) {
        return documentAccessDenied();
      }
    }

    const documents = await prisma.document.findMany({
      where: { opportunityId: id },
      orderBy: { createdAt: "desc" },
    });

    // For author/admin, return full document details
    if (isAuthorOrAdmin) {
      return NextResponse.json({ data: documents.map(serializeDocument) });
    }

    // For members, return documents with access status
    const documentIds = documents.map((d) => d.id);
    const accessStatusMap = await getAccessStatusForDocuments(session.userId, documentIds);

    const documentsWithAccessStatus = documents.map((doc) => {
      const accessStatus = accessStatusMap.get(doc.id) ?? "locked";
      const hasAccess = accessStatus === "approved";

      return {
        id: doc.id,
        opportunityId: doc.opportunityId,
        uploadedById: doc.uploadedById,
        fileName: doc.fileName,
        originalName: doc.originalName,
        mimeType: doc.mimeType,
        size: doc.size,
        // NEVER serialize r2Key or publicUrl for non-author/non-admin
        // Approved members must use presigned URLs via the detail/download routes
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
        accessStatus,
      };
    });

    return NextResponse.json({ data: documentsWithAccessStatus });
  } catch (error) {
    console.error("List documents error:", sanitizeError(error));
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

    // Validate that the r2Key matches the server-generated pattern: opportunities/{opportunityId}/documents/{uuid}.{ext}
    const r2KeyPattern = /^opportunities\/[^/]+\/documents\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]+$/;
    if (!r2KeyPattern.test(parsed.data.r2Key)) {
      return NextResponse.json({ error: "Clé de stockage invalide." }, { status: 400 });
    }
    // Ensure the r2Key belongs to this specific opportunity
    if (!parsed.data.r2Key.startsWith(`opportunities/${id}/documents/`)) {
      return NextResponse.json({ error: "Clé de stockage invalide." }, { status: 400 });
    }

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
    console.error("Complete document upload error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}