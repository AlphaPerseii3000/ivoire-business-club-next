import { beforeEach, describe, expect, it, vi } from "vitest";

import { PATCH } from "./route";

const mockAuth = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockOpportunityFindUnique = vi.hoisted(() => vi.fn());
const mockOpportunityUpdate = vi.hoisted(() => vi.fn());
const mockSendVerified = vi.hoisted(() => vi.fn());
const mockSendRejected = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/email", () => ({
  sendOpportunityVerifiedEmail: mockSendVerified,
  sendOpportunityRejectedEmail: mockSendRejected,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    opportunity: { findUnique: mockOpportunityFindUnique, update: mockOpportunityUpdate },
  },
}));
vi.mock("@/lib/sanitize-log", () => ({ sanitizeError: vi.fn(() => "Error: sanitized") }));

function request(body: unknown) {
  return new Request("http://localhost/api/admin/opportunities/opp-1/verify", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const params = { params: Promise.resolve({ id: "opp-1" }) };

const pendingOpportunity = {
  id: "opp-1",
  title: "Terrain à Cocody",
  verificationStatus: "PENDING",
  reviewNotes: null,
  adminNote: null,
  author: { id: "author-1", name: "Koffi", email: "koffi@example.com" },
};

describe("PATCH /api/admin/opportunities/[id]/verify", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "admin-1" } });
    mockUserFindUnique.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
    mockOpportunityFindUnique.mockResolvedValue(pendingOpportunity);
    mockOpportunityUpdate.mockImplementation(async ({ data }) => ({
      ...pendingOpportunity,
      ...data,
      _count: { documents: 0 },
    }));
    mockSendVerified.mockResolvedValue(undefined);
    mockSendRejected.mockResolvedValue(undefined);
  });

  it("returns 401 for unauthenticated requests", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await PATCH(request({ action: "start_review" }), params);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Non autorisé");
  });

  it("returns 403 for non-admin users", async () => {
    mockUserFindUnique.mockResolvedValueOnce({ id: "member-1", role: "MEMBER" });

    const res = await PATCH(request({ action: "start_review" }), params);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toBe("Interdit");
  });

  it("moves a pending opportunity to EN_COURS", async () => {
    const res = await PATCH(request({ action: "start_review" }), params);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.verificationStatus).toBe("EN_COURS");
    expect(mockOpportunityUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "opp-1" },
      data: expect.objectContaining({ verificationStatus: "EN_COURS", verifiedAt: null }),
    }));
  });

  it("verifies an opportunity and sends an email", async () => {
    const res = await PATCH(request({ action: "verify", note: "Dossier complet" }), params);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.verificationStatus).toBe("VERIFIED");
    expect(mockOpportunityUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ verificationStatus: "VERIFIED", verifiedById: "admin-1", rejectionNote: null }),
    }));
    expect(mockSendVerified).toHaveBeenCalledWith({
      to: "koffi@example.com",
      name: "Koffi",
      opportunityId: "opp-1",
      title: "Terrain à Cocody",
    });
  });

  it("rejects rejection without note", async () => {
    const res = await PATCH(request({ action: "reject", note: "" }), params);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("La note est obligatoire pour refuser un deal.");
    expect(mockOpportunityUpdate).not.toHaveBeenCalled();
  });

  it("rejects an opportunity with a stored private note", async () => {
    const res = await PATCH(request({ action: "reject", note: "Document manquant" }), params);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.verificationStatus).toBe("REJECTED");
    expect(mockOpportunityUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ verificationStatus: "REJECTED", rejectionNote: "Document manquant", verifiedAt: null, verifiedById: null }),
    }));
    expect(mockSendRejected).toHaveBeenCalledWith(expect.objectContaining({ note: "Document manquant" }));
  });

  it("rejects invalid transitions with INVALID_TRANSITION", async () => {
    mockOpportunityFindUnique.mockResolvedValueOnce({ ...pendingOpportunity, verificationStatus: "VERIFIED" });

    const res = await PATCH(request({ action: "start_review" }), params);
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.code).toBe("INVALID_TRANSITION");
    expect(mockOpportunityUpdate).not.toHaveBeenCalled();
  });
});
