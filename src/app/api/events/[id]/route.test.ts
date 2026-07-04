import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, PUT, DELETE } from "./route";

const mockAuth = vi.hoisted(() => vi.fn());
const mockEventFindFirst = vi.hoisted(() => vi.fn());
const mockEventUpdate = vi.hoisted(() => vi.fn());
const mockEventDelete = vi.hoisted(() => vi.fn());
const mockSafeCreateAuditLog = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    event: {
      findFirst: mockEventFindFirst,
      update: mockEventUpdate,
      delete: mockEventDelete,
    },
  },
}));
vi.mock("@/lib/audit-log", () => ({
  safeCreateAuditLog: mockSafeCreateAuditLog,
}));

function makeRequest(method: string, body?: unknown) {
  return new Request("http://localhost/api/events/test-id", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const mockEvent = {
  id: "evt-1",
  title: "Événement Test",
  slug: "evenement-test",
  description: "Description très longue et détaillée",
  startDate: new Date("2026-07-15T18:00:00Z"),
  endDate: new Date("2026-07-15T22:00:00Z"),
  location: "Abidjan",
  coverImagePath: null,
  eventType: "IN_PERSON",
  visibility: "PUBLIC",
  onlineUrl: null,
  maxCapacity: null,
  pricing: null,
  status: "DRAFT",
  authorId: "admin-1",
};

describe("GET /api/events/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockReset();
  });

  it("returns 404 if event is not found", async () => {
    mockEventFindFirst.mockResolvedValue(null);

    const response = await GET(makeRequest("GET"), { params: Promise.resolve({ id: "unknown" }) });
    expect(response.status).toBe(404);
  });

  it("does not expose DRAFT events to visitors", async () => {
    mockAuth.mockResolvedValue(null);
    mockEventFindFirst.mockResolvedValue(mockEvent);

    const response = await GET(makeRequest("GET"), { params: Promise.resolve({ id: "evt-1" }) });
    expect(response.status).toBe(404);
  });

  it("returns 200 for visitor when event is PUBLISHED", async () => {
    mockAuth.mockResolvedValue(null);
    mockEventFindFirst.mockResolvedValue({
      ...mockEvent,
      status: "PUBLISHED",
    });

    const response = await GET(makeRequest("GET"), { params: Promise.resolve({ id: "evt-1" }) });
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.id).toBe("evt-1");
  });

  it("returns 200 for visitor when event is CANCELLED", async () => {
    mockAuth.mockResolvedValue(null);
    mockEventFindFirst.mockResolvedValue({
      ...mockEvent,
      status: "CANCELLED",
    });

    const response = await GET(makeRequest("GET"), { params: Promise.resolve({ id: "evt-1" }) });
    expect(response.status).toBe(200);
  });
});

