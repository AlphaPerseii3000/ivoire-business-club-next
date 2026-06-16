import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

const mockAuth = vi.hoisted(() => vi.fn());
const mockGetUserPremiumAccess = vi.hoisted(() => vi.fn());
const mockCanUserAccessOpportunity = vi.hoisted(() => vi.fn());
const mockDocumentFindUnique = vi.hoisted(() => vi.fn());
const mockAccessRequestFindUnique = vi.hoisted(() => vi.fn());
const mockAccessRequestCreate = vi.hoisted(() => vi.fn());
const mockAccessRequestDelete = vi.hoisted(() => vi.fn());
const mockSafeCreateAuditLog = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/subscription-access", () => ({ getUserPremiumAccess: mockGetUserPremiumAccess }));
vi.mock("@/lib/opportunity-visibility", () => ({ canUserAccessOpportunity: mockCanUserAccessOpportunity }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    document: { findUnique: mockDocumentFindUnique },
    documentAccessRequest: {
      findUnique: mockAccessRequestFindUnique,
      create: mockAccessRequestCreate,
      delete: mockAccessRequestDelete,
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

const context = { params: Promise.resolve({ id: "opp-1", docId: "doc-1" }) };

function makeRequest() {
  return new Request("http://localhost/api/opportunities/opp-1/documents/doc-1/request-access", {
    method: "POST",
  });
}

function baseDocument(overrides = {}) {
  return {
    id: "doc-1",
    opportunityId: "opp-1",
    uploadedById: "author-1",
    opportunity: { id: "opp-1", authorId: "author-1", requiredTier: "AFFRANCHI" },
    ...overrides,
  };
}

describe("POST /api/opportunities/[id]/documents/[docId]/request-access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "member-1", role: "MEMBER", tier: "AFFRANCHI" } });
    mockGetUserPremiumAccess.mockResolvedValue({ hasAccess: true });
    mockCanUserAccessOpportunity.mockReturnValue(true);
    mockDocumentFindUnique.mockResolvedValue(baseDocument());
    mockAccessRequestFindUnique.mockResolvedValue(null);
    mockAccessRequestCreate.mockResolvedValue({
      id: "req-1",
      status: "PENDING",
      createdAt: new Date("2026-06-17"),
    });
    mockSafeCreateAuditLog.mockResolvedValue(undefined);
  });

  it("returns 401 for anonymous visitors", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await POST(makeRequest(), context);

    expect(response.status).toBe(401);
    expect(mockAccessRequestCreate).not.toHaveBeenCalled();
  });

  it("returns 403 when premium access is missing", async () => {
    mockGetUserPremiumAccess.mockResolvedValue({ hasAccess: false });

    const response = await POST(makeRequest(), context);

    expect(response.status).toBe(403);
    expect(mockAccessRequestCreate).not.toHaveBeenCalled();
  });

  it("returns 404 when document not found", async () => {
    mockDocumentFindUnique.mockResolvedValue(null);

    const response = await POST(makeRequest(), context);

    expect(response.status).toBe(404);
  });

  it("returns 404 when document does not belong to opportunity", async () => {
    mockDocumentFindUnique.mockResolvedValue(baseDocument({ opportunityId: "opp-other" }));

    const response = await POST(makeRequest(), context);

    expect(response.status).toBe(404);
  });

  it("returns 403 when tier access is insufficient", async () => {
    mockCanUserAccessOpportunity.mockReturnValue(false);

    const response = await POST(makeRequest(), context);

    expect(response.status).toBe(403);
    expect(mockAccessRequestCreate).not.toHaveBeenCalled();
  });

  it("returns 400 when author requests access (no need)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "author-1", role: "MEMBER", tier: "AFFRANCHI" } });

    const response = await POST(makeRequest(), context);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("Vous avez déjà accès à ce document.");
    expect(mockAccessRequestCreate).not.toHaveBeenCalled();
  });

  it("returns 400 when admin requests access (no need)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN", tier: "AFFRANCHI" } });

    const response = await POST(makeRequest(), context);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("Vous avez déjà accès à ce document.");
    expect(mockAccessRequestCreate).not.toHaveBeenCalled();
  });

  it("returns 409 when PENDING request already exists", async () => {
    mockAccessRequestFindUnique.mockResolvedValue({
      id: "req-existing",
      status: "PENDING",
      createdAt: new Date("2026-06-16"),
    });

    const response = await POST(makeRequest(), context);
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error).toBe("Vous avez déjà demandé l'accès à ce document.");
    expect(mockAccessRequestCreate).not.toHaveBeenCalled();
  });

  it("returns 409 when APPROVED request already exists", async () => {
    mockAccessRequestFindUnique.mockResolvedValue({
      id: "req-existing",
      status: "APPROVED",
      createdAt: new Date("2026-06-16"),
    });

    const response = await POST(makeRequest(), context);
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error).toBe("Vous avez déjà demandé l'accès à ce document.");
    expect(mockAccessRequestCreate).not.toHaveBeenCalled();
  });

  it("deletes DENIED request and creates new request on re-request", async () => {
    mockAccessRequestFindUnique.mockResolvedValue({
      id: "req-denied",
      status: "DENIED",
      createdAt: new Date("2026-06-15"),
    });
    mockAccessRequestDelete.mockResolvedValue({ id: "req-denied" });

    const response = await POST(makeRequest(), context);
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(mockAccessRequestDelete).toHaveBeenCalledWith({
      where: { id: "req-denied" },
    });
    expect(mockAccessRequestCreate).toHaveBeenCalled();
    expect(payload.data.status).toBe("PENDING");
  });

  it("creates access request with audit log on success", async () => {
    const response = await POST(makeRequest(), context);
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.data.id).toBe("req-1");
    expect(payload.data.status).toBe("PENDING");
    expect(mockAccessRequestCreate).toHaveBeenCalledWith({
      data: {
        requesterId: "member-1",
        documentId: "doc-1",
        status: "PENDING",
      },
      select: { id: true, status: true, createdAt: true },
    });
    expect(mockSafeCreateAuditLog).toHaveBeenCalledWith({
      actorId: "member-1",
      action: "DOCUMENT_ACCESS_REQUESTED",
      entityType: "Document",
      entityId: "doc-1",
      metadata: { requesterId: "member-1", opportunityId: "opp-1" },
    });
  });
});