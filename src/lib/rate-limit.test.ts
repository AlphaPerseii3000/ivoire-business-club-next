import { describe, it, expect, vi, beforeEach } from "vitest";

const mockLimit = vi.hoisted(() => vi.fn());
const mockRatelimitConstructor = vi.hoisted(() => {
  const ctor = vi.fn(function () { return { limit: mockLimit }; }) as unknown as {
    slidingWindow: ReturnType<typeof vi.fn>;
  };
  ctor.slidingWindow = vi.fn((requests: number, window: string) => ({ requests, window }));
  return ctor;
});
const mockRedisConstructor = vi.hoisted(() => vi.fn());

vi.mock("@upstash/redis", () => ({
  Redis: mockRedisConstructor,
}));

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: mockRatelimitConstructor,
}));

import { createRateLimiter, getClientIp, getClientIdentifier, signupRateLimiter, signinRateLimiter, accountDeleteRateLimiter } from "./rate-limit";

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

describe("getClientIp", () => {
  it("extracts IP from x-forwarded-for with single IP", () => {
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "192.168.1.1" },
    });
    expect(getClientIp(req)).toBe("192.168.1.1");
  });

  it("extracts first IP from x-forwarded-for with multiple IPs", () => {
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "192.168.1.1, 10.0.0.1, 172.16.0.1" },
    });
    expect(getClientIp(req)).toBe("192.168.1.1");
  });

  it('returns "unknown" when no x-forwarded-for header', () => {
    const req = new Request("http://localhost");
    expect(getClientIp(req)).toBe("unknown");
  });
});

describe("getClientIdentifier", () => {
  it("returns user:{id} when userId is provided", () => {
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "192.168.1.1" },
    });
    expect(getClientIdentifier(req, "user-abc")).toBe("user:user-abc");
  });

  it("returns ip:{ip} when no userId provided", () => {
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "192.168.1.1" },
    });
    expect(getClientIdentifier(req)).toBe("ip:192.168.1.1");
  });

  it("returns ip:unknown when no userId and no forwarded header", () => {
    const req = new Request("http://localhost");
    expect(getClientIdentifier(req)).toBe("ip:unknown");
  });
});

describe("accountDeleteRateLimiter", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv };
  });

  it("is a valid rate limiter", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    // With fallback, it should allow all requests
    const result = await accountDeleteRateLimiter.limit("user:123");
    expect(result.success).toBe(true);
  });
});

describe("signupRateLimiter and signinRateLimiter after refactor", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv };
  });

  it("signupRateLimiter still works with fallback", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    const result = await signupRateLimiter.limit("ip:test");
    expect(result.success).toBe(true);
    expect(result.limit).toBe(5);
  });

  it("signinRateLimiter still works with fallback", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    const result = await signinRateLimiter.limit("ip:test");
    expect(result.success).toBe(true);
    expect(result.limit).toBe(10);
  });
});