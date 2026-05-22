import { beforeEach, describe, expect, it, vi } from "vitest";

import { PATCH } from "./route";

const mockAuth = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockUserFindMany = vi.hoisted(() => vi.fn());
const mockOpportunityFindUnique = vi.hoisted(() => vi.fn());
const mockOpportunityUpdate = vi.hoisted(() => vi.fn());
const mockApprovalCreate = vi.hoisted(() => vi.fn());
const mockNotificationCreateMany = vi.hoisted(() => vi.fn());
const mockSendVerified = vi.hoisted(() => vi.fn());
const mockSendRejected = vi.hoisted(() => vi.fn());
const mockSendMatched = vi.hoisted(() => vi.fn());
const mockSafeCreateAuditLog = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/audit-log", () => ({
  AUDIT_ACTIONS: {
    SUBSCRIPTION_VALIDATE: "SUBSCRIPTION_VALIDATE",
    SUBSCRIPTION_REJECT: "SUBSCRIPTION_REJECT",
    SUBSCRIPTION_SUSPEND: "SUBSCRIPTION_SUSPEND",
    OPPORTUNITY_STATUS_CHANGE: "OPPORTUNITY_STATUS_CHANGE",
    OPPORTUNITY_DOUBLE_VERIFICATION_APPROVE: "OPPORTUNITY_DOUBLE_VERIFICATION_APPROVE",
    OPPORTUNITY_UPDATE: "OPPORTUNITY_UPDATE",
    OPPORTUNITY_DELETE: "OPPORTUNITY_DELETE",
  },
  safeCreateAuditLog: mockSafeCreateAuditLog,
}));
vi.mock("@/lib/email", () => ({
  sendOpportunityVerifiedEmail: mockSendVerified,
  sendOpportunityRejectedEmail: mockSendRejected,
  sendOpportunityMatchedEmail: mockSendMatched,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique, findMany: mockUserFindMany },
    opportunity: { findUnique: mockOpportunityFindUnique, update: mockOpportunityUpdate },
    opportunityVerificationApproval: { create: mockApprovalCreate },
    notification: { createMany: mockNotificationCreateMany },
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
  authorId: "author-1",
  requiredTier: "AFFRANCHI",
  tags: [{ category: "SECTEUR", value: "tech" }],
  requiresDoubleVerification: false,
  verificationApprovals: [],
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
      _count: { documents: 0, verificationApprovals: data.verificationStatus === "VERIFIED" ? 2 : 0 },
      verificationApprovals: [],
    }));
    mockSendVerified.mockResolvedValue(undefined);
    mockSendRejected.mockResolvedValue(undefined);
    mockSendMatched.mockResolvedValue(undefined);
    mockUserFindMany.mockResolvedValue([]);
    mockNotificationCreateMany.mockResolvedValue({ count: 0 });
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

  it("verifies an opportunity, sends an email, and creates audit log", async () => {
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
    // AC8: audit log created for verify action
    expect(mockSafeCreateAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      actorId: "admin-1",
      action: "OPPORTUNITY_STATUS_CHANGE",
      entityType: "Opportunity",
      entityId: "opp-1",
    }));
  });

  it("keeps a double-verification deal EN_COURS after the first admin approval without sending email", async () => {
    mockOpportunityFindUnique.mockResolvedValueOnce({ ...pendingOpportunity, requiresDoubleVerification: true });

    const res = await PATCH(request({ action: "verify", note: "Premier contrôle OK" }), params);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.pendingSecondVerification).toBe(true);
    expect(json.data.verificationStatus).toBe("EN_COURS");
    expect(mockApprovalCreate).toHaveBeenCalledWith({
      data: { opportunityId: "opp-1", adminId: "admin-1", note: "Premier contrôle OK" },
    });
    expect(mockSendVerified).not.toHaveBeenCalled();
  });

  it("rejects a second double-verification approval from the same admin", async () => {
    mockOpportunityFindUnique.mockResolvedValueOnce({
      ...pendingOpportunity,
      requiresDoubleVerification: true,
      verificationStatus: "EN_COURS",
      verificationApprovals: [{ adminId: "admin-1" }],
    });

    const res = await PATCH(request({ action: "verify" }), params);
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.code).toBe("DOUBLE_VERIFICATION_SAME_ADMIN");
    expect(mockOpportunityUpdate).not.toHaveBeenCalled();
    expect(mockSendVerified).not.toHaveBeenCalled();
  });

  it("marks a double-verification deal VERIFIED after a second distinct admin approval", async () => {
    mockOpportunityFindUnique.mockResolvedValueOnce({
      ...pendingOpportunity,
      requiresDoubleVerification: true,
      verificationStatus: "EN_COURS",
      verificationApprovals: [{ adminId: "admin-2" }],
    });

    const res = await PATCH(request({ action: "verify" }), params);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.pendingSecondVerification).toBe(false);
    expect(json.data.verificationStatus).toBe("VERIFIED");
    expect(mockSendVerified).toHaveBeenCalledOnce();
  });

  it("blocks direct move to VERIFIED for double-verification deals without two approvals", async () => {
    mockOpportunityFindUnique.mockResolvedValueOnce({ ...pendingOpportunity, requiresDoubleVerification: true });

    const res = await PATCH(request({ action: "move", status: "VERIFIED" }), params);
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.code).toBe("DOUBLE_VERIFICATION_REQUIRED");
    expect(mockOpportunityUpdate).not.toHaveBeenCalled();
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

  it("creates matched notifications on verification, excluding author and tier-ineligible members", async () => {
    mockUserFindMany.mockResolvedValueOnce([
      { id: "member-1", email: "member@example.com", name: "Awa", tier: "AFFRANCHI", role: "MEMBER" },
      { id: "member-2", email: "boss@example.com", name: "Boss", tier: "BOSS", role: "MEMBER" },
      { id: "member-3", email: "admin@example.com", name: "Admin", tier: "AFFRANCHI", role: "ADMIN" },
    ]);
    mockOpportunityUpdate.mockImplementationOnce(async ({ data }) => ({
      ...pendingOpportunity,
      ...data,
      requiredTier: "BOSS",
      _count: { documents: 0, verificationApprovals: 0 },
      verificationApprovals: [],
    }));

    const res = await PATCH(request({ action: "verify" }), params);

    expect(res.status).toBe(200);
    expect(mockUserFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: { not: "author-1" },
        tags: { some: { OR: [{ category: "SECTEUR", value: "tech" }] } },
      }),
    }));
    expect(mockNotificationCreateMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ userId: "member-2", title: "Nouvelle opportunité matchée : Terrain à Cocody" }),
        expect.objectContaining({ userId: "member-3", title: "Nouvelle opportunité matchée : Terrain à Cocody" }),
      ],
    });
    expect(mockSendMatched).toHaveBeenCalledTimes(2);
  });

  it("does not fail verification when matched email sending fails", async () => {
    mockUserFindMany.mockResolvedValueOnce([
      { id: "member-1", email: "member@example.com", name: "Awa", tier: "AFFRANCHI", role: "MEMBER" },
    ]);
    mockSendMatched.mockRejectedValueOnce(new Error("resend down"));

    const res = await PATCH(request({ action: "verify" }), params);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.verificationStatus).toBe("VERIFIED");
    expect(mockNotificationCreateMany).toHaveBeenCalledOnce();
  });

  it("does not re-trigger side effects for an idempotent EN_COURS transition", async () => {
    mockOpportunityFindUnique.mockResolvedValueOnce({
      ...pendingOpportunity,
      verificationStatus: "EN_COURS",
      reviewNotes: "note existante",
    });

    const res = await PATCH(request({ action: "start_review", note: "nouvelle note" }), params);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.verificationStatus).toBe("EN_COURS");
    expect(json.data.reviewNotes).toBe("note existante");
    expect(mockOpportunityUpdate).not.toHaveBeenCalled();
    expect(mockApprovalCreate).not.toHaveBeenCalled();
    expect(mockSendVerified).not.toHaveBeenCalled();
    expect(mockSendRejected).not.toHaveBeenCalled();
    expect(mockNotificationCreateMany).not.toHaveBeenCalled();
  });

  it("does not send matched notifications or emails when re-verifying an already VERIFIED opportunity", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1" } });
    mockUserFindUnique.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
    mockOpportunityFindUnique.mockResolvedValue({
      id: "opp-1",
      title: "Deal déjà vérifié",
      authorId: "author-1",
      verificationStatus: "VERIFIED",
      requiresDoubleVerification: false,
      verifiedAt: new Date("2026-05-01"),
      tags: [{ category: "SECTEUR", value: "tech" }],
      verificationApprovals: [],
      author: { id: "author-1", name: "Koffi", email: "koffi@example.com" },
      _count: { documents: 0, verificationApprovals: 0 },
    });
    mockOpportunityUpdate.mockResolvedValue({
      id: "opp-1",
      title: "Deal déjà vérifié",
      authorId: "author-1",
      verificationStatus: "VERIFIED",
      requiredTier: "AFFRANCHI",
      tags: [{ category: "SECTEUR", value: "tech" }],
      verificationApprovals: [],
      author: { id: "author-1", name: "Koffi", email: "koffi@example.com" },
      _count: { documents: 0, verificationApprovals: 0 },
    });

    const res = await PATCH(request({ action: "verify" }), params);

    expect(res.status).toBe(200);
    expect(mockOpportunityUpdate).not.toHaveBeenCalled();
    expect(mockSendVerified).not.toHaveBeenCalled();
    expect(mockNotificationCreateMany).not.toHaveBeenCalled();
    expect(mockSendMatched).not.toHaveBeenCalled();
  });

});
