import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";

const mockAuth = vi.hoisted(() =>
  vi.fn(() => Promise.resolve({ user: { id: "user-123" } }))
);
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockUserUpdate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mockUserFindUnique,
      update: mockUserUpdate,
    },
  },
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
    mockAuth.mockResolvedValueOnce(null);

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
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

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

  it("returns 400 for name too short", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });

    const req = makeRequest({ name: "J" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Données invalides");
    expect(json.details.name).toBeDefined();
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