# Story 1.6: Renforcement de la Sécurité — Rate Limiting et Headers

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a technical administrator,
I want sensitive routes to be protected against abuse, security headers to be active, and sensitive data to be kept out of logs,
so that the system is resilient, compliant, and secure.

## Acceptance Criteria

1. **Rate limiting on `/api/auth/signup`**
   - **Given** the route `/api/auth/signup`
   - **When** a client makes a POST request
   - **Then** the rate limiter allows a maximum of 5 requests per minute per IP (NFR-S3)
   - **And** a 429 response is returned with the message « Trop de tentatives. Réessayez dans une minute. »

2. **Rate limiting on `/api/auth/signin`**
   - **Given** the route `/api/auth/signin`
   - **When** a client makes a POST request
   - **Then** the rate limiter allows a maximum of 10 requests per minute per IP (NFR-S4)
   - **And** a 429 response is returned with the message « Trop de tentatives. Réessayez dans une minute. »

3. **Rate limiting on `/api/user/account` DELETE (deferred from Story 1.5)**
   - **Given** the route `/api/user/account` for DELETE requests
   - **When** a user attempts to delete their account
   - **Then** the rate limiter allows a maximum of 3 requests per minute per user ID
   - **And** a 429 response is returned with « Trop de tentatives. Réessayez dans une minute. »
   - **And** this prevents the concurrent deletion race condition identified in Story 1.5 code review

4. **Security headers on all HTTP responses**
   - **Given** any HTTP response served by the application
   - **When** it is served directly or via Nginx (production)
   - **Then** the following headers are present (NFR-S7):
     - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
     - `Content-Security-Policy` with sensible defaults for IBC
     - `X-Frame-Options: DENY`
     - `X-Content-Type-Options: nosniff`
     - `Referrer-Policy: strict-origin-when-cross-origin`
     - `Permissions-Policy` restricting camera, microphone, geolocation

5. **No sensitive data in server-side logs**
   - **Given** an unexpected server error
   - **When** it occurs during any API request
   - **Then** no sensitive data (email, password, token, passwordHash) appears in logs (NFR-S8)
   - **And** error messages logged use sanitized/redacted versions
   - **And** client-facing error responses only contain generic messages like « Erreur interne »

