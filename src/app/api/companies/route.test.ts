import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

const mockAuth = vi.hoisted(() => vi.fn());
const mockCompanyFindMany = vi.hoisted(() => vi.fn());
const mockCompanyCreate = vi.hoisted(() => vi.fn());
const mockCompanyFindFirst = vi.hoisted(() => vi.fn());
const mockCompanyCount = vi.hoisted(() => vi.fn());
const mockSafeCreateAuditLog = vi.hoisted(() => vi.fn());
const mockPromoteConfiguredAdminUser = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    company: {
      findMany: mockCompanyFindMany,
      create: mockCompanyCreate,
      findFirst: mockCompanyFindFirst,
      count: mockCompanyCount,
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

function makePostRequest(body: unknown) {
  return new Request("http://localhost/api/companies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const mockCompanies = [
  {
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
    isPublished: true,
  },
  {
    id: "comp-2",
    name: "UEMOA Conseil",
    slug: "uemoa-conseil",
    description: "Une description de plus de dix caractères pour passer les validations.",
    logoUrl: null,
    contactName: null,
    contactPhone: null,
    contactEmail: null,
    website: null,
    location: "Marcory",
    certifications: null,
    sectors: "conseil",
    isPublished: false,
  },
];

describe("GET /api/companies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns only published companies sorted by createdAt desc", async () => {
    mockCompanyFindMany.mockResolvedValue([mockCompanies[0]]);
    mockCompanyCount.mockResolvedValue(1);

    const response = await GET(new Request("http://localhost/api/companies"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toHaveLength(1);
    expect(payload.data[0].name).toBe("KS Construction");
    expect(payload.meta).toEqual({
      page: 1,
      limit: 20,
      totalCount: 1,
      totalPages: 1,
    });
    expect(mockCompanyFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isPublished: true },
        orderBy: { createdAt: "desc" },
        skip: 0,
        take: 20,
      })
    );
  });

  it("handles pagination via page parameter", async () => {
    mockCompanyFindMany.mockResolvedValue([]);
    mockCompanyCount.mockResolvedValue(25);

    const response = await GET(new Request("http://localhost/api/companies?page=2"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.meta).toEqual({
      page: 2,
      limit: 20,
      totalCount: 25,
      totalPages: 2,
    });
    expect(mockCompanyFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isPublished: true },
        orderBy: { createdAt: "desc" },
        skip: 20,
        take: 20,
      })
    );
  });
});

describe("POST /api/companies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthorized user (non-admin)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "MEMBER" } });

    const response = await POST(
      makePostRequest({
        name: "Test Company",
        description: "Une description de plus de dix caractères pour passer les validations.",
      })
    );

    expect(response.status).toBe(403);
    const payload = await response.json();
    expect(payload.error).toBe("Non autorisé");
  });

  it("creates a company with default draft status and unique slug for admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockCompanyFindFirst.mockResolvedValue(null);
    mockCompanyCreate.mockResolvedValue({
      id: "comp-3",
      name: "Nouvelle Entreprise",
      slug: "nouvelle-entreprise",
      description: "Une description de plus de dix caractères pour passer les validations.",
      isPublished: false,
    });

    const response = await POST(
      makePostRequest({
        name: "Nouvelle Entreprise",
        description: "Une description de plus de dix caractères pour passer les validations.",
      })
    );

    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload.id).toBe("comp-3");
    expect(payload.slug).toBe("nouvelle-entreprise");
    expect(payload.isPublished).toBe(false);
    expect(mockCompanyCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Nouvelle Entreprise",
          slug: "nouvelle-entreprise",
          isPublished: false,
        }),
      })
    );
    expect(mockSafeCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "admin-1",
        action: "COMPANY_CREATE",
        entityType: "COMPANY",
        entityId: "comp-3",
      })
    );
  });

  it("handles slug collision by appending counter", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockCompanyFindMany.mockResolvedValueOnce([{ slug: "collision-entreprise" }]);

    mockCompanyCreate.mockResolvedValue({
      id: "comp-4",
      name: "Collision Entreprise",
      slug: "collision-entreprise-1",
      description: "Une description de plus de dix caractères pour passer les validations.",
      isPublished: false,
    });

    const response = await POST(
      makePostRequest({
        name: "Collision Entreprise",
        description: "Une description de plus de dix caractères pour passer les validations.",
      })
    );

    expect(response.status).toBe(201);
    expect(mockCompanyCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slug: "collision-entreprise-1",
        }),
      })
    );
  });

  it("returns 400 when required fields are missing or invalid", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });

    const response = await POST(
      makePostRequest({
        name: "",
        description: "short",
      })
    );

    expect(response.status).toBe(400);
  });
});
