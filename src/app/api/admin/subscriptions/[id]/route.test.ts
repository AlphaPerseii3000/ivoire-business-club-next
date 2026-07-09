import { beforeEach, describe, expect, it, vi } from "vitest";
import { PATCH } from "./route";

const mockAuth = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockUserUpdate = vi.hoisted(() => vi.fn());
const mockSubscriptionFindUnique = vi.hoisted(() => vi.fn());
const mockSubscriptionUpdate = vi.hoisted(() => vi.fn());
const mockPaymentUpdateMany = vi.hoisted(() => vi.fn());
const mockTransaction = vi.hoisted(() => vi.fn());
const mockSendActivated = vi.hoisted(() => vi.fn());
const mockSendRejected = vi.hoisted(() => vi.fn());
const mockSafeCreateAuditLog = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/audit-log", () => ({
  AUDIT_ACTIONS: {
    SUBSCRIPTION_VALIDATE: "SUBSCRIPTION_VALIDATE",
    SUBSCRIPTION_REJECT: "SUBSCRIPTION_REJECT",
    SUBSCRIPTION_SUSPEND: "SUBSCRIPTION_SUSPEND",
    OPPORTUNITY_STATUS_CHANGE: "OPPORTUNITY_STATUS_CHANGE",
    OPPORTUNITY_DOUBLE_VERIFICATION_APPROVE: "OPPORTUNITY_DOUBLE_VERIFICATION_APPROVE",
    OPPORTUNITY_UPDATE: "OPPORTUNITY_UPDATE",
    OPPORTUNITY_DELETE: "OPPORTUNITY_DELETE",
  },
  safeCreateAuditLog: mockSafeCreateAuditLog,
}));
vi.mock("@/lib/email", () => ({
  sendSubscriptionActivatedEmail: mockSendActivated,
  sendSubscriptionRejectedEmail: mockSendRejected,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique, update: mockUserUpdate },
    subscription: { findUnique: mockSubscriptionFindUnique, update: mockSubscriptionUpdate },
    payment: { updateMany: mockPaymentUpdateMany },
    $transaction: mockTransaction,
  },
}));
vi.mock("@/lib/sanitize-log", () => ({
  sanitizeError: vi.fn((error: unknown) => (error instanceof Error ? `Error: ${error.name}` : "Unknown error")),
}));

