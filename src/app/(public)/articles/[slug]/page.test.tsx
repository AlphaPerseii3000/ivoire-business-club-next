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

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
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
  updatedAt: new Date("2026-06-11T12:00:00Z"),
  author: {
    name: "Alexandre",
  },
  opportunity: null,
};

const mockOpportunity = {
  id: "opp-1",
  title: "Terrain Abidjan Cocody",
  amount: 50000,
  currency: "EUR",
  requiredTier: "AFFRANCHI",
  verificationStatus: "VERIFIED",
  requiresDoubleVerification: false,
  category: "IMMOBILIER",
  author: {
    name: "Ibrahim",
    id: "user-opp-author",
    phone: "+225070000000",
    location: "Abidjan",
    opportunities: [{ id: "opp-1" }, { id: "opp-2" }],
  },
  tags: [
    { category: "SECTEUR", value: "immobilier" },
    { category: "LOCALISATION", value: "abidjan" },
  ],
  _count: {
    documents: 3,
    verificationApprovals: 1,
  },
  documents: [{ publicUrl: "https://example.com/thumb.jpg" }],
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

    expect(metadata.title).toEqual({
      absolute: "Guide Premium Abidjan — Ivoire Business Club",
    });
    expect(metadata.description).toBe("Extrait de l'article premium");
  });

  // ===== NEW TESTS: Associated Opportunity (AC 8) =====

  it("displays DealCard when article has an associated opportunity and user has required tier", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", tier: "AFFRANCHI", role: "MEMBER" } });
    mockHasActiveSubscription.mockResolvedValue(true);
    mockFindFirst.mockResolvedValue({
      ...mockArticle,
      visibility: ArticleVisibility.PUBLIC,
      opportunity: mockOpportunity,
    });

    const page = await ArticleDetailPage({
      params: Promise.resolve({ slug: "guide-premium-abidjan" }),
    });
    render(page);

    expect(screen.getByTestId("associated-opportunity")).toBeInTheDocument();
    expect(screen.getByText("Opportunité associée")).toBeInTheDocument();
    expect(screen.getByText("Terrain Abidjan Cocody")).toBeInTheDocument();
  });

  it("hides DealCard when user is not logged in", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue({
      ...mockArticle,
      visibility: ArticleVisibility.PUBLIC,
      opportunity: mockOpportunity,
    });

    const page = await ArticleDetailPage({
      params: Promise.resolve({ slug: "guide-premium-abidjan" }),
    });
    render(page);

    expect(screen.queryByTestId("associated-opportunity")).not.toBeInTheDocument();
  });

  it("hides DealCard when user does not have active subscription", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", tier: "AFFRANCHI", role: "MEMBER" } });
    mockHasActiveSubscription.mockResolvedValue(false);
    mockFindFirst.mockResolvedValue({
      ...mockArticle,
      visibility: ArticleVisibility.PUBLIC,
      opportunity: mockOpportunity,
    });

    const page = await ArticleDetailPage({
      params: Promise.resolve({ slug: "guide-premium-abidjan" }),
    });
    render(page);

    expect(screen.queryByTestId("associated-opportunity")).not.toBeInTheDocument();
  });

  it("hides DealCard when user tier is insufficient for the opportunity", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", tier: "AFFRANCHI", role: "MEMBER" } });
    mockHasActiveSubscription.mockResolvedValue(true);
    mockFindFirst.mockResolvedValue({
      ...mockArticle,
      visibility: ArticleVisibility.PUBLIC,
      opportunity: { ...mockOpportunity, requiredTier: "BOSS" },
    });

    const page = await ArticleDetailPage({
      params: Promise.resolve({ slug: "guide-premium-abidjan" }),
    });
    render(page);

    expect(screen.queryByTestId("associated-opportunity")).not.toBeInTheDocument();
  });

  it("shows DealCard for ADMIN even without active subscription", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", tier: "AFFRANCHI", role: "ADMIN" } });
    mockHasActiveSubscription.mockResolvedValue(false);
    mockFindFirst.mockResolvedValue({
      ...mockArticle,
      visibility: ArticleVisibility.PUBLIC,
      opportunity: { ...mockOpportunity, requiredTier: "BOSS" },
    });

    const page = await ArticleDetailPage({
      params: Promise.resolve({ slug: "guide-premium-abidjan" }),
    });
    render(page);

    expect(screen.getByTestId("associated-opportunity")).toBeInTheDocument();
  });

  // ===== NEW TESTS: ShareButtons (AC 9) =====

  it("renders ShareButtons on accessible articles", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue({
      ...mockArticle,
      visibility: ArticleVisibility.PUBLIC,
    });

    const page = await ArticleDetailPage({
      params: Promise.resolve({ slug: "guide-premium-abidjan" }),
    });
    render(page);

    expect(screen.getByTestId("share-buttons")).toBeInTheDocument();
    expect(screen.getByLabelText("Partager sur WhatsApp")).toBeInTheDocument();
    expect(screen.getByLabelText("Partager sur LinkedIn")).toBeInTheDocument();
    expect(screen.getByLabelText("Partager sur X")).toBeInTheDocument();
    expect(screen.getByLabelText("Partager sur Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Copier le lien")).toBeInTheDocument();
  });

  it("renders the comment section for an active subscriber", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", tier: "AFFRANCHI", role: "MEMBER" } });
    mockHasActiveSubscription.mockResolvedValue(true);
    mockFindFirst.mockResolvedValue(mockArticle);

    const page = await ArticleDetailPage({
      params: Promise.resolve({ slug: "guide-premium-abidjan" }),
    });
    render(page);

    expect(screen.getByTestId("article-comments-section")).toBeInTheDocument();
    expect(screen.queryByTestId("comments-guest-cta")).not.toBeInTheDocument();
  });

  it("renders the guest CTA for an unsubscribed visitor", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue(mockArticle);

    const page = await ArticleDetailPage({
      params: Promise.resolve({ slug: "guide-premium-abidjan" }),
    });
    render(page);

    expect(screen.getByTestId("comments-guest-cta")).toBeInTheDocument();
    expect(screen.getByText("Devenez membre actif pour consulter et participer aux discussions.")).toBeInTheDocument();
    expect(screen.queryByTestId("article-comments-section")).not.toBeInTheDocument();
  });
});
