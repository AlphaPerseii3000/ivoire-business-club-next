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

const mockEvents = [
  {
    id: "evt-1",
    title: "Lancement Réseau IBC",
    slug: "lancement-reseau-ibc",
    startDate: new Date("2026-07-15T10:00:00Z"),
    endDate: null,
    location: "Abidjan, Cocody",
    coverImagePath: "https://example.com/event1.jpg",
  },
  {
    id: "evt-2",
    title: "Afterwork Investisseurs",
    slug: "afterwork-investisseurs",
    startDate: new Date("2026-07-20T18:00:00Z"),
    endDate: null,
    location: "Abidjan, Plateau",
    coverImagePath: null,
  },
  {
    id: "evt-3",
    title: "Conférence Annuelle",
    slug: "conference-annuelle",
    startDate: new Date("2026-06-25T09:00:00Z"),
    endDate: null,
    location: "Grand-Bassam",
    coverImagePath: null,
  },
];

describe("Events Catalogue Page", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders published upcoming events as sorted cards", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindMany.mockResolvedValue(mockEvents);

    const page = await EventsPage();
    render(page);

    expect(screen.getByText("Événements, Conférences & Networking")).toBeInTheDocument();
    expect(screen.getByTestId("events-grid")).toBeInTheDocument();

    expect(screen.getByText("Lancement Réseau IBC")).toBeInTheDocument();
    expect(screen.getByText("Afterwork Investisseurs")).toBeInTheDocument();
    expect(screen.getByText("Conférence Annuelle")).toBeInTheDocument();

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "PUBLISHED",
          startDate: expect.objectContaining({
            gte: expect.any(Date),
          }),
        }),
        orderBy: { startDate: "asc" },
      })
    );
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
    mockFindMany.mockResolvedValue(mockEvents);

    const page = await EventsPage();
    render(page);

    const detailLinks = screen.getAllByRole("link").filter(
      (link) => link.getAttribute("href") === "/events/lancement-reseau-ibc"
    );
    expect(detailLinks.length).toBeGreaterThan(0);
  });

  it("formats dates in French", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindMany.mockResolvedValue([mockEvents[0]]);

    const page = await EventsPage();
    render(page);

    expect(screen.getByText("15 juillet 2026")).toBeInTheDocument();
  });
});
