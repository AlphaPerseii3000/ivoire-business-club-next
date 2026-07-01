import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockVerificationTokenCreate = vi.hoisted(() => vi.fn());
const mockVerificationTokenDeleteMany = vi.hoisted(() => vi.fn());

const mockLimit = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mockUserFindUnique,
    },
    verificationToken: {
      create: mockVerificationTokenCreate,
      deleteMany: mockVerificationTokenDeleteMany,
    },
  },
}));

vi.mock("@/lib/api-rate-limit", () => ({
  passwordResetRateLimiter: {
    limit: mockLimit,
  },
  getClientIp: vi.fn(() => "test-ip"),
}));

const mockSendPasswordResetEmail = vi.hoisted(() => vi.fn());
vi.mock("@/lib/email", () => ({
  sendPasswordResetEmail: mockSendPasswordResetEmail,
}));

vi.mock("@/lib/sanitize-log", () => ({
  sanitizeError: vi.fn((e: unknown) =>
    e instanceof Error ? `Error: ${e.name}` : "Unknown error"
  ),
}));

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/forgot-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLimit.mockResolvedValue({ success: true, limit: 3, remaining: 2, reset: 0 });
  });

  it("returns generic success message for existing email and creates token", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-123", email: "test@example.com", name: "Jean" });

    const req = makeRequest({ email: "test@example.com" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe("Si un compte est associé à cet email, un lien de réinitialisation a été envoyé.");
    expect(mockVerificationTokenDeleteMany).toHaveBeenCalledWith({
      where: { userId: "user-123", tokenType: "PASSWORD_RESET" },
    });
    expect(mockVerificationTokenCreate).toHaveBeenCalled();
    expect(mockSendPasswordResetEmail).toHaveBeenCalled();
  });

  it("returns same generic success message for non-existing email", async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const req = makeRequest({ email: "unknown@example.com" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe("Si un compte est associé à cet email, un lien de réinitialisation a été envoyé.");
    expect(mockVerificationTokenCreate).not.toHaveBeenCalled();
    expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid email", async () => {
    const req = makeRequest({ email: "not-an-email" });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("returns 429 when rate limit is exceeded", async () => {
    mockLimit.mockResolvedValue({ success: false, limit: 3, remaining: 0, reset: Date.now() + 60000 });

    const req = makeRequest({ email: "test@example.com" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(json.error).toContain("Trop de tentatives");
  });

  it("returns generic message even if email fails to send", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-123", email: "test@example.com", name: "Jean" });
    mockSendPasswordResetEmail.mockRejectedValue(new Error("SMTP down"));

    const req = makeRequest({ email: "test@example.com" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe("Si un compte est associé à cet email, un lien de réinitialisation a été envoyé.");
  });

  it("returns 500 on unexpected error", async () => {
    mockUserFindUnique.mockRejectedValue(new Error("DB down"));

    const req = makeRequest({ email: "test@example.com" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Erreur interne");
  });

  it("normalizes email case", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-123", email: "Test@Example.com", name: "Jean" });

    const req = makeRequest({ email: "Test@Example.com" });
    await POST(req);

    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { email: "test@example.com" },
      select: { id: true, email: true, name: true },
    });
  });
});
