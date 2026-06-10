# Investigation: Google OAuth production authentication error

## Hand-off Brief

1. **What happened.** Production Google OAuth redirects to the Auth.js error page; VPS logs confirm Auth.js/Prisma fails because `emailVerified` is sent as `null` while the Prisma schema requires `Boolean`.
2. **Where the case stands.** Status: Concluded with high confidence; Google/NEXTAUTH env values are present, and PM2 logs show the exact adapter failure.
3. **What's needed next.** Deploy a build that includes the PrismaAdapter `emailVerified: false` normalization and verify Google sign-in again.

## Case Info

| Field | Value |
| --- | --- |
| Ticket | N/A |
| Date opened | 2026-05-28 |
| Status | Concluded |
| System | Next.js/Auth.js production deployment on Hetzner, domain `ivoire-business-club.com` |
| Evidence sources | User report, story 6.6 deployment log, `scripts/DEPLOY.md`, Auth.js config, Prisma schema, VPS PM2 logs |

## Problem Statement

User reports that after deployment on Hetzner, every Google OAuth sign-in attempt lands on the authentication error page. Browser URL includes `error=Configuration`; browser console also shows repeated extension-style asynchronous listener errors.

## Evidence Inventory

| Source | Status | Notes |
| --- | --- | --- |
| User report | Available | `error=Configuration` is the symptom. |
| `_bmad-output/implementation-artifacts/6-6-preparation-deploiement-production.md` | Available | Deployment log originally said Google OAuth variables were empty. |
| `scripts/DEPLOY.md` | Available | Runbook records a P0 Auth.js/Prisma `emailVerified` issue. |
| `src/lib/auth.ts` | Available | Current source has a `patchPrismaAdapter` direction. |
| `prisma/schema.prisma` | Available | `emailVerified` is `Boolean @default(false)`, not Auth.js default nullable date shape. |
| VPS `.env` | Available | Length checks show Google/NEXTAUTH/DATABASE variables are present. |
| VPS PM2 logs | Available | Logs show `PrismaClientValidationError: Argument emailVerified must not be null`. |

## Investigation Backlog

| # | Path to Explore | Priority | Status | Notes |
| - | --- | --- | --- | --- |
| 1 | Confirm production `.env` contains non-empty OAuth variables | High | Done | Lengths: `NEXTAUTH_URL 32`, `NEXTAUTH_SECRET 64`, `GOOGLE_CLIENT_ID 72`, `GOOGLE_CLIENT_SECRET 35`, `DATABASE_URL 124`. |
| 2 | Confirm Google Cloud OAuth authorized redirect URI | High | Open | Must include `https://ivoire-business-club.com/api/auth/callback/google`; still worth verifying before final retest. |
| 3 | Inspect PM2 logs during OAuth | High | Done | Logs show `PrismaClientValidationError: Argument emailVerified must not be null`. |
| 4 | Add regression coverage for `patchPrismaAdapter` | Medium | In Progress | Local test added in `src/lib/auth.test.ts`; local execution blocked by broken Windows npm. |
| 5 | Redeploy a corrected standalone artifact | High | Open | PM2 currently runs release `20260525205929`; `/current` points to `20260525213632`. |

## Timeline of Events

| Time | Event | Source | Confidence |
| --- | --- | --- | --- |
| 2026-05-25 | Production go-live recorded with Google OAuth variables empty. | `_bmad-output/implementation-artifacts/6-6-preparation-deploiement-production.md:442` | Confirmed |
| 2026-05-25 | Deployment runbook records P0 Google OAuth broken due to Prisma `emailVerified: null`. | `scripts/DEPLOY.md:1203` | Confirmed |
| 2026-05-25 21:24:46 UTC | PM2 logs show Auth.js `AdapterError` caused by `Argument emailVerified must not be null`. | VPS PM2 error log | Confirmed |
| 2026-05-28 | User reports recurring Auth.js `error=Configuration` in production. | User report | Confirmed |
| 2026-05-28 | SSH diagnostic confirms OAuth env values are present in production `.env`. | VPS command output | Confirmed |
| 2026-05-28 | Server request to `/api/auth/signin/google` returns `302` to `/auth/error?error=Configuration`. | VPS curl output | Confirmed |

## Confirmed Findings

### Finding 1: Production env values are present now

**Evidence:** VPS length check on `/var/www/ibc/current/.env` and release `.env`.

**Detail:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, and `DATABASE_URL` all have non-zero lengths.

### Finding 2: Auth.js Google provider depends directly on those variables

**Evidence:** `src/lib/auth.ts:34`, `src/lib/auth.ts:36`, `src/lib/auth.ts:37`

**Detail:** The Google provider is initialized from `process.env.GOOGLE_CLIENT_ID` and `process.env.GOOGLE_CLIENT_SECRET`.

