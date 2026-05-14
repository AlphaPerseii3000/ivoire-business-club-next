---
Story: "2.5"
StoryKey: "2-5-suivi-des-statuts-dabonnement-et-notifications"
Title: "Suivi des Statuts d'Abonnement et Notifications"
Status: done
Priority: "P0"
Epic: "Epic 2 — Tiers et Paiement par Virement Bancaire"
FRs: ["FR13", "FR14"]
NFRs: ["NFR-I1", "NFR-I2", "NFR-S5", "NFR-S8", "NFR-A1", "NFR-A3"]
Created: "2026-05-14"
---

# Story 2.5: Suivi des Statuts d'Abonnement et Notifications

Status: done

<!-- Completion note: Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As a member,
I want to track my subscription status and receive clear notifications,
so that I know when I can access premium content.

## Acceptance Criteria

1. **Profile shows the subscription lifecycle with timestamps**
   - Given a member with a `TRIAL` or `PENDING` subscription,
   - When they consult `/profile`,
   - Then the existing `SubscriptionStatusTracker` displays the vertical lifecycle `TRIAL` completed → `PENDING` current/pulsing → `ACTIVE` pending.
   - And each visible lifecycle step includes a human-readable French timestamp when the corresponding date exists.
   - And the profile remains protected by the existing authenticated dashboard route guard.

2. **Pending members can contact support after 24h**
   - Given a member with a `PENDING` subscription whose `createdAt` or submission timestamp is older than 24 hours,
   - When they consult `/profile`,
   - Then a CTA `Contacter le support` appears below the tracker.
   - And the CTA opens a WhatsApp deep link with a prefilled French support message containing the subscription reference when available.
   - And the CTA is not shown before the 24h threshold.

3. **Activation email remains sent once through the admin validation path**
   - Given a member whose subscription passes from `PENDING` to `ACTIVE`,
   - When the admin validates the bank transfer through the Story 2.4 admin endpoint,
   - Then the member receives the existing Resend email with the copy `Votre abonnement IBC [Tier] est activé. Bienvenue dans le club !`.
   - And this story must not introduce a second email send path or duplicate activation emails.

4. **Activation creates an in-app celebration/notification**
   - Given a member with a recently activated `ACTIVE` subscription,
   - When they load `/dashboard` or `/profile`,
   - Then an in-app notification or celebration banner appears with French copy, the activated tier badge, and a clear next action such as `Découvrir les deals`.
   - And the visual celebration respects `prefers-reduced-motion` and can be dismissed without hiding the actual subscription status.

5. **Invalid subscriptions are blocked from premium deal content**
   - Given a member with no active subscription, or with `TRIAL`, `PENDING`, `CANCELLED`, or `PAST_DUE`,
   - When they try to access premium deal content,
   - Then an overlay or blocking panel informs them: `Votre abonnement est inactif. Renouvelez pour accéder aux deals.`
   - And the panel includes a CTA to `/pricing`.
   - And premium access is based on `src/lib/subscription-access.ts`, not on `User.tier` alone.

## Tasks / Subtasks

- [ ] Extend subscription status display on member profile (AC: 1, 2)
  - [ ] Update `src/app/(dashboard)/profile/page.tsx` to fetch the current user's latest subscription ordered by `createdAt desc` and pass it into the profile UI.
  - [ ] Reuse and extend `src/components/subscription-status-tracker.tsx`; do **not** create a second tracker component.
  - [ ] Add optional props such as `submittedAt`, `validatedAt`, `cancelledAt`, and/or a generic step timestamp map, then render timestamps with `toLocaleDateString("fr-FR")` plus time if useful.
  - [ ] Preserve the current profile header, avatar upload, tier badge, verification badge, and `ProfileEditForm` behavior.
  - [ ] Show clear French copy for `TRIAL`, `PENDING`, `ACTIVE`, `CANCELLED`, and `PAST_DUE`; the three-step tracker is required for the TRIAL/PENDING/ACTIVE lifecycle, while invalid states may use an explanatory banner.
  - [ ] If no subscription exists, show a friendly empty state with CTA to `/pricing`; do not fabricate a `TRIAL` subscription.

