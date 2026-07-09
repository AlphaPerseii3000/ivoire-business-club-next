import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ArticleDetailPage, { generateMetadata } from "./page";
import { ArticleVisibility } from "@/generated/prisma/client";
import { parseFaqFromMarkdown } from "@/lib/article-faq";

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

  // ===== JSON-LD GEO (Story 27.2) =====

  it("renders enriched Article + BreadcrumbList JSON-LD", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue({
      ...mockArticle,
      visibility: ArticleVisibility.PUBLIC,
      imageUrl: "https://example.com/cover.jpg",
    });

    const page = await ArticleDetailPage({
      params: Promise.resolve({ slug: "guide-premium-abidjan" }),
    });
    const { container } = render(page);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).toBeInTheDocument();

    const data = JSON.parse(script?.textContent ?? "[]");
    const articleLd = data.find((item: { '@type': string }) => item["@type"] === "Article");
    const breadcrumbLd = data.find((item: { '@type': string }) => item["@type"] === "BreadcrumbList");

    expect(articleLd).toBeDefined();
    expect(articleLd.headline).toBe("Guide Premium Abidjan");
    expect(articleLd.description).toBe("Extrait de l'article premium");
    expect(articleLd.image).toBe("https://example.com/cover.jpg");
    expect(articleLd.mainEntityOfPage).toEqual({
      "@type": "WebPage",
      "@id": "https://www.ivoire-business-club.com/articles/guide-premium-abidjan",
    });
    expect(articleLd.wordCount).toBeGreaterThanOrEqual(3);
    expect(articleLd.articleSection).toBe("guide");
    expect(articleLd.articleBody).toBe("## Contenu complet secret");
    expect(articleLd.author).toEqual({ "@type": "Person", name: "Alexandre" });

    expect(breadcrumbLd).toBeDefined();
    expect(breadcrumbLd.itemListElement).toHaveLength(3);
    expect(breadcrumbLd.itemListElement[0]).toMatchObject({
      "@type": "ListItem",
      position: 1,
      name: "Accueil",
      item: "https://www.ivoire-business-club.com",
    });
    expect(breadcrumbLd.itemListElement[2]).toMatchObject({
      "@type": "ListItem",
      position: 3,
      name: "Guide Premium Abidjan",
      item: "https://www.ivoire-business-club.com/articles/guide-premium-abidjan",
    });
  });

  it("falls back to logo image when no imageUrl is provided", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue({
      ...mockArticle,
      visibility: ArticleVisibility.PUBLIC,
    });

    const page = await ArticleDetailPage({
      params: Promise.resolve({ slug: "guide-premium-abidjan" }),
    });
    const { container } = render(page);
    const script = container.querySelector('script[type="application/ld+json"]');
    const data = JSON.parse(script?.textContent ?? "[]");
    const articleLd = data.find((item: { '@type': string }) => item["@type"] === "Article");

    expect(articleLd.image).toBe("https://www.ivoire-business-club.com/logo-ibc.webp");
  });

  it("uses excerpt for articleBody and wordCount on gated articles", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", tier: "AFFRANCHI" } });
    mockHasActiveSubscription.mockResolvedValue(false);
    mockFindFirst.mockResolvedValue(mockArticle);

    const page = await ArticleDetailPage({
      params: Promise.resolve({ slug: "guide-premium-abidjan" }),
    });
    const { container } = render(page);
    const script = container.querySelector('script[type="application/ld+json"]');
    const data = JSON.parse(script?.textContent ?? "[]");
    const articleLd = data.find((item: { '@type': string }) => item["@type"] === "Article");

    expect(articleLd.articleBody).toBe("Extrait de l'article premium");
    expect(articleLd.wordCount).toBe(mockArticle.excerpt.trim().split(/\s+/).filter(Boolean).length);
  });

  it("injects FAQPage JSON-LD when FAQ section is present", async () => {
    const contentWithFaq = `## Contenu

## FAQ
**Q:** Qui peut consulter cet article ?
**A:** Les membres Premium et Affranchi de l'Ivoire Business Club.

**Q:** Comment s'abonner ?
**A:** Par virement bancaire via la page Tarifs.
`;
    mockAuth.mockResolvedValue({ user: { id: "user-1", tier: "AFFRANCHI", role: "MEMBER" } });
    mockHasActiveSubscription.mockResolvedValue(true);
    mockFindFirst.mockResolvedValue({
      ...mockArticle,
      visibility: ArticleVisibility.PUBLIC,
      content: contentWithFaq,
    });

    const page = await ArticleDetailPage({
      params: Promise.resolve({ slug: "guide-premium-abidjan" }),
    });
    const { container } = render(page);
    const script = container.querySelector('script[type="application/ld+json"]');
    const data = JSON.parse(script?.textContent ?? "[]");
    const faqLd = data.find((item: { '@type': string }) => item["@type"] === "FAQPage");

    expect(faqLd).toBeDefined();
    expect(faqLd.mainEntity).toHaveLength(2);
    expect(faqLd.mainEntity[0]).toMatchObject({
      "@type": "Question",
      name: "Qui peut consulter cet article ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Les membres Premium et Affranchi de l'Ivoire Business Club.",
      },
    });
  });

  it("does not inject FAQPage when no FAQ heading exists", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", tier: "AFFRANCHI", role: "MEMBER" } });
    mockHasActiveSubscription.mockResolvedValue(true);
    mockFindFirst.mockResolvedValue({
      ...mockArticle,
      visibility: ArticleVisibility.PUBLIC,
      content: "## Introduction\nPas de FAQ ici.\n\n## Conclusion\nFin.",
    });

    const page = await ArticleDetailPage({
      params: Promise.resolve({ slug: "guide-premium-abidjan" }),
    });
    const { container } = render(page);
    const script = container.querySelector('script[type="application/ld+json"]');
    const data = JSON.parse(script?.textContent ?? "[]");
    const faqLd = data.find((item: { '@type': string }) => item["@type"] === "FAQPage");

    expect(faqLd).toBeUndefined();
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
