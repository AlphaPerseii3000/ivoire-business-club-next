import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST, PUT } from "./route";

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
    compare: vi.fn(async (pw, hash) => pw === "correct-password"),
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
  userPasswordUpdateRateLimiter: {
    limit: mockRateLimitLimit,
  },
  getClientIp: vi.fn(() => "127.0.0.1"),
}));

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/user/password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/user/password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates password successfully for a classical credentials user", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
    mockUserFindUnique.mockResolvedValueOnce({
      id: "user-123",
      passwordHash: "correct-password-hash",
    });
    mockUserUpdate.mockResolvedValueOnce({ id: "user-123" });

    const req = makeRequest({
      currentPassword: "correct-password",
      newPassword: "newSecurePassword123!",
      confirmNewPassword: "newSecurePassword123!",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe("Mot de passe mis à jour avec succès.");
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "user-123" },
      data: { passwordHash: "new-hashed-password" },
    });
  });

  it("returns 401 if user is not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const req = makeRequest({
      currentPassword: "correct-password",
      newPassword: "newSecurePassword123!",
      confirmNewPassword: "newSecurePassword123!",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Non autorisé");
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("returns 400 if current password is wrong", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
    mockUserFindUnique.mockResolvedValueOnce({
      id: "user-123",
      passwordHash: "correct-password-hash",
    });

    const req = makeRequest({
      currentPassword: "wrong-password",
      newPassword: "newSecurePassword123!",
      confirmNewPassword: "newSecurePassword123!",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Le mot de passe actuel est incorrect.");
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("returns 400 if user is an OAuth user without local password", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
    mockUserFindUnique.mockResolvedValueOnce({
      id: "user-123",
      passwordHash: null, // OAuth user
    });

    const req = makeRequest({
      currentPassword: "any-password",
      newPassword: "newSecurePassword123!",
      confirmNewPassword: "newSecurePassword123!",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Ce compte utilise la connexion Google.");
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("returns 400 on Zod validation errors (mismatching confirm password)", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });

    const req = makeRequest({
      currentPassword: "correct-password",
      newPassword: "newSecurePassword123!",
      confirmNewPassword: "differentPassword123!",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Données invalides");
    expect(json.details.confirmNewPassword).toBeDefined();
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("returns 400 on Zod validation errors (new password too short)", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });

    const req = makeRequest({
      currentPassword: "correct-password",
      newPassword: "short",
      confirmNewPassword: "short",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Données invalides");
    expect(json.details.newPassword).toBeDefined();
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("returns 400 if new password lacks complexity (no digits)", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });

    const req = makeRequest({
      currentPassword: "correct-password",
      newPassword: "onlyletters",
      confirmNewPassword: "onlyletters",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Données invalides");
    expect(json.details.newPassword).toBeDefined();
  });

  it("returns 400 if new password is too long (> 72 chars)", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });

    const req = makeRequest({
      currentPassword: "correct-password",
      newPassword: "a".repeat(73),
      confirmNewPassword: "a".repeat(73),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Données invalides");
    expect(json.details.newPassword).toBeDefined();
  });

  it("returns 400 if user attempts to reuse their current password", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });

    const req = makeRequest({
      currentPassword: "correct-password",
      newPassword: "correct-password",
      confirmNewPassword: "correct-password",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Données invalides");
    expect(json.details.newPassword).toBeDefined();
  });

  it("returns 403 if the user is suspended", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
    mockUserFindUnique.mockResolvedValueOnce({
      id: "user-123",
      passwordHash: "correct-password-hash",
      status: "SUSPENDED",
    });

    const req = makeRequest({
      currentPassword: "correct-password",
      newPassword: "newSecurePassword123!",
      confirmNewPassword: "newSecurePassword123!",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toBe("Compte suspendu");
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("updates password successfully via PUT method", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
    mockUserFindUnique.mockResolvedValueOnce({
      id: "user-123",
      name: "Jean",
      email: "jean@example.com",
      passwordHash: "correct-password-hash",
    });
    mockUserUpdate.mockResolvedValueOnce({ id: "user-123" });

    const req = new Request("http://localhost/api/user/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: "correct-password",
        newPassword: "newSecurePassword123!",
        confirmNewPassword: "newSecurePassword123!",
      }),
    });

    const res = await PUT(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe("Mot de passe mis à jour avec succès.");
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

  it("returns 429 when rate limit is exceeded", async () => {
    mockRateLimitLimit.mockResolvedValueOnce({ success: false, reset: Date.now() + 60000 });

    const req = makeRequest({
      currentPassword: "correct-password",
      newPassword: "newSecurePassword123!",
      confirmNewPassword: "newSecurePassword123!",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(json.error).toContain("Trop de tentatives");
    expect(res.headers.get("Retry-After")).toBeDefined();
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });
});
