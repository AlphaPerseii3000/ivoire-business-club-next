import { describe, it, expect, vi, beforeEach } from "vitest";
import { runSync } from "./sync-onboarding-to-profile";

const mockUserFindMany = vi.hoisted(() => vi.fn());
const mockUserUpdate = vi.hoisted(() => vi.fn());
const mockTransaction = vi.hoisted(() => vi.fn());
const mockAutoTransition = vi.hoisted(() => vi.fn());
const mockSafeCreateAuditLog = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findMany: mockUserFindMany, update: mockUserUpdate },
    $transaction: mockTransaction,
    $disconnect: vi.fn(),
  },
}));

vi.mock("@/lib/verification.server", () => ({
  autoTransitionVerificationStatus: mockAutoTransition,
}));

vi.mock("@/lib/audit-log", () => ({
  AUDIT_ACTIONS: {
    ONBOARDING_SYNC_MIGRATION: "ONBOARDING_SYNC_MIGRATION",
  },
  safeCreateAuditLog: mockSafeCreateAuditLog,
}));

vi.mock("@/lib/sanitize-log", () => ({
  sanitizeError: vi.fn((error: unknown) => (error instanceof Error ? `Error: ${error.message}` : "Unknown error")),
}));

const validOnboardingForm = {
  fullName: "Jean Dupont",
  phone: "+225 07 08 09 10 11",
  address: "12 rue des Affranchis, Abidjan",
  country: "CI",
  activity: "Consultant en immobilier",
  tier: "BOSS",
};

function buildUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    name: null,
    phone: null,
    location: null,
    country: null,
    bio: null,
    tier: "AFFRANCHI",
    onboardingForm: validOnboardingForm,
    onboardingCompletedAt: new Date("2026-06-18T10:00:00.000Z"),
    ...overrides,
  };
}

describe("sync-onboarding-to-profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserFindMany.mockReset();
    mockUserUpdate.mockReset();
    mockTransaction.mockReset();
    mockAutoTransition.mockReset();
    mockSafeCreateAuditLog.mockReset();
  });

  it("remplit les champs User vides à partir du onboardingForm", async () => {
    mockUserFindMany.mockResolvedValue([buildUser()]);
    mockTransaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
      const tx = { user: { update: mockUserUpdate } };
      return callback(tx);
    });

    const result = await runSync(false);

    expect(result.synced).toBe(1);
    expect(result.upToDate).toBe(0);
    expect(result.withoutForm).toBe(0);

    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        name: validOnboardingForm.fullName,
        phone: validOnboardingForm.phone,
        location: validOnboardingForm.address,
        country: validOnboardingForm.country,
        bio: validOnboardingForm.activity,
        tier: validOnboardingForm.tier,
      },
    });
    expect(mockAutoTransition).toHaveBeenCalledWith("user-1", expect.any(Object));
    expect(mockSafeCreateAuditLog).toHaveBeenCalledWith({
      actorId: null,
      action: "ONBOARDING_SYNC_MIGRATION",
      entityType: "User",
      entityId: "user-1",
      metadata: { syncedFields: ["name", "phone", "location", "country", "bio", "tier"] },
    });
  });

  it("conserve les champs User déjà remplis", async () => {
    mockUserFindMany.mockResolvedValue([
      buildUser({
        name: "Jeanne Dupont",
        phone: "+225 01 02 03 04 05",
        location: "Bouaké",
        country: "FR",
        bio: "Déjà une biographie",
        tier: "GRAND_FRERE",
      }),
    ]);

    const result = await runSync(false);

    expect(result.synced).toBe(0);
    expect(result.upToDate).toBe(1);
    expect(result.withoutForm).toBe(0);
    expect(mockUserUpdate).not.toHaveBeenCalled();
    expect(mockAutoTransition).not.toHaveBeenCalled();
    expect(mockSafeCreateAuditLog).not.toHaveBeenCalled();
  });

  it("ignore les utilisateurs sans onboardingForm", async () => {
    mockUserFindMany.mockResolvedValue([buildUser({ onboardingForm: null })]);

    const result = await runSync(false);

    expect(result.synced).toBe(0);
    expect(result.upToDate).toBe(0);
    expect(result.withoutForm).toBe(1);
    expect(mockUserUpdate).not.toHaveBeenCalled();
    expect(mockSafeCreateAuditLog).not.toHaveBeenCalled();
  });

  it("ne modifie rien en mode dry-run", async () => {
    mockUserFindMany.mockResolvedValue([buildUser()]);

    const result = await runSync(true);

    expect(result.synced).toBe(1);
    expect(result.upToDate).toBe(0);
    expect(result.withoutForm).toBe(0);
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockUserUpdate).not.toHaveBeenCalled();
    expect(mockAutoTransition).not.toHaveBeenCalled();
    expect(mockSafeCreateAuditLog).not.toHaveBeenCalled();
  });

  it("est idempotent : la seconde exécution marque les utilisateurs comme déjà à jour", async () => {
    const alreadySyncedUser = buildUser({
      name: validOnboardingForm.fullName,
      phone: validOnboardingForm.phone,
      location: validOnboardingForm.address,
      country: validOnboardingForm.country,
      bio: validOnboardingForm.activity,
      tier: validOnboardingForm.tier,
    });

    mockUserFindMany.mockResolvedValue([alreadySyncedUser]);

    const result = await runSync(false);

    expect(result.synced).toBe(0);
    expect(result.upToDate).toBe(1);
    expect(result.withoutForm).toBe(0);
    expect(mockUserUpdate).not.toHaveBeenCalled();
    expect(mockSafeCreateAuditLog).not.toHaveBeenCalled();
  });

  it("gère les onboardingForm stockés comme chaîne JSON", async () => {
    mockUserFindMany.mockResolvedValue([
      buildUser({ onboardingForm: JSON.stringify(validOnboardingForm) }),
    ]);
    mockTransaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
      const tx = { user: { update: mockUserUpdate } };
      return callback(tx);
    });

    const result = await runSync(false);

    expect(result.synced).toBe(1);
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: expect.objectContaining({ name: validOnboardingForm.fullName }),
    });
  });

  it("ignore les onboardingForm invalides", async () => {
    mockUserFindMany.mockResolvedValue([
      buildUser({ onboardingForm: "pas un json" }),
      buildUser({ onboardingForm: ["tableau"] }),
    ]);

    const result = await runSync(false);

    expect(result.synced).toBe(0);
    expect(result.upToDate).toBe(0);
    expect(result.withoutForm).toBe(2);
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("ne synchronise pas un champ vide du JSON sur un User null", async () => {
    mockUserFindMany.mockResolvedValue([
      buildUser({
        onboardingForm: { ...validOnboardingForm, fullName: "   " },
      }),
    ]);
    mockTransaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
      const tx = { user: { update: mockUserUpdate } };
      return callback(tx);
    });

    const result = await runSync(false);

    expect(result.synced).toBe(1);
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: expect.not.objectContaining({ name: expect.anything() }),
    });
  });
});
