import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

const mockAuth = vi.hoisted(() => vi.fn());
const mockExpertFindMany = vi.hoisted(() => vi.fn());
const mockExpertCreate = vi.hoisted(() => vi.fn());
const mockExpertFindFirst = vi.hoisted(() => vi.fn());
const mockSafeCreateAuditLog = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    expert: {
      findMany: mockExpertFindMany,
      create: mockExpertCreate,
      findFirst: mockExpertFindFirst,
    },
  },
}));
vi.mock("@/lib/audit-log", () => ({
  safeCreateAuditLog: mockSafeCreateAuditLog,
}));

function makePostRequest(body: unknown) {
  return new Request("http://localhost/api/experts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const mockExperts = [
  {
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
    isPublished: true,
  },
  {
    id: "exp-2",
    name: "Serge N'Goran",
    slug: "serge-n-goran",
    title: "Coach Business",
    bio: "Une biographie de plus de dix caractères pour passer les validations.",
    photoUrl: null,
    phone: null,
    email: null,
    whatsapp: null,
    specialties: "growth",
    requiredTier: "BOSS",
    isPublished: false,
  },
];

describe("GET /api/experts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns only published experts sorted by createdAt desc", async () => {
    mockExpertFindMany.mockResolvedValue([mockExperts[0]]);

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toHaveLength(1);
    expect(payload.data[0].name).toBe("Jean Koffi");
    expect(mockExpertFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isPublished: true },
        orderBy: { createdAt: "desc" },
      })
    );
  });
});

describe("POST /api/experts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthorized user (non-admin)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "MEMBER" } });

    const response = await POST(
      makePostRequest({
        name: "Test Expert",
        title: "Titre de test",
        bio: "Une biographie de plus de dix caractères pour passer les validations.",
      })
    );

    expect(response.status).toBe(403);
    const payload = await response.json();
    expect(payload.error).toBe("Non autorisé");
  });

  it("creates an expert with default draft status and unique slug for admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockExpertFindFirst.mockResolvedValue(null);
    mockExpertCreate.mockResolvedValue({
      id: "exp-3",
      name: "Nouvel Expert",
      slug: "nouvel-expert",
      title: "Consultant",
      bio: "Une biographie de plus de dix caractères pour passer les validations.",
      isPublished: false,
    });

    const response = await POST(
      makePostRequest({
        name: "Nouvel Expert",
        title: "Consultant",
        bio: "Une biographie de plus de dix caractères pour passer les validations.",
      })
    );

    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload.id).toBe("exp-3");
    expect(payload.slug).toBe("nouvel-expert");
    expect(payload.isPublished).toBe(false);
    expect(mockExpertCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Nouvel Expert",
          slug: "nouvel-expert",
          title: "Consultant",
          isPublished: false,
        }),
      })
    );
    expect(mockSafeCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "admin-1",
        action: "EXPERT_CREATE",
        entityType: "EXPERT",
        entityId: "exp-3",
      })
    );
  });

  it("handles slug collision by appending counter", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockExpertFindFirst
      .mockResolvedValueOnce({ id: "existing-id" })
      .mockResolvedValueOnce(null);

    mockExpertCreate.mockResolvedValue({
      id: "exp-4",
      name: "Collision Expert",
      slug: "collision-expert-1",
      title: "Consultant",
      bio: "Une biographie de plus de dix caractères pour passer les validations.",
      isPublished: false,
    });

    const response = await POST(
      makePostRequest({
        name: "Collision Expert",
        title: "Consultant",
        bio: "Une biographie de plus de dix caractères pour passer les validations.",
      })
    );

    expect(response.status).toBe(201);
    expect(mockExpertCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slug: "collision-expert-1",
        }),
      })
    );
  });

  it("returns 400 when required fields are missing or invalid", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });

    const response = await POST(
      makePostRequest({
        name: "",
        title: "x",
        bio: "short",
      })
    );

    expect(response.status).toBe(400);
  });
});
