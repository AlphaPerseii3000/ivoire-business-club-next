import { beforeEach, describe, expect, it, vi } from "vitest";

import { PATCH } from "./route";

const mockAuth = vi.hoisted(() => vi.fn());
const mockDocumentFindUnique = vi.hoisted(() => vi.fn());
const mockAccessRequestFindUnique = vi.hoisted(() => vi.fn());
const mockAccessRequestUpdate = vi.hoisted(() => vi.fn());
const mockSafeCreateAuditLog = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    document: { findUnique: mockDocumentFindUnique },
    documentAccessRequest: {
      findUnique: mockAccessRequestFindUnique,
      update: mockAccessRequestUpdate,
    },
  },
}));
vi.mock("@/lib/audit-log", () => ({
  AUDIT_ACTIONS: {
    DOCUMENT_ACCESS_REQUESTED: "DOCUMENT_ACCESS_REQUESTED",
    DOCUMENT_ACCESS_APPROVED: "DOCUMENT_ACCESS_APPROVED",
    DOCUMENT_ACCESS_DENIED: "DOCUMENT_ACCESS_DENIED",
    DOCUMENT_VIEWED: "DOCUMENT_VIEWED",
    DOCUMENT_DOWNLOADED: "DOCUMENT_DOWNLOADED",
  },
  safeCreateAuditLog: mockSafeCreateAuditLog,
}));
vi.mock("@/lib/document-access", () => ({
  canManageDocuments: (session: { userId: string; role: string }, authorId: string) =>
    session.userId === authorId || session.role === "ADMIN",
}));
vi.mock("@/lib/sanitize-log", () => ({ sanitizeError: (error: unknown) => String(error) }));

const context = { params: Promise.resolve({ id: "opp-1", documentId: "doc-1" }) };

