import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import MemberReviewsPage from "./page";

const mockAuth = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockReviewFindMany = vi.hoisted(() => vi.fn());
const mockGetUserPremiumAccess = vi.hoisted(() => vi.fn());
const mockNotFound = vi.hoisted(() => vi.fn(() => { throw new Error("notFound"); }));
const mockRedirect = vi.hoisted(() => vi.fn((path: string) => { throw new Error(`redirect:${path}`); }));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/subscription-access", () => ({ getUserPremiumAccess: mockGetUserPremiumAccess }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    review: { findMany: mockReviewFindMany },
  },
}));
vi.mock("next/navigation", () => ({ redirect: mockRedirect, notFound: mockNotFound }));

const params = { params: Promise.resolve({ id: "member-1" }), searchParams: Promise.resolve({}) };

function verifiedMember(overrides = {}) {
  return {
    id: "member-1",
    name: "Awa",
    verificationStatus: "VERIFIED",
    _count: { reviewsReceived: 12 },
    ...overrides,
  };
}

function makeReview(index: number) {
  return {
    id: `review-${index}`,
    rating: 5,
    comment: `Avis public ${index}`,
    createdAt: new Date(`2026-05-${String(20 - index).padStart(2, "0")}T00:00:00.000Z`),
    reviewer: { name: `Reviewer ${index}`, image: null },
  };
}

describe("MemberReviewsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "viewer-1" } });
    mockGetUserPremiumAccess.mockResolvedValue({ hasAccess: true });
    mockUserFindUnique.mockResolvedValue(verifiedMember());
    mockReviewFindMany.mockImplementation((args) => {
      const hasCommentSelect = Boolean(args.select?.comment);
      return Promise.resolve(hasCommentSelect ? [makeReview(1), makeReview(2)] : Array.from({ length: 12 }, () => ({ rating: 5 })));
    });
  });

  it("redirects unauthenticated users", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(MemberReviewsPage(params)).rejects.toThrow("redirect:/auth/signin");
    expect(mockRedirect).toHaveBeenCalledWith("/auth/signin");
  });

  it("blocks inactive premium users before member or review queries", async () => {
    mockGetUserPremiumAccess.mockResolvedValue({ hasAccess: false });

    render(await MemberReviewsPage(params));

    expect(screen.getByText("Accès réservé aux membres actifs")).toBeInTheDocument();
    expect(mockUserFindUnique).not.toHaveBeenCalled();
    expect(mockReviewFindMany).not.toHaveBeenCalled();
  });

  it("calls notFound for non-verified members", async () => {
    mockUserFindUnique.mockResolvedValue(verifiedMember({ verificationStatus: "PENDING" }));

    await expect(MemberReviewsPage(params)).rejects.toThrow("notFound");
    expect(mockNotFound).toHaveBeenCalled();
    expect(mockReviewFindMany).not.toHaveBeenCalled();
  });

  it("renders paginated reviews newest-first with public reviewer fields only", async () => {
    render(await MemberReviewsPage(params));

    expect(screen.getByText("Tous les avis de Awa")).toBeInTheDocument();
    expect(screen.getByText("5,0/5 · 12 avis reçus")).toBeInTheDocument();
    expect(screen.getByText("Avis public 1")).toBeInTheDocument();
    expect(screen.getByText("Avis public 2")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retour au profil" })).toHaveAttribute("href", "/members/member-1");
    expect(screen.getByRole("link", { name: "Page suivante" })).toHaveAttribute("href", "/members/member-1/reviews?page=2");
    expect(mockReviewFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { revieweeId: "member-1" },
      orderBy: { createdAt: "desc" },
      skip: 0,
      take: 10,
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        reviewer: { select: { name: true, image: true } },
      },
    }));
  });

  it("uses safe page bounds and previous-page navigation", async () => {
    render(await MemberReviewsPage({ params: Promise.resolve({ id: "member-1" }), searchParams: Promise.resolve({ page: "2" }) }));

    expect(screen.getByText("Page 2 / 2")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Page précédente" })).toHaveAttribute("href", "/members/member-1/reviews?page=1");
    expect(screen.queryByRole("link", { name: "Page suivante" })).not.toBeInTheDocument();
    expect(mockReviewFindMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 10, take: 10 }));
  });

  it("normalizes invalid page query to page one", async () => {
    render(await MemberReviewsPage({ params: Promise.resolve({ id: "member-1" }), searchParams: Promise.resolve({ page: "0" }) }));

    expect(screen.getByText("Page 1 / 2")).toBeInTheDocument();
    expect(mockReviewFindMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 10 }));
  });
});
