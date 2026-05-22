import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const mockAuth = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockSendEmail = vi.hoisted(() => vi.fn());
const mockSafeCreateAuditLog = vi.hoisted(() => vi.fn());
const mockSanitizeError = vi.hoisted(() => vi.fn(() => "Error: sanitized"));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/email", () => ({ sendAdminSubscriptionConfirmationEmail: mockSendEmail }));
vi.mock("@/lib/audit-log", () => ({
  AUDIT_ACTIONS: { USER_CONFIRMATION_EMAIL_SEND: "USER_CONFIRMATION_EMAIL_SEND" },
  safeCreateAuditLog: mockSafeCreateAuditLog,
}));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique: mockUserFindUnique } } }));
vi.mock("@/lib/sanitize-log", () => ({ sanitizeError: mockSanitizeError }));

const request = new Request("http://localhost/api/admin/users/member-1/confirmation-email", { method: "POST" });
const params = { params: Promise.resolve({ id: "member-1" }) };
const user = {
  id: "member-1",
  name: "Awa",
  email: "awa@example.com",
  tier: "AFFRANCHI",
  subscriptions: [{ id: "sub-1", status: "ACTIVE", tier: "GRAND_FRERE", providerRef: "IBC-1", createdAt: new Date() }],
};

describe("POST /api/admin/users/[id]/confirmation-email", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "admin-1" } });
    mockUserFindUnique.mockImplementation(async ({ where }: { where: { id: string } }) => {
      if (where.id === "admin-1") return { id: "admin-1", role: "ADMIN" };
      if (where.id === "member-1") return user;
      return null;
    });
    mockSendEmail.mockResolvedValue(undefined);
  });

  it("returns 401 for unauthenticated requests", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await POST(request, params);

    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin users", async () => {
    mockUserFindUnique.mockResolvedValueOnce({ id: "admin-1", role: "MEMBER" });

    const res = await POST(request, params);

    expect(res.status).toBe(403);
  });

  it("returns 404 when target user is missing", async () => {
    mockUserFindUnique.mockImplementation(async ({ where }: { where: { id: string } }) => {
      if (where.id === "admin-1") return { id: "admin-1", role: "ADMIN" };
      return null;
    });

    const res = await POST(request, params);

    expect(res.status).toBe(404);
  });

  it("returns 400 when the user has no email", async () => {
    mockUserFindUnique.mockImplementation(async ({ where }: { where: { id: string } }) => {
      if (where.id === "admin-1") return { id: "admin-1", role: "ADMIN" };
      return { ...user, email: "" };
    });

    const res = await POST(request, params);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.code).toBe("EMAIL_MISSING");
  });

  it("sends the confirmation email and creates sanitized audit metadata", async () => {
    const res = await POST(request, params);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual({ ok: true, emailSent: true });
    expect(mockSendEmail).toHaveBeenCalledWith({ to: "awa@example.com", name: "Awa", tier: "GRAND_FRERE" });
    expect(mockSafeCreateAuditLog).toHaveBeenCalledWith({
      actorId: "admin-1",
      action: "USER_CONFIRMATION_EMAIL_SEND",
      entityType: "User",
      entityId: "member-1",
      metadata: {
        targetUserId: "member-1",
        subscriptionId: "sub-1",
        subscriptionStatus: "ACTIVE",
        tier: "GRAND_FRERE",
        emailSent: true,
      },
    });
    expect(mockSafeCreateAuditLog.mock.calls[0][0].metadata).not.toHaveProperty("email");
  });

  it("returns EMAIL_FAILED without raw Resend details when sending fails", async () => {
    mockSendEmail.mockRejectedValueOnce(new Error("RESEND_API_KEY secret leaked"));

    const res = await POST(request, params);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json).toEqual({ error: "L'email de confirmation n'a pas pu être envoyé.", code: "EMAIL_FAILED" });
    expect(mockSanitizeError).toHaveBeenCalled();
    expect(mockSafeCreateAuditLog).not.toHaveBeenCalled();
  });
});
