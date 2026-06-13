import { describe, it, expect, vi, beforeEach } from "vitest";
import { DELETE } from "./route";

const mockAuth = vi.hoisted(() =>
  vi.fn(() => Promise.resolve({ user: { id: "user-123" } }))
);

const mockDeleteMany = vi.hoisted(() => vi.fn());
const mockUserUpdate = vi.hoisted(() => vi.fn());
const mockBcryptHash = vi.hoisted(() => vi.fn());
const mockLimit = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    opportunity: { deleteMany: mockDeleteMany },
    payment: { deleteMany: mockDeleteMany },
    subscription: { deleteMany: mockDeleteMany },
    account: { deleteMany: mockDeleteMany },
    session: { deleteMany: mockDeleteMany },
    verificationToken: { deleteMany: mockDeleteMany },
    user: { update: mockUserUpdate },
    $transaction: vi.fn((operations) => Promise.all(operations)),
  },
}));

vi.mock("bcryptjs", () => ({
  default: { hash: mockBcryptHash },
}));

vi.mock("@/lib/rate-limit", () => ({
  accountDeleteRateLimiter: { limit: mockLimit },
  getClientIdentifier: vi.fn((req: Request, userId?: string) =>
    userId ? `user:${userId}` : `ip:unknown`
  ),
}));

vi.mock("@/lib/sanitize-log", () => ({
  sanitizeError: vi.fn((e: unknown) =>
    e instanceof Error ? `Error: ${e.name}` : "Unknown error"
  ),
}));

vi.mock("@/lib/validations", () => ({
  accountDeletionSchema: {
    safeParse: (data: { confirmation: string }) => {
      if (data.confirmation === "SUPPRIMER") {
        return { success: true, data: { confirmation: "SUPPRIMER" } };
      }
      return {
        success: false,
        error: { flatten: () => ({ fieldErrors: { confirmation: ["Invalid"] } }) },
      };
    },
  },
}));

function makeDeleteRequest(body: unknown) {
  return new Request("http://localhost/api/user/account", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("DELETE /api/user/account", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBcryptHash.mockResolvedValue("$2a$12$hashedrandompassword");
    mockLimit.mockResolvedValue({ success: true, limit: 3, remaining: 2, reset: 0 });
  });

  it("returns 401 if not authenticated", async () => {
    (mockAuth as any).mockResolvedValueOnce(null);

    const req = makeDeleteRequest({ confirmation: "SUPPRIMER" });
    const res = await DELETE(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Non autorisé");
  });

  it("returns 401 if session has no user id", async () => {
    (mockAuth as any).mockResolvedValueOnce({ user: {} });

    const req = makeDeleteRequest({ confirmation: "SUPPRIMER" });
    const res = await DELETE(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Non autorisé");
  });

  it("returns 429 if rate limit is exceeded", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
    mockLimit.mockResolvedValueOnce({ success: false, limit: 3, remaining: 0, reset: 12345 });

    const req = makeDeleteRequest({ confirmation: "SUPPRIMER" });
    const res = await DELETE(req);
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(json.error).toBe("Trop de tentatives. Réessayez dans une minute.");
  });

  it("returns 400 with wrong confirmation text", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });

    const req = makeDeleteRequest({ confirmation: "delete" });
    const res = await DELETE(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Veuillez taper SUPPRIMER pour confirmer.");
  });

  it("returns 400 with empty confirmation", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });

    const req = makeDeleteRequest({ confirmation: "" });
    const res = await DELETE(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Veuillez taper SUPPRIMER pour confirmer.");
  });

  it("returns 400 with DELETE (English) instead of SUPPRIMER", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });

    const req = makeDeleteRequest({ confirmation: "DELETE" });
    const res = await DELETE(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Veuillez taper SUPPRIMER pour confirmer.");
  });

  it("anonymizes user record and deletes related data on success", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
    mockDeleteMany.mockResolvedValue({ count: 0 });
    mockUserUpdate.mockResolvedValue({
      id: "user-123",
      email: "deleted_user-123@deleted.ibc",
      name: "Compte supprimé",
    });

    const req = makeDeleteRequest({ confirmation: "SUPPRIMER" });
    const res = await DELETE(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.message).toBe("Compte supprimé avec succès.");

    // Verify deleteMany was called for all related records (6 calls)
    expect(mockDeleteMany).toHaveBeenCalledTimes(6);

    // Verify user update was called with anonymized data
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "user-123" },
      data: expect.objectContaining({
        email: "deleted_user-123@deleted.ibc",
        name: "Compte supprimé",
        bio: null,
        image: null,
        phone: null,
        location: null,
        country: null,
        passwordHash: expect.any(String),
        googleId: null,
        emailVerified: false,
        verificationStatus: "REJECTED",
      }),
    });

    // Verify bcrypt.hash was called
    expect(mockBcryptHash).toHaveBeenCalled();
  });

  it("replaces passwordHash so user cannot re-authenticate", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-456" } });
    mockDeleteMany.mockResolvedValue({ count: 0 });
    mockUserUpdate.mockResolvedValue({
      id: "user-456",
      email: "deleted_user-456@deleted.ibc",
    });

    const req = makeDeleteRequest({ confirmation: "SUPPRIMER" });
    await DELETE(req);

    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          passwordHash: "$2a$12$hashedrandompassword",
        }),
      })
    );
  });

  it("deletes opportunities, subscriptions, payments, accounts, sessions", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
    mockDeleteMany.mockResolvedValue({ count: 1 });
    mockUserUpdate.mockResolvedValue({ id: "user-123" });

    const req = makeDeleteRequest({ confirmation: "SUPPRIMER" });
    await DELETE(req);

    // Verify 6 deleteMany calls: opportunity, payment, subscription, account, session, verificationToken
    expect(mockDeleteMany).toHaveBeenCalledTimes(6);

    // Check first call (opportunities) uses authorId
    expect(mockDeleteMany.mock.calls[0][0]).toEqual({ where: { authorId: "user-123" } });

    // Remaining calls use userId
    for (let i = 1; i < 6; i++) {
      expect(mockDeleteMany.mock.calls[i][0]).toHaveProperty("where");
      expect(mockDeleteMany.mock.calls[i][0].where).toHaveProperty("userId");
      expect(mockDeleteMany.mock.calls[i][0].where.userId).toBe("user-123");
    }
  });

  it("returns 400 with malformed JSON body", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });

    const req = new Request("http://localhost/api/user/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await DELETE(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Requête invalide.");
  });

  it("returns 500 on unexpected error", async () => {
    mockAuth.mockRejectedValueOnce(new Error("DB down"));

    const req = makeDeleteRequest({ confirmation: "SUPPRIMER" });
    const res = await DELETE(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Erreur interne");
  });
});