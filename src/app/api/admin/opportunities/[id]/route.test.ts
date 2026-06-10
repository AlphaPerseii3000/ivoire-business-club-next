import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE, PATCH } from "./route";
import { shouldRequireDoubleVerification as adminOpportunityRequiresDoubleVerification } from "@/lib/trust-level";

const mockAuth = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockOpportunityFindUnique = vi.hoisted(() => vi.fn());
const mockOpportunityUpdate = vi.hoisted(() => vi.fn());
const mockOpportunityDelete = vi.hoisted(() => vi.fn());
const mockDeleteR2Object = vi.hoisted(() => vi.fn());
const mockGetMissingR2Env = vi.hoisted(() => vi.fn());
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
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    opportunity: { findUnique: mockOpportunityFindUnique, update: mockOpportunityUpdate, delete: mockOpportunityDelete },
  },
}));
vi.mock("@/lib/r2", () => ({ deleteR2Object: mockDeleteR2Object, getMissingR2Env: mockGetMissingR2Env }));
vi.mock("@/lib/sanitize-log", () => ({ sanitizeError: vi.fn(() => "Error: sanitized") }));

function patchRequest(body: unknown) {
  const requestBody = typeof body === "string" ? body : JSON.stringify(body);
  return new Request("http://localhost/api/admin/opportunities/opp-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: requestBody,
  });
}

const params = { params: Promise.resolve({ id: "opp-1" }) };

const baseOpportunity = {
  id: "opp-1",
  title: "Terrain à Cocody",
  description: "Description complète du deal.",
  category: "IMMOBILIER",
  amount: 25000,
  requiredTier: "AFFRANCHI",
  verificationStatus: "PENDING",
  requiresDoubleVerification: false,
  createdAt: new Date("2026-05-01T00:00:00.000Z"),
  updatedAt: new Date("2026-05-02T00:00:00.000Z"),
  verifiedAt: null,
  rejectionNote: null,
  reviewNotes: null,
  adminNote: null,
  author: { id: "author-1", name: "Koffi", email: "koffi@example.com", image: null },
  documents: [
    {
      id: "doc-1",
      opportunityId: "opp-1",
      uploadedById: "author-1",
      fileName: "doc.pdf",
      originalName: "Document.pdf",
      mimeType: "application/pdf",
      size: 1234,
      publicUrl: null,
      r2Key: "opportunities/opp-1/documents/doc-1.pdf",
      createdAt: new Date("2026-05-01T00:00:00.000Z"),
      updatedAt: new Date("2026-05-01T00:00:00.000Z"),
    },
  ],
  verificationApprovals: [],
  _count: { documents: 1, verificationApprovals: 0 },
};

const validUpdate = {
  title: "Deal édité",
  description: "Description complète et éditée du deal.",
  category: "BUSINESS",
  amount: 75000,
  requiredTier: "BOSS",
};

