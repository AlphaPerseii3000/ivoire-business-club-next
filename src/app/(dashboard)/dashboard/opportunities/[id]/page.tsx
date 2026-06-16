import Link from "next/link";
import { LockKeyhole } from "lucide-react";

import { DocumentUploadSection } from "@/components/features/deals/document-upload-section";
import { DocumentAccessRequests } from "@/components/features/deals/document-access-requests";
import { InterestButton } from "@/components/features/deals/interest-button";
import { ReviewForm } from "@/components/features/deals/review-form";
import { PlatinumBadge } from "@/components/features/reputation/platinum-badge";
import { ReliabilityScore } from "@/components/features/reputation/reliability-score";
import { TrustBadge } from "@/components/features/deals/trust-badge";
import { VerificationTimeline } from "@/components/features/deals/verification-timeline";
import { WhatsAppCTA } from "@/components/features/deals/whatsapp-cta";
import { TagChips } from "@/components/features/tags/tag-chips";
import { PremiumAccessBlockedPanel } from "@/components/premium-access-blocked-panel";
import { auth } from "@/lib/auth";
import { canUserAccessOpportunity } from "@/lib/opportunity-visibility";
import { formatOpportunityAmount, CURRENCY_OPTIONS } from "@/lib/currency";
import { prisma } from "@/lib/prisma";
import { calculateReliabilityScore, ensurePlatinumAwarded } from "@/lib/reputation";
import { getOpportunityTrustLevel } from "@/lib/trust-level";
import { getUserPremiumAccess } from "@/lib/subscription-access";
import { getAccessStatusForDocuments, getPendingAccessRequests } from "@/lib/document-access";
import { notFound, redirect } from "next/navigation";

