import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import OpportunitiesPage from "./page";

const mockAuth = vi.hoisted(() => vi.fn());
const mockGetUserPremiumAccess = vi.hoisted(() => vi.fn());
const mockOpportunityFindMany = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/subscription-access", () => ({ getUserPremiumAccess: mockGetUserPremiumAccess }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    opportunity: { findMany: mockOpportunityFindMany },
    user: { findUnique: mockUserFindUnique },
  },
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => { throw new Error(`redirect:${path}`); }),
  usePathname: () => "/dashboard/opportunities",
  useSearchParams: () => new URLSearchParams(),
}));

describe("OpportunitiesPage premium access and tier visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "member-1" } });
    mockUserFindUnique.mockResolvedValue({ role: "MEMBER", tier: "AFFRANCHI" });
  });

  it.each(["TRIAL", "PENDING", "CANCELLED", "PAST_DUE", "NO_SUBSCRIPTION"])(
    "blocks premium content for %s members through the subscription-access helper",
    async () => {
      mockGetUserPremiumAccess.mockResolvedValue({ hasAccess: false });

      render(await OpportunitiesPage());

      expect(screen.getByText("Votre abonnement est inactif. Renouvelez pour accéder aux deals.")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Voir les offres" })).toHaveAttribute("href", "/pricing");
      expect(mockOpportunityFindMany).not.toHaveBeenCalled();
    }
  );

  it("queries only verified Affranchi opportunities plus own opportunities for active Affranchi members", async () => {
    mockGetUserPremiumAccess.mockResolvedValue({ hasAccess: true });
    mockOpportunityFindMany.mockResolvedValue([
      {
        id: "opp-1",
        title: "Terrain à Cocody",
        amount: 25000,
        category: "IMMOBILIER",
        verificationStatus: "VERIFIED",
        createdAt: new Date("2026-05-14T00:00:00.000Z"),
        author: { id: "author-1", name: "Koffi", phone: "+22501020304", location: "Abidjan" },
        _count: { documents: 2 },
      },
    ]);

    render(await OpportunitiesPage());

    expect(mockOpportunityFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        AND: [
          {},
          {
            OR: [
              { verificationStatus: "VERIFIED", requiredTier: { in: ["AFFRANCHI"] } },
              { authorId: "member-1" },
            ],
          },
        ],
      },
    }));
    expect(screen.getByText("Terrain à Cocody")).toBeInTheDocument();
    expect(screen.getByText("Abidjan")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("queries Boss opportunities with lower tiers included", async () => {
    mockGetUserPremiumAccess.mockResolvedValue({ hasAccess: true });
    mockUserFindUnique.mockResolvedValue({ role: "MEMBER", tier: "BOSS" });
    mockOpportunityFindMany.mockResolvedValue([]);

    render(await OpportunitiesPage({ searchParams: Promise.resolve({ category: "BUSINESS" }) }));

    expect(mockOpportunityFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        AND: [
          { category: "BUSINESS" },
          {
            OR: [
              { verificationStatus: "VERIFIED", requiredTier: { in: ["AFFRANCHI", "GRAND_FRERE", "BOSS"] } },
              { authorId: "member-1" },
            ],
          },
        ],
      },
    }));
    expect(screen.getByText("Aucun deal ne correspond à vos critères")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Réinitialiser les filtres" })).toHaveAttribute("href", "/dashboard/opportunities");
  });
});
