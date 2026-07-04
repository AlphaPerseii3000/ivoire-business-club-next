import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EventsPage from "./page";

// Mock Auth
const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({ auth: mockAuth }));

// Mock Prisma
const mockFindMany = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({
  prisma: {
    event: {
      findMany: mockFindMany,
    },
  },
}));

const publicEvent = {
  id: "evt-1",
  title: "Lancement Réseau IBC",
  slug: "lancement-reseau-ibc",
  startDate: new Date("2026-07-15T10:00:00Z"),
  endDate: null,
  location: "Abidjan, Cocody",
  onlineUrl: null,
  coverImagePath: "https://example.com/event1.jpg",
  eventType: "IN_PERSON",
  visibility: "PUBLIC",
  maxCapacity: 100,
  pricing: { visitor: 10000, affranchi: 5000, grand_frere: 3000, boss: 0 },
};

const privateEvent = {
  id: "evt-2",
  title: "Afterwork Investisseurs",
  slug: "afterwork-investisseurs",
  startDate: new Date("2026-07-20T18:00:00Z"),
  endDate: null,
  location: "Abidjan, Plateau",
  onlineUrl: null,
  coverImagePath: null,
  eventType: "IN_PERSON",
  visibility: "PRIVATE",
  maxCapacity: 50,
  pricing: { visitor: 15000, affranchi: 7000, grand_frere: 5000, boss: 0 },
};

const freeEvent = {
  id: "evt-3",
  title: "Conférence Annuelle",
  slug: "conference-annuelle",
  startDate: new Date("2026-06-25T09:00:00Z"),
  endDate: null,
  location: "Grand-Bassam",
  onlineUrl: null,
  coverImagePath: null,
  eventType: "IN_PERSON",
  visibility: "PUBLIC",
  maxCapacity: null,
  pricing: null,
};

describe("Events Catalogue Page", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders published upcoming events as sorted cards for visitor", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindMany.mockResolvedValue([publicEvent, freeEvent]);

    const page = await EventsPage();
    render(page);

    expect(screen.getByText("Événements, Conférences & Networking")).toBeInTheDocument();
    expect(screen.getByTestId("events-grid")).toBeInTheDocument();

    expect(screen.getByText("Lancement Réseau IBC")).toBeInTheDocument();
    expect(screen.getByText("Conférence Annuelle")).toBeInTheDocument();
    expect(screen.queryByText("Afterwork Investisseurs")).not.toBeInTheDocument();

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "PUBLISHED",
          visibility: "PUBLIC",
          startDate: expect.objectContaining({
            gte: expect.any(Date),
          }),
        }),
        orderBy: { startDate: "asc" },
      })
    );
  });

  it("shows private events to authenticated members", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", tier: "AFFRANCHI" },
    });
    mockFindMany.mockResolvedValue([publicEvent, privateEvent]);

    const page = await EventsPage();
    render(page);

    expect(screen.getByText("Lancement Réseau IBC")).toBeInTheDocument();
    expect(screen.getByText("Afterwork Investisseurs")).toBeInTheDocument();

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "PUBLISHED",
          visibility: { in: ["PUBLIC", "PRIVATE"] },
        }),
      })
    );
  });

  it("teases private event for visitor with blur and membership CTA", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindMany.mockResolvedValue([privateEvent]);

    const page = await EventsPage();
    render(page);

    expect(screen.getByText("Afterwork Investisseurs")).toBeInTheDocument();
    expect(screen.getByText("Devenir membre pour réserver")).toBeInTheDocument();

    const blurredLocation = screen.getByText("Abidjan, Plateau").closest("div");
    expect(blurredLocation).toHaveClass("blur-md");
  });

  it("displays empty state when no upcoming published events exist", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindMany.mockResolvedValue([]);

    const page = await EventsPage();
    render(page);

    expect(screen.getByText("Aucun événement à venir")).toBeInTheDocument();
    expect(screen.getByText("Revenez bientôt !")).toBeInTheDocument();
    expect(screen.queryByTestId("events-grid")).not.toBeInTheDocument();
  });

  it("links each card to the event detail page", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindMany.mockResolvedValue([publicEvent]);

    const page = await EventsPage();
    render(page);

    const detailLinks = screen.getAllByRole("link").filter(
      (link) => link.getAttribute("href") === "/events/lancement-reseau-ibc"
    );
    expect(detailLinks.length).toBeGreaterThan(0);
  });

  it("formats dates in French", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindMany.mockResolvedValue([publicEvent]);

    const page = await EventsPage();
    render(page);

    expect(screen.getByText("15 juillet 2026")).toBeInTheDocument();
  });

  it("shows 'Gratuit' for free public event", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindMany.mockResolvedValue([freeEvent]);

    const page = await EventsPage();
    render(page);

    expect(screen.getByText("Gratuit")).toBeInTheDocument();
  });
});
