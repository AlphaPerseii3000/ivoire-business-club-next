import { NextRequest } from "next/server";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "./route";

const mockAuth = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockVerificationTokenDeleteMany = vi.hoisted(() => vi.fn());
const mockVerificationTokenCreate = vi.hoisted(() => vi.fn());
const mockSafeCreateAuditLog = vi.hoisted(() => vi.fn());
const mockSendSetPasswordEmail = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    verificationToken: {
      deleteMany: mockVerificationTokenDeleteMany,
      create: mockVerificationTokenCreate,
    },
  },
}));
vi.mock("@/lib/audit-log", () => ({
  AUDIT_ACTIONS: { USER_INVITATION_EMAIL_SEND: "USER_INVITATION_EMAIL_SEND" },
  safeCreateAuditLog: mockSafeCreateAuditLog,
}));
vi.mock("@/lib/email", () => ({
  sendSetPasswordEmail: mockSendSetPasswordEmail,
}));

function buildRequest() {
  return new NextRequest("http://localhost/api/admin/users/user-1/invite", {
    method: "POST",
  });
}

describe("POST /api/admin/users/[id]/invite", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "admin-1" } });
    mockUserFindUnique.mockImplementation((args: { where: { id: string } }) => {
      if (args.where.id === "admin-1") {
        return Promise.resolve({ id: "admin-1", role: "ADMIN", status: "ACTIVE" });
      }
      return Promise.resolve({
        id: "user-1",
        name: "Jean WhatsApp",
        email: "jean@example.com",
        emailVerified: false,
        status: "ACTIVE",
        passwordHash: "hashed-pwd",
      });
    });
    mockVerificationTokenDeleteMany.mockResolvedValue({ count: 1 });
    mockVerificationTokenCreate.mockResolvedValue({});
    mockSendSetPasswordEmail.mockResolvedValue(undefined);
  });

  it("returns 400 when user has no passwordHash", async () => {
    mockUserFindUnique.mockImplementation((args: { where: { id: string } }) => {
      if (args.where.id === "admin-1") {
        return Promise.resolve({ id: "admin-1", role: "ADMIN", status: "ACTIVE" });
      }
      return Promise.resolve({
        id: "user-1",
        name: "Jean WhatsApp",
        email: "jean@example.com",
        emailVerified: false,
        status: "ACTIVE",
        passwordHash: null,
      });
    });

    const response = await POST(buildRequest(), {
      params: Promise.resolve({ id: "user-1" }),
    });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("L'utilisateur n'a pas de mot de passe initial à définir.");
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const response = await POST(buildRequest(), {
      params: Promise.resolve({ id: "user-1" }),
    });
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Non autorisé");
  });

  it("returns 403 when user is not an admin", async () => {
    mockUserFindUnique.mockImplementationOnce((args: { where: { id: string } }) => {
      if (args.where.id === "admin-1") {
        return Promise.resolve({ id: "admin-1", role: "MEMBER", status: "ACTIVE" });
      }
      return Promise.resolve(null);
    });

    const response = await POST(buildRequest(), {
      params: Promise.resolve({ id: "user-1" }),
    });
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("Interdit");
  });

  it("returns 403 when admin account is suspended", async () => {
    mockUserFindUnique.mockImplementationOnce((args: { where: { id: string } }) => {
      if (args.where.id === "admin-1") {
        return Promise.resolve({ id: "admin-1", role: "ADMIN", status: "SUSPENDED" });
      }
      return Promise.resolve(null);
    });

    const response = await POST(buildRequest(), {
      params: Promise.resolve({ id: "user-1" }),
    });
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("Compte administrateur suspendu.");
  });

  it("returns 400 when user is suspended", async () => {
    mockUserFindUnique.mockImplementation((args: { where: { id: string } }) => {
      if (args.where.id === "admin-1") {
        return Promise.resolve({ id: "admin-1", role: "ADMIN", status: "ACTIVE" });
      }
      return Promise.resolve({
        id: "user-1",
        name: "Jean WhatsApp",
        email: "jean@example.com",
        emailVerified: false,
        status: "SUSPENDED",
      });
    });

    const response = await POST(buildRequest(), {
      params: Promise.resolve({ id: "user-1" }),
    });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Impossible d'inviter un utilisateur suspendu.");
  });

  it("returns 400 when user email is already verified", async () => {
    mockUserFindUnique.mockImplementation((args: { where: { id: string } }) => {
      if (args.where.id === "admin-1") {
        return Promise.resolve({ id: "admin-1", role: "ADMIN", status: "ACTIVE" });
      }
      return Promise.resolve({
        id: "user-1",
        name: "Jean WhatsApp",
        email: "jean@example.com",
        emailVerified: true,
        status: "ACTIVE",
      });
    });

    const response = await POST(buildRequest(), {
      params: Promise.resolve({ id: "user-1" }),
    });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe(
      "L'utilisateur a déjà activé son compte (email vérifié)."
    );
  });

  it("invalidates old tokens and creates new VerificationToken and audit log", async () => {
    const response = await POST(buildRequest(), {
      params: Promise.resolve({ id: "user-1" }),
    });
    expect(response.status).toBe(200);

    // Invalidate
    expect(mockVerificationTokenDeleteMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        tokenType: "SET_PASSWORD",
      },
    });

    // Create token
    expect(mockVerificationTokenCreate).toHaveBeenCalled();
    const tokenArgs = mockVerificationTokenCreate.mock.calls[0][0];
    expect(tokenArgs.data.userId).toBe("user-1");
    expect(tokenArgs.data.tokenType).toBe("SET_PASSWORD");

    // Audit log
    expect(mockSafeCreateAuditLog).toHaveBeenCalledWith({
      actorId: "admin-1",
      action: "USER_INVITATION_EMAIL_SEND",
      entityType: "User",
      entityId: "user-1",
      metadata: { targetUserId: "user-1" },
    });

    // Send email
    expect(mockSendSetPasswordEmail).toHaveBeenCalledWith({
      to: "jean@example.com",
      name: "Jean WhatsApp",
      token: expect.any(String),
    });
  });

  it("cleans up token and returns 500 when email sending fails", async () => {
    mockSendSetPasswordEmail.mockRejectedValueOnce(new Error("SMTP failure"));

    const response = await POST(buildRequest(), {
      params: Promise.resolve({ id: "user-1" }),
    });
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.error).toBe("Impossible d'envoyer l'email d'invitation.");

    // Cleans up
    expect(mockVerificationTokenDeleteMany).toHaveBeenCalledTimes(2);
  });
});
