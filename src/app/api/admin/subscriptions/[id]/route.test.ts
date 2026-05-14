import { beforeEach, describe, expect, it, vi } from "vitest";
import { PATCH } from "./route";

const mockAuth = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockSubscriptionFindUnique = vi.hoisted(() => vi.fn());
const mockSubscriptionUpdate = vi.hoisted(() => vi.fn());
const mockPaymentUpdateMany = vi.hoisted(() => vi.fn());
const mockTransaction = vi.hoisted(() => vi.fn());
const mockSendActivated = vi.hoisted(() => vi.fn());
const mockSendRejected = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/email", () => ({
  sendSubscriptionActivatedEmail: mockSendActivated,
  sendSubscriptionRejectedEmail: mockSendRejected,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
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
  providerRef: "IBC-member-1-GRAND_FRERE",
  status: "PENDING",
  user: { id: "member-1", name: "Jean Kouassi", email: "jean@example.com" },
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

  it("validates a pending subscription, marks payment succeeded, and sends activation email", async () => {
    mockSubscriptionFindUnique.mockResolvedValueOnce(pendingSubscription);

    const res = await PATCH(request({ action: "validate" }), params);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.status).toBe("ACTIVE");
    expect(mockSubscriptionUpdate).toHaveBeenCalledWith({
      where: { id: "sub-1" },
      data: { status: "ACTIVE" },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    expect(mockPaymentUpdateMany).toHaveBeenCalledWith({
      where: { userId: "member-1", providerRef: "IBC-member-1-GRAND_FRERE" },
      data: { status: "succeeded" },
    });
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

  it("rejects a pending subscription, marks payment failed, and sends refusal email with the reason", async () => {
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
    expect(mockSendRejected).toHaveBeenCalledWith({
      to: "jean@example.com",
      name: "Jean Kouassi",
      tier: "GRAND_FRERE",
      reason: "Virement non reçu",
    });
  });

  it("suspends an ACTIVE subscription and blocks future premium access", async () => {
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
  });
});