- [ ] Add the 24h pending support CTA via WhatsApp (AC: 2)
  - [ ] Compute the 24h threshold server-side from the subscription submission time (`createdAt` is the current available source of truth).
  - [ ] Create a small helper if needed, e.g. `src/lib/whatsapp.ts`, to generate `https://wa.me/<number>?text=<encoded message>` safely.
  - [ ] Source the support number from an environment variable such as `NEXT_PUBLIC_SUPPORT_WHATSAPP` or `SUPPORT_WHATSAPP_NUMBER`; document the chosen variable in `.env.example` without inline comments after values.
  - [ ] If no support number is configured, render a non-dead-end fallback in French (for example support email text or a disabled CTA with explanation) rather than a broken link.
  - [ ] Include the provider reference (`IBC-{userId}-{tier}`) in the prefilled message when `subscription.providerRef` exists.
  - [ ] Ensure the link has an accessible label and opens in a new tab/app without replacing the IBC session.

- [ ] Preserve and verify the Story 2.4 email path, do not duplicate it (AC: 3)
  - [ ] Keep activation email sending in `src/app/api/admin/subscriptions/[id]/route.ts` through `sendSubscriptionActivatedEmail`; do not send activation emails from `/profile`, `/dashboard`, polling, or client components.
  - [ ] Add or update focused tests for `src/lib/email.ts` or the admin route to assert the exact French activation copy includes the tier label and `Bienvenue dans le club !`.
  - [ ] If the current admin route returns a `500` after updating the subscription when email sending fails, decide deliberately whether to preserve that behavior for Story 2.5 or adjust it with tests; do not accidentally create inconsistent DB/email behavior.
  - [ ] Never expose Resend API keys, stack traces, bank details, or raw internal errors in UI or API responses.

- [ ] Implement lightweight in-app activation notification/celebration (AC: 4)
  - [ ] Prefer deriving the notification from existing subscription state (`status = ACTIVE`, latest subscription, recent `updatedAt`) instead of adding a broad notification center or event bus.
  - [ ] Create a reusable client component if needed, e.g. `src/components/subscription-activation-notice.tsx`, for dismissible local UI state and animation.
  - [ ] Render the notice on `/dashboard` and/or `/profile`; both pages already fetch the member and latest subscription, so avoid duplicate client fetches.
  - [ ] Use `getTierBadgeConfig()` for the tier badge and route the primary CTA to `/opportunities` or `/dashboard` according to the page context.
  - [ ] Use accessible motion: no essential information conveyed by animation only; support `motion-reduce:` / `prefers-reduced-motion`.
  - [ ] Persist dismissal in `localStorage` keyed by subscription id if using a client component, so the celebration does not reappear every navigation while the status remains visible.

- [ ] Gate premium deal content with the existing subscription-access helper (AC: 5)
  - [ ] Use `getUserPremiumAccess()` or `hasActiveSubscription()` from `src/lib/subscription-access.ts`; do not check `User.tier` alone.
  - [ ] Update `src/app/(dashboard)/opportunities/page.tsx` so non-active members see a blocking overlay/panel with `Votre abonnement est inactif. Renouvelez pour accéder aux deals.` and a CTA to `/pricing` before sensitive/premium deal details are exposed.
  - [ ] Update `src/app/(dashboard)/opportunities/[id]/page.tsx` so non-active members cannot read premium deal details. Allow authors/admins to access their own administrative/editing context only if explicitly needed and covered by tests.
  - [ ] Keep the implementation minimal for Epic 2: do not build the full Epic 3 tier-visibility model, public teaser feed, `visibilityTier`, or legal-document access rules unless already required by existing code.
  - [ ] Preserve existing authenticated route redirects and do not loosen middleware protection.

