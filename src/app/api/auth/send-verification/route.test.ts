import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

const mockAuth = vi.hoisted(() => vi.fn());
const mockRateLimit = vi.hoisted(() => vi.fn(async () => ({ success: true, limit: 3, remaining: 2, reset: 0 })));
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockTokenDeleteMany = vi.hoisted(() => vi.fn());
const mockTokenCreate = vi.hoisted(() => vi.fn());
const mockSendEmail = vi.hoisted(() => vi.fn(async () => {}));

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mockUserFindUnique,
    },
    verificationToken: {
      deleteMany: mockTokenDeleteMany,
      create: mockTokenCreate,
    },
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  verificationSendRateLimiter: {
    limit: mockRateLimit,
  },
  getClientIp: vi.fn(() => "127.0.0.1"),
  getClientIdentifier: vi.fn((req, userId) => `user:${userId}`),
}));

vi.mock("@/lib/email", () => ({
  sendEmailVerificationEmail: mockSendEmail,
}));

function makeRequest() {
  return new Request("http://localhost/api/auth/send-verification", {
    method: "POST",
  });
}

describe("POST /api/auth/send-verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if user is not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await POST(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Non autorisé");
  });

  it("returns 429 when rate limit is exceeded", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
    mockRateLimit.mockResolvedValueOnce({
      success: false,
      limit: 3,
      remaining: 0,
      reset: Date.now() + 60000,
    });

    const res = await POST(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(json.error).toBe("Trop de tentatives de renvoi. Réessayez dans une minute.");
  });

  it("returns 404 if authenticated user is not found in DB", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
    mockUserFindUnique.mockResolvedValue(null);

    const res = await POST(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe("Utilisateur non trouvé");
  });

  it("returns 200 with success early if email is already verified", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
    mockUserFindUnique.mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      name: "Jean",
      emailVerified: true,
    });

    const res = await POST(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.message).toBe("Email déjà vérifié");
    expect(mockTokenCreate).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("creates token, cleans up old tokens, and sends verification email on success", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
    mockUserFindUnique.mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      name: "Jean",
      emailVerified: false,
    });

    const res = await POST(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockTokenDeleteMany).toHaveBeenCalledWith({ where: { userId: "user-123" } });
    expect(mockTokenCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-123",
          token: expect.any(String),
          expires: expect.any(Date),
        }),
      })
    );
    expect(mockSendEmail).toHaveBeenCalledWith({
      to: "test@example.com",
      name: "Jean",
      token: expect.any(String),
    });
  });

  it("returns 500 when email sending fails", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
    mockUserFindUnique.mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      name: "Jean",
      emailVerified: false,
    });
    mockSendEmail.mockRejectedValueOnce(new Error("SMTP offline"));

    const res = await POST(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Impossible d'envoyer l'email de vérification. Veuillez réessayer plus tard.");
  });
});
