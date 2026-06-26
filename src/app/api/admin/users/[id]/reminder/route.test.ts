import { NextRequest } from "next/server";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { POST } from "./route";

const mockAuth = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockSafeCreateAuditLog = vi.hoisted(() => vi.fn());
const mockSendReminderEmail = vi.hoisted(() => vi.fn());
const mockSendVerificationEmailToUser = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: mockUserFindUnique } },
}));
vi.mock("@/lib/audit-log", () => ({
  AUDIT_ACTIONS: { USER_REMINDER_SEND: "USER_REMINDER_SEND" },
  safeCreateAuditLog: mockSafeCreateAuditLog,
}));
vi.mock("@/lib/email", () => ({
  sendReminderEmail: mockSendReminderEmail,
}));
vi.mock("@/lib/verification-email.server", () => ({
  sendVerificationEmailToUser: mockSendVerificationEmailToUser,
}));

function buildRequest() {
  return new NextRequest("http://localhost/api/admin/users/user-1/reminder", { method: "POST" });
}

describe("POST /api/admin/users/[id]/reminder", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "admin-1" } });
    mockUserFindUnique.mockImplementation((args: { where: { id: string } }) => {
      if (args.where.id === "admin-1") {
        return Promise.resolve({ id: "admin-1", role: "ADMIN", status: "ACTIVE" });
      }
      return Promise.resolve({
        id: "user-1",
        name: "Awa Koné",
        email: "awa@example.com",
        emailVerified: false,
        onboardingCompletedAt: null,
      });
    });
    mockSendVerificationEmailToUser.mockResolvedValue({ sent: true, reason: "sent" });
    mockSendReminderEmail.mockResolvedValue(undefined);
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const response = await POST(buildRequest(), { params: Promise.resolve({ id: "user-1" }) });
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

    const response = await POST(buildRequest(), { params: Promise.resolve({ id: "user-1" }) });
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

    const response = await POST(buildRequest(), { params: Promise.resolve({ id: "user-1" }) });
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("Compte administrateur suspendu.");
  });

  it("returns 400 EMAIL_MISSING when user has no email", async () => {
    mockUserFindUnique.mockImplementation((args: { where: { id: string } }) => {
      if (args.where.id === "admin-1") {
        return Promise.resolve({ id: "admin-1", role: "ADMIN", status: "ACTIVE" });
      }
      return Promise.resolve({
        id: "user-1",
        name: "Awa Koné",
        email: null,
        emailVerified: false,
        onboardingCompletedAt: null,
      });
    });

    const response = await POST(buildRequest(), { params: Promise.resolve({ id: "user-1" }) });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe("EMAIL_MISSING");
  });

  it("returns 400 ALREADY_COMPLETE when onboarding is fully done", async () => {
    mockUserFindUnique.mockImplementation((args: { where: { id: string } }) => {
      if (args.where.id === "admin-1") {
        return Promise.resolve({ id: "admin-1", role: "ADMIN", status: "ACTIVE" });
      }
      return Promise.resolve({
        id: "user-1",
        name: "Awa Koné",
        email: "awa@example.com",
        emailVerified: true,
        onboardingCompletedAt: new Date("2026-06-01T10:00:00Z"),
      });
    });

    const response = await POST(buildRequest(), { params: Promise.resolve({ id: "user-1" }) });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe("ALREADY_COMPLETE");
  });

  it("sends verification email when emailVerified is false", async () => {
    const response = await POST(buildRequest(), { params: Promise.resolve({ id: "user-1" }) });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toEqual({ sent: true, type: "EMAIL_VERIFICATION" });
    expect(mockSendVerificationEmailToUser).toHaveBeenCalledWith("user-1");
    expect(mockSendReminderEmail).not.toHaveBeenCalled();
  });

  it("sends profile completion email when email is verified and profile incomplete", async () => {
    mockUserFindUnique.mockImplementation((args: { where: { id: string } }) => {
      if (args.where.id === "admin-1") {
        return Promise.resolve({ id: "admin-1", role: "ADMIN", status: "ACTIVE" });
      }
      return Promise.resolve({
        id: "user-1",
        name: "Awa Koné",
        email: "awa@example.com",
        emailVerified: true,
        onboardingCompletedAt: null,
      });
    });

    const response = await POST(buildRequest(), { params: Promise.resolve({ id: "user-1" }) });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toEqual({ sent: true, type: "PROFILE_COMPLETION" });
    expect(mockSendReminderEmail).toHaveBeenCalledWith({
      to: "awa@example.com",
      name: "Awa Koné",
      type: "PROFILE_COMPLETION",
    });
    expect(mockSendVerificationEmailToUser).not.toHaveBeenCalled();
  });

  it("creates an audit log before sending the email", async () => {
    await POST(buildRequest(), { params: Promise.resolve({ id: "user-1" }) });

    expect(mockSafeCreateAuditLog).toHaveBeenCalled();
    const auditCall = mockSafeCreateAuditLog.mock.calls[0][0];
    expect(auditCall.action).toBe("USER_REMINDER_SEND");
    expect(auditCall.metadata.reminderType).toBe("EMAIL_VERIFICATION");
  });

  it("returns 500 EMAIL_FAILED when verification email sending fails", async () => {
    mockSendVerificationEmailToUser.mockRejectedValueOnce(new Error("SMTP error"));

    const response = await POST(buildRequest(), { params: Promise.resolve({ id: "user-1" }) });
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.code).toBe("EMAIL_FAILED");
    expect(mockSafeCreateAuditLog).toHaveBeenCalled();
  });
});
