import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, PUT, DELETE } from "./route";

const mockAuth = vi.hoisted(() => vi.fn());
const mockCompanyFindFirst = vi.hoisted(() => vi.fn());
const mockCompanyFindMany = vi.hoisted(() => vi.fn());
const mockCompanyUpdate = vi.hoisted(() => vi.fn());
const mockCompanyDelete = vi.hoisted(() => vi.fn());
const mockSafeCreateAuditLog = vi.hoisted(() => vi.fn());
const mockPromoteConfiguredAdminUser = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    company: {
      findFirst: mockCompanyFindFirst,
      findMany: mockCompanyFindMany,
      update: mockCompanyUpdate,
      delete: mockCompanyDelete,
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
  return new Request("http://localhost/api/companies/test-id", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const mockCompany = {
  id: "comp-1",
  name: "KS Construction",
  slug: "ks-construction",
  description: "Une description de plus de dix caractères pour passer les validations.",
  logoUrl: null,
  contactName: null,
  contactPhone: null,
  contactEmail: null,
  website: null,
  location: "Abidjan",
  certifications: null,
  sectors: "btp",
  isPublished: false,
};

describe("GET /api/companies/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 if company is not found", async () => {
    mockCompanyFindFirst.mockResolvedValue(null);

    const response = await GET(makeRequest("GET"), { params: Promise.resolve({ id: "unknown" }) });
    expect(response.status).toBe(404);
  });

  it("does not expose draft companies to visitors", async () => {
    mockAuth.mockResolvedValue(null);
    mockCompanyFindFirst.mockResolvedValue(mockCompany);

    const response = await GET(makeRequest("GET"), { params: Promise.resolve({ id: "comp-1" }) });
    expect(response.status).toBe(404);
  });

  it("returns 200 for visitor when company is published", async () => {
    mockAuth.mockResolvedValue(null);
    mockCompanyFindFirst.mockResolvedValue({
      ...mockCompany,
      isPublished: true,
    });

    const response = await GET(makeRequest("GET"), { params: Promise.resolve({ id: "comp-1" }) });
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.id).toBe("comp-1");
  });

  it("returns 200 for admin even when company is not published", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockCompanyFindFirst.mockResolvedValue(mockCompany);

    const response = await GET(makeRequest("GET"), { params: Promise.resolve({ id: "comp-1" }) });
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.id).toBe("comp-1");
  });
});

describe("PUT /api/companies/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "MEMBER" } });

    const response = await PUT(makeRequest("PUT", { name: "Nouveau Nom" }), {
      params: Promise.resolve({ id: "comp-1" }),
    });
    expect(response.status).toBe(403);
  });

  it("updates fields and regenerates slug when name changes", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockCompanyFindFirst.mockResolvedValueOnce(mockCompany);
    mockCompanyFindMany.mockResolvedValueOnce([]);

    mockCompanyUpdate.mockResolvedValue({
      ...mockCompany,
      name: "KS Construction Mis A Jour",
      slug: "ks-construction-mis-a-jour",
    });

    const response = await PUT(makeRequest("PUT", { name: "KS Construction Mis A Jour" }), {
      params: Promise.resolve({ id: "comp-1" }),
    });

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.name).toBe("KS Construction Mis A Jour");
    expect(payload.slug).toBe("ks-construction-mis-a-jour");
    expect(mockSafeCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "admin-1",
        action: "COMPANY_UPDATE",
        entityType: "COMPANY",
        entityId: "comp-1",
      })
    );
  });

  it("logs COMPANY_PUBLISH when publishing a draft company", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockCompanyFindFirst.mockResolvedValueOnce(mockCompany);
    mockCompanyUpdate.mockResolvedValue({
      ...mockCompany,
      isPublished: true,
    });

    const response = await PUT(makeRequest("PUT", { isPublished: true }), {
      params: Promise.resolve({ id: "comp-1" }),
    });

    expect(response.status).toBe(200);
    expect(mockSafeCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "admin-1",
        action: "COMPANY_PUBLISH",
        entityId: "comp-1",
      })
    );
  });

  it("logs COMPANY_UNPUBLISH when unpublishing a published company", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockCompanyFindFirst.mockResolvedValueOnce({
      ...mockCompany,
      isPublished: true,
    });
    mockCompanyUpdate.mockResolvedValue({
      ...mockCompany,
      isPublished: false,
    });

    const response = await PUT(makeRequest("PUT", { isPublished: false }), {
      params: Promise.resolve({ id: "comp-1" }),
    });

    expect(response.status).toBe(200);
    expect(mockSafeCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "admin-1",
        action: "COMPANY_UNPUBLISH",
        entityId: "comp-1",
      })
    );
  });
});

describe("DELETE /api/companies/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "MEMBER" } });

    const response = await DELETE(makeRequest("DELETE"), {
      params: Promise.resolve({ id: "comp-1" }),
    });
    expect(response.status).toBe(403);
  });

  it("deletes company and logs COMPANY_DELETE for admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockCompanyFindFirst.mockResolvedValue(mockCompany);
    mockCompanyDelete.mockResolvedValue(mockCompany);

    const response = await DELETE(makeRequest("DELETE"), {
      params: Promise.resolve({ id: "comp-1" }),
    });

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.data.ok).toBe(true);
    expect(mockCompanyDelete).toHaveBeenCalledWith({
      where: { id: "comp-1" },
    });
    expect(mockSafeCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "admin-1",
        action: "COMPANY_DELETE",
        entityType: "COMPANY",
        entityId: "comp-1",
      })
    );
  });
});