function makeRequest(body: { requestIds: string[]; action: string }) {
  return new Request("http://localhost/api/opportunities/opp-1/documents/doc-1/grant-access", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function baseDocument(overrides = {}) {
  return {
    id: "doc-1",
    opportunityId: "opp-1",
    opportunity: { id: "opp-1", authorId: "author-1" },
    ...overrides,
  };
}

describe("PATCH /api/opportunities/[id]/documents/[documentId]/grant-access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "author-1", role: "MEMBER", status: "ACTIVE" } });
    mockDocumentFindUnique.mockResolvedValue(baseDocument());
    mockAccessRequestFindUnique.mockResolvedValue(null);
    mockAccessRequestUpdate.mockResolvedValue({ id: "req-1", status: "APPROVED" });
    mockSafeCreateAuditLog.mockResolvedValue(undefined);
  });

  it("returns 401 for anonymous visitors", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await PATCH(makeRequest({ requestIds: ["req-1"], action: "approve" }), context);

    expect(response.status).toBe(401);
    expect(mockAccessRequestUpdate).not.toHaveBeenCalled();
  });

  it("returns 404 when document not found", async () => {
    mockDocumentFindUnique.mockResolvedValue(null);

    const response = await PATCH(makeRequest({ requestIds: ["req-1"], action: "approve" }), context);

    expect(response.status).toBe(404);
  });

  it("returns 403 for non-author/non-admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "other-user", role: "MEMBER", status: "ACTIVE" } });

    const response = await PATCH(makeRequest({ requestIds: ["req-1"], action: "approve" }), context);

    expect(response.status).toBe(403);
    expect(mockAccessRequestUpdate).not.toHaveBeenCalled();
  });

  it("returns 403 when admin is suspended", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN", status: "SUSPENDED" } });

    const response = await PATCH(makeRequest({ requestIds: ["req-1"], action: "approve" }), context);

    expect(response.status).toBe(403);
    const payload = await response.json();
    expect(payload.error).toBe("Compte suspendu");
    expect(mockAccessRequestUpdate).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid requestIds", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/opportunities/opp-1/documents/doc-1/grant-access", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestIds: [], action: "approve" }),
      }),
      context,
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid action", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/opportunities/opp-1/documents/doc-1/grant-access", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestIds: ["req-1"], action: "invalid" }),
      }),
      context,
    );

    expect(response.status).toBe(400);
  });

  it("approves a PENDING request with audit log", async () => {
    mockAccessRequestFindUnique.mockResolvedValue({
      id: "req-1",
      status: "PENDING",
      requesterId: "member-1",
      documentId: "doc-1",
    });

    const response = await PATCH(makeRequest({ requestIds: ["req-1"], action: "approve" }), context);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.processed).toBe(1);
    expect(mockAccessRequestUpdate).toHaveBeenCalledWith({
      where: { id: "req-1" },
      data: {
        status: "APPROVED",
        reviewedById: "author-1",
        reviewedAt: expect.any(Date),
      },
    });
    expect(mockSafeCreateAuditLog).toHaveBeenCalledWith({
      actorId: "author-1",
      action: "DOCUMENT_ACCESS_APPROVED",
      entityType: "DocumentAccessRequest",
      entityId: "req-1",
      metadata: {
        requesterId: "member-1",
        documentId: "doc-1",
        opportunityId: "opp-1",
        newStatus: "APPROVED",
      },
    });
  });

  it("denies a PENDING request with audit log", async () => {
    mockAccessRequestFindUnique.mockResolvedValue({
      id: "req-1",
      status: "PENDING",
      requesterId: "member-1",
      documentId: "doc-1",
    });

    const response = await PATCH(makeRequest({ requestIds: ["req-1"], action: "deny" }), context);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.processed).toBe(1);
    expect(mockAccessRequestUpdate).toHaveBeenCalledWith({
      where: { id: "req-1" },
      data: {
        status: "DENIED",
        reviewedById: "author-1",
        reviewedAt: expect.any(Date),
      },
    });
    expect(mockSafeCreateAuditLog).toHaveBeenCalledWith({
      actorId: "author-1",
      action: "DOCUMENT_ACCESS_DENIED",
      entityType: "DocumentAccessRequest",
      entityId: "req-1",
      metadata: {
        requesterId: "member-1",
        documentId: "doc-1",
        opportunityId: "opp-1",
        newStatus: "DENIED",
      },
    });
  });

  it("is idempotent — skips already APPROVED requests without audit log", async () => {
    mockAccessRequestFindUnique.mockResolvedValue({
      id: "req-1",
      status: "APPROVED",
      requesterId: "member-1",
      documentId: "doc-1",
    });

    const response = await PATCH(makeRequest({ requestIds: ["req-1"], action: "approve" }), context);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.processed).toBe(0);
    expect(mockAccessRequestUpdate).not.toHaveBeenCalled();
    expect(mockSafeCreateAuditLog).not.toHaveBeenCalled();
  });

  it("is idempotent — skips already DENIED requests without audit log", async () => {
    mockAccessRequestFindUnique.mockResolvedValue({
      id: "req-1",
      status: "DENIED",
      requesterId: "member-1",
      documentId: "doc-1",
    });

    const response = await PATCH(makeRequest({ requestIds: ["req-1"], action: "deny" }), context);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.processed).toBe(0);
    expect(mockAccessRequestUpdate).not.toHaveBeenCalled();
    expect(mockSafeCreateAuditLog).not.toHaveBeenCalled();
  });

  it("skips requests for different documents", async () => {
    mockAccessRequestFindUnique.mockResolvedValue({
      id: "req-1",
      status: "PENDING",
      requesterId: "member-1",
      documentId: "doc-other", // different document
    });

    const response = await PATCH(makeRequest({ requestIds: ["req-1"], action: "approve" }), context);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.processed).toBe(0);
    expect(mockAccessRequestUpdate).not.toHaveBeenCalled();
  });

  it("processes multiple PENDING requests", async () => {
    mockAccessRequestFindUnique
      .mockResolvedValueOnce({
        id: "req-1",
        status: "PENDING",
        requesterId: "member-1",
        documentId: "doc-1",
      })
      .mockResolvedValueOnce({
        id: "req-2",
        status: "PENDING",
        requesterId: "member-2",
        documentId: "doc-1",
      });

    const response = await PATCH(makeRequest({ requestIds: ["req-1", "req-2"], action: "approve" }), context);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.processed).toBe(2);
    expect(mockAccessRequestUpdate).toHaveBeenCalledTimes(2);
    expect(mockSafeCreateAuditLog).toHaveBeenCalledTimes(2);
  });

  it("allows admin to grant access", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN", status: "ACTIVE" } });
    mockAccessRequestFindUnique.mockResolvedValue({
      id: "req-1",
      status: "PENDING",
      requesterId: "member-1",
      documentId: "doc-1",
    });

    const response = await PATCH(makeRequest({ requestIds: ["req-1"], action: "approve" }), context);

    expect(response.status).toBe(200);
    expect(mockAccessRequestUpdate).toHaveBeenCalled();
  });
});