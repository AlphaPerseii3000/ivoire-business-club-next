import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ArticleDetailPage, { generateMetadata } from "./page";
import { ArticleVisibility } from "@/generated/prisma/client";

// Mock Auth
const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({ auth: mockAuth }));

// Mock Subscription
const mockHasActiveSubscription = vi.hoisted(() => vi.fn());
vi.mock("@/lib/subscription-access", () => ({
  hasActiveSubscription: mockHasActiveSubscription,
}));

// Mock Prisma
const mockFindFirst = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({
  prisma: {
    article: {
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

const mockArticle = {
  id: "art-1",
  title: "Guide Premium Abidjan",
  slug: "guide-premium-abidjan",
  excerpt: "Extrait de l'article premium",
  content: "## Contenu complet secret",
  category: "guide",
  visibility: ArticleVisibility.AFFRANCHI,
  published: true,
  publishedAt: new Date("2026-06-11T12:00:00Z"),
  createdAt: new Date("2026-06-11T12:00:00Z"),
  author: {
    name: "Alexandre",
  },
};

describe("Article Detail Page", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("calls notFound when article doesn't exist or is unpublished", async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(
      ArticleDetailPage({ params: Promise.resolve({ slug: "non-existent" }) })
    ).rejects.toThrow("NOT_FOUND");

    expect(mockNotFound).toHaveBeenCalled();
  });

  it("allows access to PUBLIC articles without auth", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue({
      ...mockArticle,
      visibility: ArticleVisibility.PUBLIC,
    });

    const page = await ArticleDetailPage({
      params: Promise.resolve({ slug: "guide-premium-abidjan" }),
    });
    render(page);

    expect(screen.getByText("Contenu complet secret")).toBeInTheDocument();
    expect(screen.queryByTestId("gate-panel")).not.toBeInTheDocument();
  });

  it("locks premium articles and renders Gate Panel (excerpt + CTA) for unsubscribed active users", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", tier: "AFFRANCHI" } });
    mockHasActiveSubscription.mockResolvedValue(false);
    mockFindFirst.mockResolvedValue(mockArticle);

    const page = await ArticleDetailPage({
      params: Promise.resolve({ slug: "guide-premium-abidjan" }),
    });
    render(page);

    expect(screen.getByText("Extrait de l'article premium")).toBeInTheDocument();
    expect(screen.queryByText("Contenu complet secret")).not.toBeInTheDocument();
    expect(screen.getByTestId("gate-panel")).toBeInTheDocument();
    expect(screen.getByText("Abonnez-vous pour lire l'article complet")).toBeInTheDocument();
  });

  it("allows full access to premium articles for subscribed users of appropriate tier", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", tier: "AFFRANCHI" } });
    mockHasActiveSubscription.mockResolvedValue(true);
    mockFindFirst.mockResolvedValue(mockArticle);

    const page = await ArticleDetailPage({
      params: Promise.resolve({ slug: "guide-premium-abidjan" }),
    });
    render(page);

    expect(screen.getByText("Contenu complet secret")).toBeInTheDocument();
    expect(screen.queryByTestId("gate-panel")).not.toBeInTheDocument();
  });

  it("generates correct dynamic SEO metadata", async () => {
    mockFindFirst.mockResolvedValue(mockArticle);

    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "guide-premium-abidjan" }),
    });

    expect(metadata.title).toBe("Guide Premium Abidjan — Ivoire Business Club");
    expect(metadata.description).toBe("Extrait de l'article premium");
  });
});
