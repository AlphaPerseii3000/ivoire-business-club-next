# Story 1.3: Connexion, Session et Rôles

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a registered member,
I want to sign in with Google or email/password,
so that I can access my personal space with a secure session.

## Acceptance Criteria

1. **Successful signin establishes JWT session**
   - **Given** a registered user on `/auth/signin`
   - **When** they enter valid credentials and submit
   - **Then** the system establishes a JWT session containing `id`, `email`, `role`, `tier`, and redirects to `/dashboard` in less than 300 ms (NFR-P3)

2. **Admin role is encoded in JWT and enforced**
   - **Given** a user with `role = ADMIN`
   - **When** they are authenticated
   - **Then** the JWT contains `role = ADMIN` and the middleware authorizes access to `/admin/*` routes

3. **Member role is blocked from admin routes**
   - **Given** a user with `role = MEMBER`
   - **When** they attempt to access `/admin`
   - **Then** the middleware redirects them to `/dashboard` or `/`

4. **Unauthenticated users are blocked from protected routes**
   - **Given** an unauthenticated visitor
   - **When** they attempt to access `/dashboard` or a protected `/api/*` route
   - **Then** the middleware redirects them to `/auth/signin` (NFR-S5)

5. **Signin rate limiting**
   - **Given** a user attempting to sign in from the same IP
   - **When** they make more than 10 signin attempts in 1 minute
   - **Then** the attempt is blocked with status 429 and the message: « Trop de tentatives. Réessayez dans une minute. » (NFR-S4)

6. **Signout clears session and redirects**
   - **Given** an authenticated user clicks « Déconnexion » from any authenticated page
   - **When** the signout action completes
   - **Then** the session cookie is cleared and the user is redirected to `/`

## Tasks / Subtasks

- [ ] **Task 1: Harden `/auth/signin` page** (AC: 1)
  - [ ] 1.1 Migrate `src/app/auth/signin/page.tsx` from manual `useState` form to React Hook Form + `zodResolver(signinSchema)` (consistent with Story 1.2 signup page)
  - [ ] 1.2 Keep the existing Google OAuth button and ensure `callbackUrl: "/dashboard"`
  - [ ] 1.3 Add inline error handling for credential validation (Zod errors + API errors) following UX-DR14
  - [ ] 1.4 Add loading/disabled state on the submit button and Google button
  - [ ] 1.5 Preserve `useSearchParams` OAuth error handling pattern from Story 1.1 (reuse `src/lib/oauth-errors.ts`)
  - [ ] 1.6 Ensure the page is fully in French (NFR-A3)

- [ ] **Task 2: Create `/api/auth/signin` route with rate limiting** (AC: 1, 5)
  - [ ] 2.1 Create `src/app/api/auth/signin/route.ts` — custom route that validates credentials with Zod, rate-limits, verifies bcrypt hash, and returns user data on success
  - [ ] 2.2 Apply rate limiter from `src/lib/rate-limit.ts` (reuse `createRateLimiter`): 10 requests / 60 seconds / IP
  - [ ] 2.3 On 429, return exact French message: « Trop de tentatives. Réessayez dans une minute. »
  - [ ] 2.4 On invalid credentials, return 401 with message: « Email ou mot de passe incorrect. »
  - [ ] 2.5 On success, return 200 with `{ id, email, name, tier, role }`
  - [ ] 2.6 Update the signin page to POST to `/api/auth/signin` first; on 200, call `signIn("credentials", { email, password, callbackUrl: "/dashboard" })` to establish NextAuth session

- [ ] **Task 3: Implement signout flow** (AC: 6)
  - [ ] 3.1 Create `/auth/signout/page.tsx` — simple page that shows « Déconnexion en cours… » and auto-redirects to `/` (auth.config.ts references this as `signOut` page)
  - [ ] 3.2 Fix `src/app/(dashboard)/layout.tsx` signout button: replace the broken `<form action="/api/auth/signout" method="POST">` with a working mechanism. Recommended: create a small client component `SignOutButton` that calls `signOut({ redirectTo: "/" })` from `next-auth/react`, OR create a Server Action that calls `signOut` from `@/lib/auth`
  - [ ] 3.3 Apply the same fix to `src/app/(admin)/layout.tsx` if it has a signout button (add one if missing)

