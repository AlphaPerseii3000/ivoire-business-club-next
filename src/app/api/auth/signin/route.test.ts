import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockUserUpdate = vi.hoisted(() => vi.fn());
const mockRateLimit = vi.hoisted(() => vi.fn(async () => ({ success: true, limit: 10, remaining: 9, reset: 0 })));
const mockBcryptCompare = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mockUserFindUnique,
      update: mockUserUpdate,
    },
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  signinRateLimiter: {
    limit: mockRateLimit,
  },
  getClientIp: vi.fn((req: Request) => {
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0].trim();
    return "unknown";
  }),
}));

vi.mock("@/lib/sanitize-log", () => ({
  sanitizeError: vi.fn((e: unknown) =>
    e instanceof Error ? `Error: ${e.name}` : "Unknown error"
  ),
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: mockBcryptCompare,
  },
}));

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/auth/signin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/signin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimit.mockResolvedValue({ success: true, limit: 10, remaining: 9, reset: 0 });
  });

  it("returns 200 with user data on valid credentials", async () => {
    mockUserFindUnique.mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      name: "Jean Dupont",
      passwordHash: "hashed",
      tier: "AFFRANCHI",
      role: "MEMBER",
    });
    mockBcryptCompare.mockResolvedValue(true);

    const req = makeRequest({ email: "test@example.com", password: "securePass123!" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({
      id: "user-123",
      email: "test@example.com",
      name: "Jean Dupont",
      tier: "AFFRANCHI",
      role: "MEMBER",
    });
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("promotes the configured bootstrap admin after valid credentials", async () => {
    mockUserFindUnique.mockResolvedValue({
      id: "admin-123",
      email: "berseth.j@gmail.com",
      name: "Jonathan",
      passwordHash: "hashed",
      tier: "AFFRANCHI",
      role: "MEMBER",
    });
    mockUserUpdate.mockResolvedValue({ id: "admin-123", role: "ADMIN" });
    mockBcryptCompare.mockResolvedValue(true);

    const req = makeRequest({ email: "berseth.j@gmail.com", password: "securePass123!" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.role).toBe("ADMIN");
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "admin-123" },
      data: { role: "ADMIN" },
    });
  });

  it("returns 401 with exact French message for invalid password", async () => {
    mockUserFindUnique.mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      name: "Jean Dupont",
      passwordHash: "hashed",
      tier: "AFFRANCHI",
      role: "MEMBER",
    });
    mockBcryptCompare.mockResolvedValue(false);

    const req = makeRequest({ email: "test@example.com", password: "wrongpassword" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Email ou mot de passe incorrect.");
  });

  it("returns 401 with exact French message for non-existent email", async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const req = makeRequest({ email: "missing@example.com", password: "securePass123!" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Email ou mot de passe incorrect.");
  });

  it("returns 429 when rate limit is exceeded", async () => {
    mockRateLimit.mockResolvedValueOnce({
      success: false,
      limit: 10,
      remaining: 0,
      reset: 12345,
    });

    const req = makeRequest({ email: "test@example.com", password: "securePass123!" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(json.error).toBe("Trop de tentatives. Réessayez dans une minute.");
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid input (Zod validation fail)", async () => {
    const req = makeRequest({ email: "not-an-email", password: "" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBeDefined();
    expect(json.details).toBeDefined();
  });

  it("returns 500 on unexpected error", async () => {
    mockUserFindUnique.mockRejectedValue(new Error("DB down"));

    const req = makeRequest({ email: "err@example.com", password: "securePass123!" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Erreur interne");
  });

  it("returns 401 for user without passwordHash (OAuth-only user)", async () => {
    mockUserFindUnique.mockResolvedValue({
      id: "user-456",
      email: "oauth@example.com",
      name: "OAuth User",
      passwordHash: null,
      tier: "AFFRANCHI",
      role: "MEMBER",
    });

    const req = makeRequest({ email: "oauth@example.com", password: "securePass123!" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Email ou mot de passe incorrect.");
  });
});
