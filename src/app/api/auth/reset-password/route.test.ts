import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

const mockVerificationTokenFindUnique = vi.hoisted(() => vi.fn());
const mockVerificationTokenDelete = vi.hoisted(() => vi.fn());
const mockUserUpdate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    verificationToken: {
      findUnique: mockVerificationTokenFindUnique,
      delete: mockVerificationTokenDelete,
    },
    user: {
      update: mockUserUpdate,
    },
    $transaction: vi.fn(async (operations: unknown[]) => {
      for (const op of operations) {
        if (typeof op === "function") {
          await op(prismaMockTx);
        }
      }
    }),
  },
}));

const prismaMockTx = {
  verificationToken: {
    delete: mockVerificationTokenDelete,
  },
  user: {
    update: mockUserUpdate,
  },
};

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

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/reset-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resets password with a valid token", async () => {
    mockVerificationTokenFindUnique.mockResolvedValue({
      token: "34d328009b123fbbb0dc93f18b3e6de1ecf7b1a5783c33dff7ffe1926f09e943",
      expires: new Date(Date.now() + 60 * 60 * 1000),
      userId: "user-123",
      tokenType: "PASSWORD_RESET",
    });

    const req = makeRequest({ token: "raw-token", password: "newPass123!", confirmPassword: "newPass123!" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe("Mot de passe réinitialisé avec succès.");
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "user-123" },
      data: { passwordHash: "new-hashed-password" },
    });
    expect(mockVerificationTokenDelete).toHaveBeenCalledWith({
      where: { token: "34d328009b123fbbb0dc93f18b3e6de1ecf7b1a5783c33dff7ffe1926f09e943" },
    });
  });

  it("returns 400 for invalid token", async () => {
    mockVerificationTokenFindUnique.mockResolvedValue(null);

    const req = makeRequest({ token: "bad-token", password: "newPass123!", confirmPassword: "newPass123!" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Ce lien est invalide.");
  });

  it("returns 400 for expired token and deletes it", async () => {
    mockVerificationTokenFindUnique.mockResolvedValue({
      token: "34d328009b123fbbb0dc93f18b3e6de1ecf7b1a5783c33dff7ffe1926f09e943",
      expires: new Date(Date.now() - 60 * 60 * 1000),
      userId: "user-123",
      tokenType: "PASSWORD_RESET",
    });

    const req = makeRequest({ token: "raw-token", password: "newPass123!", confirmPassword: "newPass123!" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Ce lien de réinitialisation a expiré. Veuillez en demander un nouveau.");
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("returns 400 if password and confirmation do not match", async () => {
    const req = makeRequest({ token: "raw-token", password: "newPass123!", confirmPassword: "different" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBeDefined();
  });

  it("returns 400 for weak password", async () => {
    const req = makeRequest({ token: "raw-token", password: "short", confirmPassword: "short" });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("returns 400 for email verification token type", async () => {
    mockVerificationTokenFindUnique.mockResolvedValue({
      token: "34d328009b123fbbb0dc93f18b3e6de1ecf7b1a5783c33dff7ffe1926f09e943",
      expires: new Date(Date.now() + 60 * 60 * 1000),
      userId: "user-123",
      tokenType: "EMAIL_VERIFICATION",
    });

    const req = makeRequest({ token: "raw-token", password: "newPass123!", confirmPassword: "newPass123!" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Ce lien est invalide.");
  });

  it("returns 500 on unexpected error", async () => {
    mockVerificationTokenFindUnique.mockRejectedValue(new Error("DB down"));

    const req = makeRequest({ token: "raw-token", password: "newPass123!", confirmPassword: "newPass123!" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Erreur interne");
  });
});