- [ ] **Task 4: Verify role-based middleware protection** (AC: 2, 3, 4)
  - [ ] 4.1 Verify `src/lib/auth.config.ts` `authorized` callback correctly blocks `/admin/*` for non-ADMIN roles (redirects to `/`)
  - [ ] 4.2 Verify `authorized` callback redirects unauthenticated users from `/dashboard/*` to `/auth/signin`
  - [ ] 4.3 Verify `authorized` callback redirects logged-in users away from `/auth/signin` and `/auth/signup` to `/dashboard`
  - [ ] 4.4 Verify `/api/auth/*` remains public (middleware matcher excludes it or authConfig treats it as public)
  - [ ] 4.5 Confirm `src/middleware.ts` only imports from `auth.config.ts` (no Prisma, no bcrypt) — DO NOT CHANGE

- [ ] **Task 5: End-to-end verification** (AC: 1–6)
  - [ ] 5.1 Manual test: credentials signin → JWT session contains `id`, `email`, `role`, `tier`; redirect to `/dashboard`
  - [ ] 5.2 Manual test: Google OAuth signin → same session guarantees
  - [ ] 5.3 Manual test: MEMBER tries `/admin` → redirected to `/dashboard` or `/`
  - [ ] 5.4 Manual test: unauthenticated tries `/dashboard` → redirected to `/auth/signin`
  - [ ] 5.5 Manual test: 11 rapid signin attempts from same IP → 429 response with exact French message
  - [ ] 5.6 Manual test: signout from dashboard → session cleared, redirect to `/`
  - [ ] 5.7 Regression test: email/password signup still works (Story 1.2)
  - [ ] 5.8 Regression test: Google OAuth signup still works (Story 1.1)

## Dev Notes

### Critical Gaps in Current Codebase

1. **Signout route does NOT exist** — `src/app/(dashboard)/layout.tsx` contains `<form action="/api/auth/signout" method="POST">` but there is no `src/app/api/auth/signout/route.ts`. Submitting this form results in a 404. The signout flow must be wired end-to-end.
2. **Signin page is basic and inconsistent** — `src/app/auth/signin/page.tsx` uses raw `useState` and manual `fetch`-like logic via `signIn("credentials", ...)`. Unlike the signup page (migrated to RHF+Zod in Story 1.2), the signin page lacks inline Zod validation, structured error handling, and consistent UX patterns.
3. **No rate limiting on signin** — Story 1.2 protected `/api/auth/signup` (5/min/IP). Story 1.3 must protect signin with 10/min/IP (NFR-S4). NextAuth's built-in credentials callback does not expose an easy rate-limit hook, so a custom `/api/auth/signin` route + client-side double-step is the pragmatic approach.
4. **No `/auth/signout` page** — `auth.config.ts` defines `signOut: "/auth/signout"` but no page exists at that path. If `signOut()` is called without `redirectTo`, Auth.js will redirect to a non-existent page.
5. **Admin layout lacks signout** — `src/app/(admin)/layout.tsx` does not have a signout button. Admins currently have no visible way to log out.

### Architecture Compliance

- **Auth.js split config (NON-NEGOTIABLE):**
  - `src/lib/auth.config.ts` → Edge Runtime, used by `src/middleware.ts`. **MUST NOT** import `PrismaAdapter`, `prisma`, or `bcrypt`. The `authorized` callback already handles role-based route protection. **Do not modify** unless a bug is found during verification.
  - `src/lib/auth.ts` → Node.js runtime. Already contains `Credentials` provider and `PrismaAdapter`. The `jwt` and `session` callbacks already embed `id`, `tier`, `role` into the token. `email` is preserved by Auth.js defaults. **Do not modify** these callbacks unless proven broken.
- **JWT session strategy** — The `jwt` callback in `auth.config.ts` adds `token.id`, `token.tier`, `token.role`. The `session` callback adds these to `session.user`. `email` and `name` remain from Auth.js defaults. This satisfies AC1.
- **Middleware route protection** — `src/middleware.ts` already uses `NextAuth(authConfig)` and the `authorized` callback handles:
  - `/admin/*` → requires `role === "ADMIN"`, otherwise redirect to `/`
  - `/dashboard/*` → requires authentication, otherwise redirect to `/auth/signin`
  - `/auth/signin` + `/auth/signup` → redirect authenticated users to `/dashboard`
  - `/api/auth/*` → public (excluded by matcher or treated as public in `authorized`)
- **Prisma client import** — Use `@/generated/prisma/client` (project convention).
- **Rate limiting library** — Reuse `@upstash/ratelimit` + `@upstash/redis` already installed in Story 1.2. Use `src/lib/rate-limit.ts` factory.
- **API response format** — Follow architecture pattern:
  - Success: `NextResponse.json({ data: T })`
  - Error: `NextResponse.json({ error: string, code?: string }, { status })`
