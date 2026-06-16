import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AUDIT_ACTIONS, safeCreateAuditLog } from "@/lib/audit-log";
import { getUserPremiumAccess } from "@/lib/subscription-access";
import { canUserAccessOpportunity } from "@/lib/opportunity-visibility";
import { canManageDocuments } from "@/lib/document-access";
import { sanitizeError } from "@/lib/sanitize-log";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; documentId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userId = session.user.id;
    const userRole = String((session.user as unknown as Record<string, unknown>).role ?? "MEMBER");
    const userTier = (session.user as unknown as Record<string, unknown>).tier ?? "AFFRANCHI";

    const { id: opportunityId, documentId } = await params;

    // Verify active subscription
    const premiumAccess = await getUserPremiumAccess(userId);
    if (!premiumAccess.hasAccess) {
      return NextResponse.json(
        { error: "Abonnement actif requis pour demander l'accès aux documents." },
        { status: 403 },
      );
    }

    // Verify the document exists and belongs to the opportunity
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: { opportunity: { select: { id: true, authorId: true, requiredTier: true } } },
    });

    if (!document || document.opportunityId !== opportunityId) {
      return NextResponse.json({ error: "Document introuvable" }, { status: 404 });
    }

    // Verify tier access
    if (!canUserAccessOpportunity(document.opportunity.requiredTier, userTier)) {
      return NextResponse.json(
        { error: "Accès refusé — tier insuffisant pour cette opportunité." },
        { status: 403 },
      );
    }

    // If user is author or admin, no need to request access
    if (canManageDocuments({ userId, role: userRole }, document.opportunity.authorId)) {
      return NextResponse.json(
        { error: "Vous avez déjà accès à ce document." },
        { status: 400 },
      );
    }

    // Check for existing PENDING or APPROVED request
    const existingRequest = await prisma.documentAccessRequest.findUnique({
      where: { requesterId_documentId: { requesterId: userId, documentId } },
      select: { id: true, status: true, createdAt: true },
    });

    if (existingRequest && (existingRequest.status === "PENDING" || existingRequest.status === "APPROVED")) {
      return NextResponse.json(
        { error: "Vous avez déjà demandé l'accès à ce document.", code: "ACCESS_ALREADY_REQUESTED" },
        { status: 409 },
      );
    }

    // If there's a DENIED request, we need to delete it first to allow re-request
    // (the @@unique constraint prevents duplicates)
    if (existingRequest && existingRequest.status === "DENIED") {
      await prisma.documentAccessRequest.delete({
        where: { id: existingRequest.id },
      });
    }

    // Create the access request
    const accessRequest = await prisma.documentAccessRequest.create({
      data: {
        requesterId: userId,
        documentId,
        status: "PENDING",
      },
      select: { id: true, status: true, createdAt: true },
    });

    // Audit log
    await safeCreateAuditLog({
      actorId: userId,
      action: AUDIT_ACTIONS.DOCUMENT_ACCESS_REQUESTED,
      entityType: "Document",
      entityId: documentId,
      metadata: { requesterId: userId, opportunityId },
    });

    return NextResponse.json({ data: accessRequest }, { status: 201 });
  } catch (error) {
    console.error("[request-access]", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}