6. **`prisma.config.ts` is present and correctly configured**
   - **Given** the project configuration
   - **When** the project starts or Prisma commands run
   - **Then** `prisma.config.ts` is present and correctly configures the datasource URL (P0 blocker #6)
   - **Note:** This is already implemented and working — this AC is verified, not built

## Tasks / Subtasks

- [x] **Task 1: Extend `src/lib/rate-limit.ts` with account deletion limiter and helper utilities** (AC: 1, 2, 3)
  - [x] 1.1 Add `accountDeleteRateLimiter` to `src/lib/rate-limit.ts`:
    ```typescript
    export const accountDeleteRateLimiter = createRateLimiter({ requests: 3, windowSeconds: 60 });
    ```
  - [x] 1.2 Refactor `getClientIp` into a shared utility in `src/lib/rate-limit.ts` (currently duplicated in `signup/route.ts` and `signin/route.ts`) — export it:
    ```typescript
    export function getClientIp(req: Request): string {
      const forwarded = req.headers.get("x-forwarded-for");
      if (forwarded) {
        return forwarded.split(",")[0].trim();
      }
      return "unknown";
    }
    ```
  - [x] 1.3 Add a `getClientIdentifier` function that prefers authenticated user ID when available, falling back to IP:
    ```typescript
    export function getClientIdentifier(req: Request, userId?: string): string {
      if (userId) return `user:${userId}`;
      return `ip:${getClientIp(req)}`;
    }
    ```
  - [x] 1.4 Update existing `signup/route.ts` and `signin/route.ts` to import `getClientIp` from `@/lib/rate-limit` instead of defining it locally — remove the duplicate `getClientIp` function from both files
  - [x] 1.5 Update `src/lib/rate-limit.test.ts` to add tests for:
    - `getClientIp` extracts from `x-forwarded-for` header
    - `getClientIp` returns `"unknown"` when no forwarded header
    - `getClientIdentifier` prefers userId over IP
    - `getClientIdentifier` falls back to IP when no userId
    - `accountDeleteRateLimiter` is a valid rate limiter with correct limits

- [x] **Task 2: Apply rate limiting to account deletion endpoint** (AC: 3)
  - [x] 2.1 Update `src/app/api/user/account/route.ts`:
    - Import `accountDeleteRateLimiter` and `getClientIdentifier` from `@/lib/rate-limit`
    - Import `auth` from `@/lib/auth`
    - After authenticating the user (getting `session.user.id`), call `accountDeleteRateLimiter.limit(getClientIdentifier(req, session.user.id))`
    - If rate limit fails, return 429 with `« Trop de tentatives. Réessayez dans une minute. »`
    - This mitigates the concurrent deletion race condition from Story 1.5 code review
  - [x] 2.2 Add rate limit test to `src/app/api/user/account/route.test.ts`:
    - Test: DELETE with rate limit exceeded returns 429

- [x] **Task 3: Create security headers middleware** (AC: 4)
  - [x] 3.1 Create `src/lib/security-headers.ts` — a utility module exporting security header configuration:
    ```typescript
    import { NextResponse } from "next/server";
    import type { NextRequest } from "next/server";

    const securityHeaders = {
      "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
      "X-Frame-Options": "DENY",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https:; frame-ancestors 'none';",
    };

    export function withSecurityHeaders(response: NextResponse): NextResponse {
      for (const [key, value] of Object.entries(securityHeaders)) {
        response.headers.set(key, value);
      }
      return response;
    }
    ```
  - [x] 3.2 Update `src/middleware.ts` to apply security headers to all responses:
    - Import `withSecurityHeaders` from `@/lib/security-headers`
    - The current middleware only invokes `auth((req) => {})` for route protection
    - Modify the middleware to also set security headers on every response
    - **CRITICAL:** The middleware must NOT break the existing `authorized` callback in `auth.config.ts`. The pattern is:
    ```typescript
    import NextAuth from "next-auth";
    import { authConfig } from "@/lib/auth.config";
    import { withSecurityHeaders } from "@/lib/security-headers";
    import { NextResponse } from "next/server";

    const { auth } = NextAuth(authConfig);

    export default auth((req) => {
      const response = NextResponse.next();
      withSecurityHeaders(response);
      return response;
    });

    export const config = {
      matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
    };
    ```
    - **IMPORTANT:** Test that auth redirects (signin, signout, role checks) still work after this change. The middleware must return `NextResponse.next()` with headers, not break the `authorized` callback flow.

  - [x] 3.3 Create `src/lib/security-headers.test.ts`:
    - Test: `withSecurityHeaders` sets all required headers on a response
    - Test: Header values match expected format
    - Test: HSTS header includes `includeSubDomains` and `preload`
    - Test: CSP header includes `frame-ancestors 'none'` (supersedes X-Frame-Options in modern browsers)
    - Test: `Permissions-Policy` restricts camera, microphone, geolocation

- [x] **Task 4: Sanitize server-side logs to prevent sensitive data leakage** (AC: 5)
  - [x] 4.1 Create `src/lib/sanitize-log.ts` — a utility for sanitizing error objects before logging:
    ```typescript
    const SENSITIVE_KEYS = ["password", "passwordHash", "token", "secret", "authorization", "cookie"];

    export function sanitizeError(error: unknown): string {
      if (error instanceof Error) {
        // Return a safe version — the error message without potential sensitive data
        return `Error: ${error.name}`;
      }
      return "Unknown error";
    }

    export function sanitizeForLog(data: Record<string, unknown>): Record<string, unknown> {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        if (SENSITIVE_KEYS.some((k) => key.toLowerCase().includes(k))) {
          sanitized[key] = "[REDACTED]";
        } else {
          sanitized[key] = value;
        }
      }
      return sanitized;
    }
    ```
  - [x] 4.2 Update `src/app/api/auth/signup/route.ts`:
    - Replace `console.error("Signup error:", error)` with `console.error("Signup error:", sanitizeError(error))`
    - Import `sanitizeError` from `@/lib/sanitize-log`
  - [x] 4.3 Update `src/app/api/auth/signin/route.ts`:
    - Replace `console.error("Signin error:", error)` with `console.error("Signin error:", sanitizeError(error))`
    - Import `sanitizeError` from `@/lib/sanitize-log`
  - [x] 4.4 Update `src/app/api/user/account/route.ts`:
    - Replace `console.error("Account deletion error:", error)` with `console.error("Account deletion error:", sanitizeError(error))`
    - Import `sanitizeError` from `@/lib/sanitize-log`
  - [x] 4.5 Update `src/app/api/user/profile/route.ts` (if it has a console.error with raw error):
    - Apply same sanitization pattern
  - [x] 4.6 Create `src/lib/sanitize-log.test.ts`:
    - Test: `sanitizeError(Error)` returns error name without message details
    - Test: `sanitizeForLog` redacts password, passwordHash, token, secret keys
    - Test: `sanitizeForLog` preserves non-sensitive keys
    - Test: `sanitizeForLog` is case-insensitive for key matching

- [x] **Task 5: Add general API rate limiting middleware** (AC: 1, 2)
  - [x] 5.1 Create `src/lib/api-rate-limit.ts` — a general-purpose API rate limiter:
    ```typescript
    import { createRateLimiter } from "./rate-limit";

    // General API rate limiter: 60 requests per minute per IP
    export const apiRateLimiter = createRateLimiter({ requests: 60, windowSeconds: 60 });

    // Password reset / email change rate limiter (future use): 3 per minute per IP
    export const passwordResetRateLimiter = createRateLimiter({ requests: 3, windowSeconds: 60 });
    ```
  - [x] 5.2 This file is for future routes (password reset, email change, etc.) and can be expanded later. For now, it establishes the pattern and makes adding rate limiting to new routes trivial.

- [x] **Task 6: Verify `prisma.config.ts` is correctly configured** (AC: 6)
  - [x] 6.1 Confirm `prisma.config.ts` exists at project root and correctly configures `datasource.url` from `DATABASE_URL`
  - [x] 6.2 Verify `prisma.config.ts` specifies `schema: "prisma/schema.prisma"` and `migrations.path`
  - [x] 6.3 Run `npx prisma validate` to confirm the schema is valid
  - [x] 6.4 Document in code comments that P0 blocker #6 is resolved

- [x] **Task 7: Update rate-limit tests for full coverage** (AC: 1, 2, 3)
  - [x] 7.1 Update `src/lib/rate-limit.test.ts` to cover:
    - `getClientIp` with various header formats (single IP, multiple IPs with comma)
    - `getClientIdentifier` with userId and without
    - `accountDeleteRateLimiter` exists and has correct limits
    - Verify existing `signupRateLimiter` and `signinRateLimiter` still work after refactor
  - [x] 7.2 Verify all existing tests pass (Stories 1.1–1.5 regression)

- [x] **Task 8: Run regression tests** (AC: all)
  - [x] 8.1 Run full test suite and verify Stories 1.1–1.5 auth flows still work
  - [x] 8.2 Verify signup rate limiting (5/min/IP) still works
  - [x] 8.3 Verify signin rate limiting (10/min/IP) still works
  - [x] 8.4 Verify account deletion now has rate limiting (3/min/user)
  - [x] 8.5 Verify security headers are present on all HTTP responses
  - [x] 8.6 Verify sensitive data is not logged in error outputs

## Dev Notes

### Architecture Compliance

- **Auth.js split config (NON-NEGOTIABLE):**
  - `src/lib/auth.config.ts` — Edge Runtime, used by middleware. **MUST NOT** import Prisma, bcrypt, or any Node.js-only module.
  - `src/lib/auth.ts` — Node.js runtime, has PrismaAdapter + providers. Use `auth()` from this file in Server Components and API routes.
  - `src/middleware.ts` — Currently uses `NextAuth(authConfig)` for route protection. Adding security headers here is correct because middleware runs on every request. **CRITICAL:** Do NOT import Prisma, bcrypt, or any Node.js-only module in middleware.

- **Security headers in middleware vs. Nginx:**
  - In development, Next.js middleware sets headers directly on responses.
  - In production, Nginx adds headers like `Strict-Transport-Security` as well (redundant is fine — Nginx headers take precedence for HTTPS).
  - The middleware approach ensures headers are present even without Nginx (e.g., during local testing or direct VPS access).
  - **DO NOT** rely solely on Nginx for security headers — the middleware must set them too.

- **API response format:** Follow architecture pattern:
  - Success: `NextResponse.json({ data: T })`
  - Error: `NextResponse.json({ error: string, code?: string }, { status })`

- **Prisma import:** Always import from `@/generated/prisma/client` — project convention.

- **Prisma client:** Use singleton from `@/lib/prisma.ts` — `import { prisma } from "@/lib/prisma"`.

- **Rate limiting pattern (established in Stories 1.2 and 1.3):**
  - `@upstash/ratelimit` with `@upstash/redis` for production
  - Graceful fallback when Upstash env vars are missing (allows all requests)
  - `getClientIp(req)` extracts IP from `x-forwarded-for` header or falls back to `"unknown"`
  - Rate limit response: 429 with French message « Trop de tentatives. Réessayez dans une minute. »

- **Middleware pattern:**
  - `src/middleware.ts` uses `NextAuth(authConfig)` for route protection
  - The `authorized` callback in `auth.config.ts` handles: public routes, protected routes, admin routes, redirect logged-in users away from auth pages
  - Security headers must be added WITHOUT breaking this flow

### Current State of Files Being Modified

**`src/lib/rate-limit.ts` (today):**
- Exports `createRateLimiter()` factory, `signupRateLimiter` (5/min/60s), `signinRateLimiter` (10/min/60s)
- Has Upstash Redis fallback when env vars are missing
- Does NOT have `getClientIp`, `getClientIdentifier`, or `accountDeleteRateLimiter`
- **What changes:** Add `getClientIp`, `getClientIdentifier`, `accountDeleteRateLimiter`, `apiRateLimiter` exports

**`src/lib/rate-limit.test.ts` (today):**
- 3 tests: Upstash env vars present (works), Upstash env vars missing (fallback), rate limit exceeded
- **What changes:** Add tests for `getClientIp`, `getClientIdentifier`, `accountDeleteRateLimiter`

**`src/app/api/auth/signup/route.ts` (today):**
- Has local `getClientIp` function definition (duplicate of signin's)
- Has `signupRateLimiter.limit(ip)` call
- Has `console.error("Signup error:", error)` — logs raw error which could leak sensitive data
- **What changes:** Remove local `getClientIp`, import from `@/lib/rate-limit`, sanitize error logging

**`src/app/api/auth/signin/route.ts` (today):**
- Has local `getClientIp` function definition (duplicate of signup's)
- Has `signinRateLimiter.limit(ip)` call
- Has `console.error("Signin error:", error)` — logs raw error
- **What changes:** Remove local `getClientIp`, import from `@/lib/rate-limit`, sanitize error logging

**`src/app/api/user/account/route.ts` (today):**
- Has `auth()` authentication, Zod validation, `$transaction` for anonymization
- No rate limiting (deferred from Story 1.5 code review finding)
- Has `console.error("Account deletion error:", error)` — logs raw error
- **What changes:** Add `accountDeleteRateLimiter` with user-ID-based identifier, sanitize error logging

**`src/middleware.ts` (today):**
- Simple `auth((req) => {})` pattern with route protection in `authorized` callback
- No security headers
- **What changes:** Add `withSecurityHeaders()` to set headers on every response. Must return `NextResponse.next()` with headers, not break auth flow.

**`prisma.config.ts` (today):**
- Already exists at project root with correct configuration
- Configures `schema`, `migrations.path`, and `datasource.url` from `DATABASE_URL`
- **P0 blocker #6 is RESOLVED** — just needs verification, no changes

**`next.config.ts` (today):**
- Minimal config with no `output: 'standalone'` — belongs to Story 1.7
- No security headers config — belongs to this story (but implemented via middleware, not next.config)

### File Structure & What to Touch

| File | Action | Why |
|------|--------|-----|
| `src/lib/rate-limit.ts` | **UPDATE** | Add `getClientIp`, `getClientIdentifier`, `accountDeleteRateLimiter` |
| `src/lib/rate-limit.test.ts` | **UPDATE** | Add tests for new exports |
| `src/lib/security-headers.ts` | **CREATE** | Security headers utility for middleware |
| `src/lib/security-headers.test.ts` | **CREATE** | Tests for security headers |
| `src/lib/sanitize-log.ts` | **CREATE** | Log sanitization utility |
| `src/lib/sanitize-log.test.ts` | **CREATE** | Tests for log sanitization |
| `src/lib/api-rate-limit.ts` | **CREATE** | General API rate limiters for future routes |
| `src/middleware.ts` | **UPDATE** | Add security headers to all responses |
| `src/app/api/auth/signup/route.ts` | **UPDATE** | Remove local `getClientIp`, use shared import, sanitize error logging |
| `src/app/api/auth/signin/route.ts` | **UPDATE** | Remove local `getClientIp`, use shared import, sanitize error logging |
| `src/app/api/user/account/route.ts` | **UPDATE** | Add rate limiting, sanitize error logging |
| `src/app/api/user/account/route.test.ts` | **UPDATE** | Add rate limit test |
| `src/app/api/user/profile/route.ts` | **UPDATE** (if needed) | Sanitize error logging if present |
| `prisma.config.ts` | **READ-ONLY / VERIFY** | Confirms P0 blocker #6 is resolved |
| `src/lib/auth.config.ts` | **READ-ONLY** | Do not modify |
| `src/lib/auth.ts` | **READ-ONLY** | Do not modify |
| `next.config.ts` | **READ-ONLY** | Do not modify (standalone output belongs to Story 1.7) |

### Technical Requirements

- **Library versions (already installed):**
  - `@upstash/ratelimit` ^2.0.8 — rate limiting (already in use)
  - `@upstash/redis` ^1.38.0 — Redis client (already in use)
  - `next-auth` ^5.0.0-beta.31 — Auth.js (middleware)
  - `next` 16.2.6 — Next.js middleware
  - `zod` ^4.4.3 — validation
  - `vitest` ^4.1.6 — testing

- **Rate limiting design for account deletion:**
  - Uses `getClientIdentifier(req, userId)` which returns `"user:{userId}"` for authenticated requests
  - This means rate limiting is per-user, not per-IP, which prevents:
    1. The concurrent deletion race condition (user can't send 2 DELETE requests within the same minute)
    2. IP-based circumvention (different IPs for the same user)
  - Falls back to IP-based limiting if userId is unavailable (shouldn't happen for authenticated endpoint)

- **Security headers design:**
  - Applied via Next.js middleware (runs on every request matching the matcher pattern)
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` — 2-year HSTS with preload
  - `X-Frame-Options: DENY` — prevents clickjacking
  - `X-Content-Type-Options: nosniff` — prevents MIME-type sniffing
  - `Referrer-Policy: strict-origin-when-cross-origin` — limits referrer leakage
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()` — disables permissions IBC doesn't need
  - `Content-Security-Policy` with sensible defaults:
    - `default-src 'self'` — only load from same origin by default
    - `script-src 'self' 'unsafe-inline' 'unsafe-eval'` — needed for Next.js (RSC + hydration)
    - `style-src 'self' 'unsafe-inline'` — needed for TailwindCSS
    - `img-src 'self' data: https:` — allow images from self, data URIs, and HTTPS (Google avatars)
    - `font-src 'self' https:` — allow fonts from self and CDNs
    - `connect-src 'self' https:` — allow XHR/fetch to self and HTTPS APIs (Upstash, Google OAuth)
    - `frame-ancestors 'none'` — equivalent to X-Frame-Options: DENY in CSP

- **Log sanitization design:**
  - `sanitizeError(error)` returns just `Error: {name}` — no message or stack that could contain passwords/tokens
  - `sanitizeForLog(data)` redacts values for keys containing: password, passwordHash, token, secret, authorization, cookie
  - Applied to all `console.error` calls in API route handlers
  - Client-facing error responses already use generic messages (« Erreur interne »)
  - This addresses NFR-S8: no sensitive data in PM2 logs

- **Middleware modification pattern:**
  - The current `src/middleware.ts` uses `NextAuth(authConfig)` with the `authorized` callback in `auth.config.ts` for route protection
  - Adding security headers must NOT break the auth flow
  - The correct pattern is:
    ```typescript
    import NextAuth from "next-auth";
    import { authConfig } from "@/lib/auth.config";
    import { NextResponse } from "next/server";
    import { withSecurityHeaders } from "@/lib/security-headers";

    const { auth } = NextAuth(authConfig);

    export default auth((req) => {
      const response = NextResponse.next();
      withSecurityHeaders(response);
      return response;
    });

    export const config = {
      matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
    };
    ```
  - **CRITICAL:** The `authorized` callback in `auth.config.ts` still handles redirects by returning `false` or `Response.redirect()`. The middleware must return `NextResponse.next()` for normal flows and let `authorized` handle auth redirects. Do NOT override the `authorized` callback behavior.

- **Testing framework:** Vitest + jsdom + @testing-library/react + jest-dom (already configured from Stories 1.1–1.5). Follow same testing patterns.

- **Upstash Redis fallback:** The existing `createRateLimiter` function grcefully handles missing `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` env vars by returning a permissive limiter that allows all requests. This is intentional — it means rate limiting is disabled in development without Redis, and enabled in production with Redis. Do NOT change this behavior.

- **Environment variables for Upstash (already in `.env.example`):**
  ```
  UPSTASH_REDIS_REST_URL=
  UPSTASH_REDIS_REST_TOKEN=
  ```

### Testing Requirements

- **Rate limit module tests (`src/lib/rate-limit.test.ts`):**
  - Test: `getClientIp` extracts IP from `x-forwarded-for` with single IP
  - Test: `getClientIp` extracts first IP from `x-forwarded-for` with multiple IPs (comma-separated)
  - Test: `getClientIp` returns `"unknown"` when no forwarded header
  - Test: `getClientIdentifier` returns `"user:{id}"` when userId is provided
  - Test: `getClientIdentifier` returns `"ip:{ip}"` when no userId
  - Test: `accountDeleteRateLimiter` creates a valid rate limiter
  - Test: existing `signupRateLimiter` and `signinRateLimiter` still work after refactor

- **Security headers tests (`src/lib/security-headers.test.ts`):**
  - Test: `withSecurityHeaders` sets `Strict-Transport-Security` with correct value
  - Test: `withSecurityHeaders` sets `X-Frame-Options: DENY`
  - Test: `withSecurityHeaders` sets `X-Content-Type-Options: nosniff`
  - Test: `withSecurityHeaders` sets `Referrer-Policy: strict-origin-when-cross-origin`
  - Test: `withSecurityHeaders` sets `Permissions-Policy` restricting camera, microphone, geolocation
  - Test: `withSecurityHeaders` sets `Content-Security-Policy` with required directives
  - Test: All 6 security headers are present after calling `withSecurityHeaders`

- **Log sanitization tests (`src/lib/sanitize-log.test.ts`):**
  - Test: `sanitizeError` returns error name without message details
  - Test: `sanitizeForLog` redacts values for sensitive keys (password, passwordHash, token, secret, authorization, cookie)
  - Test: `sanitizeForLog` preserves non-sensitive keys and values
  - Test: `sanitizeForLog` is case-insensitive for key matching

- **Account deletion rate limit test (`src/app/api/user/account/route.test.ts`):**
  - Test: DELETE with rate limit exceeded (3 requests in 1 minute) returns 429

- **Integration verification:**
  - Test: Security headers are present on HTTP responses from the app
  - Test: Auth routes (signin, signup) still function correctly
  - Test: Redirects from `authorized` callback (unauthenticated → signin, non-admin → home) still work

- **Regression tests:**
  - Stories 1.1–1.5 auth flows still work (signup, signin, signout, profile, account deletion)
  - Rate limiting on signup (5/min) and signin (10/min) still works
  - Middleware route protection still works

### Potential Pitfalls & Regression Prevention

- **DO NOT** modify `src/lib/auth.config.ts` — the `authorized` callback handles all route protection. Adding security headers to middleware must NOT interfere with this.
- **DO NOT** add `output: 'standalone'` to `next.config.ts` — belongs to Story 1.7.
- **DO NOT** remove Stripe/CinetPay — belongs to Story 2.1.
- **DO NOT** move `getClientIp` from rate-limit.ts to a separate utils file — keep it in `@/lib/rate-limit.ts` since it's tightly coupled with rate limiting logic.
- **DO NOT** use `next.config.ts` `headers()` function for security headers — the middleware approach is more reliable and testable in development. In production, Nginx adds headers too (redundancy is fine).
- **DO NOT** forget that `NextResponse.next()` is needed in middleware to continue the request chain. Never return `undefined` or `null` from middleware.
- **DO NOT** log the full `Error` object in API routes — use `sanitizeError()` which only logs the error type, not message or stack trace that might contain sensitive data.
- **CSP `unsafe-inline` and `unsafe-eval` in script-src:** These are needed for Next.js to function correctly. Next.js injects inline scripts for hydration. Removing them would break the app. A future story can implement nonce-based CSP, but for MVP this is sufficient.
- **CSP `frame-ancestors 'none'` vs `X-Frame-Options: DENY`:** Both are included for browser compatibility. Modern browsers respect `frame-ancestors` in CSP; older browsers need `X-Frame-Options`.
- **Upstash Redis in development:** If `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are not set, rate limiting is gracefully disabled (all requests pass). This means security headers are the only protection in local development. This is acceptable — rate limiting is primarily a production concern.
- **Rate limiting per-user-ID for account deletion:** Using `user:{id}` rather than `ip:{ip}` prevents circumvention via IP rotation. The user must be authenticated to reach this endpoint, so the user ID is always available.
- **The `prisma.config.ts` P0 blocker:** Already resolved by previous work. Verify it's present and correct, but do NOT modify it unless there's a discovered bug.

### Scope Boundaries (What NOT to do)

- **Do NOT** add `output: 'standalone'` to `next.config.ts` — belongs to Story 1.7
- **Do NOT** remove Stripe/CinetPay from codebase — belongs to Story 2.1
- **Do NOT** implement email verification (email verification link, verification flow UI) — while `emailVerified` and `VerificationToken` exist in Prisma, the actual email verification flow belongs to a future story
- **Do NOT** add 2FA / MFA — out of scope for MVP
- **Do NOT** add admin audit logging (NFR-S9) — belongs to Story 6.4
- **Do NOT** implement CSRF protection — Auth.js v5 handles CSRF natively (NFR-S6, already covered)
- **Do NOT** modify the `authorized` callback in `auth.config.ts` — route protection is already correct
- **Do NOT** add Nginx configuration files — those belong to Story 1.7 (deployment). Security headers in middleware are tested and verified at the application level
- **Do NOT** modify `next.config.ts` for security headers — handled in middleware

### Environment Variables

No new environment variables required. Existing variables used:
```
UPSTASH_REDIS_REST_URL=       # Required for rate limiting (production)
UPSTASH_REDIS_REST_TOKEN=      # Required for rate limiting (production)
DATABASE_URL=                  # Used by prisma.config.ts
NEXTAUTH_URL=                  # Already configured
NEXTAUTH_SECRET=               # Already configured
```

### Previous Story Intelligence

**From Story 1.2 (Inscription avec Email et Mot de Passe):**
- Rate limiting pattern established in `src/lib/rate-limit.ts` with `createRateLimiter()` factory and Upstash fallback
- `getClientIp()` function created locally in `signup/route.ts` — now needs to be extracted to shared module
- Vitest + jsdom + `@testing-library/react/jest-dom` testing stack is working
- `vi.hoisted()` pattern for mock factories

**From Story 1.3 (Connexion, Session et Rôles):**
- `signinRateLimiter` added to `src/lib/rate-limit.ts`
- Same `getClientIp()` pattern duplicated in `signin/route.ts`
- Fixed `isPublic` route detection bug in `auth.config.ts` — `startsWith("/")` was matching everything
- All API routes follow `{ data: ... }` success and `{ error: ... }` error pattern

**From Story 1.4 (Gestion du Profil Utilisateur):**
- `profileUpdateSchema` added to `src/lib/validations.ts`
- Server Component + Client Component split pattern well established

**From Story 1.5 (Suppression de Compte RGPD):**
- Account deletion route `src/app/api/user/account/route.ts` uses `$transaction` for atomicity
- `console.error("Account deletion error:", error)` logs raw error — needs sanitization
- **DEFERRED ISSUE from code review:** Concurrent deletion race condition — two rapid DELETE requests could both pass auth. This story (1.6) mitigates it with rate limiting per user ID.
- `accountDeletionSchema` added to `src/lib/validations.ts`

### Git Intelligence

Recent commits show established patterns:
- `feat(auth): Story 1.X — [description]` — commit message pattern
- Story file creation commit: `bmad-create-story: Story 1.X — [description]`
- Status update commit: `chore: mark Story 1.X as done in sprint-status`
- Code review fix: `fix(review): [description] — Story 1.X CR fix`

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 1 / Story 1.6 — Renforcement de la Sécurité — Rate Limiting et Headers]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — Security Measures (rate limiting, headers), Auth Architecture, Data Flow, P0 Blockers]
- [Source: `_bmad-output/planning-artifacts/prd.md` — NFR-S3, NFR-S4, NFR-S7, NFR-S8, P0 Blocker #6]
- [Source: `src/lib/rate-limit.ts` — Existing rate limiter with factory pattern]
- [Source: `src/lib/rate-limit.test.ts` — Existing 3 tests]
- [Source: `src/app/api/auth/signup/route.ts` — Signup rate limiting pattern (5/min/IP)]
- [Source: `src/app/api/auth/signin/route.ts` — Signin rate limiting pattern (10/min/IP)]
- [Source: `src/app/api/user/account/route.ts` — Account deletion WITHOUT rate limiting (deferred from Story 1.5)]
- [Source: `src/middleware.ts` — Current middleware with auth protection only, no security headers]
- [Source: `src/lib/auth.config.ts` — Edge-compatible auth config with `authorized` callback (READ-ONLY)]
- [Source: `prisma.config.ts` — Already correctly configured (P0 blocker #6 resolved)]

---

## Dev Agent Record

### Agent Model Used

moonshotai/kimi-k2

### Debug Log References

### Completion Notes List

- ✅ Task 1: Extended `rate-limit.ts` with `accountDeleteRateLimiter`, `getClientIp`, `getClientIdentifier`. Removed duplicate `getClientIp` from signup and signin routes. Updated existing tests, added new tests for all new exports.
- ✅ Task 2: Applied rate limiting to account deletion endpoint using `accountDeleteRateLimiter` + `getClientIdentifier(req, session.user.id)`. Added 429 rate limit test. Mitigates Story 1.5 concurrent deletion race condition.
- ✅ Task 3: Created `security-headers.ts` with `withSecurityHeaders` utility. Updated `middleware.ts` to apply security headers + maintain auth flow. Created comprehensive test suite (6 tests).
- ✅ Task 4: Created `sanitize-log.ts` with `sanitizeError` and `sanitizeForLog`. Applied to all 4 API routes (signup, signin, account deletion, profile). Created test suite (7 tests).
- ✅ Task 5: Created `api-rate-limit.ts` with `apiRateLimiter` (60/min) and `passwordResetRateLimiter` (3/min) for future use.
- ✅ Task 6: Verified `prisma.config.ts` exists, correctly configures schema/migrations/datasource. `npx prisma validate` confirms valid schema. P0 blocker #6 resolved.
- ✅ Task 7: Updated `rate-limit.test.ts` — now 12 tests covering `getClientIp`, `getClientIdentifier`, `accountDeleteRateLimiter`, and regression of `signupRateLimiter`/`signinRateLimiter`.
- ✅ Task 8: Full regression suite passes — 129 tests (up from 106), all green. No regressions in Stories 1.1–1.5 flows.

### File List

- `src/lib/rate-limit.ts` — UPDATE (added `getClientIp`, `getClientIdentifier`, `accountDeleteRateLimiter`)
- `src/lib/rate-limit.test.ts` — UPDATE (expanded from 3 to 12 tests)
- `src/lib/security-headers.ts` — CREATE (security headers utility)
- `src/lib/security-headers.test.ts` — CREATE (6 tests)
- `src/lib/sanitize-log.ts` — CREATE (log sanitization utility)
- `src/lib/sanitize-log.test.ts` — CREATE (7 tests)
- `src/lib/api-rate-limit.ts` — CREATE (general API rate limiters for future use)
- `src/middleware.ts` — UPDATE (added security headers to all responses)
- `src/app/api/auth/signup/route.ts` — UPDATE (shared `getClientIp`, `sanitizeError`)
- `src/app/api/auth/signin/route.ts` — UPDATE (shared `getClientIp`, `sanitizeError`)
- `src/app/api/user/account/route.ts` — UPDATE (rate limiting, `sanitizeError`)
- `src/app/api/user/account/route.test.ts` — UPDATE (added rate limit test + mocks)
- `src/app/api/user/profile/route.ts` — UPDATE (sanitize error logging)
- `src/app/api/auth/signup/route.test.ts` — UPDATE (added `sanitize-log` mock)
- `src/app/api/auth/signin/route.test.ts` — UPDATE (added `sanitize-log` mock)
- `src/app/api/user/profile/route.test.ts` — UPDATE (added `sanitize-log` mock)

### Change Log

- Story 1.6 implementation complete: Rate limiting extended, security headers added, log sanitization applied, all 6 ACs satisfied (2026-05-13)