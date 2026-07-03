import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";

const mockAuth = vi.hoisted(() =>
  vi.fn(() => Promise.resolve({ user: { id: "user-123" } }))
);
const mockSubscriptionFindMany = vi.hoisted(() => vi.fn());
const mockSubscriptionCreate = vi.hoisted(() => vi.fn());
const mockPaymentCreate = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockSendWelcomeEmail = vi.hoisted(() => vi.fn(async () => {}));
const mockTransaction = vi.hoisted(() =>
  vi.fn(async (cb: (tx: unknown) => unknown) =>
    cb({
      subscription: {
        create: mockSubscriptionCreate,
      },
      payment: {
        create: mockPaymentCreate,
      },
    })
  )
);

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
    user: {
      findUnique: mockUserFindUnique,
    },
    $transaction: mockTransaction,
  },
}));

vi.mock("@/lib/email", () => ({
  sendWelcomeEmail: mockSendWelcomeEmail,
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
        providerRef: "IBC-user-123-AFFRANCHI",
        status: "PENDING",
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
    (mockAuth as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

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

  it("creates PENDING subscription and pending BANK_TRANSFER payment with displayed providerRef and tier amount", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
    mockUserFindUnique.mockResolvedValueOnce({ email: "jean@example.com", name: "Jean" });
    const mockSub = {
      id: "sub-new",
      userId: "user-123",
      tier: "GRAND_FRERE",
      period: "MONTHLY",
      provider: "BANK_TRANSFER",
      providerPhone: null,
      providerRef: "IBC-user-123-GRAND_FRERE",
      status: "PENDING",
      startDate: new Date("2026-05-14"),
      endDate: new Date("2026-06-14"),
      createdAt: new Date("2026-05-14"),
      updatedAt: new Date("2026-05-14"),
    };
    const mockPayment = {
      id: "pay-new",
      userId: "user-123",
      amount: 59,
      currency: "EUR",
      provider: "BANK_TRANSFER",
      providerRef: "IBC-user-123-GRAND_FRERE",
      status: "pending",
      createdAt: new Date("2026-05-14"),
    };
    mockSubscriptionCreate.mockResolvedValueOnce(mockSub);
    mockPaymentCreate.mockResolvedValueOnce(mockPayment);
    mockTransaction.mockImplementationOnce(async (cb: (tx: unknown) => unknown) =>
      cb({
        subscription: { create: mockSubscriptionCreate },
        payment: { create: mockPaymentCreate },
      })
    );

    const req = makeRequest({ tier: "GRAND_FRERE", period: "MONTHLY" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data.subscription).toEqual({
      ...mockSub,
      startDate: "2026-05-14T00:00:00.000Z",
      endDate: expect.any(String),
      createdAt: "2026-05-14T00:00:00.000Z",
      updatedAt: "2026-05-14T00:00:00.000Z",
    });
    expect(json.data.payment).toEqual({
      id: "pay-new",
      amount: 59,
      currency: "EUR",
      status: "pending",
      provider: "BANK_TRANSFER",
      providerRef: "IBC-user-123-GRAND_FRERE",
    });
    expect(mockSubscriptionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-123",
          tier: "GRAND_FRERE",
          period: "MONTHLY",
          provider: "BANK_TRANSFER",
          providerPhone: null,
          providerRef: "IBC-user-123-GRAND_FRERE",
          status: "PENDING",
          endDate: expect.any(Date),
        }),
      })
    );
    expect(mockPaymentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-123",
          amount: 59,
          currency: "EUR",
          provider: "BANK_TRANSFER",
          providerRef: "IBC-user-123-GRAND_FRERE",
          status: "pending",
        }),
      })
    );
    expect(mockPaymentCreate.mock.calls[0][0].data.providerRef).toBe(
      mockSubscriptionCreate.mock.calls[0][0].data.providerRef
    );
    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { id: "user-123" },
      select: { email: true, name: true },
    });
    expect(mockSendWelcomeEmail).toHaveBeenCalledWith({
      to: "jean@example.com",
      name: "Jean",
      tier: "GRAND_FRERE",
      paymentProvider: "BANK_TRANSFER",
      providerPhone: null,
      userId: "user-123",
    });
  });

  it.each([
    ["AFFRANCHI", "MONTHLY", 29],
    ["AFFRANCHI", "SEMESTERIAL", 160],
    ["AFFRANCHI", "ANNUAL", 290],
    ["GRAND_FRERE", "MONTHLY", 59],
    ["GRAND_FRERE", "SEMESTERIAL", 299],
    ["GRAND_FRERE", "ANNUAL", 590],
    ["BOSS", "MONTHLY", 129],
    ["BOSS", "SEMESTERIAL", 690],
    ["BOSS", "ANNUAL", 1290],
  ])("creates payment amount %s/%s => %i EUR", async (tier, period, amount) => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
    mockSubscriptionCreate.mockResolvedValueOnce({
      id: "sub-new",
      tier,
      period: "MONTHLY",
      provider: "BANK_TRANSFER",
      providerRef: `IBC-user-123-${tier}`,
      status: "PENDING",
    });
    mockPaymentCreate.mockResolvedValueOnce({
      id: "pay-new",
      amount,
      currency: "EUR",
      status: "pending",
      provider: "BANK_TRANSFER",
      providerRef: `IBC-user-123-${tier}`,
    });
    mockTransaction.mockImplementationOnce(async (cb: (tx: unknown) => unknown) =>
      cb({
        subscription: { create: mockSubscriptionCreate },
        payment: { create: mockPaymentCreate },
      })
    );

    await POST(makeRequest({ tier, period }));

    expect(mockPaymentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ amount }),
      })
    );
  });

  it("returns 401 if not authenticated", async () => {
    (mockAuth as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

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

  it("accepts SEMESTERIAL period and uses the semestrial amount", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
    mockSubscriptionCreate.mockResolvedValueOnce({
      id: "sub-new",
      tier: "AFFRANCHI",
      period: "SEMESTERIAL",
      provider: "BANK_TRANSFER",
      providerRef: "IBC-user-123-AFFRANCHI",
      status: "PENDING",
    });
    mockPaymentCreate.mockResolvedValueOnce({
      id: "pay-new",
      amount: 160,
      currency: "EUR",
      status: "pending",
      provider: "BANK_TRANSFER",
      providerRef: "IBC-user-123-AFFRANCHI",
    });
    mockTransaction.mockImplementationOnce(async (cb) =>
      cb({
        subscription: { create: mockSubscriptionCreate },
        payment: { create: mockPaymentCreate },
      })
    );

    const res = await POST(makeRequest({ tier: "AFFRANCHI", period: "SEMESTERIAL" }));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data.payment.amount).toBe(160);
  });

  it.each([
    ["WAVE", "+22501234567"],
    ["ORANGE_MONEY", "+221771234567"],
  ] as const)(
    "creates TRIAL %s subscription and pending payment with providerPhone",
    async (provider, providerPhone) => {
      mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
      mockUserFindUnique.mockResolvedValueOnce({ email: "jean@example.com", name: "Jean" });
      const typedProvider = provider as "WAVE" | "ORANGE_MONEY";
      const mockSub = {
        id: "sub-mobile",
        userId: "user-123",
        tier: "BOSS",
        period: "ANNUAL",
        provider: typedProvider,
        providerPhone,
        providerRef: `IBC-user-123-BOSS`,
        status: "TRIAL",
        startDate: new Date("2026-06-18"),
        createdAt: new Date("2026-06-18"),
        updatedAt: new Date("2026-06-18"),
      };
      const mockPayment = {
        id: "pay-mobile",
        userId: "user-123",
        amount: 99,
        currency: "EUR",
        provider: typedProvider,
        providerRef: "IBC-user-123-BOSS",
        status: "pending",
        createdAt: new Date("2026-06-18"),
      };
      mockSubscriptionCreate.mockResolvedValueOnce(mockSub);
      mockPaymentCreate.mockResolvedValueOnce(mockPayment);
      mockTransaction.mockImplementationOnce(async (cb: (tx: unknown) => unknown) =>
        cb({
          subscription: { create: mockSubscriptionCreate },
          payment: { create: mockPaymentCreate },
        })
      );

      const res = await POST(makeRequest({ tier: "BOSS", period: "ANNUAL", provider: typedProvider, providerPhone }));
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.data.subscription.status).toBe("TRIAL");
      expect(json.data.subscription.provider).toBe(typedProvider);
      expect(json.data.subscription.providerPhone).toBe(providerPhone);
      expect(json.data.payment.provider).toBe(typedProvider);
      expect(mockSubscriptionCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            provider: typedProvider,
            providerPhone,
            status: "TRIAL",
          }),
        })
      );
      expect(mockSendWelcomeEmail).toHaveBeenCalledWith({
        to: "jean@example.com",
        name: "Jean",
        tier: "BOSS",
        paymentProvider: typedProvider,
        providerPhone,
        userId: "user-123",
      });
    }
  );

  it("returns 400 if providerPhone is missing for WAVE", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });

    const req = makeRequest({ tier: "AFFRANCHI", period: "MONTHLY", provider: "WAVE" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Données invalides");
    expect(json.details.providerPhone).toBeDefined();
  });

  it("returns 400 if providerPhone is invalid country for ORANGE_MONEY", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });

    const req = makeRequest({
      tier: "AFFRANCHI",
      period: "MONTHLY",
      provider: "ORANGE_MONEY",
      providerPhone: "+336****5678",
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Données invalides");
    expect(json.details.providerPhone).toBeDefined();
  });

  it("returns 400 if providerPhone is provided for BANK_TRANSFER", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });

    const req = makeRequest({
      tier: "AFFRANCHI",
      period: "MONTHLY",
      provider: "BANK_TRANSFER",
      providerPhone: "+225****4567",
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Données invalides");
    expect(json.details.providerPhone).toBeDefined();
  });

  it("returns 400 for malformed JSON", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });

    const req = new Request("http://localhost/api/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{invalid-json",
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Données invalides");
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("returns 500 on unexpected error and does not send welcome email", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
    mockTransaction.mockRejectedValueOnce(new Error("DB down"));

    const req = makeRequest({ tier: "BOSS", period: "MONTHLY" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Erreur interne");
    expect(mockUserFindUnique).not.toHaveBeenCalled();
    expect(mockSendWelcomeEmail).not.toHaveBeenCalled();
  });

  it("returns 201 even if sending the welcome email fails", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
    mockUserFindUnique.mockResolvedValueOnce({ email: "jean@example.com", name: "Jean" });
    mockSendWelcomeEmail.mockRejectedValueOnce(new Error("SMTP down"));
    const mockSub = {
      id: "sub-new",
      userId: "user-123",
      tier: "GRAND_FRERE",
      period: "MONTHLY",
      provider: "BANK_TRANSFER",
      providerPhone: null,
      providerRef: "IBC-user-123-GRAND_FRERE",
      status: "PENDING",
      startDate: new Date("2026-05-14"),
      createdAt: new Date("2026-05-14"),
      updatedAt: new Date("2026-05-14"),
    };
    const mockPayment = {
      id: "pay-new",
      userId: "user-123",
      amount: 49,
      currency: "EUR",
      provider: "BANK_TRANSFER",
      providerRef: "IBC-user-123-GRAND_FRERE",
      status: "pending",
      createdAt: new Date("2026-05-14"),
    };
    mockSubscriptionCreate.mockResolvedValueOnce(mockSub);
    mockPaymentCreate.mockResolvedValueOnce(mockPayment);
    mockTransaction.mockImplementationOnce(async (cb: (tx: unknown) => unknown) =>
      cb({
        subscription: { create: mockSubscriptionCreate },
        payment: { create: mockPaymentCreate },
      })
    );

    const req = makeRequest({ tier: "GRAND_FRERE", period: "MONTHLY" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data.subscription.tier).toBe("GRAND_FRERE");
    expect(mockSendWelcomeEmail).toHaveBeenCalledWith({
      to: "jean@example.com",
      name: "Jean",
      tier: "GRAND_FRERE",
      paymentProvider: "BANK_TRANSFER",
      providerPhone: null,
      userId: "user-123",
    });
  });
});
