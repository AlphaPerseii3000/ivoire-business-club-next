import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSendReminders = vi.hoisted(() =>
  vi.fn(async () => ({ processed: 3, sent: 3, skipped: 0, errors: 0 }))
);

vi.mock("@/lib/reminders.server", () => ({
  sendRemindersToIncompleteUsers: mockSendReminders,
}));

import { POST } from "./route";

function makeRequest(authHeader?: string) {
  const headers: Record<string, string> = {};
  if (authHeader) headers.Authorization = authHeader;
  return new Request("http://localhost/api/cron/remind-incomplete-users", {
    method: "POST",
    headers,
  });
}

describe("POST /api/cron/remind-incomplete-users", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, CRON_SECRET: "super-secret-cron-key" };
  });

  it("returns 401 when Authorization header is missing", async () => {
    const res = await POST(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 401 when secret is incorrect", async () => {
    const res = await POST(makeRequest("Bearer wrong-secret"));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 401 when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;
    const res = await POST(makeRequest("Bearer any-secret"));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 200 with processed / sent counts when secret is valid", async () => {
    mockSendReminders.mockResolvedValueOnce({
      processed: 5,
      sent: 4,
      skipped: 10,
      errors: 1,
    });

    const res = await POST(makeRequest("Bearer super-secret-cron-key"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual({
      processed: 5,
      sent: 4,
      skipped: 10,
      errors: 1,
    });
    expect(mockSendReminders).toHaveBeenCalledTimes(1);
  });

  it("trims whitespace from bearer token", async () => {
    const res = await POST(makeRequest("Bearer super-secret-cron-key"));
    expect(res.status).toBe(200);
  });

  it("rejects malformed Authorization header", async () => {
    const res = await POST(makeRequest("super-secret-cron-key"));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
  });
});