function request(body: unknown) {
  return new Request("http://localhost/api/admin/subscriptions/sub-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const params = { params: Promise.resolve({ id: "sub-1" }) };

const pendingSubscription = {
  id: "sub-1",
  userId: "member-1",
  tier: "GRAND_FRERE",
  period: "MONTHLY",
  provider: "BANK_TRANSFER",
  providerRef: "IBC-member-1-GRAND_FRERE",
  status: "PENDING",
  user: { id: "member-1", name: "Jean Kouassi", email: "jean@example.com" },
};

const trialWaveSubscription = {
  ...pendingSubscription,
  status: "TRIAL",
  provider: "WAVE",
  providerPhone: "+225 01 23 45 67 89",
};

const trialOrangeMoneySubscription = {
  ...pendingSubscription,
  status: "TRIAL",
  provider: "ORANGE_MONEY",
  providerPhone: "+221 77 123 45 67",
};

const activeSubscription = {
  ...pendingSubscription,
  status: "ACTIVE",
};

describe("PATCH /api/admin/subscriptions/[id]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "admin-1" } });
    mockUserFindUnique.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
    mockTransaction.mockImplementation(async (cb) =>
      cb({
        subscription: { update: mockSubscriptionUpdate },
        payment: { updateMany: mockPaymentUpdateMany },
        user: { update: mockUserUpdate },
      })
    );
    mockSubscriptionUpdate.mockResolvedValue({ ...pendingSubscription, status: "ACTIVE" });
    mockPaymentUpdateMany.mockResolvedValue({ count: 1 });
    mockSendActivated.mockResolvedValue(undefined);
    mockSendRejected.mockResolvedValue(undefined);
  });

  it("returns 401 for unauthenticated requests", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await PATCH(request({ action: "validate" }), params);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Non autorisé");
  });

  it("returns 403 for non-admin users", async () => {
    mockUserFindUnique.mockResolvedValueOnce({ id: "member-2", role: "MEMBER" });

    const res = await PATCH(request({ action: "validate" }), params);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toBe("Interdit");
  });

  it("validates a pending subscription, marks payment succeeded, sends activation email, and creates audit log", async () => {
    mockSubscriptionFindUnique.mockResolvedValueOnce(pendingSubscription);

    const res = await PATCH(request({ action: "validate" }), params);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.status).toBe("ACTIVE");
    expect(mockSubscriptionUpdate).toHaveBeenCalledWith({
      where: { id: "sub-1" },
      data: { status: "ACTIVE", endDate: expect.any(Date) },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    expect(mockPaymentUpdateMany).toHaveBeenCalledWith({
      where: { userId: "member-1", providerRef: "IBC-member-1-GRAND_FRERE" },
      data: { status: "succeeded" },
    });
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "member-1" },
      data: { tier: "GRAND_FRERE" },
    });
    expect(mockSendActivated).toHaveBeenCalledWith({
      to: "jean@example.com",
      name: "Jean Kouassi",
      tier: "GRAND_FRERE",
    });
    // AC4/AC8: audit log created with correct action/entity for validate
    expect(mockSafeCreateAuditLog).toHaveBeenCalledWith({
      actorId: "admin-1",
      action: "SUBSCRIPTION_VALIDATE",
      entityType: "Subscription",
      entityId: "sub-1",
      metadata: expect.objectContaining({
        provider: "BANK_TRANSFER",
        previousStatus: "PENDING",
        nextStatus: "ACTIVE",
        tier: "GRAND_FRERE",
      }),
    });
  });

  it("returns 200 even when activation email fails (fire-and-forget)", async () => {
    mockSubscriptionFindUnique.mockResolvedValueOnce(pendingSubscription);
    mockSendActivated.mockRejectedValueOnce(new Error("resend down"));

    const res = await PATCH(request({ action: "validate" }), params);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.status).toBe("ACTIVE");
    expect(mockSendActivated).toHaveBeenCalledWith({
      to: "jean@example.com",
      name: "Jean Kouassi",
      tier: "GRAND_FRERE",
    });
  });

  it("rejects invalid transition from ACTIVE to validate", async () => {
    mockSubscriptionFindUnique.mockResolvedValueOnce(activeSubscription);

    const res = await PATCH(request({ action: "validate" }), params);
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.error).toContain("transition");
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("requires a justification before rejecting a pending subscription", async () => {
    mockSubscriptionFindUnique.mockResolvedValueOnce(pendingSubscription);

    const res = await PATCH(request({ action: "reject", reason: "" }), params);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("La justification est obligatoire pour refuser un abonnement.");
  });

  it("rejects a pending subscription, marks payment failed, sends refusal email, and creates audit log", async () => {
    mockSubscriptionFindUnique.mockResolvedValueOnce(pendingSubscription);
    mockSubscriptionUpdate.mockResolvedValueOnce({ ...pendingSubscription, status: "CANCELLED" });

    const res = await PATCH(request({ action: "reject", reason: "Virement non reçu" }), params);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.status).toBe("CANCELLED");
    expect(mockPaymentUpdateMany).toHaveBeenCalledWith({
      where: { userId: "member-1", providerRef: "IBC-member-1-GRAND_FRERE" },
      data: { status: "failed" },
    });
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "member-1" },
      data: { tier: "AFFRANCHI" },
    });
    expect(mockSendRejected).toHaveBeenCalledWith({
      to: "jean@example.com",
      name: "Jean Kouassi",
      tier: "GRAND_FRERE",
      reason: "Virement non reçu",
    });
    // AC4/AC8: audit log created with correct action/entity for reject
    expect(mockSafeCreateAuditLog).toHaveBeenCalledWith({
      actorId: "admin-1",
      action: "SUBSCRIPTION_REJECT",
      entityType: "Subscription",
      entityId: "sub-1",
      metadata: expect.objectContaining({
        provider: "BANK_TRANSFER",
        previousStatus: "PENDING",
        nextStatus: "CANCELLED",
        tier: "GRAND_FRERE",
        paymentStatus: "failed",
      }),
    });
  });

  it("returns 200 even when rejection email fails (fire-and-forget)", async () => {
    mockSubscriptionFindUnique.mockResolvedValueOnce(pendingSubscription);
    mockSubscriptionUpdate.mockResolvedValueOnce({ ...pendingSubscription, status: "CANCELLED" });
    mockSendRejected.mockRejectedValueOnce(new Error("resend down"));

    const res = await PATCH(request({ action: "reject", reason: "Virement non reçu" }), params);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.status).toBe("CANCELLED");
    expect(mockSendRejected).toHaveBeenCalledWith({
      to: "jean@example.com",
      name: "Jean Kouassi",
      tier: "GRAND_FRERE",
      reason: "Virement non reçu",
    });
  });

  it("suspends an ACTIVE subscription, blocks future premium access, and creates audit log", async () => {
    mockSubscriptionFindUnique.mockResolvedValueOnce(activeSubscription);
    mockSubscriptionUpdate.mockResolvedValueOnce({ ...activeSubscription, status: "CANCELLED" });
    const res = await PATCH(request({ action: "suspend", reason: "Non respect des règles" }), params);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.status).toBe("CANCELLED");
    expect(mockSubscriptionUpdate).toHaveBeenCalledWith({
      where: { id: "sub-1" },
      data: { status: "CANCELLED" },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    expect(mockPaymentUpdateMany).not.toHaveBeenCalled();
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "member-1" },
      data: { tier: "AFFRANCHI" },
    });
    // AC4/AC8: audit log created with correct action/entity for suspend
    expect(mockSafeCreateAuditLog).toHaveBeenCalledWith({
      actorId: "admin-1",
      action: "SUBSCRIPTION_SUSPEND",
      entityType: "Subscription",
      entityId: "sub-1",
      metadata: expect.objectContaining({
        provider: "BANK_TRANSFER",
        previousStatus: "ACTIVE",
        nextStatus: "CANCELLED",
        tier: "GRAND_FRERE",
      }),
    });
  });
   it("validates a TRIAL WAVE subscription, marks payment succeeded, sends activation email, and creates audit log with provider", async () => {
     mockSubscriptionFindUnique.mockResolvedValueOnce(trialWaveSubscription);

     const res = await PATCH(request({ action: "validate" }), params);
     const json = await res.json();

     expect(res.status).toBe(200);
     expect(json.data.status).toBe("ACTIVE");
     expect(mockPaymentUpdateMany).toHaveBeenCalledWith({
       where: { userId: "member-1", providerRef: "IBC-member-1-GRAND_FRERE" },
       data: { status: "succeeded" },
     });
     expect(mockUserUpdate).toHaveBeenCalledWith({
       where: { id: "member-1" },
       data: { tier: "GRAND_FRERE" },
     });
     expect(mockSendActivated).toHaveBeenCalledWith({
       to: "jean@example.com",
       name: "Jean Kouassi",
       tier: "GRAND_FRERE",
     });
     expect(mockSafeCreateAuditLog).toHaveBeenCalledWith({
       actorId: "admin-1",
       action: "SUBSCRIPTION_VALIDATE",
       entityType: "Subscription",
       entityId: "sub-1",
       metadata: expect.objectContaining({
         provider: "WAVE",
         previousStatus: "TRIAL",
         nextStatus: "ACTIVE",
         tier: "GRAND_FRERE",
       }),
     });
   });

    it("validates a TRIAL ORANGE_MONEY subscription and creates audit log with provider", async () => {
      mockSubscriptionFindUnique.mockResolvedValueOnce(trialOrangeMoneySubscription);

      const res = await PATCH(request({ action: "validate" }), params);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.status).toBe("ACTIVE");
      expect(mockSubscriptionUpdate).toHaveBeenCalledWith({
        where: { id: "sub-1" },
        data: { status: "ACTIVE", endDate: expect.any(Date) },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
      expect(mockUserUpdate).toHaveBeenCalledWith({
        where: { id: "member-1" },
        data: { tier: "GRAND_FRERE" },
      });
     expect(mockSafeCreateAuditLog).toHaveBeenCalledWith({
       actorId: "admin-1",
       action: "SUBSCRIPTION_VALIDATE",
       entityType: "Subscription",
       entityId: "sub-1",
       metadata: expect.objectContaining({
         provider: "ORANGE_MONEY",
         previousStatus: "TRIAL",
         nextStatus: "ACTIVE",
         tier: "GRAND_FRERE",
       }),
     });
   });

    it("rejects a TRIAL WAVE subscription, marks payment failed, sends refusal email, and creates audit log", async () => {
      mockSubscriptionFindUnique.mockResolvedValueOnce(trialWaveSubscription);
      mockSubscriptionUpdate.mockResolvedValueOnce({ ...trialWaveSubscription, status: "CANCELLED" });

      const res = await PATCH(request({ action: "reject", reason: "Paiement non reçu" }), params);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.status).toBe("CANCELLED");
      expect(mockPaymentUpdateMany).toHaveBeenCalledWith({
        where: { userId: "member-1", providerRef: "IBC-member-1-GRAND_FRERE" },
        data: { status: "failed" },
      });
      expect(mockUserUpdate).toHaveBeenCalledWith({
        where: { id: "member-1" },
        data: { tier: "AFFRANCHI" },
      });
     expect(mockSendRejected).toHaveBeenCalledWith({
       to: "jean@example.com",
       name: "Jean Kouassi",
       tier: "GRAND_FRERE",
       reason: "Paiement non reçu",
     });
     expect(mockSafeCreateAuditLog).toHaveBeenCalledWith({
       actorId: "admin-1",
       action: "SUBSCRIPTION_REJECT",
       entityType: "Subscription",
       entityId: "sub-1",
       metadata: expect.objectContaining({
         provider: "WAVE",
         previousStatus: "TRIAL",
         nextStatus: "CANCELLED",
         tier: "GRAND_FRERE",
         paymentStatus: "failed",
       }),
     });
   });

   it("rejects invalid transition from ACTIVE to validate", async () => {
     mockSubscriptionFindUnique.mockResolvedValueOnce(activeSubscription);

     const res = await PATCH(request({ action: "validate" }), params);
     const json = await res.json();

     expect(res.status).toBe(409);
     expect(json.error).toContain("transition");
     expect(mockTransaction).not.toHaveBeenCalled();
   });

   it("rejects invalid transition from TRIAL to suspend", async () => {
     mockSubscriptionFindUnique.mockResolvedValueOnce(trialWaveSubscription);
     const res = await PATCH(request({ action: "suspend" }), params);
     const json = await res.json();
     expect(res.status).toBe(409);
     expect(json.error).toContain("transition");
     expect(mockTransaction).not.toHaveBeenCalled();
   });
   });