describe("PUT /api/events/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockReset();
    mockEventFindFirst.mockReset();
    mockEventUpdate.mockReset();
  });

  it("rejects non-admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "MEMBER" } });

    const response = await PUT(makeRequest("PUT", { title: "Nouveau titre" }), {
      params: Promise.resolve({ id: "evt-1" }),
    });
    expect(response.status).toBe(403);
  });

  it("updates fields and regenerates slug when title changes", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockEventFindFirst
      .mockResolvedValueOnce(mockEvent)
      .mockResolvedValueOnce(null);

    mockEventUpdate.mockResolvedValue({
      ...mockEvent,
      title: "Titre mis à jour",
      slug: "titre-mis-a-jour",
    });

    const response = await PUT(makeRequest("PUT", {
      title: "Titre mis à jour",
      location: "Abidjan",
      eventType: "IN_PERSON",
    }), {
      params: Promise.resolve({ id: "evt-1" }),
    });

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.title).toBe("Titre mis à jour");
    expect(payload.slug).toBe("titre-mis-a-jour");
    expect(mockSafeCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "admin-1",
        action: "EVENT_UPDATE",
        entityType: "EVENT",
        entityId: "evt-1",
      })
    );
  });

  it("logs EVENT_PUBLISH when publishing an event", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockEventFindFirst.mockResolvedValueOnce(mockEvent);
    mockEventUpdate.mockResolvedValue({
      ...mockEvent,
      status: "PUBLISHED",
    });

    const response = await PUT(makeRequest("PUT", {
      status: "PUBLISHED",
      location: "Abidjan",
      eventType: "IN_PERSON",
    }), {
      params: Promise.resolve({ id: "evt-1" }),
    });

    expect(response.status).toBe(200);
    expect(mockSafeCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "admin-1",
        action: "EVENT_UPDATE",
      })
    );
    expect(mockSafeCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "admin-1",
        action: "EVENT_PUBLISH",
        entityId: "evt-1",
      })
    );
  });

  it("logs EVENT_CANCEL when cancelling an event", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockEventFindFirst.mockResolvedValueOnce({
      ...mockEvent,
      status: "PUBLISHED",
    });
    mockEventUpdate.mockResolvedValue({
      ...mockEvent,
      status: "CANCELLED",
    });

    const response = await PUT(makeRequest("PUT", {
      status: "CANCELLED",
      location: "Abidjan",
      eventType: "IN_PERSON",
    }), {
      params: Promise.resolve({ id: "evt-1" }),
    });

    expect(response.status).toBe(200);
    expect(mockSafeCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "admin-1",
        action: "EVENT_CANCEL",
        entityId: "evt-1",
      })
    );
  });

  it("returns 400 when body has malformed JSON", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    const badRequest = new Request("http://localhost/api/events/evt-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: "{invalid-json",
    });

    const response = await PUT(badRequest, { params: Promise.resolve({ id: "evt-1" }) });
    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.error).toBe("Corps de requête JSON invalide ou vide");
  });

  it("returns 404 when event is not found", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockEventFindFirst.mockResolvedValue(null);

    const response = await PUT(makeRequest("PUT", {
      title: "Nouveau titre",
      location: "Abidjan",
      eventType: "IN_PERSON",
    }), {
      params: Promise.resolve({ id: "evt-unknown" }),
    });

    expect(response.status).toBe(404);
  });

  it("allows publishing an in-person event without re-providing location (partial PATCH)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockEventFindFirst.mockResolvedValueOnce(mockEvent);
    mockEventUpdate.mockResolvedValue({
      ...mockEvent,
      status: "PUBLISHED",
    });

    const response = await PUT(makeRequest("PUT", {
      status: "PUBLISHED",
    }), {
      params: Promise.resolve({ id: "evt-1" }),
    });

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.status).toBe("PUBLISHED");
    expect(mockEventUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "PUBLISHED",
        }),
      })
    );
  });

  it("returns 400 when PATCH changes eventType to ONLINE without onlineUrl", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockEventFindFirst.mockResolvedValueOnce(mockEvent);

    const response = await PUT(makeRequest("PUT", {
      eventType: "ONLINE",
    }), {
      params: Promise.resolve({ id: "evt-1" }),
    });

    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.error).toMatch(/lien de visioconférence est requis/i);
  });

  it("updates pricing on PATCH", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockEventFindFirst.mockResolvedValueOnce(mockEvent);
    const pricing = { visitor: 10000, affranchi: 5000, grand_frere: 3000, boss: 0 };
    mockEventUpdate.mockResolvedValue({
      ...mockEvent,
      pricing,
    });

    const response = await PUT(makeRequest("PUT", {
      pricing,
    }), {
      params: Promise.resolve({ id: "evt-1" }),
    });

    expect(response.status).toBe(200);
    expect(mockEventUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          pricing,
        }),
      })
    );
  });

  it("returns 400 when PATCH provides invalid pricing structure", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockEventFindFirst.mockResolvedValueOnce(mockEvent);

    const response = await PUT(makeRequest("PUT", {
      pricing: { visitor: "gratuit" },
    }), {
      params: Promise.resolve({ id: "evt-1" }),
    });

    expect(response.status).toBe(400);
  });

  it("prevents republishing a cancelled event via PUT (idempotent lifecycle)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    const cancelledEvent = {
      ...mockEvent,
      status: "CANCELLED",
    };
    mockEventFindFirst.mockResolvedValueOnce(cancelledEvent);

    const response = await PUT(makeRequest("PUT", {
      status: "PUBLISHED",
    }), {
      params: Promise.resolve({ id: "evt-cancelled" }),
    });

    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.error).toMatch(/un événement annulé ne peut pas être modifié/i);
  });

  it("allows no-op DRAFT → DRAFT status update", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockEventFindFirst.mockResolvedValueOnce(mockEvent);
    mockEventUpdate.mockResolvedValue(mockEvent);

    const response = await PUT(makeRequest("PUT", {
      status: "DRAFT",
    }), {
      params: Promise.resolve({ id: "evt-1" }),
    });

    expect(response.status).toBe(200);
  });
});

describe("DELETE /api/events/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockReset();
  });

  it("rejects non-admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "MEMBER" } });

    const response = await DELETE(makeRequest("DELETE"), {
      params: Promise.resolve({ id: "evt-1" }),
    });
    expect(response.status).toBe(403);
  });

  it("deletes event and logs EVENT_DELETE for admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockEventFindFirst.mockResolvedValue(mockEvent);
    mockEventDelete.mockResolvedValue(mockEvent);

    const response = await DELETE(makeRequest("DELETE"), {
      params: Promise.resolve({ id: "evt-1" }),
    });

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.data.ok).toBe(true);
    expect(mockEventDelete).toHaveBeenCalledWith({
      where: { id: "evt-1" },
    });
    expect(mockSafeCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "admin-1",
        action: "EVENT_DELETE",
        entityType: "EVENT",
        entityId: "evt-1",
      })
    );
  });
});
