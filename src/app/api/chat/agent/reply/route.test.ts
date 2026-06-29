import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockChatMessageFindUnique = vi.hoisted(() => vi.fn());
const mockChatMessageUpdate = vi.hoisted(() => vi.fn());
const mockChatMessageCreate = vi.hoisted(() => vi.fn());
const mockTransaction = vi.hoisted(() => vi.fn());

vi.mock("@/lib/sanitize-log", () => ({ sanitizeError: (error: unknown) => String(error) }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    chatMessage: {
      findUnique: mockChatMessageFindUnique,
      update: mockChatMessageUpdate,
      create: mockChatMessageCreate,
    },
    $transaction: mockTransaction,
  },
}));

import { POST } from "./route";

function makeRequest(body: object, authHeader?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authHeader) headers.Authorization = authHeader;
  return new Request("http://localhost/api/chat/agent/reply", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("POST /api/chat/agent/reply", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, CRON_SECRET: "agent-secret" };
    mockTransaction.mockImplementation(async (callback) => {
      const tx = {
        chatMessage: {
          findUnique: mockChatMessageFindUnique,
          update: mockChatMessageUpdate,
          create: mockChatMessageCreate,
        },
      };
      return callback(tx);
    });
    mockChatMessageFindUnique.mockResolvedValue({
      id: "msg-1",
      userId: "user-1",
      status: "PENDING",
    });
    mockChatMessageCreate.mockResolvedValue({
      id: "reply-1",
      userId: "user-1",
      author: "HERMES",
      replyToId: "msg-1",
      content: "Nous investiguons. Merci pour le signalement.",
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns 401 when Authorization header is missing", async () => {
    const res = await POST(makeRequest({ messageId: "msg-1", content: "Réponse" }));
    expect(res.status).toBe(401);
  });

  it("returns 401 when secret is incorrect", async () => {
    const res = await POST(makeRequest({ messageId: "msg-1", content: "Réponse" }, "Bearer wrong"));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid payload", async () => {
    const res = await POST(makeRequest({ messageId: "not-a-cuid", content: "" }, "Bearer agent-secret"));
    expect(res.status).toBe(400);
  });

  it("returns 404 when message does not exist", async () => {
    mockChatMessageFindUnique.mockResolvedValue(null);
    const res = await POST(
      makeRequest({ messageId: "cm4testtesttesttesttesttest", content: "Réponse" }, "Bearer agent-secret")
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 when message is not PENDING", async () => {
    mockChatMessageFindUnique.mockResolvedValue({ id: "msg-1", userId: "user-1", status: "REPLIED" });
    const res = await POST(
      makeRequest({ messageId: "cm4testtesttesttesttesttest", content: "Réponse" }, "Bearer agent-secret")
    );
    expect(res.status).toBe(404);
  });

  it("creates HERMES reply and marks parent as REPLIED", async () => {
    const res = await POST(
      makeRequest({ messageId: "cm4testtesttesttesttesttest", content: "Nous investiguons." }, "Bearer agent-secret")
    );
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data.reply.author).toBe("HERMES");
    expect(json.data.reply.replyToId).toBe("msg-1");
    expect(mockChatMessageUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "cm4testtesttesttesttesttest" },
        data: { status: "REPLIED" },
      })
    );
  });
});
