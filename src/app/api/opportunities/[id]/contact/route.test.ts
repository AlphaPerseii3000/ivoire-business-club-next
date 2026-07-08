import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

const mockAuth = vi.hoisted(() => vi.fn());
const mockGetUserPremiumAccess = vi.hoisted(() => vi.fn());
const mockCanUserAccessOpportunity = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockOpportunityFindUnique = vi.hoisted(() => vi.fn());
const mockContactLogCreate = vi.hoisted(() => vi.fn());
const mockBuildWhatsAppSupportLink = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/subscription-access", () => ({ getUserPremiumAccess: mockGetUserPremiumAccess }));
vi.mock("@/lib/opportunity-visibility", () => ({ canUserAccessOpportunity: mockCanUserAccessOpportunity }));
vi.mock("@/lib/sanitize-log", () => ({ sanitizeError: (error: unknown) => String(error) }));
vi.mock("@/lib/whatsapp", () => ({ buildWhatsAppSupportLink: mockBuildWhatsAppSupportLink }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    opportunity: { findUnique: mockOpportunityFindUnique },
    contactLog: { create: mockContactLogCreate },
  },
}));

function context(id = "opp-1") {
  return { params: Promise.resolve({ id }) };
}

function request(url = "http://localhost/api/opportunities/opp-1/contact") {
  return new Request(url, { method: "GET" });
}

function verifiedOpportunity(overrides = {}) {
  return {
    id: "opp-1",
    title: "Terrain à Cocody",
    authorId: "author-1",
    requiredTier: "AFFRANCHI",
    verificationStatus: "VERIFIED",
    author: { id: "author-1", phone: "+22507070707" },
    ...overrides,
  };
}

describe("GET /api/opportunities/[id]/contact", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "member-1" } });
    mockGetUserPremiumAccess.mockResolvedValue({ hasAccess: true });
    mockCanUserAccessOpportunity.mockReturnValue(true);
    mockUserFindUnique.mockResolvedValue({ id: "member-1", role: "MEMBER", tier: "AFFRANCHI" });
    mockOpportunityFindUnique.mockResolvedValue(verifiedOpportunity());
    mockContactLogCreate.mockResolvedValue({ id: "contact-1", createdAt: new Date("2026-05-20") });
    mockBuildWhatsAppSupportLink.mockReturnValue("https://wa.me/22507070707?text=Bonjour");
  });

  it("redirects anonymous visitors to signin", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await GET(request(), context());

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("http://localhost/auth/signin");
    expect(mockContactLogCreate).not.toHaveBeenCalled();
  });

  it("returns 404 for non verified deals", async () => {
    mockOpportunityFindUnique.mockResolvedValue(verifiedOpportunity({ verificationStatus: "PENDING" }));

    const response = await GET(request(), context());

    expect(response.status).toBe(404);
    expect(mockContactLogCreate).not.toHaveBeenCalled();
  });

  it("returns 403 when premium access is missing", async () => {
    mockGetUserPremiumAccess.mockResolvedValue({ hasAccess: false });

    const response = await GET(request(), context());
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error).toBe("Votre abonnement doit être actif pour contacter le porteur.");
    expect(mockContactLogCreate).not.toHaveBeenCalled();
  });

  it("returns 403 when tier access is insufficient", async () => {
    mockCanUserAccessOpportunity.mockReturnValue(false);

    const response = await GET(request(), context());
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error).toBe("Votre tier actuel ne permet pas de contacter le porteur de ce deal.");
    expect(mockContactLogCreate).not.toHaveBeenCalled();
  });

  it("returns 400 when author phone is missing", async () => {
    mockOpportunityFindUnique.mockResolvedValue(verifiedOpportunity({ author: { id: "author-1", phone: null } }));

    const response = await GET(request(), context());
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("Numéro WhatsApp du porteur non disponible.");
    expect(mockContactLogCreate).not.toHaveBeenCalled();
  });

  it("creates a ContactLog and redirects eligible members to WhatsApp", async () => {
    const response = await GET(request(), context());

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://wa.me/22507070707?text=Bonjour");
    expect(mockContactLogCreate).toHaveBeenCalledWith({
      data: { userId: "member-1", opportunityId: "opp-1" },
    });
    expect(mockBuildWhatsAppSupportLink).toHaveBeenCalledWith({
      phoneNumber: "+22507070707",
      message: "Bonjour, je suis intéressé(e) par votre deal Terrain à Cocody sur IBC.",
    });
  });

  it("still redirects when ContactLog creation fails", async () => {
    mockContactLogCreate.mockRejectedValue(new Error("DB down"));

    const response = await GET(request(), context());

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://wa.me/22507070707?text=Bonjour");
    expect(mockContactLogCreate).toHaveBeenCalledWith({
      data: { userId: "member-1", opportunityId: "opp-1" },
    });
  });

  it("allows admin to bypass premium and tier checks", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1" } });
    mockUserFindUnique.mockResolvedValue({ id: "admin-1", role: "ADMIN", tier: "AFFRANCHI" });
    mockGetUserPremiumAccess.mockResolvedValue({ hasAccess: false });
    mockCanUserAccessOpportunity.mockReturnValue(false);

    const response = await GET(request(), context());

    expect(response.status).toBe(302);
    expect(mockContactLogCreate).toHaveBeenCalledWith({
      data: { userId: "admin-1", opportunityId: "opp-1" },
    });
  });

  it("returns 500 on unexpected errors", async () => {
    mockUserFindUnique.mockRejectedValue(new Error("Unexpected"));

    const response = await GET(request(), context());
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.error).toBe("Erreur interne");
  });
});
