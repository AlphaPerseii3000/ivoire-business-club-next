import { describe, it, expect, vi, beforeEach } from "vitest";
import { PUT } from "./route";

const mockAuth = vi.hoisted(() => vi.fn(() => Promise.resolve({ user: { id: "user-123" } })));
const mockTransaction = vi.hoisted(() => vi.fn());
const mockUserUpdate = vi.hoisted(() => vi.fn());
const mockAuditLogCreate = vi.hoisted(() => vi.fn());
const mockAutoTransition = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: mockTransaction,
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

vi.mock("@/lib/verification.server", () => ({
  autoTransitionVerificationStatus: mockAutoTransition,
}));

const validPayload = {
  fullName: "Jean Dupont",
  address: "12 rue des Affranchis, 75001 Paris",
  phone: "+225 07 08 09 10 11",
  country: "CI",
  email: "jean@example.com",
  duration: "MONTHLY",
  tier: "BOSS",
  activity: "Consultant en immobilier",
  goals: "Trouver des opportunités d'investissement en Côte d'Ivoire et rencontrer des partenaires fiables.",
  needs: "Accès au réseau IBC, visibilité sur les deals vérifiés et accompagnement dans la due diligence.",
};

function makeTransactionRunner(userOverride?: Record<string, unknown>) {
  return async (callback: (tx: unknown) => Promise<unknown>) => {
    const completedAt = new Date("2026-06-18T10:00:00.000Z");
    const baseUser = {
      id: "user-123",
      email: "jean@example.com",
      name: validPayload.fullName,
      phone: validPayload.phone,
      country: validPayload.country,
      location: validPayload.address,
      bio: validPayload.activity,
      tier: validPayload.tier,
      onboardingForm: validPayload,
      onboardingCompletedAt: completedAt,
      verificationStatus: "PENDING",
      ...userOverride,
    };

    mockUserUpdate.mockResolvedValueOnce(baseUser);
    mockAutoTransition.mockResolvedValueOnce({ changed: false, status: baseUser.verificationStatus });

    return callback({
      user: {
        update: mockUserUpdate,
      },
    });
  };
}

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/user/onboarding", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PUT /api/user/onboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockReset();
    mockUserUpdate.mockReset();
    mockAutoTransition.mockReset();
    mockAuditLogCreate.mockReset();
  });

  it("returns 401 if not authenticated", async () => {
    (mockAuth as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

    const req = makeRequest(validPayload);
    const res = await PUT(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Non autorisé");
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid body", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });

    const req = makeRequest({ ...validPayload, email: "not-an-email" });
    const res = await PUT(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Données invalides");
    expect(json.details.email).toBeDefined();
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("returns 400 when country is missing", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });

    const { country: _, ...payloadWithoutCountry } = validPayload;
    const req = makeRequest(payloadWithoutCountry);
    const res = await PUT(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Données invalides");
    expect(json.details.country).toBeDefined();
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("returns 200, syncs User fields, and logs audit", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
    mockTransaction.mockImplementationOnce(makeTransactionRunner());

    const req = makeRequest(validPayload);
    const res = await PUT(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.onboardingForm).toEqual(validPayload);
    expect(json.data.onboardingCompletedAt).toBeDefined();
    expect(json.data.name).toBe(validPayload.fullName);
    expect(json.data.phone).toBe(validPayload.phone);
    expect(json.data.location).toBe(validPayload.address);
    expect(json.data.country).toBe(validPayload.country);
    expect(json.data.bio).toBe(validPayload.activity);
    expect(json.data.tier).toBe(validPayload.tier);
    expect(json.data.verificationStatus).toBe("PENDING");

    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "user-123" },
      data: expect.objectContaining({
        onboardingForm: validPayload,
        onboardingCompletedAt: expect.any(Date),
        name: validPayload.fullName,
        phone: validPayload.phone,
        location: validPayload.address,
        country: validPayload.country,
        bio: validPayload.activity,
        tier: validPayload.tier,
      }),
      select: expect.objectContaining({
        id: true,
        email: true,
        name: true,
        phone: true,
        country: true,
        location: true,
        bio: true,
        tier: true,
        onboardingForm: true,
        onboardingCompletedAt: true,
        verificationStatus: true,
      }),
    });

    expect(mockAutoTransition).toHaveBeenCalledWith("user-123", expect.any(Object));
    expect(mockAuditLogCreate).toHaveBeenCalledWith({
      actorId: "user-123",
      action: "ONBOARDING_COMPLETED",
      entityType: "User",
      entityId: "user-123",
      metadata: { completedAt: expect.any(String) },
    });
  });

  it("auto-transitions verificationStatus to EN_COURS inside the transaction", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
    mockTransaction.mockImplementationOnce(
      makeTransactionRunner({ verificationStatus: "EN_COURS" })
    );

    const req = makeRequest(validPayload);
    const res = await PUT(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.verificationStatus).toBe("EN_COURS");
    expect(mockAutoTransition).toHaveBeenCalledWith("user-123", expect.any(Object));
  });

  it("keeps VERIFIED verificationStatus idempotent", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
    mockTransaction.mockImplementationOnce(
      makeTransactionRunner({ verificationStatus: "VERIFIED" })
    );

    const req = makeRequest(validPayload);
    const res = await PUT(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.verificationStatus).toBe("VERIFIED");
  });

  it("allows updating onboarding data when already completed", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
    const updatedPayload = { ...validPayload, tier: "GRAND_FRERE" };
    mockTransaction.mockImplementationOnce(
      makeTransactionRunner({ onboardingForm: updatedPayload, tier: updatedPayload.tier })
    );

    const req = makeRequest(updatedPayload);
    const res = await PUT(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.onboardingForm.tier).toBe("GRAND_FRERE");
    expect(json.data.tier).toBe("GRAND_FRERE");
    expect(mockAuditLogCreate).toHaveBeenCalledWith({
      actorId: "user-123",
      action: "ONBOARDING_COMPLETED",
      entityType: "User",
      entityId: "user-123",
      metadata: { completedAt: expect.any(String) },
    });
  });

  it("returns 500 on unexpected transaction error", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
    mockTransaction.mockRejectedValueOnce(new Error("DB down"));

    const req = makeRequest(validPayload);
    const res = await PUT(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Erreur interne");
    expect(mockAuditLogCreate).not.toHaveBeenCalled();
  });

  it("does not expose passwordHash in response", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
    mockTransaction.mockImplementationOnce(
      makeTransactionRunner({ passwordHash: "should-not-be-there" })
    );

    const req = makeRequest(validPayload);
    const res = await PUT(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.passwordHash).toBeUndefined();
    expect(json.data).toEqual({
      onboardingForm: validPayload,
      onboardingCompletedAt: expect.any(String),
      name: validPayload.fullName,
      phone: validPayload.phone,
      location: validPayload.address,
      country: validPayload.country,
      bio: validPayload.activity,
      tier: validPayload.tier,
      verificationStatus: "PENDING",
    });
  });

  it("returns 500 on unexpected DB error inside transaction", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
    mockTransaction.mockImplementationOnce(async (callback: (tx: unknown) => Promise<unknown>) => {
      return callback({
        user: {
          update: vi.fn().mockRejectedValueOnce(new Error("DB down")),
        },
      });
    });

    const req = makeRequest(validPayload);
    const res = await PUT(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Erreur interne");
  });
});
