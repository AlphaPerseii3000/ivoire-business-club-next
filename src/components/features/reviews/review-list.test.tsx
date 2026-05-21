import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PublicReviewSection, ReviewList, truncateReviewComment } from "./review-list";

const baseReview = {
  id: "review-1",
  rating: 5,
  comment: "Collaboration excellente et fluide.",
  createdAt: new Date("2026-05-20T00:00:00.000Z"),
  reviewer: { name: "Aminata", image: null },
};

describe("public review display components", () => {
  it("does not truncate comments below the limit", () => {
    expect(truncateReviewComment("Avis utile", 20)).toBe("Avis utile");
  });

  it("truncates comments above the limit without splitting multibyte characters", () => {
    expect(truncateReviewComment("👍👍👍👍", 3)).toBe("👍👍👍…");
  });

  it("renders avatar fallback, accessible rating, comment and machine-readable date", () => {
    render(<ReviewList reviews={[baseReview]} />);

    expect(screen.getByLabelText("Avatar de Aminata")).toBeInTheDocument();
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByLabelText("5 sur 5 étoiles")).toBeInTheDocument();
    expect(screen.getByText("Collaboration excellente et fluide.")).toBeInTheDocument();
    expect(screen.getByText("20/05/2026")).toHaveAttribute("datetime", "2026-05-20T00:00:00.000Z");
  });

  it("renders the required empty state when there are no reviews", () => {
    render(<PublicReviewSection reviews={[]} averageRating={null} totalReviewCount={0} allReviewsHref="/members/1/reviews" />);

    expect(screen.getByText("Avis et Réputation")).toBeInTheDocument();
    expect(screen.getByText("Pas encore d'avis. Soyez le premier à collaborer avec ce membre.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Voir tous les avis" })).not.toBeInTheDocument();
  });

  it("renders summary and full-list link only when there are more than five reviews", () => {
    render(<PublicReviewSection reviews={[baseReview]} averageRating={4.5} totalReviewCount={6} allReviewsHref="/members/1/reviews" />);

    expect(screen.getByText("4,5/5")).toBeInTheDocument();
    expect(screen.getByText("6 avis reçus")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir tous les avis" })).toHaveAttribute("href", "/members/1/reviews");
  });

  it("hides the full-list link when there are five reviews", () => {
    render(<PublicReviewSection reviews={[baseReview]} averageRating={5} totalReviewCount={5} allReviewsHref="/members/1/reviews" />);

    expect(screen.queryByRole("link", { name: "Voir tous les avis" })).not.toBeInTheDocument();
  });
});
