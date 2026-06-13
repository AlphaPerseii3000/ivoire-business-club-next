import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const mockAuth = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockUserUpdate = vi.hoisted(() => vi.fn());
const mockSafeCreateAuditLog = vi.hoisted(() => vi.fn());
const mockIsEligibleForVerification = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/audit-log", () => ({
  AUDIT_ACTIONS: { USER_VERIFY: "USER_VERIFY" },
  safeCreateAuditLog: mockSafeCreateAuditLog,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mockUserFindUnique,
      update: mockUserUpdate,
    },
  },
}));
vi.mock("@/lib/verification", () => ({
  isEligibleForVerification: mockIsEligibleForVerification,
}));

function makeRequest(action: string) {
  const formData = new FormData();
  formData.append("action", action);
  return new Request("http://localhost/api/admin/users/member-1/verify", {
    method: "POST",
    body: formData,
  });
}

const params = { params: Promise.resolve({ id: "member-1" }) };

describe("POST /api/admin/users/[id]/verify", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "admin-1" } });
    mockIsEligibleForVerification.mockReturnValue({ eligible: true, missingPrerequisites: [] });
    mockUserFindUnique.mockImplementation(async ({ where }: { where: { id: string } }) => {
      if (where.id === "admin-1") return { id: "admin-1", role: "ADMIN", status: "ACTIVE" };
      if (where.id === "member-1") {
        return {
          id: "member-1",
          emailVerified: true,
          bio: "Bio ok",
          location: "Abidjan",
          country: "CI",
          status: "ACTIVE",
          verificationStatus: "PENDING",
        };
      }
      return null;
    });
  });

  it("returns 401 for unauthenticated requests", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await POST(makeRequest("verify"), params);
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin users", async () => {
    mockUserFindUnique.mockImplementation(async ({ where }: { where: { id: string } }) => {
      if (where.id === "admin-1") return { id: "admin-1", role: "MEMBER", status: "ACTIVE" };
      return null;
    });

    const res = await POST(makeRequest("verify"), params);
    expect(res.status).toBe(403);
  });

  it("returns 403 for suspended admin users", async () => {
    mockUserFindUnique.mockImplementation(async ({ where }: { where: { id: string } }) => {
      if (where.id === "admin-1") return { id: "admin-1", role: "ADMIN", status: "SUSPENDED" };
      return null;
    });

    const res = await POST(makeRequest("verify"), params);
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid action", async () => {
    const res = await POST(makeRequest("invalid-action"), params);
    expect(res.status).toBe(400);
  });

  it("returns 404 when target user is missing", async () => {
    mockUserFindUnique.mockImplementation(async ({ where }: { where: { id: string } }) => {
      if (where.id === "admin-1") return { id: "admin-1", role: "ADMIN", status: "ACTIVE" };
      return null;
    });

    const res = await POST(makeRequest("verify"), params);
    expect(res.status).toBe(404);
  });

  it("returns 400 for verify if user is not eligible", async () => {
    mockIsEligibleForVerification.mockReturnValue({
      eligible: false,
      missingPrerequisites: ["EMAIL_UNVERIFIED"],
    });

    const res = await POST(makeRequest("verify"), params);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.code).toBe("PREREQUISITES_MISSING");
    expect(json.missingPrerequisites).toContain("EMAIL_UNVERIFIED");
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("accepts verify when user is eligible, updates verificationStatus to VERIFIED and creates audit log", async () => {
    const res = await POST(makeRequest("verify"), params);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "member-1" },
      data: { verificationStatus: "VERIFIED" },
    });
    expect(mockSafeCreateAuditLog).toHaveBeenCalledWith({
      actorId: "admin-1",
      action: "USER_VERIFY",
      entityType: "User",
      entityId: "member-1",
      metadata: { previousStatus: "PENDING", nextStatus: "VERIFIED" },
    });
  });

  it("accepts reject even if user is not eligible, updates verificationStatus to REJECTED and creates audit log", async () => {
    mockIsEligibleForVerification.mockReturnValue({
      eligible: false,
      missingPrerequisites: ["EMAIL_UNVERIFIED"],
    });

    const res = await POST(makeRequest("reject"), params);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "member-1" },
      data: { verificationStatus: "REJECTED" },
    });
    expect(mockSafeCreateAuditLog).toHaveBeenCalledWith({
      actorId: "admin-1",
      action: "USER_VERIFY",
      entityType: "User",
      entityId: "member-1",
      metadata: { previousStatus: "PENDING", nextStatus: "REJECTED" },
    });
  });

  it("does not create audit log if status remains unchanged (idempotence)", async () => {
    mockUserFindUnique.mockImplementation(async ({ where }: { where: { id: string } }) => {
      if (where.id === "admin-1") return { id: "admin-1", role: "ADMIN", status: "ACTIVE" };
      if (where.id === "member-1") {
        return {
          id: "member-1",
          emailVerified: true,
          bio: "Bio ok",
          location: "Abidjan",
          country: "CI",
          status: "ACTIVE",
          verificationStatus: "VERIFIED",
        };
      }
      return null;
    });

    const res = await POST(makeRequest("verify"), params);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockUserUpdate).toHaveBeenCalled();
    expect(mockSafeCreateAuditLog).not.toHaveBeenCalled();
  });
});
