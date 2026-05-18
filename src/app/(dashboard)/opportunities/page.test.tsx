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
vi.mock("next/navigation", () => ({ redirect: vi.fn((path: string) => { throw new Error(`redirect:${path}`); }) }));

describe("OpportunitiesPage premium access gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "member-1" } });
    mockUserFindUnique.mockResolvedValue({ role: "MEMBER" });
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

  it("renders premium opportunity content for active members", async () => {
    mockGetUserPremiumAccess.mockResolvedValue({ hasAccess: true });
    mockOpportunityFindMany.mockResolvedValue([
      {
        id: "opp-1",
        title: "Terrain à Cocody",
        description: "Dossier complet et rendement estimé.",
        amount: 25000,
        category: "IMMOBILIER",
        verificationStatus: "VERIFIED",
        createdAt: new Date("2026-05-14T00:00:00.000Z"),
        author: { id: "author-1", name: "Koffi" },
      },
    ]);

    render(await OpportunitiesPage());

    expect(screen.getByText("Terrain à Cocody")).toBeInTheDocument();
    expect(screen.getByText("Dossier complet et rendement estimé.")).toBeInTheDocument();
    expect(screen.queryByText("Votre abonnement est inactif. Renouvelez pour accéder aux deals.")).not.toBeInTheDocument();
  });
});
