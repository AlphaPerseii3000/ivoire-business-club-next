import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminOpportunityKanban } from "@/components/features/admin/opportunity-kanban-board";
import type { AdminOpportunity } from "@/components/features/admin/opportunity-detail-sheet";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminOpportunitiesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  if (user?.role !== "ADMIN") redirect("/dashboard");
  const currentAdminId = session.user.id;

  const opportunities = await prisma.opportunity.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { id: true, name: true, email: true, image: true } },
      verifiedBy: { select: { id: true, name: true } },
      documents: { orderBy: { createdAt: "desc" } },
      verificationApprovals: { select: { adminId: true }, orderBy: { createdAt: "asc" } },
      _count: { select: { documents: true, verificationApprovals: true } },
    },
  });

  const serializedOpportunities: AdminOpportunity[] = opportunities.map((opportunity) => ({
    id: opportunity.id,
    title: opportunity.title,
    description: opportunity.description,
    category: opportunity.category,
    amount: opportunity.amount,
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
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workflow de vérification des opportunités</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Suivez les deals de la soumission à la décision finale.
          </p>
        </div>
        <Link href="/admin/dashboard" className="min-h-11 rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          ← Retour au tableau de bord
        </Link>
      </div>

      <AdminOpportunityKanban opportunities={serializedOpportunities} />
    </div>
  );
}
