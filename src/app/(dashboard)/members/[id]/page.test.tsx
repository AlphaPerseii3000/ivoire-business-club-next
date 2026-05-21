import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import MemberProfilePage from "./page";

const mockAuth = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockUserUpdateMany = vi.hoisted(() => vi.fn());
const mockReviewFindMany = vi.hoisted(() => vi.fn());
const mockGetUserPremiumAccess = vi.hoisted(() => vi.fn());
const mockNotFound = vi.hoisted(() => vi.fn(() => { throw new Error("notFound"); }));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/subscription-access", () => ({ getUserPremiumAccess: mockGetUserPremiumAccess }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique, updateMany: mockUserUpdateMany },
    review: { findMany: mockReviewFindMany },
  },
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => { throw new Error(`redirect:${path}`); }),
  notFound: mockNotFound,
}));

const params = { params: Promise.resolve({ id: "member-1" }) };

function makeReview(index: number, overrides = {}) {
  return {
    id: `review-${index}`,
    rating: 5,
    comment: `Commentaire public ${index}`,
    createdAt: new Date(`2026-05-${String(20 - index).padStart(2, "0")}T00:00:00.000Z`),
    reviewer: { name: `Reviewer ${index}`, image: null },
    ...overrides,
  };
}

function verifiedMember(overrides = {}) {
  return {
    id: "member-1",
    name: "Awa",
    bio: "Investisseuse",
    image: null,
    phone: "+225****0000",
    location: "Abidjan",
    country: "CI",
    tier: "AFFRANCHI",
    verificationStatus: "VERIFIED",
    platinumAwardedAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    opportunities: [],
    tags: [],
    _count: { reviewsReceived: 0 },
    reviewsReceived: [],
    ...overrides,
  };
}

