import { describe, it, expect, vi, beforeEach } from "vitest";

const mockLimit = vi.hoisted(() => vi.fn());
const mockRatelimitConstructor = vi.hoisted(() => {
  const ctor = vi.fn(function () { return { limit: mockLimit }; });
  (ctor as any).slidingWindow = vi.fn((requests: number, window: string) => ({ requests, window }));
  return ctor;
});
const mockRedisConstructor = vi.hoisted(() => vi.fn());

vi.mock("@upstash/redis", () => ({
  Redis: mockRedisConstructor,
}));

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: mockRatelimitConstructor,
}));

import { createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv };
  });

  it("returns a functioning limiter when Upstash env vars are present", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://test.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
    mockLimit.mockResolvedValue({ success: true, limit: 5, remaining: 4, reset: 0 });

    const limiter = createRateLimiter({ requests: 5, windowSeconds: 60 });
    const result = await limiter.limit("ip-1");

    expect(mockRedisConstructor).toHaveBeenCalledWith({
      url: "https://test.upstash.io",
      token: "test-token",
    });
    expect(mockRatelimitConstructor).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  it("returns permissive fallback when Upstash env vars are missing", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const limiter = createRateLimiter({ requests: 5, windowSeconds: 60 });
    const result = await limiter.limit("ip-1");

    expect(mockRedisConstructor).not.toHaveBeenCalled();
    expect(mockRatelimitConstructor).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(5);
  });

  it("returns success:false when limit is exceeded", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://test.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
    mockLimit.mockResolvedValue({ success: false, limit: 5, remaining: 0, reset: 12345 });

    const limiter = createRateLimiter({ requests: 5, windowSeconds: 60 });
    const result = await limiter.limit("ip-1");

    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });
});
