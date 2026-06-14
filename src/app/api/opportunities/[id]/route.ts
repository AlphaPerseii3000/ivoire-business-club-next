import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { AUDIT_ACTIONS, safeCreateAuditLog } from "@/lib/audit-log";
import { canUserAccessOpportunity } from "@/lib/opportunity-visibility";
import { prisma } from "@/lib/prisma";
import { sanitizeError } from "@/lib/sanitize-log";
import { getUserPremiumAccess } from "@/lib/subscription-access";
import { opportunityOwnerUpdateSchema } from "@/lib/validations";
import { deleteR2Object, getMissingR2Env } from "@/lib/r2";

type RouteContext = { params: Promise<{ id: string }> };

// PATCH /api/opportunities/[id] — author can update their own opportunity
export async function PATCH(req: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const { id } = await params;
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
    }

    const parsed = opportunityOwnerUpdateSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message ?? "Données invalides" },
        { status: 400 },
      );
    }

    const opportunity = await prisma.opportunity.findUnique({
      where: { id },
      select: { authorId: true, verificationStatus: true },
    });

    if (!opportunity) {
      return NextResponse.json({ error: "Opportunité introuvable" }, { status: 404 });
    }

    // Only the author can update their own opportunity
    if (opportunity.authorId !== session.user.id) {
      return NextResponse.json({ error: "Vous n'êtes pas l'auteur de cette opportunité." }, { status: 403 });
    }

    // Author cannot edit a VERIFIED opportunity (must contact admin)
    if (opportunity.verificationStatus === "VERIFIED") {
      return NextResponse.json(
        { error: "Les opportunités vérifiées ne peuvent pas être modifiées. Contactez un administrateur." },
        { status: 403 },
      );
    }

    const { title, description, category, amount, currency, requiredTier } = parsed.data;

    const updated = await prisma.opportunity.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category }),
        ...(amount !== undefined && { amount: typeof amount === "number" && isNaN(amount) ? null : amount ?? null }),
        ...(currency !== undefined && { currency }),
        ...(requiredTier !== undefined && { requiredTier }),
      },
      include: {
        author: { select: { id: true, name: true, location: true, phone: true } },
        tags: { orderBy: [{ category: "asc" }, { value: "asc" }], select: { category: true, value: true } },
        _count: { select: { documents: true, verificationApprovals: true } },
      },
    });

    await safeCreateAuditLog({
      actorId: session.user.id,
      action: AUDIT_ACTIONS.OPPORTUNITY_UPDATE,
      entityType: "Opportunity",
      entityId: id,
      metadata: {
        updatedBy: "owner",
        changedFields: {
          title: title !== undefined,
          description: description !== undefined,
          category: category !== undefined,
          amount: amount !== undefined,
          currency: currency !== undefined,
          requiredTier: requiredTier !== undefined,
        },
      },
    });

    return NextResponse.json({
      data: {
        id: updated.id,
        title: updated.title,
        description: updated.description,
        category: updated.category,
        amount: updated.amount,
        currency: updated.currency,
        requiredTier: updated.requiredTier,
        verificationStatus: updated.verificationStatus,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        tags: updated.tags,
        author: updated.author,
        documentCount: updated._count.documents,
        approvalCount: updated._count.verificationApprovals,
      },
    });
  } catch (error) {
    console.error("[opportunity-owner-update]", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

// DELETE /api/opportunities/[id] — author can delete their own opportunity (non-verified only)
export async function DELETE(_req: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const opportunity = await prisma.opportunity.findUnique({
      where: { id },
      include: {
        documents: { select: { id: true, r2Key: true } },
        verificationApprovals: { select: { adminId: true } },
      },
    });

    if (!opportunity) {
      return NextResponse.json({ error: "Opportunité introuvable" }, { status: 404 });
    }

    // Only the author can delete their own opportunity
    if (opportunity.authorId !== session.user.id) {
      return NextResponse.json({ error: "Vous n'êtes pas l'auteur de cette opportunité." }, { status: 403 });
    }

    // Author cannot delete a VERIFIED opportunity
    if (opportunity.verificationStatus === "VERIFIED") {
      return NextResponse.json(
        { error: "Les opportunités vérifiées ne peuvent pas être supprimées. Contactez un administrateur." },
        { status: 403 },
      );
    }

    const documentKeys = opportunity.documents.map((doc) => doc.r2Key);
    await prisma.opportunity.delete({ where: { id } });

    // Clean up R2 documents
    if (getMissingR2Env().length === 0) {
      const deletionResults = await Promise.allSettled(documentKeys.map((key) => deleteR2Object(key)));
      const failedDeletionCount = deletionResults.filter((result) => result.status === "rejected").length;
      if (failedDeletionCount > 0) {
        console.error("[opportunity-owner-delete-r2]", { opportunityId: id, failedDeletionCount });
      }
    }

    console.info("[opportunity-owner-delete]", { opportunityId: id, userId: session.user.id });
    await safeCreateAuditLog({
      actorId: session.user.id,
      action: AUDIT_ACTIONS.OPPORTUNITY_DELETE,
      entityType: "Opportunity",
      entityId: id,
      metadata: {
        deletedBy: "owner",
        previousStatus: opportunity.verificationStatus,
        documentCount: opportunity.documents.length,
      },
    });

    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    console.error("[opportunity-owner-delete]", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

// GET /api/opportunities/[id] — author or member with access can view a single opportunity
export async function GET(req: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const [currentUser, opportunity] = await Promise.all([
      prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true, tier: true } }),
      prisma.opportunity.findUnique({
        where: { id },
        include: {
          author: { select: { id: true, name: true, location: true, phone: true, opportunities: { where: { verificationStatus: "VERIFIED" }, select: { id: true } } } },
          tags: { orderBy: [{ category: "asc" }, { value: "asc" }], select: { category: true, value: true } },
          _count: { select: { documents: true, verificationApprovals: true } },
        },
      }),
    ]);

    if (!opportunity) {
      return NextResponse.json({ error: "Opportunité introuvable" }, { status: 404 });
    }

    const isAuthor = opportunity.authorId === session.user.id;
    const isAdmin = currentUser?.role === "ADMIN";
    const isVerified = opportunity.verificationStatus === "VERIFIED";

    // Access check: author, admin, or verified+accessible
    if (!isAuthor && !isAdmin) {
      if (!isVerified) {
        return NextResponse.json({ error: "Opportunité introuvable" }, { status: 404 });
      }
      const hasTierAccess = canUserAccessOpportunity(opportunity.requiredTier, currentUser?.tier);
      if (!hasTierAccess) {
        return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
      }
    }

    return NextResponse.json({
      data: {
        id: opportunity.id,
        title: opportunity.title,
        description: opportunity.description,
        category: opportunity.category,
        amount: opportunity.amount,
        currency: opportunity.currency,
        requiredTier: opportunity.requiredTier,
        verificationStatus: opportunity.verificationStatus,
        createdAt: opportunity.createdAt.toISOString(),
        updatedAt: opportunity.updatedAt.toISOString(),
        tags: opportunity.tags,
        author: {
          id: opportunity.author.id,
          name: opportunity.author.name,
          location: opportunity.author.location,
          phone: opportunity.author.phone,
        },
        documentCount: opportunity._count.documents,
        approvalCount: opportunity._count.verificationApprovals,
        isAuthor,
      },
    });
  } catch (error) {
    console.error("[opportunity-get]", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}