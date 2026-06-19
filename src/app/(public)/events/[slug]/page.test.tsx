import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EventDetailPage, { generateMetadata } from "./page";
import { EventStatus } from "@/generated/prisma/client";

// Mock Auth
const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({ auth: mockAuth }));

// Mock Prisma
const mockFindFirst = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({
  prisma: {
    event: {
      findFirst: mockFindFirst,
    },
  },
}));

// Mock next/navigation notFound
const mockNotFound = vi.hoisted(() => vi.fn(() => {
  throw new Error("NOT_FOUND");
}));
vi.mock("next/navigation", () => ({
  notFound: mockNotFound,
}));

const mockEvent = {
  id: "evt-1",
  title: "Lancement Réseau IBC",
  slug: "lancement-reseau-ibc",
  description: "Une soirée de networking pour les membres et investisseurs du réseau IBC.",
  startDate: new Date("2026-07-15T10:00:00Z"),
  endDate: new Date("2026-07-15T14:00:00Z"),
  location: "Abidjan, Cocody",
  imageUrl: "https://example.com/event.jpg",
  status: EventStatus.PUBLISHED,
};

describe("Event Detail Page", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("calls notFound when event is not found or is a draft", async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(
      EventDetailPage({ params: Promise.resolve({ slug: "non-existent" }) })
    ).rejects.toThrow("NOT_FOUND");

    expect(mockNotFound).toHaveBeenCalled();
  });

  it("renders full event details", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue(mockEvent);

    const page = await EventDetailPage({
      params: Promise.resolve({ slug: "lancement-reseau-ibc" }),
    });
    render(page);

    expect(screen.getByText("Lancement Réseau IBC")).toBeInTheDocument();
    expect(screen.getByText("Une soirée de networking pour les membres et investisseurs du réseau IBC.")).toBeInTheDocument();
    expect(screen.getByText("15 juillet 2026")).toBeInTheDocument();
    expect(screen.getByText("Jusqu'au 15 juillet 2026")).toBeInTheDocument();
    expect(screen.getByText("Abidjan, Cocody")).toBeInTheDocument();
  });

  it("renders cancelled badge for cancelled events", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue({
      ...mockEvent,
      status: EventStatus.CANCELLED,
    });

    const page = await EventDetailPage({
      params: Promise.resolve({ slug: "lancement-reseau-ibc" }),
    });
    render(page);

    expect(screen.getByText("Annulé")).toBeInTheDocument();
  });

  it("renders back link to events list", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue(mockEvent);

    const page = await EventDetailPage({
      params: Promise.resolve({ slug: "lancement-reseau-ibc" }),
    });
    render(page);

    const backLink = screen.getByRole("link", { name: /Retour aux événements/i });
    expect(backLink).toHaveAttribute("href", "/events");
  });

  it("generates correct dynamic SEO metadata", async () => {
    mockFindFirst.mockResolvedValue(mockEvent);

    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "lancement-reseau-ibc" }),
    });

    expect(metadata.title).toEqual({
      absolute: "Lancement Réseau IBC — Ivoire Business Club",
    });
    expect(metadata.description).toBe("Une soirée de networking pour les membres et investisseurs du réseau IBC.".slice(0, 160));
  });
});
