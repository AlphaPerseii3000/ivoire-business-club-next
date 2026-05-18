import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import OpportunityDetailPage from "./page";

const mockAuth = vi.hoisted(() => vi.fn());
const mockGetUserPremiumAccess = vi.hoisted(() => vi.fn());
const mockOpportunityFindUnique = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockNotFound = vi.hoisted(() => vi.fn(() => { throw new Error("notFound"); }));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/subscription-access", () => ({ getUserPremiumAccess: mockGetUserPremiumAccess }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    opportunity: { findUnique: mockOpportunityFindUnique },
    user: { findUnique: mockUserFindUnique },
  },
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => { throw new Error(`redirect:${path}`); }),
  notFound: mockNotFound,
}));

const params = { params: Promise.resolve({ id: "opp-1" }) };

describe("OpportunityDetailPage premium access gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "member-1" } });
    mockUserFindUnique.mockResolvedValue({ role: "MEMBER" });
  });

  it("blocks premium deal details for non-active members", async () => {
    mockGetUserPremiumAccess.mockResolvedValue({ hasAccess: false });
    mockOpportunityFindUnique.mockResolvedValueOnce({
      id: "opp-1",
      title: "Terrain à Cocody",
      description: "Dossier confidentiel premium",
      amount: 25000,
      category: "IMMOBILIER",
      verificationStatus: "VERIFIED",
      createdAt: new Date("2026-05-14T00:00:00.000Z"),
      rejectionNote: null,
      author: { id: "author-1", name: "Koffi", location: "Abidjan" },
      verifiedBy: null,
      documents: [],
    });

    render(await OpportunityDetailPage(params));

    expect(screen.getByText("Votre abonnement est inactif. Renouvelez pour accéder aux deals.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir les offres" })).toHaveAttribute("href", "/pricing");
    expect(screen.queryByText("Dossier confidentiel premium")).not.toBeInTheDocument();
  });

  it("renders premium deal details for active members", async () => {
    mockGetUserPremiumAccess.mockResolvedValue({ hasAccess: true });
    mockOpportunityFindUnique.mockResolvedValueOnce({
      id: "opp-1",
      title: "Terrain à Cocody",
      description: "Dossier confidentiel premium",
      amount: 25000,
      category: "IMMOBILIER",
      verificationStatus: "VERIFIED",
      createdAt: new Date("2026-05-14T00:00:00.000Z"),
      rejectionNote: null,
      author: { id: "author-1", name: "Koffi", location: "Abidjan" },
      verifiedBy: { name: "Admin IBC" },
      documents: [],
    });

    render(await OpportunityDetailPage(params));

    expect(screen.getByText("Terrain à Cocody")).toBeInTheDocument();
    expect(screen.getByText("Dossier confidentiel premium")).toBeInTheDocument();
    expect(screen.queryByText("Votre abonnement est inactif. Renouvelez pour accéder aux deals.")).not.toBeInTheDocument();
  });
});
