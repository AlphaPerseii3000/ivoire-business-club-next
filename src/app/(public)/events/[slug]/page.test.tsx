import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EventDetailPage, { generateMetadata } from "./page";

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

const baseEvent = {
  id: "evt-1",
  title: "Lancement Réseau IBC",
  slug: "lancement-reseau-ibc",
  description: "Une soirée de networking pour les membres et investisseurs du réseau IBC.",
  startDate: new Date("2026-07-15T10:00:00Z"),
  endDate: new Date("2026-07-15T14:00:00Z"),
  location: "Abidjan, Cocody",
  onlineUrl: null,
  coverImagePath: "https://example.com/event.jpg",
  eventType: "IN_PERSON",
  visibility: "PUBLIC",
  maxCapacity: 100,
  pricing: { visitor: 10000, affranchi: 5000, grand_frere: 3000, boss: 0 },
  status: "PUBLISHED",
  registrations: [],
};

describe("Event Detail Page", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("calls notFound when event is not found", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue(null);

    await expect(
      EventDetailPage({ params: Promise.resolve({ slug: "non-existent" }) })
    ).rejects.toThrow("NOT_FOUND");

    expect(mockNotFound).toHaveBeenCalled();
  });

  it("does not publicly render a draft event", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue(null);

    await expect(
      EventDetailPage({ params: Promise.resolve({ slug: "lancement-reseau-ibc" }) })
    ).rejects.toThrow("NOT_FOUND");

    expect(mockNotFound).toHaveBeenCalled();
  });

  it("renders full event details for public event", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue(baseEvent);

    const page = await EventDetailPage({
      params: Promise.resolve({ slug: "lancement-reseau-ibc" }),
    });
    render(page);

    expect(screen.getByText("Lancement Réseau IBC")).toBeInTheDocument();
    expect(screen.getByText("Une soirée de networking pour les membres et investisseurs du réseau IBC.")).toBeInTheDocument();
    expect(screen.getByText("15 juillet 2026")).toBeInTheDocument();
    expect(screen.getByText("Jusqu\u2019au 15 juillet 2026")).toBeInTheDocument();
    expect(screen.getByText("Abidjan, Cocody")).toBeInTheDocument();
    expect(screen.getByText("100 places restantes")).toBeInTheDocument();
    expect(screen.getByText("S\u2019inscrire")).toBeInTheDocument();

    const image = screen.getByRole("img", { name: "Lancement Réseau IBC" });
    expect(image).toBeInTheDocument();
  });

  it("renders cancelled badge for cancelled events", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue({
      ...baseEvent,
      status: "CANCELLED",
    });

    const page = await EventDetailPage({
      params: Promise.resolve({ slug: "lancement-reseau-ibc" }),
    });
    render(page);

    expect(screen.getByText("Annulé")).toBeInTheDocument();
  });

  it("renders back link to events list", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue(baseEvent);

    const page = await EventDetailPage({
      params: Promise.resolve({ slug: "lancement-reseau-ibc" }),
    });
    render(page);

    const backLink = screen.getByRole("link", { name: /Retour aux événements/i });
    expect(backLink).toHaveAttribute("href", "/events");
  });

  it("generates correct dynamic SEO metadata", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue(baseEvent);

    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "lancement-reseau-ibc" }),
    });

    expect(metadata.title).toEqual({
      absolute: "Lancement Réseau IBC — Ivoire Business Club",
    });
    expect(metadata.description).toBe(baseEvent.description.slice(0, 160));
  });

  it("returns empty metadata when event is not found", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue(null);

    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "non-existent" }),
    });

    expect(metadata).toEqual({});
  });

  it("renders teaser for private event and visitor", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue({
      ...baseEvent,
      visibility: "PRIVATE",
    });

    const page = await EventDetailPage({
      params: Promise.resolve({ slug: "lancement-reseau-ibc" }),
    });
    render(page);

    expect(screen.getByText("Lancement Réseau IBC")).toBeInTheDocument();
    expect(screen.getByText(/Privé/i)).toBeInTheDocument();
    expect(screen.getByText("Devenir membre pour débloquer")).toBeInTheDocument();

    const blurredDescription = screen.getByText(baseEvent.description);
    expect(blurredDescription).toHaveClass("blur-md");
    expect(screen.queryByText("Abidjan, Cocody")).not.toBeInTheDocument();
    expect(screen.queryByText("100 places restantes")).not.toBeInTheDocument();
    expect(screen.queryByText("S\u2019inscrire")).not.toBeInTheDocument();
  });

  it("renders full content for private event and authenticated member", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", tier: "AFFRANCHI" },
    });
    mockFindFirst.mockResolvedValue({
      ...baseEvent,
      visibility: "PRIVATE",
    });

    const page = await EventDetailPage({
      params: Promise.resolve({ slug: "lancement-reseau-ibc" }),
    });
    render(page);

    expect(screen.getByText("Une soirée de networking pour les membres et investisseurs du réseau IBC.")).toBeInTheDocument();
    expect(screen.getByText("Abidjan, Cocody")).toBeInTheDocument();
    expect(screen.getByText("S\u2019inscrire")).toBeInTheDocument();
  });

  it("displays remaining spots counter", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue({
      ...baseEvent,
      registrations: [
        { status: "REGISTERED" },
        { status: "REGISTERED" },
        { status: "CANCELLED" },
      ],
    });

    const page = await EventDetailPage({
      params: Promise.resolve({ slug: "lancement-reseau-ibc" }),
    });
    render(page);

    expect(screen.getByText("98 places restantes")).toBeInTheDocument();
  });

  it("displays 'Places illimitées' when maxCapacity is null", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue({
      ...baseEvent,
      maxCapacity: null,
    });

    const page = await EventDetailPage({
      params: Promise.resolve({ slug: "lancement-reseau-ibc" }),
    });
    render(page);

    expect(screen.getByText("Places illimitées")).toBeInTheDocument();
  });

  it("renders pricing grid", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue(baseEvent);

    const page = await EventDetailPage({
      params: Promise.resolve({ slug: "lancement-reseau-ibc" }),
    });
    render(page);

    expect(screen.getByText("10 000 FCFA")).toBeInTheDocument();
    expect(screen.getByText("À partir de 3 000 FCFA")).toBeInTheDocument();
  });

  it("renders 'Gratuit' when pricing is null", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue({
      ...baseEvent,
      pricing: null,
    });

    const page = await EventDetailPage({
      params: Promise.resolve({ slug: "lancement-reseau-ibc" }),
    });
    render(page);

    const gratuitLabels = screen.getAllByText("Gratuit");
    expect(gratuitLabels.length).toBeGreaterThanOrEqual(2);
  });

  it("highlights authenticated member tier price", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", tier: "GRAND_FRERE" },
    });
    mockFindFirst.mockResolvedValue(baseEvent);

    const page = await EventDetailPage({
      params: Promise.resolve({ slug: "lancement-reseau-ibc" }),
    });
    render(page);

    expect(screen.getByText(/Votre tarif/i)).toBeInTheDocument();
    expect(screen.getByText("3 000 FCFA")).toBeInTheDocument();
  });

  it("uses generic metadata description for private event when visitor", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue({
      ...baseEvent,
      visibility: "PRIVATE",
    });

    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "lancement-reseau-ibc" }),
    });

    expect(metadata.description).toBe(
      "Événement réservé aux membres IBC. Devenez membre pour découvrir tous les détails."
    );
  });
});