- **Form handling** — React Hook Form + Zod (`src/lib/validations.ts`). `signinSchema` already exists.

### File Structure & What to Touch

| File | Action | Why |
|------|--------|-----|
| `src/app/auth/signin/page.tsx` | **UPDATE** | Migrate to RHF+Zod; add loading/error states; POST to custom signin API first |
| `src/app/api/auth/signin/route.ts` | **CREATE** | Custom credentials validation + rate limiting (10/60s/IP) |
| `src/app/api/auth/signin/route.test.ts` | **CREATE** | Tests for 200 success, 401 invalid, 429 rate limit, 400 validation |
| `src/app/auth/signout/page.tsx` | **CREATE** | Auth.js redirect target after signout; shows message and redirects to `/` |
| `src/app/(dashboard)/layout.tsx` | **UPDATE** | Fix broken signout form; wire to working signout mechanism |
| `src/app/(admin)/layout.tsx` | **UPDATE** | Add signout button/link |
| `src/lib/rate-limit.ts` | **READ-ONLY VERIFY** | Reuse `createRateLimiter` factory from Story 1.2; add a `signinRateLimiter` |
| `src/lib/validations.ts` | **READ-ONLY VERIFY** | `signinSchema` already exists; reuse with RHF resolver |
| `src/lib/auth.config.ts` | **READ-ONLY** | Verify `authorized` callback; do not modify unless bug found |
| `src/middleware.ts` | **READ-ONLY** | Verify matcher and authConfig import; do not modify |
| `src/lib/auth.ts` | **READ-ONLY** | Credentials provider and callbacks already work; do not modify |

### Technical Requirements

- **Library versions (already installed):**
  - `react-hook-form` v7.75.0 — form state management
  - `zod` v4.4.3 — schema validation
  - `@upstash/ratelimit` — sliding window rate limiting (installed in Story 1.2)
  - `@upstash/redis` — companion client
- **Rate limiter configuration:**
  - Reuse `createRateLimiter` from `src/lib/rate-limit.ts`
  - Window: 60 seconds
  - Max requests: 10 per IP
  - Identifier: `req.headers.get("x-forwarded-for")` or `req.ip` fallback
  - Error response: `{ error: "Trop de tentatives. Réessayez dans une minute." }` with status `429`
  - Graceful fallback when Upstash env vars are missing (local dev)
- **Custom `/api/auth/signin` route behavior:**
  - Accepts JSON body `{ email, password }`
  - Validates with `signinSchema` (Zod)
  - Checks rate limit via `signinRateLimiter`
  - Finds user via `prisma.user.findUnique({ where: { email } })`
  - Verifies `passwordHash` with `bcrypt.compare`
  - Returns 200 + `{ id, email, name, tier, role }`
  - Returns 401 + `{ error: "Email ou mot de passe incorrect." }` if invalid
  - Returns 429 + `{ error: "Trop de tentatives. Réessayez dans une minute." }` if rate limited
  - Returns 400 + `{ error: ..., details: ... }` if Zod validation fails
- **Signin page flow:**
  - `useForm<SigninInput>({ resolver: zodResolver(signinSchema) })`
  - On submit: `setLoading(true)`, POST `/api/auth/signin`
  - On 200: call `signIn("credentials", { email, password, callbackUrl: "/dashboard" })`
  - On 429/401: display inline error banner with exact French message
  - On Zod error: display inline field errors (RHF handles this automatically)
  - Google button: `signIn("google", { callbackUrl: "/dashboard" })` with `googleLoading` state
- **Signout flow:**
  - Client component approach (recommended for reliability):
    - Create `src/components/auth/sign-out-button.tsx` (small client component)
    - Uses `signOut({ redirectTo: "/" })` from `next-auth/react`
    - Rendered inside dashboard and admin layouts
  - Alternative (Server Action): define `async function signOutAction() { "use server"; await signOut({ redirectTo: "/" }); }` in layout and use `<form action={signOutAction}>`. Either approach is acceptable.
- **Signout page (`/auth/signout`):**
  - Simple server component or client component
  - Shows spinner + « Déconnexion en cours… »
  - Auto-redirects to `/` after 1 second (use `useEffect` + `setTimeout` or `redirect` if server)
  - This page is only hit if `signOut` is called without explicit `redirectTo`

### Current State of Files Being Modified

**`src/app/auth/signin/page.tsx` (today):**
```typescript
"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // ... manual form with basic inputs
  // calls signIn("credentials", { email, password, redirect: false })
  // on error: "Email ou mot de passe incorrect"
  // on success: window.location.href = "/dashboard"
}
```
**What changes:** Migrate to RHF+Zod; add custom API pre-check for rate limiting; preserve Google OAuth button; add `useSearchParams` error handling for OAuth errors (reuse pattern from signup page).

