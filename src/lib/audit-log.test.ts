import { beforeEach, describe, expect, it, vi } from "vitest";

import { AUDIT_ACTIONS, createAuditLog, queryAuditLogs, safeCreateAuditLog } from "./audit-log";

const mockAuditCreate = vi.hoisted(() => vi.fn());
const mockAuditFindMany = vi.hoisted(() => vi.fn());
const mockAuditCount = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditLog: {
      create: mockAuditCreate,
      findMany: mockAuditFindMany,
      count: mockAuditCount,
    },
  },
}));

describe("audit-log helper", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockAuditCreate.mockResolvedValue({ id: "audit-1" });
    mockAuditFindMany.mockResolvedValue([]);
    mockAuditCount.mockResolvedValue(0);
  });

  it("creates an immutable audit entry through create only with sanitized metadata", async () => {
    await createAuditLog({
      actorId: "admin-1",
      action: AUDIT_ACTIONS.SUBSCRIPTION_VALIDATE,
      entityType: "Subscription",
      entityId: "sub-1",
      metadata: { previousStatus: "PENDING", nextStatus: "ACTIVE", email: "member@example.com", r2Key: "secret-key" },
    });

    expect(mockAuditCreate).toHaveBeenCalledWith({
      data: {
        actorId: "admin-1",
        action: "SUBSCRIPTION_VALIDATE",
        entityType: "Subscription",
        entityId: "sub-1",
        metadata: { previousStatus: "PENDING", nextStatus: "ACTIVE", email: "[REDACTED]", r2Key: "[REDACTED]" },
      },
    });
  });

  it("does not throw when safe audit creation fails after a business mutation", async () => {
    mockAuditCreate.mockRejectedValueOnce(new Error("database unavailable"));
    await expect(safeCreateAuditLog({ action: AUDIT_ACTIONS.USER_VERIFY, entityType: "User", entityId: "user-1" })).resolves.toBeUndefined();
  });

  it("queries paginated logs with filters", async () => {
    await queryAuditLogs({ page: 2, pageSize: 10, action: "USER_VERIFY", entityType: "User", actorId: "admin-1", q: "user-1" });

    expect(mockAuditFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        action: "USER_VERIFY",
        entityType: "User",
        actorId: "admin-1",
        OR: expect.any(Array),
      }),
      orderBy: { createdAt: "desc" },
      skip: 10,
      take: 10,
    }));
    expect(mockAuditCount).toHaveBeenCalled();
  });
});
