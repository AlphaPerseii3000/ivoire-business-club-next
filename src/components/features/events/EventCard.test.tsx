import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EventCard } from "./EventCard";

vi.mock("@/lib/event-utils", () => ({
  formatEventDate: (date: Date) => date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
  formatEventPricing: (pricing: any) => {
    if (!pricing) return { visitor: null, memberMin: null, isFree: true };
    const values = [pricing.affranchi, pricing.grand_frere, pricing.boss].filter((v: any) => typeof v === "number" && v > 0);
    const memberMin = values.length > 0 ? Math.min(...values) : null;
    const isFree = !pricing || [pricing.visitor, pricing.affranchi, pricing.grand_frere, pricing.boss].every((v: any) => v === null || v === undefined || v === 0);
    return { visitor: pricing.visitor ?? null, memberMin, isFree };
  },
  formatPrice: (price: number | null) => (price && price > 0 ? `${price.toLocaleString("fr-FR")} FCFA` : "Gratuit"),
  getEventTypeLabel: (eventType?: string | null) => (eventType === "ONLINE" ? "En ligne" : "En présentiel"),
  isPrivateEventForVisitor: (visibility?: string | null, isAuthenticated?: boolean) => visibility === "PRIVATE" && !isAuthenticated,
  normalizePricing: (pricing: unknown) => {
    if (!pricing || typeof pricing !== "object" || Array.isArray(pricing)) return null;
    const p = pricing as Record<string, unknown>;
    const out: any = {};
    for (const key of ["visitor", "affranchi", "grand_frere", "boss"]) {
      out[key] = typeof p[key] === "number" && (p[key] as number) > 0 ? p[key] : null;
    }
    return out;
  },
}));

const baseEvent = {
  id: "evt-1",
  slug: "conference-ibc",
  title: "Conférence IBC",
  startDate: new Date("2026-07-15T10:00:00Z"),
  endDate: null,
  location: "Abidjan, Cocody",
  onlineUrl: null,
  coverImagePath: "https://example.com/cover.jpg",
  eventType: "IN_PERSON",
  visibility: "PUBLIC",
  maxCapacity: 100,
  pricing: { visitor: 10000, affranchi: 5000, grand_frere: 3000, boss: 0 },
};

describe("EventCard", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders public event with type badge, date, location and CTA", () => {
    render(<EventCard event={baseEvent} isAuthenticated={false} />);

    expect(screen.getByText("Conférence IBC")).toBeInTheDocument();
    expect(screen.getByText("En présentiel")).toBeInTheDocument();
    expect(screen.getByText("15 juillet 2026")).toBeInTheDocument();
    expect(screen.getByText("Abidjan, Cocody")).toBeInTheDocument();
    expect(screen.getByText("À partir de 3 000 FCFA")).toBeInTheDocument();
    expect(screen.getByText("S'inscrire")).toBeInTheDocument();
  });

  it("renders online event label", () => {
    render(
      <EventCard event={{ ...baseEvent, eventType: "ONLINE", location: null }} />
    );
    expect(screen.getAllByText("En ligne").length).toBeGreaterThanOrEqual(1);
  });

  it("displays 'Gratuit' when pricing is null", () => {
    render(<EventCard event={{ ...baseEvent, pricing: null }} />);
    expect(screen.getByText("Gratuit")).toBeInTheDocument();
  });

  it("blurs private event for visitors and shows membership CTA", () => {
    render(<EventCard event={{ ...baseEvent, visibility: "PRIVATE" }} isAuthenticated={false} />);

    expect(screen.getByText("Conférence IBC")).toBeInTheDocument();
    expect(screen.getAllByText(/Privé/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Devenir membre pour réserver")).toBeInTheDocument();

    const blurredLocation = screen.getByText("Abidjan, Cocody").closest("div");
    expect(blurredLocation).toHaveClass("blur-md");

    const coverImage = screen.getByRole("img", { name: "Conférence IBC" });
    expect(coverImage).toHaveClass("blur-md");
  });

  it("does not blur private event for authenticated members", () => {
    render(<EventCard event={{ ...baseEvent, visibility: "PRIVATE" }} isAuthenticated={true} userTier="AFFRANCHI" />);

    expect(screen.getByText("S'inscrire")).toBeInTheDocument();

    const coverImage = screen.getByRole("img", { name: "Conférence IBC" });
    expect(coverImage).not.toHaveClass("blur-md");
  });

  it("renders strikethrough price for private visitor card", () => {
    render(<EventCard event={{ ...baseEvent, visibility: "PRIVATE" }} isAuthenticated={false} />);

    const priceElement = screen.getByText(/3[\s\u202f]000\sFCFA/);
    expect(priceElement).toHaveClass("line-through");
  });
});
