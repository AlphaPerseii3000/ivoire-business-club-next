import { beforeEach, describe, expect, it, vi } from "vitest";

import { PATCH, POST } from "./route";

const mockAuth = vi.hoisted(() => vi.fn());
const mockNotificationFindFirst = vi.hoisted(() => vi.fn());
const mockNotificationUpdate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/sanitize-log", () => ({ sanitizeError: (error: unknown) => String(error) }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    notification: {
      findFirst: mockNotificationFindFirst,
      update: mockNotificationUpdate,
    },
  },
}));

const request = new Request("http://localhost/api/notifications/notif-1/read", { method: "POST" });
const context = { params: Promise.resolve({ id: "notif-1" }) };

describe("notification read route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockNotificationFindFirst.mockResolvedValue({ id: "notif-1", readAt: null });
    mockNotificationUpdate.mockResolvedValue({ id: "notif-1", readAt: new Date("2026-05-20T00:00:00.000Z") });
  });

  it("requires authentication", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await POST(request, context);

    expect(response.status).toBe(401);
    expect(mockNotificationUpdate).not.toHaveBeenCalled();
  });

  it("does not expose another user's notification", async () => {
    mockNotificationFindFirst.mockResolvedValue(null);

    const response = await POST(request, context);

    expect(response.status).toBe(404);
    expect(mockNotificationFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "notif-1", userId: "user-1" },
    }));
    expect(mockNotificationUpdate).not.toHaveBeenCalled();
  });

  it("marks an unread notification as read", async () => {
    const response = await PATCH(request, context);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.id).toBe("notif-1");
    expect(mockNotificationUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "notif-1" },
      data: { readAt: expect.any(Date) },
    }));
  });

  it("is idempotent for already read notifications", async () => {
    const readAt = new Date("2026-05-19T00:00:00.000Z");
    mockNotificationFindFirst.mockResolvedValue({ id: "notif-1", readAt });

    const response = await POST(request, context);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.id).toBe("notif-1");
    expect(mockNotificationUpdate).not.toHaveBeenCalled();
  });
});
