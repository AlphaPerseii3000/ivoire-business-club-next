import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

const mockUserCreate = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockSubscriptionCreate = vi.hoisted(() => vi.fn());
const mockVerificationTokenCreate = vi.hoisted(() => vi.fn());
const mockRateLimit = vi.hoisted(() => vi.fn(async () => ({ success: true, limit: 5, remaining: 4, reset: 0 })));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mockUserFindUnique,
      create: mockUserCreate,
    },
    subscription: {
      create: mockSubscriptionCreate,
    },
    verificationToken: {
      create: mockVerificationTokenCreate,
    },
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  signupRateLimiter: {
    limit: mockRateLimit,
  },
  getClientIp: vi.fn((req: Request) => {
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0].trim();
    return "unknown";
  }),
}));

vi.mock("@/lib/email", () => ({
  sendEmailVerificationEmail: vi.fn(async () => {}),
}));

vi.mock("@/lib/sanitize-log", () => ({
  sanitizeError: vi.fn((e: unknown) =>
    e instanceof Error ? `Error: ${e.name}` : "Unknown error"
  ),
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(async () => "hashed-password"),
  },
}));

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/signup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 201 with user data on valid signup and does NOT create Subscription", async () => {
    mockUserFindUnique.mockResolvedValue(null);
    mockUserCreate.mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      name: "Jean Dupont",
    });

    const req = makeRequest({ name: "Jean Dupont", email: "test@example.com", password: "securePass123!" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json).toEqual({ id: "user-123", email: "test@example.com", name: "Jean Dupont" });
    expect(mockUserCreate).toHaveBeenCalledWith({
      data: { name: "Jean Dupont", email: "test@example.com", passwordHash: "hashed-password", role: "MEMBER" },
    });
    expect(mockSubscriptionCreate).not.toHaveBeenCalled();
  });

  it("creates the configured bootstrap admin with ADMIN role", async () => {
    mockUserFindUnique.mockResolvedValue(null);
    mockUserCreate.mockResolvedValue({
      id: "admin-123",
      email: "berseth.j@gmail.com",
      name: "Jonathan",
    });

    const req = makeRequest({ name: "Jonathan", email: "BERSETH.J@gmail.com", password: "securePass123!" });
    const res = await POST(req);

    expect(res.status).toBe(201);
    expect(mockUserCreate).toHaveBeenCalledWith({
      data: { name: "Jonathan", email: "BERSETH.J@gmail.com", passwordHash: "hashed-password", role: "ADMIN" },
    });
  });

  it("returns 409 with exact French message for duplicate email", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "existing-1", email: "dup@example.com" });

    const req = makeRequest({ name: "Jean", email: "dup@example.com", password: "securePass123!" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.error).toBe("Cet email est déjà associé à un compte.");
    expect(mockUserCreate).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid input (Zod validation fail)", async () => {
    const req = makeRequest({ name: "J", email: "not-an-email", password: "123" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBeDefined();
  });

  it("returns 429 when rate limit is exceeded", async () => {
    const { signupRateLimiter } = await import("@/lib/rate-limit");
    (signupRateLimiter.limit as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      success: false,
      limit: 5,
      remaining: 0,
      reset: 12345,
    });

    const req = makeRequest({ name: "Jean", email: "rate@example.com", password: "securePass123!" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(json.error).toBe("Trop de tentatives. Réessayez dans une minute.");
    expect(mockUserCreate).not.toHaveBeenCalled();
  });

  it("returns 500 on unexpected error", async () => {
    mockUserFindUnique.mockRejectedValue(new Error("DB down"));

    const req = makeRequest({ name: "Jean", email: "err@example.com", password: "securePass123!" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Erreur interne");
  });
});