**`src/app/(dashboard)/layout.tsx` (today):**
```tsx
<form action="/api/auth/signout" method="POST">
  <button type="submit">🚪 Déconnexion</button>
</form>
```
**What changes:** This form POSTs to a non-existent route. Replace with a working signout mechanism (client component with `signOut` from `next-auth/react` or Server Action).

**`src/lib/auth.config.ts` (today):**
```typescript
authorized({ auth, request: { nextUrl } }) {
  const pathname = nextUrl.pathname;
  const isLoggedIn = !!auth?.user;
  const publicRoutes = ["/", "/pricing", "/auth/signin", "/auth/signup", "/auth/error"];
  const isPublic = publicRoutes.some((route) => pathname.startsWith(route)) || pathname.startsWith("/api/auth");

  if (pathname.startsWith("/admin")) {
    if (!isLoggedIn) return false;
    if ((auth?.user as unknown as Record<string, unknown>)?.role !== "ADMIN") {
      return Response.redirect(new URL("/", nextUrl));
    }
  }

  if (!isPublic && !pathname.startsWith("/api")) {
    if (!isLoggedIn) return false;
  }

  if (isLoggedIn && (pathname.startsWith("/auth/signin") || pathname.startsWith("/auth/signup"))) {
    return Response.redirect(new URL("/dashboard", nextUrl));
  }

  return true;
}
```
**What changes:** Likely NONE — this already satisfies AC2–4. Verify during Task 4 and only fix if a bug is discovered.

### Testing Requirements

- **Unit tests for signin API route (`src/app/api/auth/signin/route.test.ts`):**
  - Test: valid credentials → 200 + user data
  - Test: invalid password → 401 + exact French error message
  - Test: non-existent email → 401 + exact French error message
  - Test: 11th request from same IP → 429 + exact French error message
  - Test: missing body / invalid email format → 400 + Zod field errors
  - Test: graceful fallback when Upstash env vars missing → allows request
- **Component tests for signin page:**
  - Reuse existing test patterns from `src/app/auth/signup/page.test.tsx`
  - Test: form submission triggers POST to `/api/auth/signin`
  - Test: Zod validation errors render inline before API call
  - Test: 429 response renders exact French error banner
  - Test: 401 response renders exact French error banner
  - Test: Google OAuth button calls `signIn("google", ...)` with `callbackUrl: "/dashboard"`
  - Test: loading state disables both buttons during submission
- **Integration tests for middleware + role-based access:**
  - Test: unauthenticated request to `/dashboard` → redirect to `/auth/signin`
  - Test: MEMBER request to `/admin` → redirect to `/`
  - Test: ADMIN request to `/admin` → allowed (200)
  - Test: authenticated request to `/auth/signin` → redirect to `/dashboard`
- **Regression tests:**
  - Signup page (Story 1.2) still works
  - Google OAuth signup/signin (Story 1.1) still works
  - Rate limiting on signup (Story 1.2) still works
  - Middleware still protects all dashboard and admin routes

### Potential Pitfalls & Regression Prevention

- **DO NOT** import `PrismaAdapter`, `prisma`, or `bcrypt` into `auth.config.ts` — Edge runtime will crash and break all route protection.
- **DO NOT** modify the `jwt` or `session` callbacks in `auth.config.ts` — they already correctly propagate `id`, `tier`, `role`. Changing them risks breaking sessions for all auth methods.
- **DO NOT** modify `src/lib/auth.ts` Credentials provider logic — it already hashes with bcrypt and returns the correct user shape. The custom `/api/auth/signin` route should duplicate the lookup/compare logic, not replace it.
- **DO NOT** create a Subscription in any signin/signout flow — subscription lifecycle belongs to Epic 2.
- **DO NOT** break the Google OAuth button or `useSearchParams` error handling patterns established in Story 1.1.
- **DO NOT** remove Stripe/CinetPay files or dependencies — belongs to Story 2.1.
- **Watch out for Next.js 16 cache corruption** after any code changes. If the dev server throws cryptic errors, run `rm -rf .next` and restart.
- **If Upstash env vars are missing**, the rate limiter should gracefully fall back to allowing requests (with a console warning) so local development isn't blocked. This behavior is already implemented in `src/lib/rate-limit.ts` from Story 1.2.
- **Ensure the `/api/auth/signin` route does not conflict with NextAuth's internal `/api/auth/callback/credentials`** — they are separate paths. The signin page calls your custom route first, then NextAuth's callback.
- **The `signOut` page (`/auth/signout`) should handle both client-initiated and server-initiated redirects gracefully** — use `useEffect` + `window.location` on the client, or `redirect("/")` on the server.

