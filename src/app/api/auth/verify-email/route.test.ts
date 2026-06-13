import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

const mockTokenFindUnique = vi.hoisted(() => vi.fn());
const mockTokenDelete = vi.hoisted(() => vi.fn());
const mockUserUpdate = vi.hoisted(() => vi.fn());
const mockTransaction = vi.hoisted(() => vi.fn(async (cb) => {
  const tx = {
    user: {
      update: mockUserUpdate,
    },
    verificationToken: {
      delete: mockTokenDelete,
    },
  };
  return cb(tx);
}));
const mockAutoTransition = vi.hoisted(() => vi.fn(async () => ({ changed: true, status: "EN_COURS" })));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    verificationToken: {
      findUnique: mockTokenFindUnique,
      delete: mockTokenDelete,
    },
    $transaction: mockTransaction,
  },
}));

vi.mock("@/lib/verification.server", () => ({
  autoTransitionVerificationStatus: mockAutoTransition,
}));

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/auth/verify-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/verify-email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when token is missing", async () => {
    const res = await POST(makeRequest({}));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Jeton de vérification manquant.");
  });

  it("returns 400 when token is invalid/unknown", async () => {
    mockTokenFindUnique.mockResolvedValue(null);

    const res = await POST(makeRequest({ token: "unknown-token" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Jeton de vérification invalide ou inconnu.");
  });

  it("returns 400 and deletes token when expired", async () => {
    mockTokenFindUnique.mockResolvedValue({
      token: "expired-token",
      expires: new Date(Date.now() - 10000), // in the past
      userId: "user-123",
    });

    const res = await POST(makeRequest({ token: "expired-token" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Le lien de vérification a expiré.");
    expect(mockTokenDelete).toHaveBeenCalledWith({ where: { token: "expired-token" } });
  });

  it("runs transaction, updates emailVerified, deletes token and calls autoTransition on success", async () => {
    mockTokenFindUnique.mockResolvedValue({
      token: "valid-token",
      expires: new Date(Date.now() + 60000), // in the future
      userId: "user-123",
    });

    const res = await POST(makeRequest({ token: "valid-token" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockTransaction).toHaveBeenCalled();
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "user-123" },
      data: { emailVerified: true },
    });
    expect(mockTokenDelete).toHaveBeenCalledWith({ where: { token: "valid-token" } });
    expect(mockAutoTransition).toHaveBeenCalledWith("user-123", expect.any(Object));
  });
});
