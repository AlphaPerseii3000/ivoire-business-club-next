import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.hoisted(() => vi.fn());
const mockChatMessageCount = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/sanitize-log", () => ({ sanitizeError: (error: unknown) => String(error) }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    chatMessage: {
      count: mockChatMessageCount,
    },
  },
}));

import { GET } from "./route";

describe("GET /api/chat/unread", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockChatMessageCount.mockResolvedValue(3);
  });

  it("requires authentication", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/chat/unread", { method: "GET" }));
    expect(res.status).toBe(401);
    expect(mockChatMessageCount).not.toHaveBeenCalled();
  });

  it("counts unread HERMES and SYSTEM messages for the user", async () => {
    const res = await GET(new Request("http://localhost/api/chat/unread", { method: "GET" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.unreadCount).toBe(3);
    expect(mockChatMessageCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "user-1",
          author: { in: ["HERMES", "SYSTEM"] },
          readAt: null,
        },
      })
    );
  });
});
