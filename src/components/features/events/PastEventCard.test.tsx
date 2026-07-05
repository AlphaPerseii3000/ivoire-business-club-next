import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PastEventCard } from "./PastEventCard";

describe("PastEventCard component", () => {
  const mockEvent = {
    id: "evt-past-1",
    title: "Gala Annuel IBC 2025",
    slug: "gala-annuel-ibc-2025",
    startDate: new Date("2025-12-15T19:00:00Z"),
    eventType: "IN_PERSON",
    visibility: "PUBLIC",
    location: "Hotel Ivoire, Abidjan",
    coverImagePath: "/events/evt-past-1/cover.jpg",
    galleryPhotos: [
      { id: "p1", filePath: "/events/evt-past-1/gallery/p1.jpg", caption: "Cocktail" },
      { id: "p2", filePath: "/events/evt-past-1/gallery/p2.jpg", caption: "Discours" },
    ],
    _count: {
      galleryPhotos: 15,
      registrations: 80,
    },
  };

  it("renders event details, badges, and photo thumbnails", () => {
    render(<PastEventCard event={mockEvent} />);

    expect(screen.getByText("Gala Annuel IBC 2025")).toBeInTheDocument();
    expect(screen.getByText("En présentiel")).toBeInTheDocument();
    expect(screen.getByText("Public")).toBeInTheDocument();
    expect(screen.getByText("15 photos")).toBeInTheDocument();

    const link = screen.getByRole("link", { name: /consulter la galerie/i });
    expect(link).toHaveAttribute("href", "/dashboard/events/gala-annuel-ibc-2025/gallery");
  });
});