describe("MemberProfilePage reputation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "viewer-1" } });
    mockGetUserPremiumAccess.mockResolvedValue({ hasAccess: true });
    mockUserFindUnique.mockResolvedValue(verifiedMember());
    mockReviewFindMany.mockResolvedValue([]);
    mockUserUpdateMany.mockResolvedValue({ count: 1 });
  });

  it("blocks member profile reputation for users without premium access", async () => {
    mockGetUserPremiumAccess.mockResolvedValue({ hasAccess: false });

    render(await MemberProfilePage(params));

    expect(screen.getByText("Accès réservé aux membres actifs")).toBeInTheDocument();
    expect(screen.queryByText("Score de fiabilité IBC")).not.toBeInTheDocument();
    expect(mockUserFindUnique).not.toHaveBeenCalled();
    expect(mockReviewFindMany).not.toHaveBeenCalled();
    expect(mockUserUpdateMany).not.toHaveBeenCalled();
  });

  it("renders the required no-review EmptyState and does not show legacy review copy or fake stars", async () => {
    render(await MemberProfilePage(params));

    expect(screen.getByText("Avis et Réputation")).toBeInTheDocument();
    expect(screen.getByText("Pas encore d'avis. Soyez le premier à collaborer avec ce membre.")).toBeInTheDocument();
    expect(screen.queryByText("Avis reçus")).not.toBeInTheDocument();
    expect(screen.getByText("Score de fiabilité IBC")).toBeInTheDocument();
    expect(screen.getByText("Pas encore d'avis reçus")).toBeInTheDocument();
    expect(screen.queryByText(/\/5/)).not.toBeInTheDocument();
  });

  it("renders received review summary from received reviews and newest five previews only", async () => {
    const previewReviews = [
      makeReview(1, { rating: 5, comment: "Partenaire très sérieux.", reviewer: { name: "Koffi", image: "https://example.com/koffi.png" } }),
      makeReview(2, { rating: 4, comment: "Bonne collaboration." }),
      makeReview(3),
      makeReview(4),
      makeReview(5),
    ];
    mockUserFindUnique.mockResolvedValue(verifiedMember({
      _count: { reviewsReceived: 6 },
      reviewsReceived: previewReviews,
    }));
    mockReviewFindMany.mockResolvedValue([{ rating: 5 }, { rating: 4 }, { rating: 5 }, { rating: 4 }, { rating: 5 }, { rating: 4 }]);

    render(await MemberProfilePage(params));

    expect(screen.getByText("Avis et Réputation")).toBeInTheDocument();
    expect(screen.getAllByLabelText("4,5 sur 5 étoiles").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("4,5/5").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("6 avis reçus").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Partenaire très sérieux.")).toBeInTheDocument();
    expect(screen.getByText("Koffi")).toBeInTheDocument();
    expect(screen.getByLabelText("Avatar de Koffi")).toBeInTheDocument();
    expect(screen.getByText("19/05/2026")).toBeInTheDocument();
    expect(screen.queryByText("Commentaire public 6")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir tous les avis" })).toHaveAttribute("href", "/members/member-1/reviews");
    expect(mockUserFindUnique).toHaveBeenCalledWith(expect.objectContaining({
      select: expect.objectContaining({
        reviewsReceived: expect.objectContaining({ take: 5 }),
      }),
    }));
  });

  it("hides Voir tous les avis when the member has five or fewer reviews", async () => {
    mockUserFindUnique.mockResolvedValue(verifiedMember({
      _count: { reviewsReceived: 5 },
      reviewsReceived: [makeReview(1), makeReview(2), makeReview(3), makeReview(4), makeReview(5)],
    }));
    mockReviewFindMany.mockResolvedValue([{ rating: 5 }, { rating: 5 }, { rating: 5 }, { rating: 5 }, { rating: 5 }]);

    render(await MemberProfilePage(params));

    expect(screen.queryByRole("link", { name: "Voir tous les avis" })).not.toBeInTheDocument();
  });

  it("truncates long preview comments", async () => {
    const longComment = `${"Très ".repeat(60)}utile`;
    mockUserFindUnique.mockResolvedValue(verifiedMember({
      _count: { reviewsReceived: 1 },
      reviewsReceived: [makeReview(1, { comment: longComment })],
    }));
    mockReviewFindMany.mockResolvedValue([{ rating: 5 }]);

    render(await MemberProfilePage(params));

    expect(screen.getByText(/…$/)).toBeInTheDocument();
    expect(screen.queryByText(longComment)).not.toBeInTheDocument();
  });

  it("shows active Platinum and first-unlock confetti when eligibility is newly persisted", async () => {
    mockUserFindUnique.mockResolvedValue(verifiedMember({
      opportunities: [{ id: "opp-1" }, { id: "opp-2" }, { id: "opp-3" }],
      _count: { reviewsReceived: 1 },
      reviewsReceived: [makeReview(1, { rating: 5, comment: "Top", reviewer: { name: "Koffi", image: null } })],
    }));
    mockReviewFindMany.mockResolvedValue([{ rating: 5 }]);
    mockUserUpdateMany.mockResolvedValue({ count: 1 });

    render(await MemberProfilePage(params));

    expect(screen.getByText("Membre Platinum")).toBeInTheDocument();
    expect(screen.getByLabelText("Membre distingué : 3+ deals validés et excellentes reviews")).toBeInTheDocument();
    expect(screen.getByTestId("platinum-confetti")).toHaveClass("motion-reduce:hidden");
    expect(mockUserUpdateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "member-1", platinumAwardedAt: null } }));
  });

  it("shows maintain Platinum without de-awarding when the average drops", async () => {
    const awardedAt = new Date("2026-05-01T00:00:00.000Z");
    mockUserFindUnique.mockResolvedValue(verifiedMember({
      platinumAwardedAt: awardedAt,
      opportunities: [{ id: "opp-1" }, { id: "opp-2" }, { id: "opp-3" }],
      _count: { reviewsReceived: 1 },
      reviewsReceived: [makeReview(1, { rating: 4, comment: "Correct", reviewer: { name: "Koffi", image: null } })],
    }));
    mockReviewFindMany.mockResolvedValue([{ rating: 4 }]);

    render(await MemberProfilePage(params));

    expect(screen.getByText("Membre Platinum")).toBeInTheDocument();
    expect(screen.getByText("À maintenir")).toBeInTheDocument();
    expect(mockUserUpdateMany).not.toHaveBeenCalled();
  });

  it("does not show badge when not awarded and not eligible", async () => {
    render(await MemberProfilePage(params));

    expect(screen.queryByText("Membre Platinum")).not.toBeInTheDocument();
    expect(screen.queryByTestId("platinum-confetti")).not.toBeInTheDocument();
  });

  it("does not show confetti just because the member is already Platinum", async () => {
    mockUserFindUnique.mockResolvedValue(verifiedMember({
      platinumAwardedAt: new Date("2026-05-01T00:00:00.000Z"),
      opportunities: [{ id: "opp-1" }, { id: "opp-2" }, { id: "opp-3" }],
      _count: { reviewsReceived: 1 },
      reviewsReceived: [makeReview(1, { rating: 5, comment: "Top", reviewer: { name: "Koffi", image: null } })],
    }));
    mockReviewFindMany.mockResolvedValue([{ rating: 5 }]);

    render(await MemberProfilePage(params));

    expect(screen.getByText("Membre Platinum")).toBeInTheDocument();
    expect(screen.queryByTestId("platinum-confetti")).not.toBeInTheDocument();
  });

  it("preserves the verified profile guard", async () => {
    mockUserFindUnique.mockResolvedValue(verifiedMember({ verificationStatus: "PENDING" }));

    await expect(MemberProfilePage(params)).rejects.toThrow("notFound");
    expect(mockNotFound).toHaveBeenCalled();
    expect(mockReviewFindMany).not.toHaveBeenCalled();
  });
});
