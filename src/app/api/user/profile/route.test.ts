import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";

const mockAuth = vi.hoisted(() =>
  vi.fn(() => Promise.resolve({ user: { id: "user-123" } }))
);
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockUserUpdate = vi.hoisted(() => vi.fn());
const mockUserTagDeleteMany = vi.hoisted(() => vi.fn());
const mockUserTagCreateMany = vi.hoisted(() => vi.fn());
const mockTransaction = vi.hoisted(() => vi.fn((callback) => callback({
  user: { update: mockUserUpdate },
  userTag: { deleteMany: mockUserTagDeleteMany, createMany: mockUserTagCreateMany },
})));
const mockAutoTransition = vi.hoisted(() => vi.fn(async () => ({ changed: false, status: "PENDING" })));

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: mockTransaction,
    user: {
      findUnique: mockUserFindUnique,
      update: mockUserUpdate,
    },
    userTag: {
      deleteMany: mockUserTagDeleteMany,
      createMany: mockUserTagCreateMany,
    },
  },
}));

vi.mock("@/lib/verification.server", () => ({
  autoTransitionVerificationStatus: mockAutoTransition,
}));

vi.mock("@/lib/sanitize-log", () => ({
  sanitizeError: vi.fn((e: unknown) =>
    e instanceof Error ? `Error: ${e.name}` : "Unknown error"
  ),
}));

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/user/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const mockUserData = {
  id: "user-123",
  name: "Jean Dupont",
  email: "jean@example.com",
  bio: "Entrepreneur",
  image: null,
  phone: "+225 0708091011",
  location: "Abidjan",
  country: "CI",
  tier: "AFFRANCHI",
  role: "MEMBER",
  verificationStatus: "PENDING",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  tags: [],
};

describe("GET /api/user/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns user profile data excluding passwordHash", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
    mockUserFindUnique.mockResolvedValueOnce(mockUserData);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toBeDefined();
    expect(json.data.name).toBe("Jean Dupont");
    expect(json.data.email).toBe("jean@example.com");
    // Ensure passwordHash is not returned
    expect(json.data.passwordHash).toBeUndefined();
  });

  it("returns 401 if not authenticated", async () => {
    (mockAuth as any).mockResolvedValueOnce(null);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Non autorisé");
  });

  it("returns 401 if user not found", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
    mockUserFindUnique.mockResolvedValueOnce(null);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Non autorisé");
  });

  it("returns 500 on unexpected error", async () => {
    mockAuth.mockRejectedValueOnce(new Error("DB down"));

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Erreur interne");
  });
});

describe("POST /api/user/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates user profile with valid data and returns 200", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
    const updatedData = { ...mockUserData, name: "Jean Nouveau" };
    mockUserUpdate.mockResolvedValueOnce(updatedData);

    const req = makeRequest({
      name: "Jean Nouveau",
      bio: "Entrepreneur",
      phone: "+225 0708091011",
      location: "Abidjan",
      country: "CI",
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toBeDefined();
    expect(json.data.name).toBe("Jean Nouveau");
    expect(mockUserTagDeleteMany).not.toHaveBeenCalled();
    expect(mockUserTagCreateMany).not.toHaveBeenCalled();
  });

  it("returns 401 if not authenticated", async () => {
    (mockAuth as any).mockResolvedValueOnce(null);

    const req = makeRequest({ name: "Test" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Non autorisé");
  });

  it("returns 400 with French error for invalid phone", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });

    const req = makeRequest({
      name: "Jean Dupont",
      phone: "abc",
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Données invalides");
    expect(json.details).toBeDefined();
    expect(json.details.phone).toBeDefined();
  });

  it("converts empty string to null for nullable fields", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
    const updatedData = { ...mockUserData, bio: null, phone: null };
    mockUserUpdate.mockResolvedValueOnce(updatedData);

    const req = makeRequest({
      name: "Jean Dupont",
      bio: "",
      phone: "",
      location: "",
      country: "",
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "user-123" },
      data: expect.objectContaining({
        name: "Jean Dupont",
        bio: null,
        phone: null,
        location: null,
        country: null,
      }),
      select: expect.any(Object),
    });
  });

  it("preserves existing tags when tags field is omitted from payload", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
    mockUserUpdate.mockResolvedValueOnce({
      ...mockUserData,
      tags: [{ category: "SECTEUR", value: "tech" }],
    });

    const req = makeRequest({
      name: "Jean Dupont",
      bio: "Entrepreneur",
      phone: "+225 0708091011",
      location: "Abidjan",
      country: "CI",
      // tags omitted — should preserve existing tags
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(mockUserTagDeleteMany).not.toHaveBeenCalled();
    expect(mockUserTagCreateMany).not.toHaveBeenCalled();
  });

  it("clears existing profile tags when tags is an empty array", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
    mockUserUpdate.mockResolvedValueOnce({ ...mockUserData, tags: [] });

    const req = makeRequest({
      name: "Jean Dupont",
      bio: "Entrepreneur",
      phone: "+225 0708091011",
      location: "Abidjan",
      country: "CI",
      tags: [],
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(mockUserTagDeleteMany).toHaveBeenCalledWith({ where: { userId: "user-123" } });
    expect(mockUserTagCreateMany).not.toHaveBeenCalled();
    expect(json.data.tags).toEqual([]);
  });

  it("saves deduplicated profile tags transactionally", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
    mockUserUpdate.mockResolvedValueOnce({
      ...mockUserData,
      tags: [{ category: "SECTEUR", value: "tech" }],
    });

    const req = makeRequest({
      name: "Jean Dupont",
      bio: "Entrepreneur",
      phone: "+225 0708091011",
      location: "Abidjan",
      country: "CI",
      tags: [
        { category: "SECTEUR", value: "tech" },
        { category: "SECTEUR", value: "tech" },
      ],
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(mockUserTagDeleteMany).toHaveBeenCalledWith({ where: { userId: "user-123" } });
    expect(mockUserTagCreateMany).toHaveBeenCalledWith({
      data: [{ userId: "user-123", category: "SECTEUR", value: "tech" }],
    });
    expect(json.data.tags).toEqual([{ category: "SECTEUR", value: "tech" }]);
  });

  it("rejects invalid profile tags", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });

    const req = makeRequest({
      name: "Jean Dupont",
      tags: [{ category: "SECTEUR", value: "inconnu" }],
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Données invalides");
    expect(mockUserTagCreateMany).not.toHaveBeenCalled();
  });

  it("returns 400 for name too short", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });

    const req = makeRequest({ name: "J" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Données invalides");
    expect(json.details.name).toBeDefined();
  });

  it("calls autoTransitionVerificationStatus inside transaction and merges updated verification status", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
    mockUserUpdate.mockResolvedValueOnce({
      ...mockUserData,
      name: "Jean Dupont",
      verificationStatus: "PENDING",
    });
    mockAutoTransition.mockResolvedValueOnce({ changed: true, status: "EN_COURS" });

    const req = makeRequest({ name: "Jean Dupont" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.verificationStatus).toBe("EN_COURS");
    expect(mockAutoTransition).toHaveBeenCalledWith("user-123", expect.any(Object));
  });

  it("returns 500 on unexpected error", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
    mockUserUpdate.mockRejectedValueOnce(new Error("DB down"));

    const req = makeRequest({ name: "Jean Dupont" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Erreur interne");
  });
});