import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ArticlesPage from "./page";
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
const mockFindMany = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({
  prisma: {
    article: {
      findMany: mockFindMany,
    },
  },
}));

const mockArticles = [
  {
    id: "art-1",
    title: "Article Public",
    slug: "article-public",
    excerpt: "Excerpt 1",
    content: "Content 1",
    category: "conseil",
    visibility: ArticleVisibility.PUBLIC,
    published: true,
    publishedAt: new Date("2026-06-10T12:00:00Z"),
    createdAt: new Date("2026-06-10T12:00:00Z"),
  },
  {
    id: "art-2",
    title: "Article Affranchi",
    slug: "article-affranchi",
    excerpt: "Excerpt 2",
    content: "Content 2",
    category: "guide",
    visibility: ArticleVisibility.AFFRANCHI,
    published: true,
    publishedAt: new Date("2026-06-11T12:00:00Z"),
    createdAt: new Date("2026-06-11T12:00:00Z"),
  },
  {
    id: "art-3",
    title: "Article Boss",
    slug: "article-boss",
    excerpt: "Excerpt 3",
    content: "Content 3",
    category: "actu",
    visibility: ArticleVisibility.BOSS,
    published: true,
    publishedAt: new Date("2026-06-12T12:00:00Z"),
    createdAt: new Date("2026-06-12T12:00:00Z"),
  },
];

describe("Articles Catalogue Page", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders only public articles for anonymous visitors", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindMany.mockResolvedValue([mockArticles[0]]);

    const page = await ArticlesPage({ searchParams: Promise.resolve({}) });
    render(page);

    expect(screen.getByText("Article Public")).toBeInTheDocument();
    expect(screen.queryByText("Article Affranchi")).not.toBeInTheDocument();

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          visibility: ArticleVisibility.PUBLIC,
        }),
      })
    );
  });

  it("renders all articles for logged in members, but locks premium ones if inactive/unsubscribed", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", tier: "AFFRANCHI" } });
    mockHasActiveSubscription.mockResolvedValue(false);
    mockFindMany.mockResolvedValue(mockArticles);

    const page = await ArticlesPage({ searchParams: Promise.resolve({}) });
    render(page);

    expect(screen.getByText("Article Public")).toBeInTheDocument();
    expect(screen.getByText("Article Affranchi")).toBeInTheDocument();
    expect(screen.getByText("Article Boss")).toBeInTheDocument();

    const subscribeLinks = screen.getAllByRole("link", { name: /Abonnez-vous/i });
    expect(subscribeLinks.length).toBe(2);
  });

  it("unlocks articles within the active user's tier for subscribed members", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", tier: "AFFRANCHI" } });
    mockHasActiveSubscription.mockResolvedValue(true);
    mockFindMany.mockResolvedValue(mockArticles);

    const page = await ArticlesPage({ searchParams: Promise.resolve({}) });
    render(page);

    expect(screen.getByText("Article Public")).toBeInTheDocument();
    expect(screen.getByText("Article Affranchi")).toBeInTheDocument();
    expect(screen.getByText("Article Boss")).toBeInTheDocument();

    const readLinks = screen.getAllByRole("link", { name: /Lire l'article/i });
    expect(readLinks.length).toBe(2);

    const subscribeLinks = screen.getAllByRole("link", { name: /Abonnez-vous/i });
    expect(subscribeLinks.length).toBe(1);
  });

  it("filters articles by category via searchParams", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindMany.mockResolvedValue([mockArticles[0]]);

    const page = await ArticlesPage({ searchParams: Promise.resolve({ category: "conseil" }) });
    render(page);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          category: {
            in: ["conseil", "Conseil", "CONSEIL"],
          },
        }),
      })
    );
  });
});
