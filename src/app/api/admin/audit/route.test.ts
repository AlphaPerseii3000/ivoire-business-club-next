import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

const mockAuth = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockQueryAuditLogs = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique: mockUserFindUnique } } }));
vi.mock("@/lib/audit-log", () => ({ queryAuditLogs: mockQueryAuditLogs }));
vi.mock("@/lib/sanitize-log", () => ({ sanitizeError: vi.fn(() => "Error: sanitized") }));

function request(query = "") {
  return new Request(`http://localhost/api/admin/audit${query}`);
}

describe("GET /api/admin/audit", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "admin-1" } });
    mockUserFindUnique.mockResolvedValue({ role: "ADMIN" });
    mockQueryAuditLogs.mockResolvedValue({
      logs: [
        {
          id: "audit-1",
          actorId: "admin-1",
          action: "USER_VERIFY",
          entityType: "User",
          entityId: "user-1",
          metadata: { previousStatus: "PENDING", nextStatus: "VERIFIED" },
          createdAt: new Date("2026-05-22T08:00:00.000Z"),
          actor: { id: "admin-1", name: "Admin", email: "admin@example.com" },
        },
      ],
      page: 1,
      pageSize: 50,
      total: 1,
      totalPages: 1,
    });
  });

  it("returns 401 for unauthenticated requests", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await GET(request());
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Non autorisé");
  });

  it("returns 403 for non-admin users", async () => {
    mockUserFindUnique.mockResolvedValueOnce({ role: "MEMBER" });

    const res = await GET(request());
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toBe("Interdit");
  });

  it("returns paginated logs and passes validated filters", async () => {
    const res = await GET(request("?page=1&pageSize=50&action=USER_VERIFY&entityType=User&actorId=admin-1&q=user-1&from=2026-05-01T00:00:00.000Z&to=2026-05-31T23:59:59.999Z"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.logs[0].createdAt).toBe("2026-05-22T08:00:00.000Z");
    expect(json.data.pageSize).toBe(50);
    expect(mockQueryAuditLogs).toHaveBeenCalledWith(expect.objectContaining({ page: 1, pageSize: 50, action: "USER_VERIFY", entityType: "User", actorId: "admin-1", q: "user-1" }));
  });

  it("rejects invalid pageSize and dates", async () => {
    const res = await GET(request("?pageSize=500&from=bad-date"));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Filtres invalides");
    expect(mockQueryAuditLogs).not.toHaveBeenCalled();
  });

  it("rejects inverted date ranges", async () => {
    const res = await GET(request("?from=2026-06-01T00:00:00.000Z&to=2026-05-01T00:00:00.000Z"));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("La date de début doit être antérieure à la date de fin");
  });
});
