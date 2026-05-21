import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { formatReliabilityScore } from "@/components/features/reputation/reliability-score";

export type PublicReviewListItem = {
  id: string;
  rating: number;
  comment: string;
  createdAt: Date;
  reviewer: { name: string; image?: string | null };
};

type ReviewListProps = {
  reviews: PublicReviewListItem[];
  truncateComments?: boolean;
};

type PublicReviewSectionProps = {
  reviews: PublicReviewListItem[];
  averageRating: number | null;
  totalReviewCount: number;
  allReviewsHref?: string;
};

const PREVIEW_COMMENT_LIMIT = 180;
const emptyReviewMessage = "Pas encore d'avis. Soyez le premier à collaborer avec ce membre.";
const frScoreFormatter = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function getReviewerInitial(name: string): string {
  const trimmedName = name.trim();
  return trimmedName.length > 0 ? trimmedName.charAt(0).toUpperCase() : "?";
}

export function truncateReviewComment(comment: string, limit = PREVIEW_COMMENT_LIMIT): string {
  const characters = Array.from(comment);
  if (characters.length <= limit) {
    return comment;
  }

  return `${characters.slice(0, limit).join("").trimEnd()}…`;
}

function Stars({ rating }: { rating: number }) {
  const safeRating = Math.max(0, Math.min(5, rating));
  return (
    <span aria-label={`${safeRating} sur 5 étoiles`} className="text-amber-500">
      {"★".repeat(safeRating)}{"☆".repeat(5 - safeRating)}
    </span>
  );
}

export function ReviewList({ reviews, truncateComments = false }: ReviewListProps) {
  return (
    <div className="space-y-3">
      {reviews.map((review) => {
        const reviewerName = review.reviewer.name;
        const reviewerInitial = getReviewerInitial(reviewerName);
        const visibleComment = truncateComments ? truncateReviewComment(review.comment) : review.comment;
        const hasReviewerImage = Boolean(review.reviewer.image);

        return (
          <article key={review.id} className="rounded-xl border bg-background p-4">
            <div className="flex items-start gap-3">
              <Avatar className="mt-0.5" aria-label={`Avatar de ${reviewerName}`}>
                {hasReviewerImage ? <AvatarImage src={review.reviewer.image ?? undefined} alt={`Avatar de ${reviewerName}`} /> : null}
                <AvatarFallback>{reviewerInitial}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">{reviewerName}</p>
                  <time className="text-xs text-muted-foreground" dateTime={review.createdAt.toISOString()}>
                    {review.createdAt.toLocaleDateString("fr-FR")}
                  </time>
                </div>
                <div className="mt-1">
                  <Stars rating={review.rating} />
                </div>
                <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{visibleComment}</p>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function PublicReviewSection({ reviews, averageRating, totalReviewCount, allReviewsHref }: PublicReviewSectionProps) {
  const hasReviews = totalReviewCount > 0;
  const hasAverageRating = averageRating !== null;
  const hasMoreReviews = totalReviewCount > 5;
  const shouldShowAllReviewsLink = hasMoreReviews ? Boolean(allReviewsHref) : false;
  const countLabel = `${totalReviewCount} avis reçu${totalReviewCount > 1 ? "s" : ""}`;
  const averageLabel = hasAverageRating ? `${frScoreFormatter.format(averageRating)} sur 5 étoiles` : undefined;

  return (
    <section className="mt-6" aria-labelledby="public-reviews-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="public-reviews-title" className="font-semibold">Avis et Réputation</h2>
          {hasReviews ? (
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span aria-label={averageLabel} className="font-semibold text-foreground">
                {hasAverageRating ? formatReliabilityScore(averageRating) : "—"}
              </span>
              <span>{countLabel}</span>
            </div>
          ) : null}
        </div>
        {shouldShowAllReviewsLink ? (
          <Link href={allReviewsHref ?? "#"} className={buttonVariants({ variant: "outline", size: "sm", className: "min-h-11" })}>
            Voir tous les avis
          </Link>
        ) : null}
      </div>

      <div className="mt-3">
        {hasReviews ? (
          <ReviewList reviews={reviews} truncateComments />
        ) : (
          <EmptyState title={emptyReviewMessage} />
        )}
      </div>
    </section>
  );
}
