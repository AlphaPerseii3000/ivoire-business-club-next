import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ActualitesPage, { metadata } from "./page";

// Mock Prisma
const mockArticleFindMany = vi.hoisted(() => vi.fn());
const mockEventFindMany = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({
  prisma: {
    article: {
      findMany: mockArticleFindMany,
    },
    event: {
      findMany: mockEventFindMany,
    },
  },
}));

const mockArticles = [
  {
    id: "art-1",
    title: "Guide Investir Abidjan",
    slug: "guide-investir-abidjan",
    excerpt: "Un guide pratique pour investir en Côte d'Ivoire.",
    imageUrl: "/article1.webp",
    publishedAt: new Date("2026-06-20T12:00:00Z"),
    category: "guide",
  },
  {
    id: "art-2",
    title: "Actualité économique",
    slug: "actualite-economique",
    excerpt: "Les dernières nouvelles économiques.",
    imageUrl: null,
    publishedAt: new Date("2026-06-19T12:00:00Z"),
    category: "actu",
  },
];

const mockEvents = [
  {
    id: "evt-1",
    slug: "afterwork-investisseurs",
    title: "Afterwork Investisseurs",
    startDate: new Date("2026-07-15T18:00:00Z"),
    endDate: null,
    location: "Abidjan, Plateau",
    imageUrl: null,
  },
];

describe("Actualités Page", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("has correct SEO metadata", () => {
    expect(metadata.title).toBe("Actualités, Articles & Événements | Ivoire Business Club");
    expect(metadata.description).toContain("Ivoire Business Club");
    expect(metadata.description?.length).toBeGreaterThanOrEqual(140);
    expect(metadata.description?.length).toBeLessThanOrEqual(160);
  });

  it("renders h1 and aggregates articles and events", async () => {
    mockArticleFindMany.mockResolvedValue(mockArticles);
    mockEventFindMany.mockResolvedValue(mockEvents);

    const page = await ActualitesPage();
    render(page);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Actualités");
    expect(screen.getByRole("heading", { name: "Derniers articles" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Prochains événements" })).toBeInTheDocument();
    expect(screen.getByTestId("actualites-articles-grid")).toBeInTheDocument();
    expect(screen.getByTestId("actualites-events-grid")).toBeInTheDocument();
    expect(screen.getByText("Guide Investir Abidjan")).toBeInTheDocument();
    expect(screen.getByText("Afterwork Investisseurs")).toBeInTheDocument();
  });

  it("fetches at most 6 public articles", async () => {
    mockArticleFindMany.mockResolvedValue(mockArticles);
    mockEventFindMany.mockResolvedValue([]);

    await ActualitesPage();

    expect(mockArticleFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          published: true,
          visibility: "PUBLIC",
        }),
        orderBy: { publishedAt: "desc" },
        take: 6,
      })
    );
  });

  it("fetches at most 3 upcoming published events", async () => {
    mockArticleFindMany.mockResolvedValue([]);
    mockEventFindMany.mockResolvedValue(mockEvents);

    await ActualitesPage();

    expect(mockEventFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "PUBLISHED",
          startDate: expect.objectContaining({ gte: expect.any(Date) }),
        }),
        orderBy: { startDate: "asc" },
        take: 3,
      })
    );
  });

  it("renders empty states when no content", async () => {
    mockArticleFindMany.mockResolvedValue([]);
    mockEventFindMany.mockResolvedValue([]);

    const page = await ActualitesPage();
    render(page);

    expect(screen.getByText("Aucun article disponible")).toBeInTheDocument();
    expect(screen.getByText("Aucun événement à venir")).toBeInTheDocument();
  });
});