- [ ] Add tests and run verification (AC: 1, 2, 3, 4, 5)
  - [ ] Add/extend tests for `SubscriptionStatusTracker` covering timestamps, PENDING pulse/current state, ACTIVE completed state, and invalid statuses if represented.
  - [ ] Add/extend tests for `/profile` or extracted profile subscription component: tracker renders, 24h support CTA appears only after threshold, no subscription empty state appears correctly.
  - [ ] Add tests for activation notice dismissal and reduced-motion-safe content if implemented as a client component.
  - [ ] Add tests for opportunity gating: active member sees premium content; `TRIAL`, `PENDING`, `CANCELLED`, `PAST_DUE`, and no subscription users see the inactive overlay and `/pricing` CTA.
  - [ ] Keep existing Story 2.4 tests green, especially admin subscription validation/refusal/suspension route tests.
  - [ ] Run `npx vitest run`.
  - [ ] Run `npm run build`.

### Review Findings

- [x] [Review][Patch] Activation celebration notice initialized from `window.localStorage` during render, creating an SSR/client hydration mismatch risk [src/components/subscription-activation-notice.tsx:24] — fixed by deferring storage reads to `useEffect`, rendering deterministically until hydration, and keeping dismissal functional if storage is unavailable.
- [x] [Review][Patch] New activation notice render checks used boolean `&&` inside JSX conditions despite the Next.js 16 strict guardrail [src/app/(dashboard)/dashboard/page.tsx:48, src/app/(dashboard)/profile/page.tsx:122] — fixed by precomputing a nullable subscription and using explicit ternary rendering.
- [x] [Review][Patch] Prisma BetterSqlite3 adapter consumed raw relative `DATABASE_URL` even though Prisma 7 adapter runtime requires an absolute SQLite file path [src/lib/prisma.ts:9] — fixed by normalizing `file:` URLs to absolute paths before adapter creation.

## Dev Notes

### Critical product context

Epic 2 exists to complete the bank-transfer subscription loop: members choose a tier, confirm they sent a transfer to KS Investment, admins validate receipt manually, and members only access premium content after activation. Story 2.5 is member-facing closure for that loop: status transparency, post-24h support, activation celebration, and premium-content gating. [Source: `_bmad-output/planning-artifacts/epics.md#Epic-2-Tiers-et-Paiement-par-Virement-Bancaire`]

### Requirements traced to PRD / Epic / UX

- FR13 maps to activation confirmation email. Story 2.4 already implemented `sendSubscriptionActivatedEmail`; Story 2.5 must verify and preserve that path, not duplicate it. [Source: `_bmad-output/planning-artifacts/prd.md#8.2-Tiers--Abonnements`, `src/app/api/admin/subscriptions/[id]/route.ts`]
- FR14 maps to blocking premium content for invalid subscriptions. The existing helper returns true only for `ACTIVE`; wire it into member-facing deal content. [Source: `_bmad-output/planning-artifacts/prd.md#8.2-Tiers--Abonnements`, `src/lib/subscription-access.ts`]
- UX requires subscription pending states to be reassuring, never dead ends: vertical tracker, `Nous validons votre virement sous 24h`, and support CTA after 24h. [Source: `_bmad-output/planning-artifacts/ux-spec.md#14.5-Pending--Waiting-States`]
- UX requires in-app success feedback and activation celebration with tier badge while respecting reduced motion. [Source: `_bmad-output/planning-artifacts/ux-spec.md#14.4-Success-States`, `_bmad-output/planning-artifacts/ux-spec.md#13.3-Accessibility-Strategy`]
- NFR-I1 requires WhatsApp deep links to work on mobile and desktop. [Source: `_bmad-output/planning-artifacts/prd.md#9.6-Intégration--Compatibilité`]
- NFR-I2 requires transactional emails via Resend/SendGrid; architecture standardizes on Resend. [Source: `_bmad-output/planning-artifacts/architecture.md#Integration-Points`]
- NFR-S5 requires protected dashboard/admin/API routes; do not weaken route guards while adding subscription checks. [Source: `_bmad-output/planning-artifacts/prd.md#9.2-Sécurité`]

### Existing implementation state to reuse, not reinvent

