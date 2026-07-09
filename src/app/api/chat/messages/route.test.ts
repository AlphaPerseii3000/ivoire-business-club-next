import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.hoisted(() => vi.fn());
const mockChatMessageCreate = vi.hoisted(() => vi.fn());
const mockChatMessageFindMany = vi.hoisted(() => vi.fn());
const mockChatMessageCount = vi.hoisted(() => vi.fn());
const mockTransaction = vi.hoisted(() => vi.fn());
const mockRateLimit = vi.hoisted(() => vi.fn());
const mockPublicRateLimit = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/sanitize-log", () => ({ sanitizeError: (error: unknown) => String(error) }));
vi.mock("@/lib/rate-limit", () => ({
  chatMessageRateLimiter: { limit: mockRateLimit },
  chatMessagePublicRateLimiter: { limit: mockPublicRateLimit },
  getClientIdentifier: (_req: Request, userId?: string) => (userId ? `user:${userId}` : "ip:unknown"),
  getClientIp: () => "127.0.0.1",
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    chatMessage: {
      create: mockChatMessageCreate,
      findMany: mockChatMessageFindMany,
      count: mockChatMessageCount,
    },
    $transaction: mockTransaction,
  },
}));

import { GET, POST } from "./route";

function makePostRequest(body: object, headers?: Record<string, string>) {
  return new Request("http://localhost/api/chat/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function makeGetRequest(search = "") {
  return new Request(`http://localhost/api/chat/messages${search}`, { method: "GET" });
}

describe("POST /api/chat/messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockRateLimit.mockResolvedValue({ success: true, limit: 1, remaining: 0, reset: 0 });
    mockPublicRateLimit.mockResolvedValue({ success: true, limit: 10, remaining: 9, reset: 0 });
    mockTransaction.mockImplementation(async (callback) => {
      const tx = {
        chatMessage: {
          create: mockChatMessageCreate,
        },
      };
      return callback(tx);
    });
    mockChatMessageCreate
      .mockResolvedValueOnce({
        id: "msg-1",
        userId: "user-1",
        author: "MEMBER",
        status: "PENDING",
        category: "bug_technique",
        content: "Bug report",
        createdAt: new Date("2026-06-29T00:00:00.000Z"),
      })
      .mockResolvedValueOnce({
        id: "ack-1",
        userId: "user-1",
        author: "SYSTEM",
        status: "ACKNOWLEDGED",
        replyToId: "msg-1",
        content: "Merci, votre message a été reçu. L'équipe vous répondra sous peu. 🚧 Plateforme en phase bêta.",
        createdAt: new Date("2026-06-29T00:00:01.000Z"),
      });
  });

  it("requires authentication", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(makePostRequest({ category: "bug_technique", content: "Bug" }));
    expect(res.status).toBe(401);
    expect(mockChatMessageCreate).not.toHaveBeenCalled();
  });

  it("returns 429 when rate limit exceeded", async () => {
    mockRateLimit.mockResolvedValue({ success: false, limit: 1, remaining: 0, reset: 1234567890 });
    const res = await POST(makePostRequest({ category: "bug_technique", content: "Bug" }));
    const json = await res.json();
    expect(res.status).toBe(429);
    expect(json.code).toBe("RATE_LIMITED");
    expect(res.headers.get("Retry-After")).toBeDefined();
    expect(mockChatMessageCreate).not.toHaveBeenCalled();
  });

  it("returns 429 when public IP rate limit exceeded", async () => {
    mockPublicRateLimit.mockResolvedValue({ success: false, limit: 10, remaining: 0, reset: 1234567890 });
    const res = await POST(makePostRequest({ category: "bug_technique", content: "Bug" }));
    const json = await res.json();
    expect(res.status).toBe(429);
    expect(json.code).toBe("RATE_LIMITED");
    expect(res.headers.get("Retry-After")).toBeDefined();
    expect(mockChatMessageCreate).not.toHaveBeenCalled();
  });

  it("validates category", async () => {
    const res = await POST(makePostRequest({ category: "invalid", content: "Bug" }));
    expect(res.status).toBe(400);
    expect(mockChatMessageCreate).not.toHaveBeenCalled();
  });

  it("validates content is required and max 5000 chars", async () => {
    const res = await POST(makePostRequest({ category: "bug_technique", content: "" }));
    expect(res.status).toBe(400);
    expect(mockChatMessageCreate).not.toHaveBeenCalled();
  });

  it("creates member message and system acknowledgement", async () => {
    const res = await POST(makePostRequest({ category: "bug_technique", content: "Bug report" }));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data.message.author).toBe("MEMBER");
    expect(json.data.message.status).toBe("PENDING");
    expect(json.data.ack.author).toBe("SYSTEM");
    expect(json.data.ack.status).toBe("ACKNOWLEDGED");
    expect(json.data.ack.replyToId).toBe("msg-1");
    expect(mockChatMessageCreate).toHaveBeenCalledTimes(2);
  });
});

describe("GET /api/chat/messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockChatMessageFindMany.mockResolvedValue([
      { id: "msg-2", userId: "user-1", content: "Second" },
      { id: "msg-1", userId: "user-1", content: "First" },
    ]);
    mockChatMessageCount.mockResolvedValue(2);
  });

  it("requires authentication", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  it("returns paginated messages for the authenticated user", async () => {
    const res = await GET(makeGetRequest("?page=1&limit=10"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.messages).toHaveLength(2);
    expect(json.data.total).toBe(2);
    expect(json.data.page).toBe(1);
    expect(json.data.limit).toBe(10);
    expect(mockChatMessageFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
        orderBy: { createdAt: "desc" },
        skip: 0,
        take: 10,
      })
    );
  });

  it("caps limit at 50", async () => {
    await GET(makeGetRequest("?limit=100"));
    expect(mockChatMessageFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 50,
      })
    );
  });
});
