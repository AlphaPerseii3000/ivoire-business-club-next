import { beforeEach, describe, expect, it, vi } from "vitest";
import { PATCH } from "./route";

const mockAuth = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockUserUpdate = vi.hoisted(() => vi.fn());
const mockSafeCreateAuditLog = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/audit-log", () => ({
  AUDIT_ACTIONS: {
    USER_SUSPEND: "USER_SUSPEND",
    USER_REACTIVATE: "USER_REACTIVATE",
  },
  safeCreateAuditLog: mockSafeCreateAuditLog,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique, update: mockUserUpdate },
  },
}));

function request(body: unknown) {
  return new Request("http://localhost/api/admin/users/member-1/status", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function invalidJsonRequest() {
  return new Request("http://localhost/api/admin/users/member-1/status", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: "{invalid",
  });
}

const params = { params: Promise.resolve({ id: "member-1" }) };
const activeUser = { id: "member-1", status: "ACTIVE", role: "MEMBER", email: "member@example.com", name: "Awa", tier: "GRAND_FRERE" };
const suspendedUser = { ...activeUser, status: "SUSPENDED" };

describe("PATCH /api/admin/users/[id]/status", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "admin-1" } });
    mockUserFindUnique.mockImplementation(async ({ where }: { where: { id: string } }) => {
      if (where.id === "admin-1") return { id: "admin-1", role: "ADMIN", status: "ACTIVE" };
      if (where.id === "member-1") return activeUser;
      return null;
    });
    mockUserUpdate.mockResolvedValue({ id: "member-1", status: "SUSPENDED", tier: "GRAND_FRERE" });
  });

  it("returns 400 for invalid JSON", async () => {
    const res = await PATCH(invalidJsonRequest(), params);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.code).toBe("INVALID_JSON");
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("returns 400 for unknown actions before processing", async () => {
    const res = await PATCH(request({ action: "ban" }), params);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.code).toBe("INVALID_ACTION");
    expect(mockAuth).not.toHaveBeenCalled();
  });

  it("returns 401 for unauthenticated requests", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await PATCH(request({ action: "suspend" }), params);

    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin users", async () => {
    mockUserFindUnique.mockResolvedValueOnce({ id: "admin-1", role: "MEMBER", status: "ACTIVE" });

    const res = await PATCH(request({ action: "suspend" }), params);

    expect(res.status).toBe(403);
  });

  it("returns 403 for suspended admin users", async () => {
    mockUserFindUnique.mockImplementation(async ({ where }: { where: { id: string } }) => {
      if (where.id === "admin-1") return { id: "admin-1", role: "ADMIN", status: "SUSPENDED" };
      if (where.id === "member-1") return activeUser;
      return null;
    });

    const res = await PATCH(request({ action: "suspend" }), params);

    expect(res.status).toBe(403);
  });

  it("returns 404 when target user is missing", async () => {
    mockUserFindUnique.mockImplementation(async ({ where }: { where: { id: string } }) => {
      if (where.id === "admin-1") return { id: "admin-1", role: "ADMIN", status: "ACTIVE" };
      return null;
    });

    const res = await PATCH(request({ action: "suspend" }), params);

    expect(res.status).toBe(404);
  });

  it("prevents admin self-suspension", async () => {
    const res = await PATCH(request({ action: "suspend" }), { params: Promise.resolve({ id: "admin-1" }) });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.code).toBe("SELF_SUSPEND");
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("suspends an active user and creates sanitized audit metadata immediately after mutation", async () => {
    const res = await PATCH(request({ action: "suspend" }), params);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual({ id: "member-1", status: "SUSPENDED", changed: true });
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "member-1" },
      data: { status: "SUSPENDED" },
      select: { id: true, status: true, tier: true },
    });
    expect(mockSafeCreateAuditLog).toHaveBeenCalledWith({
      actorId: "admin-1",
      action: "USER_SUSPEND",
      entityType: "User",
      entityId: "member-1",
      metadata: {
        previousStatus: "ACTIVE",
        nextStatus: "SUSPENDED",
        targetUserId: "member-1",
        tier: "GRAND_FRERE",
      },
    });
  });

  it("reactivates a suspended user and creates audit metadata", async () => {
    mockUserFindUnique.mockImplementation(async ({ where }: { where: { id: string } }) => {
      if (where.id === "admin-1") return { id: "admin-1", role: "ADMIN", status: "ACTIVE" };
      return suspendedUser;
    });
    mockUserUpdate.mockResolvedValueOnce({ id: "member-1", status: "ACTIVE", tier: "GRAND_FRERE" });

    const res = await PATCH(request({ action: "reactivate" }), params);

    expect(res.status).toBe(200);
    expect(mockSafeCreateAuditLog).toHaveBeenCalledWith({
      actorId: "admin-1",
      action: "USER_REACTIVATE",
      entityType: "User",
      entityId: "member-1",
      metadata: {
        previousStatus: "SUSPENDED",
        nextStatus: "ACTIVE",
        targetUserId: "member-1",
        tier: "GRAND_FRERE",
      },
    });
  });

  it("guards idempotent transitions without duplicate mutation or audit", async () => {
    const res = await PATCH(request({ action: "suspend" }), params);
    await res.json();
    mockUserUpdate.mockClear();
    mockSafeCreateAuditLog.mockClear();
    mockUserFindUnique.mockImplementation(async ({ where }: { where: { id: string } }) => {
      if (where.id === "admin-1") return { id: "admin-1", role: "ADMIN", status: "ACTIVE" };
      return suspendedUser;
    });

    const second = await PATCH(request({ action: "suspend" }), params);
    const json = await second.json();

    expect(second.status).toBe(409);
    expect(json.code).toBe("INVALID_TRANSITION");
    expect(mockUserUpdate).not.toHaveBeenCalled();
    expect(mockSafeCreateAuditLog).not.toHaveBeenCalled();
  });
});