- `src/components/subscription-status-tracker.tsx` already exists and renders `TRIAL → PENDING → ACTIVE` vertically with a pulsing amber dot for `PENDING`. Extend it with timestamps and invalid-state support; do not create a duplicate tracker. [Source: `src/components/subscription-status-tracker.tsx`]
- `src/app/(dashboard)/profile/page.tsx` currently renders profile header, avatar upload, tier badge, verification badge, and `ProfileEditForm`, but it does not fetch or display subscriptions. Add subscription UI without regressing profile editing. [Source: `src/app/(dashboard)/profile/page.tsx`]
- `src/app/(dashboard)/dashboard/page.tsx` already fetches the latest subscription and displays a basic status card, but its `statusLabel` currently omits `PENDING`. It is a good place for the activation notice and status-label correction. [Source: `src/app/(dashboard)/dashboard/page.tsx`]
- `src/app/api/subscriptions/route.ts` already exposes authenticated `GET` for the member's subscriptions and `POST` for bank-transfer submissions. Story 2.4 normalized the submission status to `PENDING`. Reuse this lifecycle. [Source: `src/app/api/subscriptions/route.ts`]
- `src/lib/subscription-access.ts` already provides `hasActiveSubscription(userId)` and `getUserPremiumAccess(userId)` with tests. Use this as the source of truth for premium access. [Source: `src/lib/subscription-access.ts`, `src/lib/subscription-access.test.ts`]
- `src/lib/email.ts` already wraps Resend and contains the exact activation body copy. Do not introduce another email module or direct `new Resend()` calls elsewhere. [Source: `src/lib/email.ts`]
- `src/app/api/admin/subscriptions/[id]/route.ts` already validates subscriptions, updates payment state, and sends activation/refusal emails. Do not move email sending into the client. [Source: `src/app/api/admin/subscriptions/[id]/route.ts`]
- `src/lib/tier-config.ts` and `src/lib/bank-transfer-config.ts` are the sources of truth for tier labels, badge classes, and amounts. Use `getTierBadgeConfig()` and `getAmountForTier()` rather than hardcoding tier labels/prices. [Source: `src/lib/tier-config.ts`, `src/lib/bank-transfer-config.ts`]
- `src/app/(dashboard)/opportunities/page.tsx` and `src/app/(dashboard)/opportunities/[id]/page.tsx` currently expose opportunity details to any authenticated member. Story 2.5 must add the first premium access gate there while keeping Epic 3 tier-visibility rules out of scope. [Source: `src/app/(dashboard)/opportunities/page.tsx`, `src/app/(dashboard)/opportunities/[id]/page.tsx`]

### Current files likely to create or modify and what to preserve

- `src/components/subscription-status-tracker.tsx` (UPDATE)
  - Current state: vertical `TRIAL → PENDING → ACTIVE` tracker, PENDING pulse, no timestamps.
  - Change: add timestamp rendering and clearer invalid/final-state handling.
  - Preserve: current import path and usage from `BankTransferInstructions`; do not break Story 2.3/2.4 tests.

- `src/app/(dashboard)/profile/page.tsx` (UPDATE)
  - Current state: profile details only.
  - Change: fetch latest subscription and render tracker/support CTA/invalid-state message.
  - Preserve: avatar upload, edit form, authenticated redirect, profile badges.

- `src/app/(dashboard)/dashboard/page.tsx` (UPDATE)
  - Current state: basic subscription status card, no `PENDING` label, no celebration.
  - Change: correct status labels and show activation notice when appropriate.
  - Preserve: existing quick actions and `/pricing` CTA for no subscription/TRIAL.

- `src/components/subscription-activation-notice.tsx` (NEW, recommended)
  - Purpose: dismissible in-app activation celebration with tier badge and CTA.
  - Preserve: no server secrets, no email sends, reduced-motion-safe UI.

- `src/lib/whatsapp.ts` (NEW, optional)
  - Purpose: safely build WhatsApp support deep links and encode messages.
  - Preserve: no WhatsApp Business API; deep links only.

