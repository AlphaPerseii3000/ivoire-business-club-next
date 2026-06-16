import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    documentAccessRequest: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { canManageDocuments, canViewDocument, hasApprovedAccess, getAccessStatusForDocuments } from "./document-access";
import { prisma } from "@/lib/prisma";

const mockFindUnique = prisma.documentAccessRequest.findUnique as ReturnType<typeof vi.fn>;
const mockFindMany = prisma.documentAccessRequest.findMany as ReturnType<typeof vi.fn>;

describe("canManageDocuments", () => {
  it("allows the opportunity author", () => {
    expect(canManageDocuments({ userId: "user-1", role: "MEMBER" }, "user-1")).toBe(true);
  });

  it("allows admins", () => {
    expect(canManageDocuments({ userId: "admin-1", role: "ADMIN" }, "user-1")).toBe(true);
  });

  it("rejects non-author members", () => {
    expect(canManageDocuments({ userId: "user-2", role: "MEMBER" }, "user-1")).toBe(false);
  });
});

describe("hasApprovedAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when APPROVED request exists", async () => {
    mockFindUnique.mockResolvedValue({ status: "APPROVED" });
    const result = await hasApprovedAccess("user-1", "doc-1");
    expect(result).toBe(true);
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { requesterId_documentId: { requesterId: "user-1", documentId: "doc-1" } },
      select: { status: true },
    });
  });

  it("returns false when PENDING request exists", async () => {
    mockFindUnique.mockResolvedValue({ status: "PENDING" });
    const result = await hasApprovedAccess("user-1", "doc-1");
    expect(result).toBe(false);
  });

  it("returns false when DENIED request exists", async () => {
    mockFindUnique.mockResolvedValue({ status: "DENIED" });
    const result = await hasApprovedAccess("user-1", "doc-1");
    expect(result).toBe(false);
  });

  it("returns false when no request exists", async () => {
    mockFindUnique.mockResolvedValue(null);
    const result = await hasApprovedAccess("user-1", "doc-1");
    expect(result).toBe(false);
  });
});

describe("canViewDocument", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows the opportunity author", async () => {
    const result = await canViewDocument({ userId: "user-1", role: "MEMBER" }, "doc-1", "user-1");
    expect(result).toBe(true);
  });

  it("allows admins", async () => {
    const result = await canViewDocument({ userId: "admin-1", role: "ADMIN" }, "doc-1", "user-1");
    expect(result).toBe(true);
  });

  it("allows member with APPROVED access", async () => {
    mockFindUnique.mockResolvedValue({ status: "APPROVED" });
    const result = await canViewDocument({ userId: "user-2", role: "MEMBER" }, "doc-1", "user-1");
    expect(result).toBe(true);
  });

  it("rejects member without approved access", async () => {
    mockFindUnique.mockResolvedValue(null);
    const result = await canViewDocument({ userId: "user-2", role: "MEMBER" }, "doc-1", "user-1");
    expect(result).toBe(false);
  });

  it("rejects member with PENDING access", async () => {
    mockFindUnique.mockResolvedValue({ status: "PENDING" });
    const result = await canViewDocument({ userId: "user-2", role: "MEMBER" }, "doc-1", "user-1");
    expect(result).toBe(false);
  });
});

describe("getAccessStatusForDocuments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty map for empty documentIds", async () => {
    const result = await getAccessStatusForDocuments("user-1", []);
    expect(result.size).toBe(0);
  });

  it("returns 'locked' for documents with no request", async () => {
    mockFindMany.mockResolvedValue([]);
    const result = await getAccessStatusForDocuments("user-1", ["doc-1", "doc-2"]);
    expect(result.get("doc-1")).toBe("locked");
    expect(result.get("doc-2")).toBe("locked");
  });

  it("returns correct status for documents with requests", async () => {
    mockFindMany.mockResolvedValue([
      { documentId: "doc-1", status: "APPROVED" },
      { documentId: "doc-2", status: "PENDING" },
      { documentId: "doc-3", status: "DENIED" },
    ]);
    const result = await getAccessStatusForDocuments("user-1", ["doc-1", "doc-2", "doc-3", "doc-4"]);
    expect(result.get("doc-1")).toBe("approved");
    expect(result.get("doc-2")).toBe("pending");
    expect(result.get("doc-3")).toBe("denied");
    expect(result.get("doc-4")).toBe("locked");
  });
});