# Story 1.2: Inscription avec Email et Mot de Passe

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a visitor,
I want to sign up with my email and a secure password,
so that I can create an IBC account independently of Google.

## Acceptance Criteria

1. **Email signup creates user with defaults**
   - **Given** an unauthenticated visitor on `/auth/signup`
   - **When** they enter a valid email, a password of at least 8 characters, and submit the form
   - **Then** the system creates a `User` with `role = MEMBER`, `tier = AFFRANCHI`, password hashed with bcryptjs (cost ≥ 10, NFR-S2), and redirects to `/dashboard`

2. **Duplicate email prevention**
   - **Given** a visitor enters an email already in use
   - **When** they submit the form
   - **Then** a clear error message displays: « Cet email est déjà associé à un compte. »

3. **Rate limiting on signup**
   - **Given** a visitor attempting to sign up from the same IP
   - **When** they make more than 5 signup attempts in 1 minute
   - **Then** the 6th attempt is blocked with status 429 and the message: « Trop de tentatives. Réessayez dans une minute. » (NFR-S3)

4. **Password strength indicator**
   - **Given** a visitor enters a weak password (< 8 characters)
   - **When** the field loses focus
   - **Then** an inline password strength indicator appears below the field (inline validation, UX-DR14)

## Tasks / Subtasks

- [ ] **Task 1: Harden `/api/auth/signup` route** (AC: 1, 2, 3)
  - [ ] 1.1 Install `@upstash/ratelimit` and `@upstash/redis`
  - [ ] 1.2 Create `src/lib/rate-limit.ts` with a signup rate limiter (5 requests / 60 seconds / IP)
  - [ ] 1.3 Apply rate limiter to `POST /api/auth/signup` — return 429 with French message when exceeded
  - [ ] 1.4 Ensure bcrypt cost is ≥ 10 (currently 12 — verify, do not lower)
  - [ ] 1.5 Update duplicate-email error response to exactly: « Cet email est déjà associé à un compte. »
  - [ ] 1.6 Remove `Subscription` creation from the signup route — subscription lifecycle belongs to Epic 2 (bank-transfer flow). The `User.tier` default (`AFFRANCHI`) is sufficient for initial access.
  - [ ] 1.7 Return `201` with `{ id, email, name }` on success

- [ ] **Task 2: Migrate signup page to React Hook Form + Zod** (AC: 1, 2, 4)
  - [ ] 2.1 Refactor `src/app/auth/signup/page.tsx` from manual `useState` form to `react-hook-form` with `zodResolver(signupSchema)`
  - [ ] 2.2 Keep the existing Google OAuth button and error handling (from Story 1.1) untouched
  - [ ] 2.3 Add password strength indicator component: weak (< 8 chars), medium (8+ with mixed), strong (12+ with symbols) — displayed inline under the password field
  - [ ] 2.4 Ensure all validation errors follow UX-DR14 (label above, placeholder muted, inline validation, loading state on submit button)
  - [ ] 2.5 Ensure auto sign-in after successful signup still works via `signIn("credentials", ...)` but redirect to `/dashboard` (not `/pricing`)

- [ ] **Task 3: End-to-end verification** (AC: 1, 2, 3, 4)
  - [ ] 3.1 Manual test: new email signup → User created with `role=MEMBER`, `tier=AFFRANCHI`, `passwordHash` present
  - [ ] 3.2 Manual test: duplicate email → French error message, no duplicate User
  - [ ] 3.3 Manual test: 6 rapid signup attempts from same IP → 429 response with French message
  - [ ] 3.4 Manual test: weak password blur → inline strength indicator visible
  - [ ] 3.5 Regression test: email/password sign-in still works (`/api/auth/signin` or NextAuth credentials flow)
  - [ ] 3.6 Regression test: Google OAuth signup still works (Story 1.1 functionality preserved)
  - [ ] 3.7 Regression test: middleware still redirects unauthenticated users from `/dashboard` to `/auth/signin`

## Dev Notes

### Critical Gaps in Current Codebase

1. **Signup API creates a Subscription with `provider: "STRIPE"`** — This is a P0 blocker carry-over from the original template. The bank-transfer model eliminates Stripe. For Story 1.2, simply remove Subscription creation from the signup route. Epic 2 (Stories 2.1–2.3) will build the proper bank-transfer subscription flow.
2. **Duplicate email error message is wrong** — Current API returns « Cet email est déjà utilisé ». The AC requires « Cet email est déjà associé à un compte. »
3. **No rate limiting on `/api/auth/signup`** — Brute-force account creation is possible. Must install `@upstash/ratelimit` and protect this route.
4. **Signup page uses manual form state** — Architecture mandates React Hook Form + Zod for all forms. The page currently uses raw `useState` and manual `fetch` with inline validation. Migrate to RHF for consistency, testability, and UX-DR14 compliance.
5. **Post-signup redirect is `/pricing`** — The signup page auto-signs in after creation but sends the user to `/pricing`. The AC for Story 1.2 (and Story 1.1) requires redirect to `/dashboard`.
6. **No password strength indicator** — UX-DR14 requires inline validation feedback. Add a simple strength bar below the password field.

