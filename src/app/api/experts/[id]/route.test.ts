import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, PUT, DELETE } from "./route";

const mockAuth = vi.hoisted(() => vi.fn());
const mockExpertFindFirst = vi.hoisted(() => vi.fn());
const mockExpertFindMany = vi.hoisted(() => vi.fn());
const mockExpertUpdate = vi.hoisted(() => vi.fn());
const mockExpertDelete = vi.hoisted(() => vi.fn());
const mockSafeCreateAuditLog = vi.hoisted(() => vi.fn());
const mockPromoteConfiguredAdminUser = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    expert: {
      findFirst: mockExpertFindFirst,
      findMany: mockExpertFindMany,
      update: mockExpertUpdate,
      delete: mockExpertDelete,
    },
  },
}));
vi.mock("@/lib/audit-log", () => ({
  safeCreateAuditLog: mockSafeCreateAuditLog,
}));
vi.mock("@/lib/admin-access", () => ({
  promoteConfiguredAdminUser: mockPromoteConfiguredAdminUser,
}));

mockPromoteConfiguredAdminUser.mockImplementation(async (userId: string) => {
  const session = await mockAuth();
  if (session?.user?.id === userId) {
    return { id: userId, role: session.user.role };
  }
  return null;
});

function makeRequest(method: string, body?: unknown) {
  return new Request("http://localhost/api/experts/test-id", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const mockExpert = {
  id: "exp-1",
  name: "Jean Koffi",
  slug: "jean-koffi",
  title: "Expert Fiscal",
  bio: "Une biographie de plus de dix caractères pour passer les validations.",
  photoUrl: null,
  phone: null,
  email: null,
  whatsapp: null,
  specialties: "fiscalité",
  requiredTier: "AFFRANCHI",
  isPublished: false,
};

describe("GET /api/experts/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 if expert is not found", async () => {
    mockExpertFindFirst.mockResolvedValue(null);

    const response = await GET(makeRequest("GET"), { params: Promise.resolve({ id: "unknown" }) });
    expect(response.status).toBe(404);
  });

  it("does not expose draft experts to visitors", async () => {
    mockAuth.mockResolvedValue(null);
    mockExpertFindFirst.mockResolvedValue(mockExpert);

    const response = await GET(makeRequest("GET"), { params: Promise.resolve({ id: "exp-1" }) });
    expect(response.status).toBe(404);
  });

  it("returns 200 for visitor when expert is published", async () => {
    mockAuth.mockResolvedValue(null);
    mockExpertFindFirst.mockResolvedValue({
      ...mockExpert,
      isPublished: true,
    });

    const response = await GET(makeRequest("GET"), { params: Promise.resolve({ id: "exp-1" }) });
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.id).toBe("exp-1");
  });

  it("returns 200 for admin even when expert is not published", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockExpertFindFirst.mockResolvedValue(mockExpert);

    const response = await GET(makeRequest("GET"), { params: Promise.resolve({ id: "exp-1" }) });
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.id).toBe("exp-1");
  });
});

describe("PUT /api/experts/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "MEMBER" } });

    const response = await PUT(makeRequest("PUT", { title: "Nouveau titre" }), {
      params: Promise.resolve({ id: "exp-1" }),
    });
    expect(response.status).toBe(403);
  });

  it("updates fields and regenerates slug when name changes", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockExpertFindFirst.mockResolvedValueOnce(mockExpert);
    mockExpertFindMany.mockResolvedValueOnce([]);

    mockExpertUpdate.mockResolvedValue({
      ...mockExpert,
      name: "Jean Koffi Mis A Jour",
      slug: "jean-koffi-mis-a-jour",
    });

    const response = await PUT(makeRequest("PUT", { name: "Jean Koffi Mis A Jour" }), {
      params: Promise.resolve({ id: "exp-1" }),
    });

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.name).toBe("Jean Koffi Mis A Jour");
    expect(payload.slug).toBe("jean-koffi-mis-a-jour");
    expect(mockSafeCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "admin-1",
        action: "EXPERT_UPDATE",
        entityType: "EXPERT",
        entityId: "exp-1",
      })
    );
  });

  it("logs EXPERT_PUBLISH when publishing a draft expert", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockExpertFindFirst.mockResolvedValueOnce(mockExpert);
    mockExpertUpdate.mockResolvedValue({
      ...mockExpert,
      isPublished: true,
    });

    const response = await PUT(makeRequest("PUT", { isPublished: true }), {
      params: Promise.resolve({ id: "exp-1" }),
    });

    expect(response.status).toBe(200);
    expect(mockSafeCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "admin-1",
        action: "EXPERT_PUBLISH",
        entityId: "exp-1",
      })
    );
  });

  it("logs EXPERT_UNPUBLISH when unpublishing a published expert", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockExpertFindFirst.mockResolvedValueOnce({
      ...mockExpert,
      isPublished: true,
    });
    mockExpertUpdate.mockResolvedValue({
      ...mockExpert,
      isPublished: false,
    });

    const response = await PUT(makeRequest("PUT", { isPublished: false }), {
      params: Promise.resolve({ id: "exp-1" }),
    });

    expect(response.status).toBe(200);
    expect(mockSafeCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "admin-1",
        action: "EXPERT_UNPUBLISH",
        entityId: "exp-1",
      })
    );
  });
});

describe("DELETE /api/experts/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "MEMBER" } });

    const response = await DELETE(makeRequest("DELETE"), {
      params: Promise.resolve({ id: "exp-1" }),
    });
    expect(response.status).toBe(403);
  });

  it("deletes expert and logs EXPERT_DELETE for admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockExpertFindFirst.mockResolvedValue(mockExpert);
    mockExpertDelete.mockResolvedValue(mockExpert);

    const response = await DELETE(makeRequest("DELETE"), {
      params: Promise.resolve({ id: "exp-1" }),
    });

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.data.ok).toBe(true);
    expect(mockExpertDelete).toHaveBeenCalledWith({
      where: { id: "exp-1" },
    });
    expect(mockSafeCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "admin-1",
        action: "EXPERT_DELETE",
        entityType: "EXPERT",
        entityId: "exp-1",
      })
    );
  });
});
