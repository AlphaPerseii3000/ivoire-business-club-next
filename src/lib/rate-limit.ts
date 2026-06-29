import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

interface RateLimiterOptions {
  requests: number;
  windowSeconds: number;
}

interface LimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

interface RateLimiter {
  limit: (identifier: string) => Promise<LimitResult>;
}

export function createRateLimiter({ requests, windowSeconds }: RateLimiterOptions): RateLimiter {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn("[rate-limit] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN missing. Rate limiting disabled.");
    return {
      limit: async () => ({ success: true, limit: requests, remaining: requests, reset: 0 }),
    };
  }

  const redis = new Redis({ url, token });
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, `${windowSeconds} s`),
    analytics: false,
  });

  return {
    limit: async (identifier: string) => limiter.limit(identifier),
  };
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return "unknown";
}

export function getClientIdentifier(req: Request, userId?: string): string {
  if (userId) return `user:${userId}`;
  return `ip:${getClientIp(req)}`;
}

export const signupRateLimiter = createRateLimiter({ requests: 5, windowSeconds: 60 });
export const signinRateLimiter = createRateLimiter({ requests: 10, windowSeconds: 60 });
export const accountDeleteRateLimiter = createRateLimiter({ requests: 3, windowSeconds: 60 });
export const chatMessageRateLimiter = createRateLimiter({ requests: 1, windowSeconds: 30 });
export const verificationSendRateLimiter = createRateLimiter({ requests: 3, windowSeconds: 60 });