- `.env.example` (UPDATE only if support WhatsApp env var is introduced)
  - Current state: already contains Resend-related env from previous stories.
  - Change: add one support contact variable if needed, with empty value and no inline comments after the value.

- `src/app/(dashboard)/opportunities/page.tsx` (UPDATE)
  - Current state: lists all opportunities and shows description/amount/status/author to authenticated users.
  - Change: gate premium details for non-active users; show inactive overlay and `/pricing` CTA.
  - Preserve: authenticated redirect and existing opportunity list behavior for active users.

- `src/app/(dashboard)/opportunities/[id]/page.tsx` (UPDATE)
  - Current state: details are readable by any authenticated user.
  - Change: block premium details for non-active users with the required inactive copy and pricing CTA.
  - Preserve: `notFound()` for missing opportunities and author controls unless intentionally changed/tested.

- Tests likely to add/update:
  - `src/components/subscription-status-tracker.test.tsx` (NEW or UPDATE if created)
  - `src/components/subscription-activation-notice.test.tsx` (NEW if component created)
  - `src/app/(dashboard)/profile/page.test.tsx` or extracted component test (NEW)
  - `src/app/(dashboard)/opportunities/page.test.tsx` and `[id]/page.test.tsx` (NEW or UPDATE)
  - `src/lib/email.test.ts` or admin route test enhancement (NEW/UPDATE)

### Architecture and coding guardrails

- Framework: Next.js `16.2.6` with App Router and React `19.2.4`. Use Server Components for DB/auth reads; use Client Components only for dismissible notices, local UI state, or browser APIs such as `localStorage`. [Source: `_bmad-output/planning-artifacts/architecture.md#Technical-Constraints--Dependencies`, `package.json`]
- Auth: server pages/routes may import `auth` from `@/lib/auth`; middleware must remain Edge-safe and must not import Prisma/bcrypt. Do not alter auth architecture for this story. [Source: `_bmad-output/planning-artifacts/architecture.md#Authentication--Security`]
- Prisma: DB access goes through `src/lib/prisma.ts`. Prisma client is generated under `src/generated/prisma`; do not use raw SQL or direct DB drivers in app code. [Source: `_bmad-output/planning-artifacts/architecture.md#Data-Boundaries`]
- API/side effects: Route Handlers return `{ data }` on success and `{ error, code?, details? }` on errors. Use `try/catch`, Zod validation where accepting input, and sanitized logging. [Source: `_bmad-output/planning-artifacts/architecture.md#API--Communication-Patterns`]
- Payments: `BANK_TRANSFER` only. Do not add Stripe, CinetPay, checkout, webhook, card-payment SDK, or placeholder payment-provider code. [Source: `_bmad-output/planning-artifacts/architecture.md#Implementation-Handoff`]
- Emails: use `src/lib/email.ts` only. Tests must mock email helpers or Resend; never call Resend in tests. [Source: `src/lib/email.ts`, `src/app/api/admin/subscriptions/[id]/route.test.ts`]
- UI: all visible copy must be French with diacritics. Use TailwindCSS 4 + existing shadcn/Base UI primitives and current class conventions. [Source: `_bmad-output/planning-artifacts/ux-spec.md#Design-System-Foundation`]
- Accessibility: touch targets must be at least 44px, focus rings visible, status conveyed with text/icons not color alone, and animations must not be essential. [Source: `_bmad-output/planning-artifacts/ux-spec.md#13.3-Accessibility-Strategy`]

### Subscription status semantics for this story

Use this source-of-truth lifecycle:

1. `TRIAL`: account/subscription pre-payment state; no premium access.
2. `PENDING`: member clicked `J'ai effectué le virement`; `Payment.status = pending`; admin verification pending; no premium access.
3. `ACTIVE`: admin verified receipt; `Payment.status = succeeded`; premium access allowed.
4. `CANCELLED`: refused or suspended; no premium access.
5. `PAST_DUE`: reserved for explicit payment delay/renewal flow; no premium access.

