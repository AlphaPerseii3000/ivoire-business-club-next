import { describe, it, expect, vi, beforeEach } from "vitest";
import { PUT } from "./route";

const mockAuth = vi.hoisted(() => vi.fn(() => Promise.resolve({ user: { id: "user-123" } })));
const mockUserUpdate = vi.hoisted(() => vi.fn());
const mockAuditLogCreate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      update: mockUserUpdate,
    },
  },
}));

vi.mock("@/lib/audit-log", () => ({
  AUDIT_ACTIONS: { ONBOARDING_COMPLETED: "ONBOARDING_COMPLETED" },
  safeCreateAuditLog: mockAuditLogCreate,
}));

vi.mock("@/lib/sanitize-log", () => ({
  sanitizeError: vi.fn((e: unknown) =>
    e instanceof Error ? `Error: ${e.name}` : "Unknown error"
  ),
}));

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/user/onboarding", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validPayload = {
  fullName: "Jean Dupont",
  address: "12 rue des Affranchis, 75001 Paris",
  phone: "+225 07 08 09 10 11",
  email: "jean@example.com",
  duration: "MONTHLY",
  tier: "BOSS",
  activity: "Consultant en immobilier",
  goals: "Trouver des opportunités d'investissement en Côte d'Ivoire et rencontrer des partenaires fiables.",
  needs: "Accès au réseau IBC, visibilité sur les deals vérifiés et accompagnement dans la due diligence.",
};

describe("PUT /api/user/onboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if not authenticated", async () => {
    (mockAuth as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

    const req = makeRequest(validPayload);
    const res = await PUT(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Non autorisé");
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid body", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });

    const req = makeRequest({ ...validPayload, email: "not-an-email" });
    const res = await PUT(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Données invalides");
    expect(json.details.email).toBeDefined();
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("returns 200, updates onboardingForm and onboardingCompletedAt, and logs audit", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
    const completedAt = new Date("2026-06-18T10:00:00.000Z");
    mockUserUpdate.mockResolvedValueOnce({
      id: "user-123",
      email: "jean@example.com",
      name: "Jean",
      phone: null,
      country: null,
      onboardingForm: validPayload,
      onboardingCompletedAt: completedAt,
    });

    const req = makeRequest(validPayload);
    const res = await PUT(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.onboardingForm).toEqual(validPayload);
    expect(json.data.onboardingCompletedAt).toBe(completedAt.toISOString());
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "user-123" },
      data: expect.objectContaining({
        onboardingForm: validPayload,
        onboardingCompletedAt: expect.any(Date),
      }),
      select: expect.any(Object),
    });
    expect(mockAuditLogCreate).toHaveBeenCalledWith({
      actorId: "user-123",
      action: "ONBOARDING_COMPLETED",
      entityType: "User",
      entityId: "user-123",
      metadata: { completedAt: expect.any(String) },
    });
  });

  it("allows updating onboarding data when already completed", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
    const updatedPayload = { ...validPayload, tier: "GRAND_FRERE" };
    const completedAt = new Date("2026-06-18T11:00:00.000Z");
    mockUserUpdate.mockResolvedValueOnce({
      id: "user-123",
      email: "jean@example.com",
      name: "Jean",
      phone: null,
      country: null,
      onboardingForm: updatedPayload,
      onboardingCompletedAt: completedAt,
    });

    const req = makeRequest(updatedPayload);
    const res = await PUT(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.onboardingForm.tier).toBe("GRAND_FRERE");
    expect(mockAuditLogCreate).toHaveBeenCalledWith({
      actorId: "user-123",
      action: "ONBOARDING_COMPLETED",
      entityType: "User",
      entityId: "user-123",
      metadata: { completedAt: expect.any(String) },
    });
  });

  it("returns 500 on unexpected DB error", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
    mockUserUpdate.mockRejectedValueOnce(new Error("DB down"));

    const req = makeRequest(validPayload);
    const res = await PUT(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Erreur interne");
  });

  it("does not expose passwordHash in response", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
    mockUserUpdate.mockResolvedValueOnce({
      id: "user-123",
      email: "jean@example.com",
      name: "Jean",
      phone: null,
      country: null,
      onboardingForm: validPayload,
      onboardingCompletedAt: new Date(),
      passwordHash: "should-not-be-there",
    });

    const req = makeRequest(validPayload);
    const res = await PUT(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.passwordHash).toBeUndefined();
    expect(json.data).toEqual({
      onboardingForm: validPayload,
      onboardingCompletedAt: expect.any(String),
    });
  });
});