### Architecture Compliance

- **Auth.js split config (NON-NEGOTIABLE):**
  - `src/lib/auth.config.ts` → Edge Runtime. **MUST NOT** import `PrismaAdapter`, `prisma`, or `bcrypt`. Keep exactly as-is.
  - `src/lib/auth.ts` → Node.js runtime. Already contains `Credentials` provider. **Do not modify** the Credentials provider logic unless it is broken — it already hashes with bcrypt and returns `id`, `email`, `name`, `tier`, `role`.
- **JWT session strategy** — Already configured in `auth.config.ts`. The `jwt` and `session` callbacks embed `id`, `tier`, `role`. Do not modify.
- **Default role/tier** — Prisma schema defines `@default(MEMBER)` for `role` and `@default(AFFRANCHI)` for `tier`. When a `User` is created via `prisma.user.create()`, these defaults apply automatically. Do not hardcode them in the signup route unless you have a specific reason.
- **Rate limiting library** — Use `@upstash/ratelimit` with `@upstash/redis`. The project does not have these installed yet; add them to `package.json`.
- **Prisma client import** — Use `@/generated/prisma/client` (project convention).
- **API response format** — Follow architecture pattern:
  - Success: `Response.json({ data: T })` or `NextResponse.json({ data: T })`
  - Error: `NextResponse.json({ error: string, code?: string }, { status })`

### File Structure & What to Touch

| File | Action | Why |
|------|--------|-----|
| `src/app/api/auth/signup/route.ts` | **UPDATE** | Fix error message, add rate limiting, remove Subscription creation, ensure bcrypt cost ≥ 10 |
| `src/app/auth/signup/page.tsx` | **UPDATE** | Migrate to React Hook Form, add password strength indicator, fix redirect to `/dashboard` |
| `src/lib/rate-limit.ts` | **CREATE** | Upstash rate limiter factory for signup (and future reuse) |
| `src/lib/validations.ts` | **READ-ONLY VERIFY** | `signupSchema` already exists; reuse it with RHF resolver |
| `package.json` | **UPDATE** | Add `@upstash/ratelimit`, `@upstash/redis` dependencies |
| `src/lib/auth.ts` | **READ-ONLY** | Credentials provider already works; do not change unless broken |
| `src/lib/auth.config.ts` | **READ-ONLY** | Do not modify Edge config |
| `src/middleware.ts` | **READ-ONLY** | Do not modify |
| `prisma/schema.prisma` | **READ-ONLY** | No schema changes needed for this story |

### Technical Requirements

- **Library versions to install:**
  - `@upstash/ratelimit` — latest stable (uses sliding window, serverless-compatible)
  - `@upstash/redis` — companion client for ratelimit
- **Rate limiter configuration:**
  - Window: 60 seconds
  - Max requests: 5 per IP
  - Identifier: `req.headers.get("x-forwarded-for")` or `req.ip` fallback
  - Error response: `{ error: "Trop de tentatives. Réessayez dans une minute." }` with status `429`
- **Password strength rules (UX):**
  - Weak: < 8 characters → red text « Faible »
  - Medium: 8+ characters with at least one letter and one number → amber text « Moyen »
  - Strong: 12+ characters with letters, numbers, and symbols → green text « Fort »
- **React Hook Form migration:**
  - Use `useForm<SignupInput>({ resolver: zodResolver(signupSchema) })`
  - Keep existing visual structure (card layout, Google button, error banner)
  - Preserve `googleLoading` state and `useSearchParams` error handling from Story 1.1
- **Post-signup auto sign-in:**
  - After successful `fetch("/api/auth/signup")`, call `signIn("credentials", { email, password, redirect: false })`
  - On `result?.ok`, redirect to `/dashboard` via `window.location.href = "/dashboard"`
  - On failure, redirect to `/auth/signin`

### Current State of Files Being Modified

**`src/app/api/auth/signup/route.ts` (today):**
```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signupSchema } from "@/lib/validations";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const { name, email, password } = parsed.data;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({ data: { name, email, passwordHash } });
    // ❌ Remove this block — Subscription belongs to Epic 2
    await prisma.subscription.create({
      data: {
        userId: user.id,
        tier: "AFFRANCHI",
        period: "MONTHLY",
        provider: "STRIPE",
        providerRef: "trial",
        status: "TRIAL",
        startDate: new Date(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    });
    return NextResponse.json({ id: user.id, email: user.email, name: user.name }, { status: 201 });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
```

