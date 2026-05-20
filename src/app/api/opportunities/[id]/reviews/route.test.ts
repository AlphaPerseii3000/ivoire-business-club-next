import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

const mockAuth = vi.hoisted(() => vi.fn());
const mockGetUserPremiumAccess = vi.hoisted(() => vi.fn());
const mockCanUserAccessOpportunity = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockOpportunityFindUnique = vi.hoisted(() => vi.fn());
const mockReviewCreate = vi.hoisted(() => vi.fn());
const mockRevalidatePath = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }));
vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/subscription-access", () => ({ getUserPremiumAccess: mockGetUserPremiumAccess }));
vi.mock("@/lib/opportunity-visibility", () => ({ canUserAccessOpportunity: mockCanUserAccessOpportunity }));
vi.mock("@/lib/sanitize-log", () => ({ sanitizeError: (error: unknown) => String(error) }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    opportunity: { findUnique: mockOpportunityFindUnique },
    review: { create: mockReviewCreate },
  },
}));

const context = { params: Promise.resolve({ id: "opp-1" }) };

function request(body: unknown) {
  return new Request("http://localhost/api/opportunities/opp-1/reviews", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function oldInterest() {
  return new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
}

function recentInterest() {
  return new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
}

function verifiedOpportunity(overrides = {}) {
  return {
    id: "opp-1",
    authorId: "author-1",
    requiredTier: "AFFRANCHI",
    verificationStatus: "VERIFIED",
    interests: [{ id: "interest-1", createdAt: oldInterest() }],
    reviews: [],
    ...overrides,
  };
}

describe("POST /api/opportunities/[id]/reviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "member-1" } });
    mockGetUserPremiumAccess.mockResolvedValue({ hasAccess: true });
    mockCanUserAccessOpportunity.mockReturnValue(true);
    mockUserFindUnique.mockResolvedValue({ id: "member-1", role: "MEMBER", tier: "AFFRANCHI" });
    mockOpportunityFindUnique.mockResolvedValue(verifiedOpportunity());
    mockReviewCreate.mockResolvedValue({
      id: "review-1",
      reviewerId: "member-1",
      revieweeId: "author-1",
      opportunityId: "opp-1",
      rating: 5,
      comment: "Très bon échange",
      createdAt: new Date("2026-05-20T00:00:00.000Z"),
    });
  });

  it("returns 401 for unauthenticated users", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await POST(request({ rating: 5, comment: "Top" }), context);

    expect(response.status).toBe(401);
    expect(mockReviewCreate).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid payloads", async () => {
    const response = await POST(request({ rating: 6, comment: "" }), context);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.code).toBe("VALIDATION_ERROR");
    expect(mockReviewCreate).not.toHaveBeenCalled();
  });

  it("blocks inactive subscriptions", async () => {
    mockGetUserPremiumAccess.mockResolvedValue({ hasAccess: false });

    const response = await POST(request({ rating: 5, comment: "Top" }), context);

    expect(response.status).toBe(403);
    expect(mockReviewCreate).not.toHaveBeenCalled();
  });

  it("blocks insufficient tier access", async () => {
    mockCanUserAccessOpportunity.mockReturnValue(false);

    const response = await POST(request({ rating: 5, comment: "Top" }), context);

    expect(response.status).toBe(403);
    expect(mockReviewCreate).not.toHaveBeenCalled();
  });

  it("returns 404 when opportunity is missing", async () => {
    mockOpportunityFindUnique.mockResolvedValue(null);

    const response = await POST(request({ rating: 5, comment: "Top" }), context);

    expect(response.status).toBe(404);
    expect(mockReviewCreate).not.toHaveBeenCalled();
  });

  it("returns 404 when opportunity is not verified", async () => {
    mockOpportunityFindUnique.mockResolvedValue(verifiedOpportunity({ verificationStatus: "PENDING" }));

    const response = await POST(request({ rating: 5, comment: "Top" }), context);

    expect(response.status).toBe(404);
    expect(mockReviewCreate).not.toHaveBeenCalled();
  });

  it("blocks author self-review", async () => {
    mockAuth.mockResolvedValue({ user: { id: "author-1" } });
    mockUserFindUnique.mockResolvedValue({ id: "author-1", role: "MEMBER", tier: "AFFRANCHI" });
    mockOpportunityFindUnique.mockResolvedValue(verifiedOpportunity({ authorId: "author-1" }));

    const response = await POST(request({ rating: 5, comment: "Top" }), context);

    expect(response.status).toBe(409);
    expect(mockReviewCreate).not.toHaveBeenCalled();
  });

  it("blocks users without an interest record", async () => {
    mockOpportunityFindUnique.mockResolvedValue(verifiedOpportunity({ interests: [] }));

    const response = await POST(request({ rating: 5, comment: "Top" }), context);

    expect(response.status).toBe(403);
    expect(mockReviewCreate).not.toHaveBeenCalled();
  });

  it("blocks reviews before the 7-day delay", async () => {
    mockOpportunityFindUnique.mockResolvedValue(verifiedOpportunity({ interests: [{ id: "interest-1", createdAt: recentInterest() }] }));

    const response = await POST(request({ rating: 5, comment: "Top" }), context);

    expect(response.status).toBe(403);
    expect(mockReviewCreate).not.toHaveBeenCalled();
  });

  it("creates a review for eligible users without notification side effects", async () => {
    const response = await POST(request({ rating: 5, comment: "Très bon échange" }), context);
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.data.review.id).toBe("review-1");
    expect(mockReviewCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: {
        reviewerId: "member-1",
        revieweeId: "author-1",
        opportunityId: "opp-1",
        rating: 5,
        comment: "Très bon échange",
      },
    }));
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/opportunities/opp-1");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/members/author-1");
  });

  it("returns the exact duplicate message when an existing review is found", async () => {
    mockOpportunityFindUnique.mockResolvedValue(verifiedOpportunity({ reviews: [{ id: "review-1" }] }));

    const response = await POST(request({ rating: 5, comment: "Top" }), context);
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error).toBe("Vous avez déjà laissé un avis pour ce deal.");
    expect(mockReviewCreate).not.toHaveBeenCalled();
  });

  it("handles duplicate P2002 races with the exact duplicate message", async () => {
    mockReviewCreate.mockRejectedValue({ code: "P2002" });

    const response = await POST(request({ rating: 5, comment: "Top" }), context);
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error).toBe("Vous avez déjà laissé un avis pour ce deal.");
  });
});
