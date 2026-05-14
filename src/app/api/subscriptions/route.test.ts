import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";

const mockAuth = vi.hoisted(() =>
  vi.fn(() => Promise.resolve({ user: { id: "user-123" } }))
);
const mockSubscriptionFindMany = vi.hoisted(() => vi.fn());
const mockSubscriptionCreate = vi.hoisted(() => vi.fn());
const mockPaymentCreate = vi.hoisted(() => vi.fn());
const mockTransaction = vi.hoisted(() => vi.fn((cb: Function) => cb({
  subscription: {
    create: mockSubscriptionCreate,
  },
  payment: {
    create: mockPaymentCreate,
  },
})));

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    subscription: {
      findMany: mockSubscriptionFindMany,
      create: mockSubscriptionCreate,
    },
    payment: {
      create: mockPaymentCreate,
    },
    $transaction: mockTransaction,
  },
}));

vi.mock("@/lib/sanitize-log", () => ({
  sanitizeError: vi.fn((e: unknown) =>
    e instanceof Error ? `Error: ${e.name}` : "Unknown error"
  ),
}));

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/subscriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/subscriptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with user subscriptions ordered by createdAt desc", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
    mockSubscriptionFindMany.mockResolvedValueOnce([
      {
        id: "sub-1",
        userId: "user-123",
        tier: "AFFRANCHI",
        period: "MONTHLY",
        provider: "BANK_TRANSFER",
        providerRef: "IBC-user-123-AFFRANCHI-123456",
        status: "TRIAL",
        startDate: new Date("2024-01-01"),
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
        user: { id: "user-123", name: "Jean", email: "jean@example.com" },
      },
    ]);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].tier).toBe("AFFRANCHI");
    expect(mockSubscriptionFindMany).toHaveBeenCalledWith({
      where: { userId: "user-123" },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Non autorisé");
  });

  it("returns 500 on unexpected error", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
    mockSubscriptionFindMany.mockRejectedValueOnce(new Error("DB down"));

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Erreur interne");
  });
});

describe("POST /api/subscriptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates TRIAL subscription and pending payment in transaction with generated providerRef", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
    const mockSub = {
      id: "sub-new",
      userId: "user-123",
      tier: "GRAND_FRERE",
      period: "ANNUAL",
      provider: "BANK_TRANSFER",
      providerRef: expect.stringMatching(/^IBC-user-123-GRAND_FRERE-\d+$/),
      status: "TRIAL",
      startDate: expect.any(Date),
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
    };
    mockSubscriptionCreate.mockResolvedValueOnce(mockSub);
    mockPaymentCreate.mockResolvedValueOnce({ id: "pay-new" });
    mockTransaction.mockImplementationOnce(async (cb: Function) => cb({
      subscription: { create: mockSubscriptionCreate },
      payment: { create: mockPaymentCreate },
    }));

    const req = makeRequest({ tier: "GRAND_FRERE", period: "ANNUAL" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data).toBeDefined();
    expect(mockSubscriptionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-123",
          tier: "GRAND_FRERE",
          period: "ANNUAL",
          provider: "BANK_TRANSFER",
          status: "TRIAL",
        }),
      })
    );
    expect(mockPaymentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-123",
          amount: 0,
          currency: "EUR",
          provider: "BANK_TRANSFER",
          status: "pending",
        }),
      })
    );
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const req = makeRequest({ tier: "AFFRANCHI", period: "MONTHLY" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Non autorisé");
  });

  it("returns 400 for invalid tier", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });

    const req = makeRequest({ tier: "INVALID", period: "MONTHLY" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Données invalides");
    expect(json.details).toBeDefined();
  });

  it("returns 400 for invalid period", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });

    const req = makeRequest({ tier: "AFFRANCHI", period: "WEEKLY" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Données invalides");
    expect(json.details).toBeDefined();
  });

  it("returns 500 on unexpected error", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
    mockTransaction.mockRejectedValueOnce(new Error("DB down"));

    const req = makeRequest({ tier: "BOSS", period: "MONTHLY" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Erreur interne");
  });
});