### Finding 3: The runbook records the same P0 OAuth blocker around `emailVerified`

**Evidence:** `scripts/DEPLOY.md:1203`, `scripts/DEPLOY.md:1205`, `scripts/DEPLOY.md:1206`

**Detail:** During Google OAuth user creation, Auth.js/Prisma can send `emailVerified: null` while the Prisma schema requires a non-null boolean.

### Finding 4: Production logs confirm the `emailVerified` Prisma validation failure

**Evidence:** VPS PM2 error log `/var/www/ibc/releases/20260525205929/logs/ibc-app-error.log`.

**Detail:** Auth.js reports `AdapterError`; the cause is `PrismaClientValidationError` for `prisma.user.create()` with `Argument emailVerified must not be null`.

### Finding 5: PM2 is executing an older release path

**Evidence:** `pm2 describe ibc-app` on VPS.

**Detail:** PM2 script path and cwd point to `/var/www/ibc/releases/20260525205929`, while `/var/www/ibc/current` points to `/var/www/ibc/releases/20260525213632`.

## Deduced Conclusions

### Deduction 1: Missing Google credentials are no longer the active blocker

**Based on:** Findings 1 and 2.

**Reasoning:** The original deployment note said Google credentials were empty, but the VPS now shows non-empty values for Google and NEXTAUTH env variables.

**Conclusion:** Keep Google Cloud callback settings on the checklist, but the confirmed runtime failure is the Prisma adapter/schema mismatch.

### Deduction 2: The required fix is to deploy an artifact containing `emailVerified` normalization

**Based on:** Findings 3, 4, and 5.

**Reasoning:** The active production logs show the exact `emailVerified` failure. Current source has a patch direction, but production must be rebuilt/redeployed and PM2 must start from `/var/www/ibc/current`.

**Conclusion:** Use the BMAD quick-dev/hotfix flow: test the adapter patch, rebuild deploy artifact, transfer a new release, repoint `/var/www/ibc/current`, reload PM2 from `/current`, and retest OAuth.

## Hypothesized Paths

### Hypothesis 1: Missing Google OAuth env variables cause the current `error=Configuration`

**Status:** Refuted as current active cause.

**Resolution:** VPS env length checks show the fields are now populated.

### Hypothesis 2: Prisma/Auth.js `emailVerified` mismatch is the active blocker

**Status:** Confirmed.

**Resolution:** PM2 logs show `PrismaClientValidationError: Argument emailVerified must not be null`.

## Missing Evidence

| Gap | Impact | How to Obtain |
| --- | --- | --- |
| Google Cloud OAuth client authorized origins/redirects | Confirms Google-side callback configuration | Check Google Cloud Console OAuth client settings. |
| Local test result | Confirms the regression test passes before deploy | Fix local npm or run tests in a clean CI/workspace. |

## Source Code Trace

| Element | Detail |
| --- | --- |
| Error origin | Auth.js redirects to `/auth/error?error=Configuration` after adapter failure. |
| Trigger | User clicks Google sign-in from `src/app/auth/signin/page.tsx` or signup page. |
| Condition | First-time Google user creation sends `emailVerified: null` to Prisma. |
| Related files | `src/lib/auth.ts`, `src/lib/auth.test.ts`, `prisma/schema.prisma`, `scripts/DEPLOY.md` |

## Conclusion

**Confidence:** High

The active root cause is the Auth.js Prisma adapter sending `emailVerified: null` into `prisma.user.create()` while `prisma/schema.prisma` defines `emailVerified Boolean @default(false)`. Production env values for Google/NEXTAUTH are present, so the original empty-env theory is no longer the active blocker. The browser console message about an asynchronous listener is not strong evidence for the auth failure; the PM2 server logs are decisive.

## Recommended Next Steps

### Fix direction

1. Keep the current `patchPrismaAdapter` direction, but ensure it is covered by a regression test and included in the deployed standalone bundle.
2. Build and deploy a fresh release; ensure PM2 starts from `/var/www/ibc/current`, not the older release path.
3. Retest Google OAuth and inspect PM2 logs for absence of `AdapterError` / `emailVerified`.

### Diagnostic

Before final validation, verify Google Cloud has `https://ivoire-business-club.com/api/auth/callback/google` configured as an authorized redirect URI.

## Reproduction Plan

1. Trigger Google OAuth once in production.
2. Immediately collect PM2 logs.
3. Confirm no new `AdapterError` or `Argument emailVerified must not be null` entries appear.

## Side Findings

- The UI maps `Configuration` to a specific French OAuth configuration message on signin/signup, but `/auth/error` currently displays a generic message.
- PM2 process env does not show app secrets in `/proc/<pid>/environ`; the application appears to rely on standalone `.env` loading through the symlink.
