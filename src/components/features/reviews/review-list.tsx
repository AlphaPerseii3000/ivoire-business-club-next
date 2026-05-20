type ReviewListItem = {
  id: string;
  rating: number;
  comment: string;
  createdAt: Date;
  reviewer: { name: string };
};

type ReviewListProps = {
  reviews: ReviewListItem[];
};

function Stars({ rating }: { rating: number }) {
  return (
    <span aria-label={`${rating} sur 5 étoiles`} className="text-amber-500">
      {"★".repeat(rating)}{"☆".repeat(5 - rating)}
    </span>
  );
}

export function ReviewList({ reviews }: ReviewListProps) {
  const hasReviews = reviews.length > 0;

  return (
    <section className="mt-6" aria-labelledby="received-reviews-title">
      <h2 id="received-reviews-title" className="font-semibold">Avis reçus</h2>
      {hasReviews ? (
        <div className="mt-3 space-y-3">
          {reviews.map((review) => (
            <article key={review.id} className="rounded-xl border bg-background p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Stars rating={review.rating} />
                <time className="text-xs text-muted-foreground" dateTime={review.createdAt.toISOString()}>
                  {review.createdAt.toLocaleDateString("fr-FR")}
                </time>
              </div>
              <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{review.comment}</p>
              <p className="mt-3 text-xs font-medium">Par {review.reviewer.name}</p>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