**`src/app/auth/signup/page.tsx` (today):**
Uses manual `useState` for `name`, `email`, `password`, `error`, `loading`. Calls `fetch("/api/auth/signup")` manually. On success, calls `signIn("credentials", ...)` then redirects to `/pricing`. Google button and `useSearchParams` error handling were added in Story 1.1 and must be preserved.

### Testing Requirements

- **Unit tests for rate limiter:**
  - Test `src/lib/rate-limit.ts` exports a functioning limiter
  - Mock Upstash Redis and verify `limit()` returns `{ success: true/false }`
- **Component tests for signup page:**
  - Reuse and extend existing `src/app/auth/signup/page.test.tsx` (created in Story 1.1)
  - Test: form submission with RHF triggers API call with correct payload
  - Test: Zod validation errors render inline before API call
  - Test: password strength indicator updates on input change
  - Test: duplicate email error message matches exact French string
- **API route tests:**
  - Test: valid signup returns 201 + user data, no Subscription in DB
  - Test: duplicate email returns 409 with exact French message
  - Test: 6th request from same IP returns 429 with exact French message
- **Regression tests:**
  - Google OAuth button still renders and calls `signIn("google", ...)`
  - OAuth error banner still appears from `useSearchParams`
  - Credentials sign-in still works after signup route changes

### Potential Pitfalls & Regression Prevention

- **DO NOT** import `PrismaAdapter` or `bcrypt` into `auth.config.ts` — this will crash the Edge runtime.
- **DO NOT** modify the `jwt` or `session` callbacks in `auth.config.ts` — they already work.
- **DO NOT** create a Subscription in the signup route. The bank-transfer subscription flow is Epic 2. Creating a Stripe subscription here is a P0 blocker regression.
- **DO NOT** break the Google OAuth button or `useSearchParams` error handling added in Story 1.1.
- **DO NOT** change `src/lib/auth.ts` Credentials provider logic — it already works correctly.
- **DO NOT** add rate limiting to `/api/auth/signin` — that belongs to Story 1.6 (10/min/IP).
- **Watch out for RHF + Next.js 16 compatibility** — ensure `react-hook-form` version in `package.json` is compatible with React 19. The project already has React Hook Form installed (v7.75.0 per architecture).
- **When installing `@upstash/ratelimit`**, ensure you also install `@upstash/redis`. The limiter factory should read `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` from `process.env`.
- **If Upstash env vars are missing**, the rate limiter should gracefully fall back to allowing requests (or log a warning) so local development isn't blocked. Document this behavior.
- **Next.js 16 cache issue**: after any `package.json` change, run `rm -rf .next && npm run dev` if you see cryptic module errors.

### Scope Boundaries (What NOT to do)

- **Do NOT** remove Stripe/CinetPay files or dependencies — belongs to Story 2.1
- **Do NOT** modify `PaymentProvider` enum or `Subscription` model — belongs to Story 2.1
- **Do NOT** add rate limiting to `/api/auth/signin` — belongs to Story 1.6
- **Do NOT** implement CSP/security headers — belongs to Story 1.6
- **Do NOT** build `/dashboard` features — just ensure redirect lands there
- **Do NOT** modify `next.config.ts` for standalone output — belongs to Story 1.7
- **Do NOT** send welcome emails — belongs to Story 2.5 (notifications)

### Environment Variables

Required for rate limiting (add to `.env.local` if not present):
```
UPSTASH_REDIS_REST_URL=<from Upstash console>
UPSTASH_REDIS_REST_TOKEN=<from Upstash console>
```
If these are missing in local dev, the rate limiter should fallback to permissive mode with a console warning.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 1 / Story 1.2]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — Auth.js Split Config, Rate Limiting (Upstash), API Patterns, Form Handling (RHF + Zod)]
- [Source: `_bmad-output/planning-artifacts/prd.md` — FR2, NFR-S2, NFR-S3, NFR-P3]
- [Source: `src/lib/auth.config.ts` — Edge auth config with jwt/session/authorized callbacks]
- [Source: `src/lib/auth.ts` — Node.js auth instance with Credentials provider]
- [Source: `src/app/api/auth/signup/route.ts` — Current email signup API (to be hardened)]
- [Source: `src/app/auth/signup/page.tsx` — Current signup page (to be migrated to RHF)]
- [Source: `src/lib/validations.ts` — Existing `signupSchema`]
- [Source: `prisma/schema.prisma` — User model with defaults for role/tier]

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
