import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

const mockAuth = vi.hoisted(() => vi.fn());
const mockEventFindMany = vi.hoisted(() => vi.fn());
const mockEventCreate = vi.hoisted(() => vi.fn());
const mockEventFindFirst = vi.hoisted(() => vi.fn());
const mockSafeCreateAuditLog = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    event: {
      findMany: mockEventFindMany,
      create: mockEventCreate,
      findFirst: mockEventFindFirst,
    },
  },
}));
vi.mock("@/lib/audit-log", () => ({
  safeCreateAuditLog: mockSafeCreateAuditLog,
}));

function makePostRequest(body: unknown) {
  return new Request("http://localhost/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const mockEvents = [
  {
    id: "evt-1",
    title: "Événement Publié",
    slug: "evenement-publie",
    description: "Description de l'événement publié",
    startDate: new Date("2026-07-15T18:00:00Z"),
    endDate: new Date("2026-07-15T22:00:00Z"),
    location: "Abidjan",
    imageUrl: null,
    status: "PUBLISHED",
    authorId: "admin-1",
  },
  {
    id: "evt-2",
    title: "Événement Annulé",
    slug: "evenement-annule",
    description: "Description de l'événement annulé",
    startDate: new Date("2026-06-10T18:00:00Z"),
    endDate: null,
    location: "Bouaké",
    imageUrl: null,
    status: "CANCELLED",
    authorId: "admin-1",
  },
  {
    id: "evt-3",
    title: "Événement Brouillon",
    slug: "evenement-brouillon",
    description: "Description du brouillon",
    startDate: new Date("2026-08-01T18:00:00Z"),
    endDate: null,
    location: "San Pedro",
    imageUrl: null,
    status: "DRAFT",
    authorId: "admin-1",
  },
];

describe("GET /api/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns only PUBLISHED and CANCELLED events sorted by startDate desc", async () => {
    mockAuth.mockResolvedValue(null);
    mockEventFindMany.mockResolvedValue([mockEvents[0], mockEvents[1]]);

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toHaveLength(2);
    expect(mockEventFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: { in: ["PUBLISHED", "CANCELLED"] },
        },
        orderBy: { startDate: "desc" },
      })
    );
  });
});

describe("POST /api/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthorized user (non-admin)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "MEMBER" } });

    const response = await POST(
      makePostRequest({
        title: "Titre de test",
        description: "Description de l'événement de test assez longue",
        startDate: "2026-07-15T18:00:00Z",
        endDate: "2026-07-15T22:00:00Z",
        location: "Abidjan",
      })
    );

    expect(response.status).toBe(403);
    const payload = await response.json();
    expect(payload.error).toBe("Non autorisé");
  });

  it("creates an event with default DRAFT status and auto-generated slug for admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockEventFindFirst.mockResolvedValue(null);
    mockEventCreate.mockResolvedValue({
      id: "evt-4",
      title: "Nouvel événement",
      slug: "nouvel-evenement",
      status: "DRAFT",
      authorId: "admin-1",
    });

    const response = await POST(
      makePostRequest({
        title: "Nouvel événement",
        description: "Description de l'événement de test assez longue",
        startDate: "2026-07-15T18:00:00Z",
        endDate: "2026-07-15T22:00:00Z",
        location: "Abidjan",
      })
    );

    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload.id).toBe("evt-4");
    expect(payload.slug).toBe("nouvel-evenement");
    expect(payload.status).toBe("DRAFT");
    expect(mockEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Nouvel événement",
          slug: "nouvel-evenement",
          status: "DRAFT",
          authorId: "admin-1",
        }),
      })
    );
    expect(mockSafeCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "admin-1",
        action: "EVENT_CREATE",
        entityType: "EVENT",
        entityId: "evt-4",
      })
    );
  });

  it("handles slug collision by appending counter", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockEventFindFirst
      .mockResolvedValueOnce({ id: "existing-id" })
      .mockResolvedValueOnce(null);

    mockEventCreate.mockResolvedValue({
      id: "evt-5",
      title: "Collision Titre",
      slug: "collision-titre-1",
      status: "DRAFT",
    });

    const response = await POST(
      makePostRequest({
        title: "Collision Titre",
        description: "Description de l'événement de test assez longue",
        startDate: "2026-07-15T18:00:00Z",
        location: "Abidjan",
      })
    );

    expect(response.status).toBe(201);
    expect(mockEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slug: "collision-titre-1",
        }),
      })
    );
  });

  it("returns 400 when endDate is before startDate", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });

    const response = await POST(
      makePostRequest({
        title: "Événement invalide",
        description: "Description de l'événement de test assez longue",
        startDate: "2026-07-15T18:00:00Z",
        endDate: "2026-07-14T18:00:00Z",
        location: "Abidjan",
      })
    );

    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.error).toBe("La date de fin doit être postérieure ou égale à la date de début");
  });

  it("returns 400 when body has malformed JSON", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    const badRequest = new Request("http://localhost/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{invalid-json",
    });

    const response = await POST(badRequest);
    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.error).toBe("Corps de requête JSON invalide ou vide");
  });

  it("returns 400 when required fields are missing", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });

    const response = await POST(
      makePostRequest({
        title: "",
        description: "courte",
        location: "",
      })
    );

    expect(response.status).toBe(400);
  });
});
