import { cn } from "@/lib/utils";

type ReliabilityScoreProps = {
  averageRating: number | null;
  reviewCount: number;
  className?: string;
};

const frScoreFormatter = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function formatReliabilityScore(averageRating: number): string {
  return `${frScoreFormatter.format(averageRating)}/5`;
}

export function ReliabilityScore({ averageRating, reviewCount, className }: ReliabilityScoreProps) {
  const hasScore = averageRating !== null && reviewCount > 0;
  const roundedStars = hasScore ? Math.round(averageRating) : 0;
  const filledStars = "★".repeat(roundedStars);
  const emptyStars = "☆".repeat(5 - roundedStars);
  const ariaLabel = hasScore ? `${frScoreFormatter.format(averageRating)} sur 5 étoiles` : undefined;
  const reviewCountLabel = `${reviewCount} avis reçu${reviewCount > 1 ? "s" : ""}`;

  return (
    <section className={cn("rounded-xl border bg-background p-4", className)} aria-labelledby="reliability-score-title">
      <h2 id="reliability-score-title" className="text-sm font-semibold text-foreground">
        Score de fiabilité IBC
      </h2>
      {hasScore ? (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span aria-label={ariaLabel} className="text-lg tracking-wide text-amber-500">
            {filledStars}{emptyStars}
          </span>
          <span className="font-semibold">{formatReliabilityScore(averageRating)}</span>
          <span className="text-sm text-muted-foreground">{reviewCountLabel}</span>
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">Pas encore d&apos;avis reçus</p>
      )}
    </section>
  );
}