### Scope Boundaries (What NOT to do)

- **Do NOT** remove Stripe/CinetPay files or dependencies — belongs to Story 2.1
- **Do NOT** modify `PaymentProvider` enum or `Subscription` model — belongs to Story 2.1
- **Do NOT** add CSP/security headers — belongs to Story 1.6
- **Do NOT** modify `next.config.ts` for standalone output — belongs to Story 1.7
- **Do NOT** build new dashboard features — just ensure signin redirect lands there
- **Do NOT** implement profile editing — belongs to Story 1.4
- **Do NOT** send transactional emails — belongs to Story 2.5
- **Do NOT** change the existing `[...nextauth]/route.ts` unless absolutely necessary

### Environment Variables

Required (already present in `.env.local` as placeholders):
```
NEXTAUTH_URL=
NEXTAUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
UPSTASH_REDIS_REST_URL=<from Upstash console>
UPSTASH_REDIS_REST_TOKEN=<from Upstash console>
```
If Upstash env vars are missing in local dev, the rate limiter falls back to permissive mode with a console warning (behavior from Story 1.2).

### Previous Story Intelligence

**From Story 1.1 (Inscription via Google OAuth):**
- NextAuth v5 config merge: use single-object spread `{ ...authConfig, adapter: PrismaAdapter(prisma), providers: [...] }` — NOT two-argument `NextAuth(authConfig, { ... })` which causes TS2554.
- OAuth error handling: use `useSearchParams` from `next/navigation` (not `useEffect` + `window.location.search`) to avoid React Compiler lint violations.
- `src/lib/oauth-errors.ts` was created for testable French OAuth error mapping — reuse it on the signin page.
- `avatarUrl` → `image` schema rename was done; all references updated.

**From Story 1.2 (Inscription avec Email et Mot de Passe):**
- React Hook Form + Zod migration pattern: `useForm<SignupInput>({ resolver: zodResolver(signupSchema), mode: "onBlur" })`.
- Rate limiting pattern: `src/lib/rate-limit.ts` with `createRateLimiter()` factory and graceful fallback.
- Vitest + jsdom + `@testing-library/react/jest-dom` testing stack is set up and working.
- `vi.hoisted()` pattern must be used for mock factories to avoid Vitest hoisting issues.
- `tsconfig.json` excludes `vitest.config.ts` from type-check to avoid internal vitest type resolution issues.
- The signup route removed Subscription creation (P0 blocker). Do not reintroduce it.

### Git Intelligence

Recent commits show the following patterns:
- `feat(auth): Story 1.1 — Inscription via Google OAuth` — added PrismaAdapter, renamed `avatarUrl`→`image`, updated signup page
- `bmad-create-story: Story 1.2` — story file creation commit
- `feat(auth): Story 1.2 — Inscription avec Email et Mot de Passe` — added RHF+Zod signup, rate limiting, vitest setup
- `fix(review): remove any cast in rate-limit.test.ts` — CR fix style: remove `any`, use proper types
- `chore: mark Story 1.2 as done in sprint-status` — status update pattern

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 1 / Story 1.3]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — Auth.js Split Config, JWT Sessions, Middleware, Rate Limiting (Upstash), API Patterns, Form Handling (RHF + Zod)]
- [Source: `_bmad-output/planning-artifacts/prd.md` — FR5, FR6, NFR-P3, NFR-S4, NFR-S5]
- [Source: `src/lib/auth.config.ts` — Edge auth config with jwt/session/authorized callbacks]
- [Source: `src/lib/auth.ts` — Node.js auth instance with Credentials provider and PrismaAdapter]
- [Source: `src/middleware.ts` — NextAuth middleware using authConfig only]
- [Source: `src/app/auth/signin/page.tsx` — Current basic signin page (to be hardened)]
- [Source: `src/app/(dashboard)/layout.tsx` — Dashboard layout with broken signout form]
- [Source: `src/app/(admin)/layout.tsx` — Admin layout (no signout button)]
- [Source: `src/lib/validations.ts` — Existing `signinSchema`]
- [Source: `src/lib/rate-limit.ts` — Rate limiter factory from Story 1.2]
- [Source: `src/lib/oauth-errors.ts` — French OAuth error mapper from Story 1.1]
- [Source: `prisma/schema.prisma` — User model with `role`, `tier`, `email` defaults]

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
