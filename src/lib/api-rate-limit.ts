import { createRateLimiter } from "./rate-limit";

// General API rate limiter: 60 requests per minute per IP
export const apiRateLimiter = createRateLimiter({ requests: 60, windowSeconds: 60 });

// Password reset / email change rate limiter (future use): 3 per minute per IP
export const passwordResetRateLimiter = createRateLimiter({ requests: 3, windowSeconds: 60 });