Do not infer paid access from `User.tier`. Tier is the selected product level; subscription status controls access.

### Premium-gating scope boundary

Story 2.5 should add a practical gate to existing opportunity pages because those are the current premium deal surfaces. It should **not** implement Epic 3's full marketplace visibility model (`VERIFIED`-only feeds, tier-specific deal visibility, public teaser feed, legal document permissions, trust badges, or double verification) unless a small change is strictly necessary to avoid leaking premium content. Keep the gate simple, tested, and reversible for Epic 3.

### Previous story intelligence (Story 2.4)

- Story 2.4 implemented `/admin/subscriptions`, admin mutation endpoint `PATCH /api/admin/subscriptions/[id]`, Resend email helpers, `src/lib/subscription-access.ts`, and tests for validation/refusal/suspension. Build and tests passed during review. [Source: `_bmad-output/implementation-artifacts/2-4-validation-manuelle-des-abonnements-par-ladmin.md`]
- Story 2.4 review required adding `GET /api/admin/subscriptions` and avoiding boolean `&&` JSX conditional patterns that violated a strict Next.js 16 guardrail. Prefer explicit ternaries returning `null` in JSX conditionals if similar issues appear. [Source: `_bmad-output/implementation-artifacts/2-4-validation-manuelle-des-abonnements-par-ladmin.md#Review-Findings`]
- Story 2.4 intentionally did **not** build member-facing notification center/status profile UI; that is the responsibility of Story 2.5. [Source: `_bmad-output/implementation-artifacts/2-4-validation-manuelle-des-abonnements-par-ladmin.md#Non-goals--Do-Not-Do`]
- Story 2.4 already added `resend` to `package.json` and `src/lib/email.ts`. Do not re-add dependencies or create duplicate email code. [Source: `package.json`, `src/lib/email.ts`]
- Story 2.4 normalized `POST /api/subscriptions` to create `Subscription.status = PENDING` after transfer confirmation. Profile/tracker logic should reflect that current behavior even though older planning text mentioned `TRIAL`. [Source: `src/app/api/subscriptions/route.ts`, `_bmad-output/implementation-artifacts/2-4-validation-manuelle-des-abonnements-par-ladmin.md#Subscription-status-and-payment-semantics`]

### Consolidation Story 2.0 constraints not to duplicate

- Story 2.0 already removed Stripe/CinetPay runtime/build code and dependencies, aligned Prisma to `BANK_TRANSFER`, added auth middleware regression tests, and documented Auth.js v5 patterns. Do not reintroduce removed payment providers or redo consolidation work. [Source: `_bmad-output/implementation-artifacts/2-0-consolidation-post-retrospective-epic-1.md`]
- Active payment model remains `BANK_TRANSFER` only. Any payment-provider comments, env vars, SDKs, webhooks, or checkout concepts outside bank transfer are regressions. [Source: `_bmad-output/implementation-artifacts/2-0-consolidation-post-retrospective-epic-1.md#Stakeholder-Checkpoint`]

### Git intelligence

Recent commits show the exact sequence to preserve:

- `6b0d506 feat(story-2.4): implement admin subscription validation, refusal, and suspension` added the admin subscription validation flow, email wrapper, and access helper.
- `0f35b20 fix(story-2.4): CR patch - add GET /api/admin/subscriptions route, fix JSX boolean &&` patched missing API surface and strict JSX conditional issue.
- `430cbf7 chore(bmad): Story 2-4 CR complete — status done, review findings patched` marked Story 2.4 done.

Actionable implication: build on the Story 2.4 flow; do not redesign admin validation, email sending, or subscription access. This story is member-facing display/gating.

### Latest technical/version notes

