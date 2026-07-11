import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

const mockAuth = vi.hoisted(() =>
  vi.fn(() => Promise.resolve({ user: { id: "user-123" } }))
);
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockUserUpdate = vi.hoisted(() => vi.fn());
const mockSafeCreateAuditLog = vi.hoisted(() => vi.fn());
const mockSendPasswordChangedEmail = vi.hoisted(() => vi.fn());
const mockRateLimitLimit = vi.hoisted(() => vi.fn(() => Promise.resolve({ success: true, reset: 0 })));

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

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(async () => "new-hashed-password"),
  },
}));

vi.mock("@/lib/sanitize-log", () => ({
  sanitizeError: vi.fn((e: unknown) =>
    e instanceof Error ? `Error: ${e.name}` : "Unknown error"
  ),
}));

vi.mock("@/lib/audit-log", () => ({
  safeCreateAuditLog: mockSafeCreateAuditLog,
  AUDIT_ACTIONS: {
    PASSWORD_CHANGED: "PASSWORD_CHANGED",
  },
}));

vi.mock("@/lib/email", () => ({
  sendPasswordChangedEmail: mockSendPasswordChangedEmail,
}));

vi.mock("@/lib/rate-limit", () => ({
  setPasswordRateLimiter: {
    limit: mockRateLimitLimit,
  },
  getClientIp: vi.fn(() => "127.0.0.1"),
}));

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/auth/set-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/set-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets password successfully for an OAuth user without existing password", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
    mockUserFindUnique.mockResolvedValueOnce({
      id: "user-123",
      name: "Jean",
      email: "jean@example.com",
      passwordHash: null,
      status: "ACTIVE",
    });
    mockUserUpdate.mockResolvedValueOnce({ id: "user-123" });

    const req = makeRequest({
      password: "newSecurePassword123!",
      confirmPassword: "newSecurePassword123!",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe("Mot de passe défini avec succès.");
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "user-123" },
      data: { passwordHash: "new-hashed-password" },
    });
    expect(mockSafeCreateAuditLog).toHaveBeenCalled();
    expect(mockSendPasswordChangedEmail).toHaveBeenCalledWith({
      to: "jean@example.com",
      name: "Jean",
    });
  });

  it("returns 401 if user is not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const req = makeRequest({
      password: "newSecurePassword123!",
      confirmPassword: "newSecurePassword123!",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Non autorisé");
  });

  it("returns 400 if password already exists", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
    mockUserFindUnique.mockResolvedValueOnce({
      id: "user-123",
      name: "Jean",
      email: "jean@example.com",
      passwordHash: "already-hashed-password",
      status: "ACTIVE",
    });

    const req = makeRequest({
      password: "newSecurePassword123!",
      confirmPassword: "newSecurePassword123!",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Un mot de passe est déjà configuré pour ce compte.");
  });

  it("returns 403 if user is suspended", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
    mockUserFindUnique.mockResolvedValueOnce({
      id: "user-123",
      name: "Jean",
      email: "jean@example.com",
      passwordHash: null,
      status: "SUSPENDED",
    });

    const req = makeRequest({
      password: "newSecurePassword123!",
      confirmPassword: "newSecurePassword123!",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toBe("Compte suspendu");
  });

  it("returns 429 when rate limit is exceeded", async () => {
    mockRateLimitLimit.mockResolvedValueOnce({ success: false, reset: Date.now() + 60000 });

    const req = makeRequest({
      password: "newSecurePassword123!",
      confirmPassword: "newSecurePassword123!",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(json.error).toContain("Trop de tentatives");
    expect(res.headers.get("Retry-After")).toBeDefined();
  });

  it("returns 400 on Zod validation errors (confirmPassword mismatch)", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });

    const req = makeRequest({
      password: "newSecurePassword123!",
      confirmPassword: "differentPassword123!",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Données invalides");
    expect(json.details.confirmPassword).toBeDefined();
  });
});
