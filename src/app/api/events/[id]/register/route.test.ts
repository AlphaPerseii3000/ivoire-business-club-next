import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const mockAuth = vi.hoisted(() => vi.fn());
const mockTransaction = vi.hoisted(() => vi.fn());
const mockPosthogCapture = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: mockTransaction,
  },
}));
vi.mock("@/lib/posthog-server", () => ({
  posthogServer: {
    capture: mockPosthogCapture,
  },
}));

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/events/evt-1/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/events/[id]/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 if visitor doesn't provide an email", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await POST(makeRequest({ payOnSite: true }), {
      params: Promise.resolve({ id: "evt-1" }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("L'adresse email est requise");
  });

  it("registers visitor successfully for public event (payOnSite: true)", async () => {
    mockAuth.mockResolvedValue(null);

    mockTransaction.mockImplementation(async (callback: any) => {
      const mockTx = {
        event: {
          findUnique: vi.fn().mockResolvedValue({
            id: "evt-1",
            title: "Conférence Tech",
            status: "PUBLISHED",
            visibility: "PUBLIC",
            maxCapacity: 100,
            pricing: { visitor: 10000, affranchi: 5000 },
          }),
        },
        eventRegistration: {
          count: vi.fn().mockResolvedValue(10),
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "reg-1", ...data })),
        },
        payment: {
          create: vi.fn(),
        },
      };
      return callback(mockTx);
    });

    const response = await POST(
      makeRequest({ email: "visitor@example.com", payOnSite: true }),
      { params: Promise.resolve({ id: "evt-1" }) }
    );

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.registration.email).toBe("visitor@example.com");
    expect(data.registration.amountPaid).toBeNull();
    expect(data.payment).toBeNull();
  });

  it("registers member and creates Payment record when paying via provider", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123", email: "member@example.com", tier: "GRAND_FRERE" },
    });

    let paymentCreated = false;
    mockTransaction.mockImplementation(async (callback: any) => {
      const mockTx = {
        event: {
          findUnique: vi.fn().mockResolvedValue({
            id: "evt-1",
            title: "Gala IBC",
            status: "PUBLISHED",
            visibility: "PUBLIC",
            maxCapacity: 50,
            pricing: { visitor: 20000, affranchi: 15000, grand_frere: 10000 },
          }),
        },
        eventRegistration: {
          count: vi.fn().mockResolvedValue(5),
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "reg-2", ...data })),
        },
        payment: {
          create: vi.fn().mockImplementation(({ data }) => {
            paymentCreated = true;
            return Promise.resolve({ id: "pay-1", ...data });
          }),
        },
      };
      return callback(mockTx);
    });

    const response = await POST(
      makeRequest({ provider: "WAVE", payOnSite: false }),
      { params: Promise.resolve({ id: "evt-1" }) }
    );

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.registration.amountPaid).toBe(10000);
    expect(paymentCreated).toBe(true);
    expect(data.payment.provider).toBe("WAVE");
    expect(data.payment.providerRef).toBe("EVT-evt-1-user-123");
  });

  it("fails with 400 when event is full", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", email: "user@example.com", tier: "AFFRANCHI" },
    });

    mockTransaction.mockImplementation(async (callback: any) => {
      const mockTx = {
        event: {
          findUnique: vi.fn().mockResolvedValue({
            id: "evt-1",
            title: "Atelier Restreint",
            status: "PUBLISHED",
            visibility: "PUBLIC",
            maxCapacity: 10,
            pricing: null,
          }),
        },
        eventRegistration: {
          count: vi.fn().mockResolvedValue(10),
          findUnique: vi.fn().mockResolvedValue(null),
        },
      };
      return callback(mockTx);
    });

    const response = await POST(makeRequest({ payOnSite: true }), {
      params: Promise.resolve({ id: "evt-1" }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("L'événement est complet");
  });

  it("fails with 400 when user is already registered", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", email: "user@example.com", tier: "AFFRANCHI" },
    });

    mockTransaction.mockImplementation(async (callback: any) => {
      const mockTx = {
        event: {
          findUnique: vi.fn().mockResolvedValue({
            id: "evt-1",
            title: "Atelier",
            status: "PUBLISHED",
            visibility: "PUBLIC",
            maxCapacity: 50,
            pricing: null,
          }),
        },
        eventRegistration: {
          count: vi.fn().mockResolvedValue(2),
          findUnique: vi.fn().mockResolvedValue({ id: "existing-reg" }),
        },
      };
      return callback(mockTx);
    });

    const response = await POST(makeRequest({ payOnSite: true }), {
      params: Promise.resolve({ id: "evt-1" }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Vous êtes déjà inscrit à cet événement");
  });
});
