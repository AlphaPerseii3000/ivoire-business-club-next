import Link from "next/link";

import { DocumentUploadSection } from "@/components/features/deals/document-upload-section";
import { PremiumAccessBlockedPanel } from "@/components/premium-access-blocked-panel";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserPremiumAccess } from "@/lib/subscription-access";
import { notFound, redirect } from "next/navigation";

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const { id } = await params;

  const [access, currentUser, opportunity] = await Promise.all([
    getUserPremiumAccess(session.user.id),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } }),
    prisma.opportunity.findUnique({
      where: { id },
      include: {
        author: { select: { name: true, id: true, location: true } },
        verifiedBy: { select: { name: true } },
        documents: { orderBy: { createdAt: "desc" } },
      },
    }),
  ]);

  if (!opportunity) notFound();

  const isAuthor = session.user.id === opportunity.author.id;
  const isAdmin = currentUser?.role === "ADMIN";
  const isPublishedToMember = opportunity.verificationStatus === "VERIFIED";

  if (!isAuthor && !isAdmin && !isPublishedToMember) notFound();

  if (!access.hasAccess && !isAuthor && !isAdmin) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link href="/opportunities" className="text-sm text-muted-foreground hover:text-primary">← Retour aux opportunités</Link>
        <PremiumAccessBlockedPanel />
      </div>
    );
  }

  const categoryLabels: Record<string, string> = {
    INVESTISSEMENT: "Investissement",
    BUSINESS: "Business",
    PARTENARIAT: "Partenariat",
    IMMOBILIER: "Immobilier",
  };

  const statusLabels: Record<string, { text: string; color: string }> = {
    PENDING: { text: "En attente de vérification", color: "text-yellow-600" },
    EN_COURS: { text: "En cours de vérification", color: "text-blue-600" },
    VERIFIED: { text: "Vérifié ✓", color: "text-accent" },
    REJECTED: { text: "Refusé", color: "text-destructive" },
  };

  const status = statusLabels[opportunity.verificationStatus] ?? { text: opportunity.verificationStatus, color: "" };
  const canManageDocuments = isAuthor || isAdmin;
  const canSeeRejectionNote = (isAuthor || isAdmin) && opportunity.rejectionNote;
  const initialDocuments = canManageDocuments
    ? (opportunity.documents ?? []).map((document) => ({
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
      }))
    : [];
  const documentCount = opportunity.documents?.length ?? 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/opportunities" className="text-sm text-muted-foreground hover:text-primary">← Retour aux opportunités</Link>

      <div className="mt-6">
        <div className="flex items-start justify-between">
          <h1 className="text-2xl font-bold">{opportunity.title}</h1>
          <span className={`text-sm font-medium ${status.color}`}>{status.text}</span>
        </div>

        <div className="mt-4 flex gap-3">
          <span className="rounded-md bg-muted px-3 py-1 text-sm">{categoryLabels[opportunity.category] ?? opportunity.category}</span>
          {opportunity.amount ? (
            <span className="rounded-md bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
              {opportunity.amount.toLocaleString("fr-FR")} €
            </span>
          ) : null}
        </div>

        {canSeeRejectionNote ? (
          <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <h2 className="font-semibold">Note privée de refus</h2>
            <p className="mt-2 whitespace-pre-wrap">{opportunity.rejectionNote}</p>
          </div>
        ) : null}

        <div className="mt-6 rounded-xl border bg-card p-6">
          <p className="whitespace-pre-wrap">{opportunity.description}</p>
        </div>

        <div className="mt-6 rounded-xl border bg-card p-6">
          <h2 className="font-semibold">Auteur</h2>
          <p className="mt-1 text-sm">{opportunity.author.name}{opportunity.author.location ? ` — ${opportunity.author.location}` : ""}</p>
          <p className="mt-1 text-xs text-muted-foreground">Publié le {new Date(opportunity.createdAt).toLocaleDateString("fr-FR")}</p>
          {opportunity.verifiedBy ? (
            <p className="mt-2 text-xs text-accent">Vérifié par {opportunity.verifiedBy.name}</p>
          ) : null}
        </div>

        <div className="mt-6">
          <DocumentUploadSection
            opportunityId={opportunity.id}
            initialDocuments={initialDocuments}
            documentCount={documentCount}
            canUpload={canManageDocuments}
            canPreview={canManageDocuments}
          />
        </div>

        {isAuthor ? (
          <div className="mt-6">
            <form action={`/api/opportunities/${opportunity.id}/delete`} method="POST">
              <button type="submit" className="min-h-11 rounded-md border border-destructive px-4 py-2 text-sm text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                Supprimer cette opportunité
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  );
}
