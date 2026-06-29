import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockChatMessageFindUnique = vi.hoisted(() => vi.fn());
const mockChatMessageUpdate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/sanitize-log", () => ({ sanitizeError: (error: unknown) => String(error) }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    chatMessage: {
      findUnique: mockChatMessageFindUnique,
      update: mockChatMessageUpdate,
    },
  },
}));

import { POST } from "./route";

function makeRequest(body: object, authHeader?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authHeader) headers.Authorization = authHeader;
  return new Request("http://localhost/api/chat/agent/close", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("POST /api/chat/agent/close", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, CRON_SECRET: "agent-secret" };
    mockChatMessageFindUnique.mockResolvedValue({ id: "msg-1", status: "REPLIED" });
    mockChatMessageUpdate.mockResolvedValue({ id: "msg-1", status: "CLOSED" });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns 401 when Authorization header is missing", async () => {
    const res = await POST(makeRequest({ messageId: "cm4testtesttesttesttesttest" }));
    expect(res.status).toBe(401);
    expect(mockChatMessageFindUnique).not.toHaveBeenCalled();
  });

  it("returns 401 when secret is incorrect", async () => {
    const res = await POST(makeRequest({ messageId: "cm4testtesttesttesttesttest" }, "Bearer wrong"));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid messageId", async () => {
    const res = await POST(makeRequest({ messageId: "not-a-cuid" }, "Bearer agent-secret"));
    expect(res.status).toBe(400);
  });

  it("returns 404 when message does not exist", async () => {
    mockChatMessageFindUnique.mockResolvedValue(null);
    const res = await POST(makeRequest({ messageId: "cm4testtesttesttesttesttest" }, "Bearer agent-secret"));
    expect(res.status).toBe(404);
  });

  it("is idempotent when already closed", async () => {
    mockChatMessageFindUnique.mockResolvedValue({ id: "msg-1", status: "CLOSED" });
    const res = await POST(makeRequest({ messageId: "cm4testtesttesttesttesttest" }, "Bearer agent-secret"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.closed).toBe(true);
    expect(mockChatMessageUpdate).not.toHaveBeenCalled();
  });

  it("updates status to CLOSED when not already closed", async () => {
    const res = await POST(makeRequest({ messageId: "cm4testtesttesttesttesttest" }, "Bearer agent-secret"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.closed).toBe(true);
    expect(mockChatMessageUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "cm4testtesttesttesttesttest" },
        data: { status: "CLOSED" },
      })
    );
  });
});
