import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

const mockLeadMagnetFindUnique = vi.hoisted(() => vi.fn());
const mockLeadMagnetCreate = vi.hoisted(() => vi.fn());
const mockLeadMagnetUpdate = vi.hoisted(() => vi.fn());
const mockRateLimit = vi.hoisted(() => vi.fn(async () => ({ success: true, limit: 5, remaining: 4, reset: 0 })));
const mockSendGuideEmail = vi.hoisted(() => vi.fn(async () => {}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    leadMagnet: {
      findUnique: mockLeadMagnetFindUnique,
      create: mockLeadMagnetCreate,
      update: mockLeadMagnetUpdate,
    },
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  createRateLimiter: vi.fn(() => ({ limit: mockRateLimit })),
  getClientIdentifier: vi.fn(() => "ip:127.0.0.1"),
}));

vi.mock("@/lib/email", () => ({
  sendGuideEmail: mockSendGuideEmail,
}));

vi.mock("@/lib/sanitize-log", () => ({
  sanitizeError: vi.fn((e: unknown) => (e instanceof Error ? `Error: ${e.name}` : "Unknown error")),
}));

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/lead-magnet", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/lead-magnet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 and sends the guide for a valid email", async () => {
    mockLeadMagnetFindUnique.mockResolvedValue(null);
    mockLeadMagnetCreate.mockResolvedValue({ id: "lm-1", email: "jean@example.com" });
    mockLeadMagnetUpdate.mockResolvedValue({ id: "lm-1", email: "jean@example.com", guideSentAt: new Date() });

    const req = makeRequest({ email: "jean@example.com" });
    const res = await POST(req as unknown as import("next/server").NextRequest);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.message).toBe("Votre guide vous a été envoyé par email.");
    expect(mockLeadMagnetCreate).toHaveBeenCalledWith({ data: { email: "jean@example.com" } });
    expect(mockSendGuideEmail).toHaveBeenCalledWith({ to: "jean@example.com" });
    expect(mockLeadMagnetUpdate).toHaveBeenCalledWith({
      where: { id: "lm-1" },
      data: { guideSentAt: expect.any(Date) },
    });
  });

  it("returns 200 with 'already received' for duplicate email without resending", async () => {
    mockLeadMagnetFindUnique.mockResolvedValue({
      id: "lm-2",
      email: "dup@example.com",
      guideSentAt: new Date("2026-01-01"),
    });

    const req = makeRequest({ email: "dup@example.com" });
    const res = await POST(req as unknown as import("next/server").NextRequest);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.message).toBe("Vous avez déjà reçu ce guide.");
    expect(mockLeadMagnetCreate).not.toHaveBeenCalled();
    expect(mockSendGuideEmail).not.toHaveBeenCalled();
    expect(mockLeadMagnetUpdate).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid email", async () => {
    const req = makeRequest({ email: "not-an-email" });
    const res = await POST(req as unknown as import("next/server").NextRequest);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBeDefined();
  });

  it("returns 400 for missing body", async () => {
    const req = new Request("http://localhost/api/lead-magnet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "",
    });
    const res = await POST(req as unknown as import("next/server").NextRequest);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Requête malformée.");
  });

  it("returns 429 when rate limit is exceeded", async () => {
    // Override the rate-limiter factory to force a denial
    const { createRateLimiter: mockedCreateRateLimiter } = await import("@/lib/rate-limit");
    const denyLimiter = {
      limit: vi.fn(async () => ({ success: false, limit: 5, remaining: 0, reset: Date.now() + 60000 })),
    };
    (mockedCreateRateLimiter as unknown as ReturnType<typeof vi.fn>).mockReturnValue(denyLimiter);

    vi.resetModules();
    const { POST: POSTWithLimit } = await import("./route");

    const req = makeRequest({ email: "rate@example.com" });
    const res = await POSTWithLimit(req as unknown as import("next/server").NextRequest);
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(json.error).toBe("Trop de tentatives. Réessayez dans une minute.");
  });

  it("returns 500 and does not update guideSentAt when email fails", async () => {
    mockLeadMagnetFindUnique.mockResolvedValue(null);
    mockLeadMagnetCreate.mockResolvedValue({ id: "lm-3", email: "fail@example.com" });
    mockSendGuideEmail.mockRejectedValue(new Error("SMTP error"));

    const req = makeRequest({ email: "fail@example.com" });
    const res = await POST(req as unknown as import("next/server").NextRequest);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Impossible d'envoyer l'email. Veuillez réessayer plus tard.");
    expect(mockLeadMagnetUpdate).not.toHaveBeenCalled();
  });
});
