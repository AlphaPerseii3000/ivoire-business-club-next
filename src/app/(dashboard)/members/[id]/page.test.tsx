import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import MemberProfilePage from "./page";

const mockAuth = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockUserUpdateMany = vi.hoisted(() => vi.fn());
const mockGetUserPremiumAccess = vi.hoisted(() => vi.fn());
const mockNotFound = vi.hoisted(() => vi.fn(() => { throw new Error("notFound"); }));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/subscription-access", () => ({ getUserPremiumAccess: mockGetUserPremiumAccess }));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: mockUserFindUnique, updateMany: mockUserUpdateMany } },
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => { throw new Error(`redirect:${path}`); }),
  notFound: mockNotFound,
}));

const params = { params: Promise.resolve({ id: "member-1" }) };

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
    mockUserUpdateMany.mockResolvedValue({ count: 1 });
  });

  it("blocks member profile reputation for users without premium access", async () => {
    mockGetUserPremiumAccess.mockResolvedValue({ hasAccess: false });

    render(await MemberProfilePage(params));

    expect(screen.getByText("Accès réservé aux membres actifs")).toBeInTheDocument();
    expect(screen.queryByText("Score de fiabilité IBC")).not.toBeInTheDocument();
    expect(mockUserFindUnique).not.toHaveBeenCalled();
    expect(mockUserUpdateMany).not.toHaveBeenCalled();
  });

  it("does not render Avis reçus when there are no reviews and does not show a fake score", async () => {
    render(await MemberProfilePage(params));

    expect(screen.queryByText("Avis reçus")).not.toBeInTheDocument();
    expect(screen.getByText("Score de fiabilité IBC")).toBeInTheDocument();
    expect(screen.getByText("Pas encore d'avis reçus")).toBeInTheDocument();
    expect(screen.queryByText(/\/5/)).not.toBeInTheDocument();
  });

  it("renders received reviews and the centralized reliability score", async () => {
    mockUserFindUnique.mockResolvedValue(verifiedMember({
      reviewsReceived: [
        {
          id: "review-1",
          rating: 5,
          comment: "Partenaire très sérieux.",
          createdAt: new Date("2026-05-20T00:00:00.000Z"),
          reviewer: { name: "Koffi" },
        },
        {
          id: "review-2",
          rating: 4,
          comment: "Bonne collaboration.",
          createdAt: new Date("2026-05-19T00:00:00.000Z"),
          reviewer: { name: "Aminata" },
        },
      ],
    }));

    render(await MemberProfilePage(params));

    expect(screen.getByText("Avis reçus")).toBeInTheDocument();
    expect(screen.getByLabelText("4,5 sur 5 étoiles")).toBeInTheDocument();
    expect(screen.getByText("4,5/5")).toBeInTheDocument();
    expect(screen.getByText("2 avis reçus")).toBeInTheDocument();
    expect(screen.getByText("Partenaire très sérieux.")).toBeInTheDocument();
    expect(screen.getByText("Par Koffi")).toBeInTheDocument();
    expect(screen.getByText("20/05/2026")).toBeInTheDocument();
  });

  it("shows active Platinum and first-unlock confetti when eligibility is newly persisted", async () => {
    mockUserFindUnique.mockResolvedValue(verifiedMember({
      opportunities: [{ id: "opp-1" }, { id: "opp-2" }, { id: "opp-3" }],
      reviewsReceived: [{ id: "review-1", rating: 5, comment: "Top", createdAt: new Date("2026-05-20T00:00:00.000Z"), reviewer: { name: "Koffi" } }],
    }));
    mockUserUpdateMany.mockResolvedValue({ count: 1 });

    render(await MemberProfilePage(params));

    expect(screen.getByText("Membre Platinum")).toBeInTheDocument();
    expect(screen.getByTestId("platinum-confetti")).toHaveClass("motion-reduce:hidden");
    expect(mockUserUpdateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "member-1", platinumAwardedAt: null } }));
  });

  it("shows maintain Platinum without de-awarding when the average drops", async () => {
    const awardedAt = new Date("2026-05-01T00:00:00.000Z");
    mockUserFindUnique.mockResolvedValue(verifiedMember({
      platinumAwardedAt: awardedAt,
      opportunities: [{ id: "opp-1" }, { id: "opp-2" }, { id: "opp-3" }],
      reviewsReceived: [{ id: "review-1", rating: 4, comment: "Correct", createdAt: new Date("2026-05-20T00:00:00.000Z"), reviewer: { name: "Koffi" } }],
    }));

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
      reviewsReceived: [{ id: "review-1", rating: 5, comment: "Top", createdAt: new Date("2026-05-20T00:00:00.000Z"), reviewer: { name: "Koffi" } }],
    }));

    render(await MemberProfilePage(params));

    expect(screen.getByText("Membre Platinum")).toBeInTheDocument();
    expect(screen.queryByTestId("platinum-confetti")).not.toBeInTheDocument();
  });

  it("preserves the verified profile guard", async () => {
    mockUserFindUnique.mockResolvedValue(verifiedMember({ verificationStatus: "PENDING" }));

    await expect(MemberProfilePage(params)).rejects.toThrow("notFound");
    expect(mockNotFound).toHaveBeenCalled();
  });
});
