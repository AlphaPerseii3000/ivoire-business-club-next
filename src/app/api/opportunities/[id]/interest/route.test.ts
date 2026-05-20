import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

const mockAuth = vi.hoisted(() => vi.fn());
const mockGetUserPremiumAccess = vi.hoisted(() => vi.fn());
const mockCanUserAccessOpportunity = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockOpportunityFindUnique = vi.hoisted(() => vi.fn());
const mockOpportunityInterestCreate = vi.hoisted(() => vi.fn());
const mockNotificationCreate = vi.hoisted(() => vi.fn());
const mockTransaction = vi.hoisted(() => vi.fn((callback) => callback({
  opportunityInterest: { create: mockOpportunityInterestCreate },
  notification: { create: mockNotificationCreate },
})));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/subscription-access", () => ({ getUserPremiumAccess: mockGetUserPremiumAccess }));
vi.mock("@/lib/opportunity-visibility", () => ({ canUserAccessOpportunity: mockCanUserAccessOpportunity }));
vi.mock("@/lib/sanitize-log", () => ({ sanitizeError: (error: unknown) => String(error) }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: mockTransaction,
    user: { findUnique: mockUserFindUnique },
    opportunity: { findUnique: mockOpportunityFindUnique },
  },
}));

const context = { params: Promise.resolve({ id: "opp-1" }) };
const request = new Request("http://localhost/api/opportunities/opp-1/interest", { method: "POST" });

function verifiedOpportunity(overrides = {}) {
  return {
    id: "opp-1",
    title: "Terrain à Cocody",
    authorId: "author-1",
    requiredTier: "AFFRANCHI",
    verificationStatus: "VERIFIED",
    author: { id: "author-1" },
    ...overrides,
  };
}

describe("POST /api/opportunities/[id]/interest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "member-1" } });
    mockGetUserPremiumAccess.mockResolvedValue({ hasAccess: true });
    mockCanUserAccessOpportunity.mockReturnValue(true);
    mockUserFindUnique.mockResolvedValue({ id: "member-1", name: "Awa", role: "MEMBER", tier: "AFFRANCHI" });
    mockOpportunityFindUnique.mockResolvedValue(verifiedOpportunity());
    mockOpportunityInterestCreate.mockResolvedValue({ id: "interest-1", createdAt: new Date("2026-05-20") });
    mockNotificationCreate.mockResolvedValue({ id: "notification-1" });
  });

  it("returns 401 for anonymous visitors", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await POST(request, context);

    expect(response.status).toBe(401);
    expect(mockOpportunityInterestCreate).not.toHaveBeenCalled();
  });

  it("returns 404 for non verified deals invisible to members", async () => {
    mockOpportunityFindUnique.mockResolvedValue(verifiedOpportunity({ verificationStatus: "PENDING" }));

    const response = await POST(request, context);

    expect(response.status).toBe(404);
    expect(mockOpportunityInterestCreate).not.toHaveBeenCalled();
  });

  it("returns 403 when premium access is missing", async () => {
    mockGetUserPremiumAccess.mockResolvedValue({ hasAccess: false });

    const response = await POST(request, context);

    expect(response.status).toBe(403);
    expect(mockOpportunityInterestCreate).not.toHaveBeenCalled();
  });

  it("returns 403 when tier access is insufficient", async () => {
    mockCanUserAccessOpportunity.mockReturnValue(false);

    const response = await POST(request, context);

    expect(response.status).toBe(403);
    expect(mockOpportunityInterestCreate).not.toHaveBeenCalled();
  });

  it("refuses author self-interest without notification", async () => {
    mockAuth.mockResolvedValue({ user: { id: "author-1" } });
    mockUserFindUnique.mockResolvedValue({ id: "author-1", name: "Koffi", role: "MEMBER", tier: "AFFRANCHI" });

    const response = await POST(request, context);
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error).toBe("Vous ne pouvez pas marquer votre intérêt pour votre propre deal.");
    expect(mockNotificationCreate).not.toHaveBeenCalled();
  });

  it("creates an interest and exact notification for eligible members", async () => {
    const response = await POST(request, context);
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.data.created).toBe(true);
    expect(mockOpportunityInterestCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: { userId: "member-1", opportunityId: "opp-1" },
    }));
    expect(mockNotificationCreate).toHaveBeenCalledWith({
      data: {
        userId: "author-1",
        type: "OPPORTUNITY_INTEREST",
        title: "Awa est intéressé(e) par votre deal Terrain à Cocody",
        body: "Awa est intéressé(e) par votre deal Terrain à Cocody",
        href: "/dashboard/opportunities/opp-1?highlight=interests",
      },
    });
  });

  it("handles duplicate interest idempotently without duplicate notification", async () => {
    mockOpportunityInterestCreate.mockRejectedValue({ code: "P2002" });

    const response = await POST(request, context);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.created).toBe(false);
    expect(mockNotificationCreate).not.toHaveBeenCalled();
  });
});
