"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

type ReviewFormProps = {
  opportunityId: string;
};

export function ReviewForm({ opportunityId }: ReviewFormProps) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const remainingCharacters = 500 - comment.length;
  const canSubmit = rating >= 1 && rating <= 5 && comment.trim().length > 0 && comment.length <= 500 && !isPending;

  function submitReview() {
    setError(null);
    setSuccess(null);

    if (rating < 1 || rating > 5) {
      setError("Choisissez une note entre 1 et 5 étoiles.");
      return;
    }

    if (!comment.trim()) {
      setError("Le commentaire est requis.");
      return;
    }

    if (comment.length > 500) {
      setError("Le commentaire ne doit pas dépasser 500 caractères.");
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/opportunities/${opportunityId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(payload.error ?? "Impossible de soumettre votre avis.");
        return;
      }

      setSuccess("Merci, votre avis a été enregistré.");
      router.refresh();
    });
  }

  return (
    <section className="mt-6 rounded-xl border bg-card p-6" aria-labelledby="review-form-title">
      <h2 id="review-form-title" className="text-lg font-semibold">Laisser un avis</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Partagez une note et un commentaire après votre échange post-deal.
      </p>

      <div className="mt-4 flex gap-2" role="radiogroup" aria-label="Note">
        {[1, 2, 3, 4, 5].map((value) => {
          const isSelected = rating >= value;
          const starClassName = isSelected ? "text-amber-500" : "text-muted-foreground";
          return (
            <button
              key={value}
              type="button"
              aria-label={`${value} étoile${value > 1 ? "s" : ""}`}
              aria-checked={rating === value}
              role="radio"
              onClick={() => setRating(value)}
              className={`min-h-11 min-w-11 rounded-md border text-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${starClassName}`}
            >
              ★
            </button>
          );
        })}
      </div>

      <label htmlFor="review-comment" className="mt-4 block text-sm font-medium">
        Commentaire
      </label>
      <textarea
        id="review-comment"
        value={comment}
        maxLength={500}
        onChange={(event) => setComment(event.target.value)}
        className="mt-2 min-h-28 w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        placeholder="Décrivez votre expérience en quelques mots."
      />
      <p className="mt-1 text-xs text-muted-foreground">{remainingCharacters} caractères restants</p>

      {error ? <p className="mt-3 text-sm text-destructive" role="alert">{error}</p> : null}
      {success ? <p className="mt-3 text-sm text-accent" role="status">{success}</p> : null}

      <Button type="button" className="mt-4" disabled={!canSubmit} onClick={submitReview}>
        {isPending ? "Envoi en cours..." : "Soumettre mon avis"}
      </Button>
    </section>
  );
}