describe("PATCH /api/admin/opportunities/[id]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "admin-1" } });
    mockUserFindUnique.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
    mockOpportunityFindUnique.mockResolvedValueOnce(baseOpportunity).mockResolvedValue(baseOpportunity);
    mockOpportunityUpdate.mockResolvedValue({ ...baseOpportunity, ...validUpdate, requiresDoubleVerification: true });
    mockGetMissingR2Env.mockReturnValue([]);
    mockDeleteR2Object.mockResolvedValue(undefined);
  });

  it("returns 401 for unauthenticated requests", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await PATCH(patchRequest(validUpdate), params);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Non autorisé");
  });

  it("returns 403 for non-admin users", async () => {
    mockUserFindUnique.mockResolvedValueOnce({ id: "member-1", role: "MEMBER" });

    const res = await PATCH(patchRequest(validUpdate), params);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toBe("Interdit");
  });

  it("returns 400 for malformed JSON before validation", async () => {
    const res = await PATCH(patchRequest("{"), params);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("JSON invalide");
    expect(mockOpportunityUpdate).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid Zod fields", async () => {
    const res = await PATCH(patchRequest({ ...validUpdate, title: "x" }), params);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Le titre doit contenir au moins 3 caractères");
    expect(mockOpportunityUpdate).not.toHaveBeenCalled();
  });

  it("returns 404 when the opportunity does not exist", async () => {
    mockOpportunityFindUnique.mockReset();
    mockOpportunityFindUnique.mockResolvedValueOnce(null);

    const res = await PATCH(patchRequest(validUpdate), params);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe("Opportunité introuvable");
  });

  it("updates allowed fields and enables double verification for amount above 50k, and creates audit log", async () => {
    const updatedForResponse = { ...baseOpportunity, ...validUpdate, requiresDoubleVerification: true, updatedAt: new Date("2026-05-03T00:00:00.000Z") };
    mockOpportunityFindUnique.mockReset();
    mockOpportunityFindUnique.mockResolvedValueOnce(baseOpportunity).mockResolvedValueOnce(updatedForResponse);

    const res = await PATCH(patchRequest(validUpdate), params);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(mockOpportunityUpdate).toHaveBeenCalledWith({
      where: { id: "opp-1" },
      data: {
        title: "Deal édité",
        description: "Description complète et éditée du deal.",
        category: "BUSINESS",
        amount: 75000,
        requiredTier: "BOSS",
        requiresDoubleVerification: true,
      },
    });
    expect(json.data.requiresDoubleVerification).toBe(true);
    expect(json.data.documents[0].originalName).toBe("Document.pdf");
    // AC8: audit log created for opportunity update
    expect(mockSafeCreateAuditLog).toHaveBeenCalledWith({
      actorId: "admin-1",
      action: "OPPORTUNITY_UPDATE",
      entityType: "Opportunity",
      entityId: "opp-1",
      metadata: expect.objectContaining({
        changedFields: expect.objectContaining({
          title: true,
          category: true,
          amount: true,
        }),
      }),
    });
  });

  it("preserves double verification when a verified deal amount decreases", () => {
    expect(adminOpportunityRequiresDoubleVerification({
      amount: 1000,
      currentRequiresDoubleVerification: true,
      existingApprovalCount: 0,
      verificationStatus: "VERIFIED",
    })).toBe(true);
  });

  it("clears double verification when amount decreases without compliance context", () => {
    expect(adminOpportunityRequiresDoubleVerification({
      amount: 1000,
      currentRequiresDoubleVerification: true,
      existingApprovalCount: 1,
      verificationStatus: "EN_COURS",
    })).toBe(false);
  });
});

describe("DELETE /api/admin/opportunities/[id]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "admin-1" } });
    mockUserFindUnique.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
    mockOpportunityFindUnique.mockResolvedValue({
      id: "opp-1",
      verificationStatus: "PENDING",
      requiresDoubleVerification: false,
      documents: [{ id: "doc-1", r2Key: "opportunities/opp-1/documents/doc-1.pdf" }],
      verificationApprovals: [],
    });
    mockOpportunityDelete.mockResolvedValue({ id: "opp-1" });
    mockGetMissingR2Env.mockReturnValue([]);
    mockDeleteR2Object.mockResolvedValue(undefined);
  });

  it("deletes the opportunity and then its R2 documents, and creates audit log", async () => {
    const res = await DELETE(new Request("http://localhost/api/admin/opportunities/opp-1", { method: "DELETE" }), params);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.ok).toBe(true);
    expect(mockOpportunityDelete).toHaveBeenCalledWith({ where: { id: "opp-1" } });
    expect(mockDeleteR2Object).toHaveBeenCalledWith("opportunities/opp-1/documents/doc-1.pdf");
    // AC8: audit log created for opportunity delete
    expect(mockSafeCreateAuditLog).toHaveBeenCalledWith({
      actorId: "admin-1",
      action: "OPPORTUNITY_DELETE",
      entityType: "Opportunity",
      entityId: "opp-1",
      metadata: expect.objectContaining({ previousStatus: "PENDING" }),
    });
  });

  it("does not fail the user response when R2 deletion fails after DB deletion", async () => {
    mockDeleteR2Object.mockRejectedValueOnce(new Error("r2 down"));

    const res = await DELETE(new Request("http://localhost/api/admin/opportunities/opp-1", { method: "DELETE" }), params);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.ok).toBe(true);
    expect(mockOpportunityDelete).toHaveBeenCalledOnce();
  });
});
