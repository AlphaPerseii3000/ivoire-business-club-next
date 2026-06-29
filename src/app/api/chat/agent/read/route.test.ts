import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockChatMessageFindMany = vi.hoisted(() => vi.fn());

vi.mock("@/lib/sanitize-log", () => ({ sanitizeError: (error: unknown) => String(error) }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    chatMessage: {
      findMany: mockChatMessageFindMany,
    },
  },
}));

import { GET } from "./route";

function makeRequest(authHeader?: string) {
  const headers: Record<string, string> = {};
  if (authHeader) headers.Authorization = authHeader;
  return new Request("http://localhost/api/chat/agent/read", { method: "GET", headers });
}

describe("GET /api/chat/agent/read", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, CRON_SECRET: "agent-secret" };
    mockChatMessageFindMany.mockResolvedValue([
      { id: "msg-1", userId: "user-1", category: "bug_technique", content: "Bug", createdAt: "2026-06-29T00:00:00.000Z" },
    ]);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns 401 when Authorization header is missing", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    expect(mockChatMessageFindMany).not.toHaveBeenCalled();
  });

  it("returns 401 when secret is incorrect", async () => {
    const res = await GET(makeRequest("Bearer wrong-secret"));
    expect(res.status).toBe(401);
    expect(mockChatMessageFindMany).not.toHaveBeenCalled();
  });

  it("returns 401 when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(makeRequest("Bearer agent-secret"));
    expect(res.status).toBe(401);
    expect(mockChatMessageFindMany).not.toHaveBeenCalled();
  });

  it("returns only PENDING messages when secret is valid", async () => {
    const res = await GET(makeRequest("Bearer agent-secret"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.messages).toHaveLength(1);
    expect(mockChatMessageFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
        select: { id: true, userId: true, category: true, content: true, createdAt: true },
      })
    );
  });
});
