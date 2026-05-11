# Code Review — Ivoire Business Club

**Date**: 2026-05-11
**Reviewer**: BMAD automated review (3 lenses)
**Project**: Ivoire Business Club (IBC) — Next.js 16 + TypeScript + Prisma 7

---

## Lens 1: Architecture & Design ✅

### Strengths
- **Clean route groups**: `(public)`, `(dashboard)`, `(admin)` with separate layouts
- **Prisma 7** with SQLite adapter (better-sqlite3) correctly configured
- **Auth.js v5** with middleware route protection
- **Dual payment integration** (Stripe EUR + CinetPay CFA) cleanly separated
- **Proper separation**: API routes, server components, and client components well delineated
- **SEO metadata** with title templates and OG tags

### Issues Found
1. **No CSRF protection** on admin form submissions (using native HTML forms)
2. **Member list shows ALL verified users** without pagination — will scale poorly (1000+ members)
3. **Dashboard and admin layouts duplicate auth checks** — could be DRYed with a shared `requireAuth()` utility
4. **Stripe webhook uses `@ts-nocheck`** — temporary workaround for Stripe v22 types, should be fixed when Stripe updates their types

### Recommendations
- Add `OFFSET/LIMIT` pagination on `/members` and `/admin/members`
- Extract `requireAuth()` + `requireAdmin()` helpers from repeated auth patterns
- Add rate limiting middleware on `/api/auth/signup` to prevent abuse

---

## Lens 2: Security ⚠️

### Strengths
- Passwords hashed with bcrypt (12 rounds)
- Auth middleware protects dashboard and admin routes
- Admin role check on all admin pages and API routes
- Input validation with Zod on signup

### Critical Issues
1. **NEXTAUTH_SECRET is required** — app will crash in production without it. Need fallback or startup check.
2. **No rate limiting on signup endpoint** — open to brute force / spam
3. **Admin API routes use `formData()` parsing** but the frontend uses native `<form action>` which is fine, but there's no CSRF token validation
4. **CinetPay webhook signature verification** is a placeholder (`return true`) — MUST be implemented before production
5. **Stripe webhook** correctly validates signatures ✅

### Recommendations
- Add `next-rate-limit` or similar middleware on auth endpoints
- Implement CinetPay HMAC signature verification before going live
- Add `NEXTAUTH_SECRET` validation check at startup
- Consider adding CAPTCHA to signup form

---

## Lens 3: Code Quality & DX ✅

### Strengths
- **18 git commits**, one per story/epic — clean history
- **Consistent French localization** throughout the app
- **Consistent naming**: files, routes, variables match domain language
- **Component structure** follows Next.js App Router conventions
- **shadcn/ui** used consistently for UI primitives

### Issues Found
1. **Prisma generated files committed** — should be in `.gitignore` (already added, but existing files were committed)
2. **No seed data** — developer experience would benefit from a `prisma/seed.ts` script
3. **No test files** — no unit or integration tests yet
4. **Stripe `apiVersion`** hardcoded to `"2026-04-22.dahlia"` — should match actual Stripe account version
5. **Client components** on pages that could be server components (pricing page, signup/signin pages)

### Recommendations
- Add `prisma/seed.ts` with sample data for dev
- Convert pricing page to server component (currently `"use client"` just for toggle state)
- Add Playwright or Cypress for E2E tests
- Add `.env.example` with all required environment variables documented

---

## Summary

| Lens | Status | Critical Issues |
|------|--------|----------------|
| Architecture | ✅ Pass | 0 critical, 4 minor |
| Security | ⚠️ Warning | 2 critical (rate limiting, CinetPay placeholder) |
| Code Quality | ✅ Pass | 0 critical, 5 minor |

**Overall**: Production-ready with caveats. Must fix CinetPay webhook verification and add rate limiting before launch. All other issues are nice-to-haves.

### Action Items Before Launch
1. **P0**: Implement CinetPay webhook signature verification
2. **P0**: Add rate limiting on `/api/auth/signup`
3. **P1**: Add `NEXTAUTH_SECRET` startup validation
4. **P1**: Add pagination to member lists
5. **P2**: Add seed data script
6. **P2**: Add `.env.example`
7. **P2**: Add E2E tests