- Project pinned versions at story creation: Next.js `16.2.6`, React `19.2.4`, Prisma `7.8.0`, next-auth `5.0.0-beta.31`, TailwindCSS `4.x`, Vitest `4.1.6`, Resend `6.12.3`, Sonner `2.0.7`, Base UI `1.4.1`. Do not upgrade packages for this story unless a test/build failure requires a minimal compatible patch. [Source: `package.json`]
- `npm view` on 2026-05-14 reported latest package versions: Next `16.2.6`, React `19.2.6`, Prisma `7.8.0`, Resend `6.12.3`, lucide-react `1.16.0`, Sonner `2.0.7`, Base UI `1.4.1`; `npm view next-auth version` reports stable v4 `4.24.14`, but this project intentionally uses Auth.js v5 beta. Do not downgrade next-auth.

### Testing Standards

- Test framework: Vitest 4 + Testing Library / user-event where relevant, with co-located `*.test.ts(x)` files matching current repo style. [Source: `package.json`, `src/app/api/admin/subscriptions/[id]/route.test.ts`, `src/app/(admin)/admin/subscriptions/page.test.tsx`]
- Mock `auth()`, `prisma`, `fetch`, `localStorage`, `toast`, email helpers, and time (`vi.setSystemTime`) as needed.
- Required verification before moving to review:
  - `npx vitest run`
  - `npm run build`

### Non-goals / Do Not Do

- Do not implement a full notification center, push notifications, WebSockets/SSE, or event bus unless explicitly required by a failing acceptance test. A lightweight state-derived activation notice is enough for Story 2.5.
- Do not send activation emails from profile/dashboard/client code. The admin validation endpoint owns activation emails.
- Do not implement Stripe, CinetPay, card payments, checkout pages, webhooks, or payment-provider abstractions.
- Do not implement full Epic 3 deal visibility, public teaser SEO pages, document upload, trust badges, or tier-specific opportunity filtering beyond the minimal premium gate.
- Do not rely on `User.tier` alone for premium access.
- Do not break existing profile editing, avatar upload, pricing/virement confirmation, or admin subscription validation flows.

### References

- [Source: `_bmad-output/implementation-artifacts/sprint-status.yaml`]
- [Source: `_bmad-output/planning-artifacts/epics.md#Story-2.5-Suivi-des-Statuts-dAbonnement-et-Notifications`]
- [Source: `_bmad-output/planning-artifacts/prd.md#8.2-Tiers--Abonnements`]
- [Source: `_bmad-output/planning-artifacts/prd.md#9.6-Intégration--Compatibilité`]
- [Source: `_bmad-output/planning-artifacts/architecture.md#Authentication--Security`]
- [Source: `_bmad-output/planning-artifacts/architecture.md#API--Communication-Patterns`]
- [Source: `_bmad-output/planning-artifacts/architecture.md#Data-Boundaries`]
- [Source: `_bmad-output/planning-artifacts/ux-spec.md#14.5-Pending--Waiting-States`]
- [Source: `_bmad-output/planning-artifacts/ux-spec.md#14.4-Success-States`]
- [Source: `_bmad-output/implementation-artifacts/2-4-validation-manuelle-des-abonnements-par-ladmin.md`]
- [Source: `_bmad-output/implementation-artifacts/2-0-consolidation-post-retrospective-epic-1.md`]
- [Source: `src/components/subscription-status-tracker.tsx`]
- [Source: `src/app/(dashboard)/profile/page.tsx`]
- [Source: `src/app/(dashboard)/dashboard/page.tsx`]
- [Source: `src/app/(dashboard)/opportunities/page.tsx`]
- [Source: `src/app/(dashboard)/opportunities/[id]/page.tsx`]
- [Source: `src/app/api/subscriptions/route.ts`]
- [Source: `src/app/api/admin/subscriptions/[id]/route.ts`]
- [Source: `src/lib/subscription-access.ts`]
- [Source: `src/lib/email.ts`]
- [Source: `src/lib/tier-config.ts`]
- [Source: `src/lib/bank-transfer-config.ts`]
- [Source: `prisma/schema.prisma`]
- [Source: `package.json`]

## Dev Agent Record

### Agent Model Used

N/A — story context only.

### Debug Log References

N/A

### Completion Notes List

N/A

### File List

N/A

### Change Log

- 2026-05-14: Story context created and marked ready-for-dev.
