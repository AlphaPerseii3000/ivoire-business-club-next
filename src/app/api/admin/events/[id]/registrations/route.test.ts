import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { PUT } from "./[registrationId]/route";

const mockAuth = vi.hoisted(() => vi.fn());
const mockFindMany = vi.hoisted(() => vi.fn());
const mockFindFirst = vi.hoisted(() => vi.fn());
const mockFindUnique = vi.hoisted(() => vi.fn());
const mockUpdate = vi.hoisted(() => vi.fn());
const mockSafeCreateAuditLog = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    eventRegistration: {
      findMany: mockFindMany,
      findFirst: mockFindFirst,
      findUnique: mockFindUnique,
      update: mockUpdate,
    },
  },
}));
vi.mock("@/lib/audit-log", () => ({
  AUDIT_ACTIONS: { EVENT_REGISTRATION_UPDATE: "EVENT_REGISTRATION_UPDATE" },
  safeCreateAuditLog: mockSafeCreateAuditLog,
}));

describe("Admin Event Registrations API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/admin/events/[id]/registrations", () => {
    it("returns 403 for non-admin", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1", role: "MEMBER" } });

      const request = new Request("http://localhost/api/admin/events/evt-1/registrations");
      const response = await GET(request, { params: Promise.resolve({ id: "evt-1" }) });

      expect(response.status).toBe(403);
    });

    it("returns registrations list for admin", async () => {
      mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
      const mockRegs = [
        {
          id: "reg-1",
          eventId: "evt-1",
          email: "test@example.com",
          status: "REGISTERED",
          tierSnapshot: "AFFRANCHI",
        },
      ];
      mockFindMany.mockResolvedValue(mockRegs);

      const request = new Request("http://localhost/api/admin/events/evt-1/registrations");
      const response = await GET(request, { params: Promise.resolve({ id: "evt-1" }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.registrations).toEqual(mockRegs);
    });
  });

  describe("PUT /api/admin/events/[id]/registrations/[registrationId]", () => {
    it("returns 403 for non-admin", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1", role: "MEMBER" } });

      const request = new Request("http://localhost/api/admin/events/evt-1/registrations/reg-1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ATTENDED" }),
      });

      const response = await PUT(request, {
        params: Promise.resolve({ id: "evt-1", registrationId: "reg-1" }),
      });

      expect(response.status).toBe(403);
    });

    it("updates registration status and creates audit log", async () => {
      mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
      mockFindFirst.mockResolvedValue({
        id: "reg-1",
        eventId: "evt-1",
        status: "REGISTERED",
      });
      mockFindUnique.mockResolvedValue({
        id: "reg-1",
        eventId: "evt-1",
        status: "REGISTERED",
      });
      mockUpdate.mockResolvedValue({
        id: "reg-1",
        eventId: "evt-1",
        status: "ATTENDED",
      });

      const request = new Request("http://localhost/api/admin/events/evt-1/registrations/reg-1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ATTENDED" }),
      });

      const response = await PUT(request, {
        params: Promise.resolve({ id: "evt-1", registrationId: "reg-1" }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.registration.status).toBe("ATTENDED");
      expect(mockSafeCreateAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: "admin-1",
          action: "EVENT_REGISTRATION_UPDATE",
          entityId: "reg-1",
        })
      );
    });
  });
});
