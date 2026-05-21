import Link from "next/link";
import { LockKeyhole } from "lucide-react";

import { DocumentUploadSection } from "@/components/features/deals/document-upload-section";
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
import { prisma } from "@/lib/prisma";
import { calculateReliabilityScore, ensurePlatinumAwarded } from "@/lib/reputation";
import { getOpportunityTrustLevel } from "@/lib/trust-level";
import { getUserPremiumAccess } from "@/lib/subscription-access";
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
        <div className="mt-8 rounded-2xl border bg-card p-8 text-center shadow-sm">
          <LockKeyhole className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
          <h1 className="mt-4 text-xl font-semibold">Cette opportunité nécessite un tier supérieur</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Votre tier actuel ne permet pas d&apos;accéder aux détails de ce deal. Passez à un tier supérieur pour débloquer plus d&apos;opportunités vérifiées.
          </p>
          <Link
            href="/pricing"
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/dashboard/opportunities" className="text-sm text-muted-foreground hover:text-primary">← Retour aux opportunités</Link>

      <div className="mt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <h1 className="text-2xl font-bold">{opportunity.title}</h1>
            <p className={interestIndicatorClassName} aria-live="polite" aria-current={shouldHighlightInterests ? "true" : undefined}>
              {interestCountLabel}
            </p>
            {trustLevel ? <TrustBadge level={trustLevel} size="md" animated={trustLevel === "or"} /> : null}
          </div>
          <span className={`text-sm font-medium ${status.color}`}>{status.text}</span>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <span className="rounded-md bg-muted px-3 py-1 text-sm">{categoryLabels[opportunity.category] ?? opportunity.category}</span>
          {opportunity.amount ? (
            <span className="rounded-md bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
              {opportunity.amount.toLocaleString("fr-FR")} €
            </span>
          ) : null}
        </div>

        {hasTags ? (
          <div className="mt-4">
            <TagChips tags={opportunityTags} />
          </div>
        ) : null}

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
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="text-sm">{opportunity.author.name}{opportunity.author.location ? ` — ${opportunity.author.location}` : ""}</p>
            {shouldShowAuthorPlatinumBadge ? <PlatinumBadge state={authorPlatinumAward.displayState} /> : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Publié le {new Date(opportunity.createdAt).toLocaleDateString("fr-FR")}</p>
          <ReliabilityScore
            averageRating={authorReliabilityScore.averageRating}
            reviewCount={authorReliabilityScore.reviewCount}
            className="mt-4"
          />
          {opportunity.verifiedBy ? (
            <p className="mt-2 text-xs text-accent">Vérifié par {opportunity.verifiedBy.name}</p>
          ) : null}
          {shouldShowWhatsApp ? (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
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

        <div className="mt-6">
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

        <div className="mt-6">
          <DocumentUploadSection
            opportunityId={opportunity.id}
            initialDocuments={initialDocuments}
            documentCount={documentCount}
            canUpload={canManageDocuments}
            canPreview={canViewDocuments}
          />
        </div>

        {canShowReviewForm ? <ReviewForm opportunityId={opportunity.id} /> : null}

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
