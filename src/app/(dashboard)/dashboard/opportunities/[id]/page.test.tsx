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
  useRouter: () => ({ refresh: vi.fn() }),
}));

const params = { params: Promise.resolve({ id: "opp-1" }) };

function verifiedOpportunity(overrides = {}) {
  return {
    id: "opp-1",
    title: "Terrain à Cocody",
    description: "Dossier confidentiel premium",
    amount: 25000,
    requiredTier: "AFFRANCHI",
    category: "IMMOBILIER",
    verificationStatus: "VERIFIED",
    createdAt: new Date("2026-05-14T00:00:00.000Z"),
    rejectionNote: null,
    author: { id: "author-1", name: "Koffi", location: "Abidjan", phone: "+22501020304", opportunities: [{ id: "opp-1" }] },
    verifiedBy: null,
    documents: [],
    verificationApprovals: [],
    tags: [],
    interests: [],
    reviews: [],
    _count: { interests: 0 },
    requiresDoubleVerification: false,
    ...overrides,
  };
}

describe("OpportunityDetailPage premium and tier access gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "member-1" } });
    mockUserFindUnique.mockResolvedValue({ role: "MEMBER", tier: "AFFRANCHI" });
  });

  it("blocks premium deal details for non-active members", async () => {
    mockGetUserPremiumAccess.mockResolvedValue({ hasAccess: false });
    mockOpportunityFindUnique.mockResolvedValueOnce(verifiedOpportunity());

    render(await OpportunityDetailPage(params));

    expect(screen.getByText("Votre abonnement est inactif. Renouvelez pour accéder aux deals.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir les offres" })).toHaveAttribute("href", "/pricing");
    expect(screen.queryByText("Dossier confidentiel premium")).not.toBeInTheDocument();
  });

  it("blocks active members whose tier is too low without showing details", async () => {
    mockGetUserPremiumAccess.mockResolvedValue({ hasAccess: true });
    mockOpportunityFindUnique.mockResolvedValueOnce(verifiedOpportunity({ requiredTier: "BOSS" }));

    render(await OpportunityDetailPage(params));

    expect(screen.getByText("Cette opportunité nécessite un tier supérieur")).toBeInTheDocument();
    expect(screen.queryByText("Dossier confidentiel premium")).not.toBeInTheDocument();
  });

  it("renders premium deal details for active members with sufficient tier", async () => {
    mockGetUserPremiumAccess.mockResolvedValue({ hasAccess: true });
    mockOpportunityFindUnique.mockResolvedValueOnce(verifiedOpportunity({ verifiedBy: { name: "Admin IBC" } }));

    render(await OpportunityDetailPage(params));

    expect(screen.getByText("Terrain à Cocody")).toBeInTheDocument();
    expect(screen.getByText("Dossier confidentiel premium")).toBeInTheDocument();
    expect(screen.getByText("Vérifié par Admin IBC")).toBeInTheDocument();
    expect(screen.getByLabelText(/Niveau de confiance Argent/)).toBeInTheDocument();
    expect(screen.getByText("Timeline de vérification")).toBeInTheDocument();
    expect(screen.getByText("0 intérêt enregistré")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Intéressé(e)" })).toBeInTheDocument();
    expect(screen.queryByText("Votre abonnement est inactif. Renouvelez pour accéder aux deals.")).not.toBeInTheDocument();
  });

  it("highlights the interest count from notification links", async () => {
    mockGetUserPremiumAccess.mockResolvedValue({ hasAccess: true });
    mockOpportunityFindUnique.mockResolvedValueOnce(verifiedOpportunity({ _count: { interests: 2 } }));

    render(await OpportunityDetailPage({
      params: Promise.resolve({ id: "opp-1" }),
      searchParams: Promise.resolve({ highlight: "interests" }),
    }));

    expect(screen.getByText("2 intérêts enregistrés")).toHaveAttribute("aria-current", "true");
  });

  it("renders legal document rows with preview and download for authorized members", async () => {
    mockGetUserPremiumAccess.mockResolvedValue({ hasAccess: true });
    mockOpportunityFindUnique.mockResolvedValueOnce(verifiedOpportunity({
      documents: [
        {
          id: "doc-1",
          opportunityId: "opp-1",
          uploadedById: "author-1",
          fileName: "statuts.pdf",
          originalName: "Statuts SCI.pdf",
          mimeType: "application/pdf",
          size: 1200,
          publicUrl: null,
          createdAt: new Date("2026-05-15T00:00:00.000Z"),
          updatedAt: new Date("2026-05-15T00:00:00.000Z"),
        },
      ],
    }));

    render(await OpportunityDetailPage(params));

    expect(screen.getByText("Statuts SCI.pdf")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Aperçu de Statuts SCI\.pdf/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Télécharger/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Supprimer/ })).not.toBeInTheDocument();
  });


  it("hides the review form when the member has no interest", async () => {
    mockGetUserPremiumAccess.mockResolvedValue({ hasAccess: true });
    mockOpportunityFindUnique.mockResolvedValueOnce(verifiedOpportunity());

    render(await OpportunityDetailPage(params));

    expect(screen.queryByRole("heading", { name: "Laisser un avis" })).not.toBeInTheDocument();
  });

  it("hides the review form before the 7-day delay", async () => {
    mockGetUserPremiumAccess.mockResolvedValue({ hasAccess: true });
    mockOpportunityFindUnique.mockResolvedValueOnce(verifiedOpportunity({
      interests: [{ id: "interest-1", createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) }],
    }));

    render(await OpportunityDetailPage(params));

    expect(screen.queryByRole("heading", { name: "Laisser un avis" })).not.toBeInTheDocument();
  });

  it("hides the review form after an existing review", async () => {
    mockGetUserPremiumAccess.mockResolvedValue({ hasAccess: true });
    mockOpportunityFindUnique.mockResolvedValueOnce(verifiedOpportunity({
      interests: [{ id: "interest-1", createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) }],
      reviews: [{ id: "review-1" }],
    }));

    render(await OpportunityDetailPage(params));

    expect(screen.queryByRole("heading", { name: "Laisser un avis" })).not.toBeInTheDocument();
  });

  it("shows the review form after the 7-day delay when no review exists", async () => {
    mockGetUserPremiumAccess.mockResolvedValue({ hasAccess: true });
    mockOpportunityFindUnique.mockResolvedValueOnce(verifiedOpportunity({
      interests: [{ id: "interest-1", createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) }],
    }));

    render(await OpportunityDetailPage(params));

    expect(screen.getByRole("heading", { name: "Laisser un avis" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Soumettre mon avis" })).toBeInTheDocument();
  });
});