export default async function OpportunityDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ highlight?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const shouldHighlightInterests = resolvedSearchParams.highlight === "interests";

  const [access, currentUser, opportunity] = await Promise.all([
    getUserPremiumAccess(session.user.id),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true, tier: true } }),
    prisma.opportunity.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            name: true,
            id: true,
            location: true,
            phone: true,
            platinumAwardedAt: true,
            opportunities: { where: { verificationStatus: "VERIFIED" }, select: { id: true } },
            reviewsReceived: { select: { rating: true } },
          },
        },
        verifiedBy: { select: { name: true } },
        documents: { orderBy: { createdAt: "desc" } },
        tags: { orderBy: [{ category: "asc" }, { value: "asc" }], select: { category: true, value: true } },
        verificationApprovals: { select: { adminId: true }, orderBy: { createdAt: "asc" } },
        interests: { where: { userId: session.user.id }, select: { id: true, createdAt: true } },
        reviews: { where: { reviewerId: session.user.id }, select: { id: true } },
        _count: { select: { interests: true } },
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
        <Link href="/dashboard/opportunities" className="text-sm text-muted-foreground hover:text-primary">← Retour aux opportunités</Link>
        <PremiumAccessBlockedPanel />
      </div>
    );
  }

  const hasTierAccess = canUserAccessOpportunity(opportunity.requiredTier, currentUser?.tier);
  if (!hasTierAccess && !isAuthor && !isAdmin) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link href="/dashboard/opportunities" className="text-sm text-muted-foreground hover:text-primary">← Retour aux opportunités</Link>
        <div data-testid="opportunity-tier-gate" className="mt-8 rounded-2xl border bg-card p-8 text-center shadow-sm">
          <LockKeyhole className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
          <h1 className="mt-4 text-xl font-semibold">Cette opportunité nécessite un tier supérieur</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Votre tier actuel ne permet pas d&apos;accéder aux détails de ce deal. Passez à un tier supérieur pour débloquer plus d&apos;opportunités vérifiées.
          </p>
          <Link
            href="/pricing"
            data-testid="upgrade-cta"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Voir les offres
          </Link>
        </div>
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
  const canViewDocuments = canManageDocuments || (access.hasAccess && hasTierAccess && isPublishedToMember);
  const canSeeRejectionNote = (isAuthor || isAdmin) && opportunity.rejectionNote;
  const shouldShowWhatsApp = !isAuthor && !isAdmin;
  const opportunityTags = opportunity.tags ?? [];
  const hasTags = opportunityTags.length > 0;
  const initialDocuments = canViewDocuments
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
  const interestCount = opportunity._count.interests;
  const hasCurrentUserInterest = opportunity.interests.length > 0;
  const currentUserInterest = opportunity.interests[0] ?? null;
  const hasExistingReview = opportunity.reviews.length > 0;
  const reviewDelayElapsed = currentUserInterest
    ? currentUserInterest.createdAt.getTime() <= Date.now() - 7 * 24 * 60 * 60 * 1000
    : false;
  const canShowReviewForm = !isAuthor && !isAdmin && isPublishedToMember && access.hasAccess && hasTierAccess && hasCurrentUserInterest && reviewDelayElapsed && !hasExistingReview;
  const interestCountLabel = `${interestCount} intérêt${interestCount > 1 ? "s" : ""} enregistré${interestCount > 1 ? "s" : ""}`;
  const interestIndicatorClassName = shouldHighlightInterests
    ? "mt-4 inline-flex items-center rounded-full border border-primary bg-primary/10 px-3 py-1 text-sm font-semibold text-primary ring-2 ring-primary/30"
    : "mt-4 inline-flex items-center rounded-full border bg-card px-3 py-1 text-sm text-muted-foreground";
  const approvalCount = opportunity.verificationApprovals.length;
  const authorReliabilityScore = calculateReliabilityScore(opportunity.author.reviewsReceived);
  const averageRating = authorReliabilityScore.averageRating;
  const validatedDealsCount = opportunity.author.opportunities.length;
  const authorPlatinumAward = await ensurePlatinumAwarded(opportunity.author.id, {
    validatedDealsCount,
    averageRating,
    platinumAwardedAt: opportunity.author.platinumAwardedAt,
  });
  const shouldShowAuthorPlatinumBadge = authorPlatinumAward.displayState !== "none";
  const trustLevel = getOpportunityTrustLevel({
    documentCount,
    verificationStatus: opportunity.verificationStatus,
    requiresDoubleVerification: opportunity.requiresDoubleVerification,
    approvalCount,
    authorStats: { validatedDealsCount, averageRating },
  });

  // Compute per-document access status for non-author/non-admin members
  const documentIds = (opportunity.documents ?? []).map((d) => d.id);
  const accessStatusMapResult = (!isAuthor && !isAdmin && canViewDocuments && documentIds.length > 0)
    ? await getAccessStatusForDocuments(session.user.id, documentIds)
    : null;
  const accessStatusMap = accessStatusMapResult
    ? Object.fromEntries(accessStatusMapResult)
    : undefined;

  // Fetch pending access requests for author/admin
  const pendingAccessRequests = (isAuthor || isAdmin)
    ? await getPendingAccessRequests(opportunity.id)
    : [];
  const hasPendingRequests = pendingAccessRequests.length > 0;
  const serializedPendingRequests = pendingAccessRequests.map((r) => ({
    id: r.id,
    requester: { id: r.requester.id, name: r.requester.name, email: r.requester.email },
    document: { id: r.document.id, originalName: r.document.originalName },
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link href="/dashboard/opportunities" className="text-sm text-muted-foreground hover:text-primary">← Retour aux opportunités</Link>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-8 items-start">
        {/* Left Column: 60% */}
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <h1 className="text-2xl font-bold">{opportunity.title}</h1>
              <p className={interestIndicatorClassName} aria-live="polite" aria-current={shouldHighlightInterests ? "true" : undefined}>
                {interestCountLabel}
              </p>
              {trustLevel ? <TrustBadge level={trustLevel} size="md" animated={trustLevel === "or"} /> : null}
            </div>
            <span data-testid="opportunity-status" className={`text-sm font-medium ${status.color}`}>{status.text}</span>
          </div>

          <div className="flex flex-wrap gap-3">
            <span className="rounded-md bg-muted px-3 py-1 text-sm">{categoryLabels[opportunity.category] ?? opportunity.category}</span>
            {opportunity.amount ? (
              <span className="rounded-md bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                {formatOpportunityAmount(opportunity.amount, opportunity.currency)}
              </span>
            ) : null}
          </div>

          {hasTags ? (
            <div>
              <TagChips tags={opportunityTags} />
            </div>
          ) : null}

          {canSeeRejectionNote ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              <h2 className="font-semibold">Note privée de refus</h2>
              <p className="mt-2 whitespace-pre-wrap">{opportunity.rejectionNote}</p>
            </div>
          ) : null}

          <div className="rounded-xl border bg-card p-6">
            <p className="whitespace-pre-wrap">{opportunity.description}</p>
          </div>

          <div>
            <VerificationTimeline
              documentCount={documentCount}
              verificationStatus={opportunity.verificationStatus}
              trustLevel={trustLevel}
              requiresDoubleVerification={opportunity.requiresDoubleVerification}
              approvalCount={approvalCount}
              averageRating={averageRating}
              validatedDealsCount={validatedDealsCount}
            />
          </div>

          <div>
            <DocumentUploadSection
              opportunityId={opportunity.id}
              initialDocuments={initialDocuments}
              documentCount={documentCount}
              canUpload={canManageDocuments}
              canPreview={canViewDocuments}
              accessStatusMap={accessStatusMap}
            />
          </div>

          {hasPendingRequests ? (
            <DocumentAccessRequests
              opportunityId={opportunity.id}
              requests={serializedPendingRequests}
            />
          ) : null}

          {canShowReviewForm ? <ReviewForm opportunityId={opportunity.id} /> : null}

          {isAuthor && opportunity.verificationStatus !== "VERIFIED" ? (
            <div className="flex gap-3">
              <button
                type="button"
                data-action="toggle-edit"
                className="min-h-11 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Modifier cette opportunité
              </button>
              <button
                type="button"
                data-action="delete-opportunity"
                data-opportunity-id={opportunity.id}
                className="min-h-11 rounded-md border border-destructive px-4 py-2 text-sm text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Supprimer cette opportunité
              </button>
            </div>
          ) : null}

          {isAuthor && opportunity.verificationStatus !== "VERIFIED" ? (
            <div id="edit-opportunity-form" className="hidden rounded-xl border bg-card p-6 space-y-4">
              <h2 className="text-lg font-semibold">Modifier l&apos;opportunité</h2>
              <form id="opportunity-edit-form" className="space-y-4">
                <div>
                  <label htmlFor="edit-title" className="block text-sm font-medium mb-1">Titre</label>
                  <input id="edit-title" name="title" type="text" defaultValue={opportunity.title} maxLength={200} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
                </div>
                <div>
                  <label htmlFor="edit-description" className="block text-sm font-medium mb-1">Description</label>
                  <textarea id="edit-description" name="description" rows={6} maxLength={5000} className="w-full rounded-md border bg-background px-3 py-2 text-sm" defaultValue={opportunity.description} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="edit-category" className="block text-sm font-medium mb-1">Catégorie</label>
                    <select id="edit-category" name="category" className="w-full rounded-md border bg-background px-3 py-2 text-sm" defaultValue={opportunity.category}>
                      <option value="IMMOBILIER">Immobilier</option>
                      <option value="BUSINESS">Business</option>
                      <option value="PARTENARIAT">Partenariat</option>
                      <option value="INVESTISSEMENT">Investissement</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="edit-amount" className="block text-sm font-medium mb-1">Montant</label>
                    <input id="edit-amount" name="amount" type="number" min="0" step="0.01" className="w-full rounded-md border bg-background px-3 py-2 text-sm" defaultValue={opportunity.amount ?? ""} />
                  </div>
                  <div>
                    <label htmlFor="edit-currency" className="block text-sm font-medium mb-1">Devise</label>
                    <select id="edit-currency" name="currency" className="w-full rounded-md border bg-background px-3 py-2 text-sm" defaultValue={opportunity.currency ?? "EUR"}>
                      {CURRENCY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="edit-tier" className="block text-sm font-medium mb-1">Visibilité</label>
                  <select id="edit-tier" name="requiredTier" className="w-full rounded-md border bg-background px-3 py-2 text-sm" defaultValue={opportunity.requiredTier}>
                    <option value="AFFRANCHI">Affranchi (tous)</option>
                    <option value="GRAND_FRERE">Grand Frère</option>
                    <option value="BOSS">Boss</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="min-h-11 rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    Enregistrer les modifications
                  </button>
                  <button
                    type="button"
                    data-action="cancel-edit"
                    className="min-h-11 rounded-md border px-6 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    Annuler
                  </button>
                </div>
                <p id="edit-error" className="text-sm text-destructive hidden"></p>
              </form>
            </div>
          ) : null}

          <script
            data-opportunity-id={opportunity.id}
            dangerouslySetInnerHTML={{
              __html: `
                document.addEventListener('DOMContentLoaded', function() {
                  var scriptTag = document.currentScript || document.querySelector('script[data-opportunity-id]');
                  var OPP_ID = scriptTag ? scriptTag.getAttribute('data-opportunity-id') : '';
                  var toggleBtn = document.querySelector('[data-action="toggle-edit"]');
                  var cancelBtn = document.querySelector('[data-action="cancel-edit"]');
                  var deleteBtn = document.querySelector('[data-action="delete-opportunity"]');
                  var editForm = document.getElementById('edit-opportunity-form');
                  var editFormEl = document.getElementById('opportunity-edit-form');
                  var errEl = document.getElementById('edit-error');

                  if (toggleBtn) toggleBtn.addEventListener('click', function() { editForm.classList.toggle('hidden'); });
                  if (cancelBtn) cancelBtn.addEventListener('click', function() { editForm.classList.add('hidden'); });

                  if (deleteBtn) deleteBtn.addEventListener('click', function() {
                    if (!confirm('\u00CAtes-vous s\u00FBr de vouloir supprimer cette opportunit\u00E9 ? Cette action est irr\u00E9versible.')) return;
                    fetch('/api/opportunities/' + OPP_ID, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } })
                      .then(function(r) {
                        if (r.ok) { window.location.href = '/dashboard/opportunities'; }
                        else { r.json().then(function(d) { alert(d.error || 'Erreur'); }); }
                      })
                      .catch(function() { alert('Erreur r\u00E9seau'); });
                  });

                  if (editFormEl) editFormEl.addEventListener('submit', function(e) {
                    e.preventDefault();
                    errEl.classList.add('hidden');
                    var data = {
                      title: document.getElementById('edit-title').value,
                      description: document.getElementById('edit-description').value,
                      category: document.getElementById('edit-category').value,
                      amount: document.getElementById('edit-amount').value ? parseFloat(document.getElementById('edit-amount').value) : null,
                      requiredTier: document.getElementById('edit-tier').value,
                    };
                    fetch('/api/opportunities/' + OPP_ID, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(data),
                    })
                    .then(function(r) {
                      if (r.ok) { window.location.reload(); }
                      else { r.json().then(function(d) { errEl.textContent = d.error || 'Erreur lors de la modification'; errEl.classList.remove('hidden'); }); }
                    })
                    .catch(function() { errEl.textContent = 'Erreur r\u00E9seau'; errEl.classList.remove('hidden'); });
                  });
                });
              `,
            }}
          />
        </div>

        {/* Right Column: 40% (Sticky Sidebar) */}
        <div className="lg:sticky lg:top-6 space-y-6">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="font-semibold text-lg">Auteur (Promoteur)</h2>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">{opportunity.author.name}{opportunity.author.location ? ` — ${opportunity.author.location}` : ""}</p>
              {shouldShowAuthorPlatinumBadge ? <PlatinumBadge state={authorPlatinumAward.displayState} /> : null}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Publié le {new Date(opportunity.createdAt).toLocaleDateString("fr-FR")}</p>
            <ReliabilityScore
              averageRating={authorReliabilityScore.averageRating}
              reviewCount={authorReliabilityScore.reviewCount}
              className="mt-4"
            />
            {opportunity.verifiedBy ? (
              <p className="mt-2 text-xs text-accent font-medium">Vérifié par {opportunity.verifiedBy.name}</p>
            ) : null}
            {shouldShowWhatsApp ? (
              <div className="mt-6 flex flex-col gap-3">
                <WhatsAppCTA
                  phoneNumber={opportunity.author.phone}
                  prefilledMessage={`Bonjour, je suis intéressé(e) par votre deal ${opportunity.title} sur IBC.`}
                  label="Contacter le porteur sur WhatsApp"
                />
                <InterestButton
                  opportunityId={opportunity.id}
                  isAuthenticated={true}
                  initialInterested={hasCurrentUserInterest}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
