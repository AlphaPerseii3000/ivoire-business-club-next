# Acceptance Auditor Prompt — Story 2.5

You are an Acceptance Auditor. Review this diff against the spec and context docs. Check for: violations of acceptance criteria, deviations from spec intent, missing implementation of specified behavior, contradictions between spec constraints and actual code. Output findings as a Markdown list. Each finding: one-line title, which AC/constraint it violates, and evidence from the diff.

## Story Spec

```markdown
---
Story: "2.5"
StoryKey: "2-5-suivi-des-statuts-dabonnement-et-notifications"
Title: "Suivi des Statuts d'Abonnement et Notifications"
Status: review
Priority: "P0"
Epic: "Epic 2 — Tiers et Paiement par Virement Bancaire"
FRs: ["FR13", "FR14"]
NFRs: ["NFR-I1", "NFR-I2", "NFR-S5", "NFR-S8", "NFR-A1", "NFR-A3"]
Created: "2026-05-14"
---

# Story 2.5: Suivi des Statuts d'Abonnement et Notifications

Status: review

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

```

## Architecture Context

```markdown
---
stepsCompleted:
  - step-01-init
  - step-02-context
  - step-03-starter
  - step-04-decisions
  - step-05-patterns
  - step-06-structure
  - step-07-validation
  - step-08-complete
inputDocuments:
  - product-brief.md
  - prd.md
  - ux-spec.md
  - technical-feasibility-ibc-2026-05-12.md
  - domain-research-2026-05-12-ibc-deep-dive.md
  - prisma/schema.prisma
  - src/lib/auth.config.ts
  - src/lib/auth.ts
  - src/middleware.ts
  - next.config.ts
  - package.json
workflowType: architecture
project_name: ibc
user_name: Alphaperseii
status: complete
completedAt: '2026-05-12'
---

# Architecture Decision Document — IBC (Ivoire Business Club)

_This document was built collaboratively through the BMAD architecture workflow. It serves as the single source of truth for all technical decisions, ensuring consistent implementation across AI agents._

---

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**

The PRD defines 45 Functional Requirements (FR1–FR45) organized into 7 categories:

| Category | Count | Key Architectural Impact |
|----------|-------|--------------------------|
| Auth & Users (FR1–FR7) | 7 | Dual auth (OAuth + credentials), role-based access, JWT sessions |
| Tiers & Subscriptions (FR8–FR14) | 7 | Bank-transfer payment flow, manual admin validation, status lifecycle |
| Marketplace (FR15–FR23) | 9 | Document upload, verification workflow, tier-based visibility |
| Networking & Matching (FR24–FR30) | 7 | Tag-based matching, WhatsApp deep links, soft-commitment |
| Reviews & Reputation (FR31–FR34) | 4 | Bidirectional review system, score calculation, badge automation |
| Admin & Back-office (FR35–FR40) | 6 | Kanban UI, audit logs, metrics dashboard |
| Landing & Content (FR41–FR45) | 5 | Teaser deals, tier comparison, static success wall |

**Non-Functional Requirements:**

| Category | Key Requirements |
|----------|-----------------|
| Performance | Landing < 2s on 3G, API p95 < 500ms, Auth < 300ms, standalone build < 100MB |
| Security | HTTPS/HSTS, bcrypt cost ≥10, rate limiting, CSRF, CSP headers, audit trails |
| Scalability | 500 concurrent users Phase 1, 2,000 users without rework, PostgreSQL in prod |
| Accessibility | WCAG 2.1 AA, dark mode, French non-technical language |
| Deployment | Standalone output, PM2 cluster, Nginx reverse proxy, SSL Let's Encrypt |
| Integration | WhatsApp deep links, email via Resend/SendGrid, Cloudflare R2 for documents |

**Scale & Complexity:**

- **Primary domain:** Full-stack web application (Next.js 16 App Router)
- **Complexity level:** High — multi-tier marketplace, trust infrastructure, bank-transfer payment flow, admin verification kanban, CI/UEMOA compliance context
- **Estimated architectural components:** 12 major modules (Auth, Subscriptions, Opportunities, Matching, Reviews, Admin, Landing, Uploads, Notifications, Analytics, Payments-virement, Compliance)

### Technical Constraints & Dependencies

**Already-Implemented (Brownfield):**
- Next.js 16.2.6 + React 19.2.4 + App Router
- Prisma 7.8.0 with SQLite (dev), schema defined, generated client at `src/generated/prisma`
- Auth.js v5 beta.31 with split config (`auth.config.ts` Edge + `auth.ts` Node.js)
- `src/middleware.ts` already exists and correctly uses `NextAuth(authConfig)`
- TailwindCSS 4.x
- shadcn/ui base components

**Critical Constraints from Technical Feasibility:**
- Auth.js v5: middleware MUST import ONLY from `auth.config.ts` (Edge Runtime, no Prisma/bcrypt). `auth.ts` has providers (Node runtime).
- Prisma v7: datasource block has no direct `url` — uses `prisma.config.ts`. PrismaClient needs adapter. Import client from `@/generated/prisma/client`.
- Next.js 16: `.next` cache can corrupt (`rm -rf .next` to fix). Kill stale processes before restart.
- Stripe types are volatile across versions — remove entirely (bank-transfer model replaces payment providers).
- Project is **brownfield** — starter template evaluation is N/A; we extend existing structure.

### Cross-Cutting Concerns Identified

1. **Authentication & Authorization** — JWT session strategy, role-based route guards, tier-based data access
2. **Trust Infrastructure** — Verification levels, document integrity, audit trails, reputation scoring
3. **Payment-virement Flow** — Offline payment (bank transfer), manual admin validation, status lifecycle
4. **File Upload & Storage** — Legal documents (R2), profile images, secure presigned URLs
5. **Rate Limiting & Security** — Upstash Redis for API protection, especially `/api/auth/signup`
6. **Mobile-First Responsiveness** — 80%+ traffic on smartphones, touch targets ≥44px
7. **WhatsApp Integration** — Deep links on every profile/deal, pre-filled messages
8. **Compliance & Audit** — CENTIF-CI AML trails, APDP data protection, non-financial intermediary status

---

## Starter Template Evaluation

### Primary Technology Domain

**Brownfield Next.js 16 Full-Stack Web Application** — The project already has a functioning codebase with Auth.js, Prisma, and TailwindCSS. Starter template evaluation is **not applicable**; instead, we document the existing base and architectural decisions made on top of it.

### Existing Base Architecture

The codebase uses:
- `create-next-app` with TypeScript, TailwindCSS v4, App Router
- Prisma ORM with `better-sqlite3` adapter (dev only)
- Auth.js v5 with split config pattern
- shadcn/ui for unstyled accessible primitives

**Note:** Project initialization is already complete. The first implementation priority is resolving P0 blockers and building the bank-transfer workflow.

---

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Payment model | Bank transfer KS Investment + manual admin validation | Eliminates Stripe/CinetPay dependency, zero webhooks, PCI-DSS irrelevant; universally accessible for diaspora |
| Auth middleware | `src/middleware.ts` with `NextAuth(authConfig)` | Already implemented; Edge-compatible route protection |
| Rate limiting | Upstash Redis `@upstash/ratelimit` | Serverless-compatible, zero infra, sliding window precision |
| Database (prod) | PostgreSQL managed (Supabase/Railway) | Migration from SQLite before production; required for concurrency |
| Build output | `output: 'standalone'` in `next.config.ts` | Required for PM2 + Nginx self-hosting on Infomaniak VPS |

**Important Decisions (Shape Architecture):**
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Session strategy | JWT (not database) | Required for Edge-compatible middleware; role/tier embedded in token |
| File storage | Cloudflare R2 | Zero egress fees, S3-compatible, good for document storage |
| API pattern | RESTful Route Handlers (`app/api/**/route.ts`) | Native Next.js pattern, no external API framework needed |
| Form handling | React Hook Form + Zod | Already in dependencies; server-side validation with Zod schemas |
| Emails | Resend (recommendation) | Simple API, good deliverability, free tier sufficient for MVP |

**Deferred Decisions (Post-MVP):**
| Decision | Deferred Reason |
|----------|-----------------|
| PWA + service worker | Phase 2; current responsive web is sufficient |
| Matching algorithm (ML) | Tag-based rules sufficient for < 500 members |
| Crowd-due diligence | Admin-only verification for trust-building phase |
| Identity verification API (uqudo/Smile ID) | Manual upload + admin check sufficient for MVP |

### Data Architecture

**Database:** PostgreSQL in production (migrate from SQLite). Prisma 7 with `prisma-client` generator outputting to `src/generated/prisma`.

**Key Data Models (from schema):**
- `User` — auth identity, profile, tier, role, verification status, country field (UEMOA expansion ready)
- `Account` / `Session` / `VerificationToken` — Auth.js required adapters
- `Subscription` — tier, period, provider (will become `BANK_TRANSFER`), status lifecycle
- `Opportunity` — deal postings with verification status, author, verifier
- `Payment` — legacy Stripe/CinetPay records; to be repurposed or replaced for bank-transfer tracking

**Data Validation:**
- Server-side: Zod schemas in `src/lib/validations.ts`
- Client-side: React Hook Form resolvers with same Zod schemas
- Database: Prisma schema constraints + native type safety

**Caching Strategy (MVP):**
- No server-side caching layer initially
- Static page generation for landing, pricing, success wall
- Dynamic routes use `revalidate` where appropriate
- Future: Redis for session caching if JWT becomes too large

### Authentication & Security

**Auth Architecture:**
- Google OAuth provider + Credentials provider (bcryptjs)
- JWT session strategy with custom claims (`tier`, `role`, `id`)
- `auth.config.ts` — Edge-compatible, NO Prisma/bcrypt, used by middleware
- `auth.ts` — Full Node.js config with PrismaAdapter + providers
- `src/middleware.ts` — Route protection via `authorized` callback

**Authorization Patterns:**
- Role-based: `MEMBER` vs `ADMIN` — middleware blocks `/admin` for non-admins
- Tier-based: Data access filtered by `Tier` enum at API layer
- Public routes: Landing, pricing, auth pages, API auth endpoints

**Security Measures:**
- Rate limiting: `@upstash/ratelimit` on `/api/auth/signup` (5/min/IP) and `/api/auth/signin` (10/min/IP)
- HTTPS forced with HSTS header (Nginx)
- CSP, X-Frame-Options, X-Content-Type-Options headers
- No sensitive data in logs
- Audit trail for all admin actions and subscription transactions

### API & Communication Patterns

**API Design:** Next.js App Router Route Handlers (`route.ts`) under `src/app/api/`

**Endpoint Organization:**
```
src/app/api/
├── auth/signup/route.ts          # Credential registration (rate limited)
├── admin/
│   ├── opportunities/[id]/verify/route.ts  # Status transitions
│   └── users/[id]/tier/route.ts            # Tier management
├── opportunities/route.ts        # CRUD + listing
├── user/profile/route.ts         # Profile updates
└── (future) subscriptions/       # Bank-transfer submission
```

**API Response Format:**
- Success: `Response.json({ data: T })` or `NextResponse.json({ data: T })`
- Error: `Response.json({ error: string, code?: string }, { status })`
- HTTP status codes: 200 (OK), 201 (Created), 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 429 (Rate Limited), 500 (Server Error)

**Error Handling:**
- Use `try/catch` in all route handlers
- Zod validation errors returned as `400` with field-level details
- Unexpected errors logged server-side, generic message returned to client
- Auth errors (NextAuth) handled by configured error page `/auth/error`

### Frontend Architecture

**State Management:**
- Server state: Server Components + Server Actions (Next.js 16 RSC)
- Client state: React `useState` / `useReducer` for local UI state
- No global client state library needed for MVP complexity
- Form state: React Hook Form

**Component Architecture:**
- Server Components by default (data fetching, auth checks)
- Client Components only when needed (`"use client"`) — interactivity, forms, hooks
- shadcn/ui primitives themed with IBC teal/amber palette
- Custom IBC components: `TrustBadge`, `DealCard`, `WhatsAppCTA`, `TierCard`, `StatusPill`

**Routing Strategy:**
- App Router with route groups for layout segmentation:
  - `(public)` — landing, pricing, auth pages (no auth required)
  - `(dashboard)` — member area (auth required)
  - `(admin)` — admin area (ADMIN role required)

### Infrastructure & Deployment

**Hosting:** VPS Cloud Infomaniak (Ubuntu 24.04)
**Process Manager:** PM2 with cluster mode (`ecosystem.config.js`)
**Reverse Proxy:** Nginx (SSL termination, static asset caching)
**SSL:** Let's Encrypt via Certbot (auto-renewal)
**Database:** PostgreSQL managed (Supabase or Railway for MVP)
**Build Output:** `output: 'standalone'` in `next.config.ts`

**Deployment Steps:**
1. `npm run build` → generates `.next/standalone/`
2. `prepare-deploy.sh` → assembles deploy package
3. `rsync` to VPS
4. `pm2 restart ibc-app`

---

## Implementation Patterns & Consistency Rules

### Naming Patterns

**Database (Prisma):**
- Table names: PascalCase in schema, mapped to `snake_case` with `@@map("users")`
- Column names: camelCase in schema (Prisma convention)
- Foreign keys: `{relationName}Id` (e.g., `authorId`, `verifiedById`)
- Enums: UPPER_SNAKE_CASE values (e.g., `AFFRANCHI`, `PENDING`)

**API Endpoints:**
- RESTful plural nouns: `/api/opportunities`, `/api/admin/users`
- Route parameters: `[id]` for dynamic segments
- Actions as sub-routes: `/api/opportunities/[id]/verify`

**Code (TypeScript):**
- Components: PascalCase files (e.g., `DealCard.tsx`)
- Hooks: camelCase prefixed with `use` (e.g., `useAuth`)
- Utilities/helpers: camelCase (e.g., `formatCurrency`)
- Constants: UPPER_SNAKE_CASE for true constants
- File naming: kebab-case for page files (e.g., `page.tsx`, `layout.tsx`)

### Structure Patterns

**Project Organization:**
```
src/
├── app/                  # Next.js App Router (routes + API)
│   ├── (public)/         # Public route group
│   ├── (dashboard)/      # Authenticated member routes
│   ├── (admin)/          # Admin-only routes
│   ├── api/              # API route handlers
│   ├── auth/             # Auth pages (signin, signup, error)
│   ├── globals.css       # Tailwind + CSS variables
│   ├── layout.tsx        # Root layout with providers
│   └── page.tsx          # Root redirect or landing
├── components/
│   ├── ui/               # shadcn/ui primitives
│   ├── features/         # Domain-specific components
│   │   ├── deals/
│   │   ├── auth/
│   │   ├── admin/
│   │   └── landing/
│   └── shared/           # Reusable cross-cutting components
├── lib/
│   ├── prisma.ts         # PrismaClient singleton
│   ├── auth.config.ts    # Edge auth config
│   ├── auth.ts           # Full auth instance
│   ├── validations.ts    # Zod schemas
│   ├── rate-limit.ts     # Upstash rate limiters
│   └── utils.ts          # cn() + general utilities
├── hooks/                # Custom React hooks
├── types/                # Supplementary TypeScript types
└── generated/prisma/     # Prisma Client output
```

**Test Organization (to be established):**
- Co-located: `*.test.ts(x)` next to source files
- E2E: `tests/e2e/` with Playwright (future)

### Format Patterns

**API Responses:**
```typescript
// Success
type ApiResponse<T> = { data: T };

// Error
type ApiError = { error: string; code?: string; details?: Record<string, string[]> };
```

**Date/Time:**
- Stored: ISO 8601 strings in PostgreSQL (`DateTime` in Prisma)
- Displayed: `toLocaleDateString('fr-FR')` for French formatting
- Never use `Date` objects in JSON — always serialize to ISO strings

**Currency:**
- Stored as smallest unit (cents) OR as `Float` with EUR/XOF labels
- Display: `Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })`

### Communication Patterns

**Server Actions (preferred over API routes for mutations):**
- Use for form submissions where possible (Next.js 16 progressive enhancement)
- Revalidate paths after mutations: `revalidatePath('/dashboard/opportunities')`

**API Routes (for external/Webhook needs):**
- Use for file uploads, external integrations, or when Server Actions aren't suitable

**Event/Notification Pattern (MVP):**
- No event bus initially
- Direct function calls for immediate side effects
- Admin notifications via email (Resend) for subscription validation

### Process Patterns

**Loading States:**
- Server Components: Use `loading.tsx` in route segments
- Client Components: Use `Skeleton` components from shadcn/ui
- Form submissions: Button disabled + spinner

**Error Handling:**
- Global: `error.tsx` in App Router for boundary catches
- Form: Display Zod validation errors inline
- API: Return structured error responses; toast notification on client
- Unexpected: Log to server, show generic "Une erreur est survenue" to user

**Authentication Flow:**
1. Unauthenticated user visits protected route → middleware redirects to `/auth/signin`
2. Sign in via Google OAuth or credentials → JWT created with role/tier
3. Middleware checks `authorized` callback on every request
4. `/admin` routes check `role === "ADMIN"`

---

## Project Structure & Boundaries

### Complete Project Directory Structure

```
ibc/
├── README.md
├── package.json
├── next.config.ts              # + output: 'standalone'
├── tsconfig.json
├── tailwind.config.ts / globals.css   # Tailwind v4 + CSS vars
├── prisma.config.ts            # Prisma 7 config (datasource url)
├── prisma/
│   └── schema.prisma           # Data models (to migrate to PostgreSQL)
├── src/
│   ├── app/
│   │   ├── (public)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx        # Landing page
│   │   │   └── pricing/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx      # Member layout with auth check
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── opportunities/page.tsx
│   │   │   ├── opportunities/[id]/page.tsx
│   │   │   ├── opportunities/new/page.tsx
│   │   │   ├── members/page.tsx
│   │   │   ├── profile/page.tsx
│   │   │   └── settings/page.tsx
│   │   ├── (admin)/
│   │   │   ├── layout.tsx      # Admin layout with role guard
│   │   │   ├── admin/page.tsx
│   │   │   ├── admin/members/page.tsx
│   │   │   └── admin/opportunities/page.tsx
│   │   ├── api/
│   │   │   ├── auth/signup/route.ts
│   │   │   ├── opportunities/route.ts
│   │   │   ├── opportunities/[id]/route.ts
│   │   │   ├── user/profile/route.ts
│   │   │   ├── admin/
│   │   │   │   ├── users/[id]/tier/route.ts
│   │   │   │   ├── users/[id]/verify/route.ts
│   │   │   │   └── opportunities/[id]/verify/route.ts
│   │   │   └── (future) subscriptions/
│   │   ├── auth/
│   │   │   ├── signin/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   └── error/page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx          # Root with ThemeProvider + AuthProvider
│   │   └── page.tsx            # Redirect to landing or dashboard
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components (Button, Card, Input, etc.)
│   │   ├── features/
│   │   │   ├── deals/
│   │   │   │   ├── deal-card.tsx
│   │   │   │   ├── deal-detail.tsx
│   │   │   │   ├── trust-badge.tsx
│   │   │   │   └── document-row.tsx
│   │   │   ├── auth/
│   │   │   │   ├── signin-form.tsx
│   │   │   │   └── signup-form.tsx
│   │   │   ├── admin/
│   │   │   │   ├── kanban-board.tsx
│   │   │   │   ├── user-management.tsx
│   │   │   │   └── metrics-cards.tsx
│   │   │   └── landing/
│   │   │       ├── hero.tsx
│   │   │       ├── pricing.tsx
│   │   │       └── footer.tsx
│   │   └── shared/
│   │       ├── whatsapp-cta.tsx
│   │       ├── tier-card.tsx
│   │       ├── status-pill.tsx
│   │       └── page-header.tsx
│   ├── lib/
│   │   ├── prisma.ts           # PrismaClient singleton with adapter
│   │   ├── auth.config.ts      # Edge-compatible auth config
│   │   ├── auth.ts             # Full NextAuth instance
│   │   ├── validations.ts      # Zod schemas
│   │   ├── rate-limit.ts       # Upstash ratelimiters
│   │   └── utils.ts            # cn() + helpers
│   ├── hooks/
│   │   └── (future custom hooks)
│   ├── types/
│   │   └── (future type extensions)
│   ├── generated/
│   │   └── prisma/             # Generated Prisma Client
│   └── middleware.ts           # Auth.js route protection
├── public/
│   └── (static assets)
├── tests/
│   └── e2e/                    # Playwright tests (future)
├── scripts/
│   └── prepare-deploy.sh       # Build + package standalone for rsync
├── ecosystem.config.js         # PM2 cluster config
└── .env.example                # Required environment variables
```

### Architectural Boundaries

**API Boundaries:**
- Public API: No auth required (landing data, auth endpoints)
- Member API: Requires valid JWT with `MEMBER` or `ADMIN` role
- Admin API: Requires `ADMIN` role; returns 403 otherwise
- Tier-gated data: Opportunity responses filtered by `req.user.tier`

**Route Boundaries:**
- `(public)` — No session check; landing, pricing, auth pages
- `(dashboard)` — Session required; redirect to `/auth/signin` if unauthenticated
- `(admin)` — Session + `ADMIN` role required; redirect to `/` if unauthorized

**Data Boundaries:**
- Prisma ORM is the ONLY data access layer
- No raw SQL except in migrations
- All DB calls go through `src/lib/prisma.ts` singleton
- External file storage: Cloudflare R2 via S3-compatible SDK

### Integration Points

**Internal Communication:**
- Server Components fetch data directly via Prisma
- Client Components call Server Actions or API routes
- Auth state propagated via Auth.js session provider

**External Integrations:**
- Google OAuth (Auth.js built-in)
- WhatsApp `wa.me` deep links (no API, just URLs)
- Cloudflare R2 (S3 SDK) for document storage
- Resend for transactional emails
- Upstash Redis for rate limiting

**Data Flow:**
```
User → Nginx → Next.js (standalone)
         ↓
    [Middleware] → Auth check (Edge)
         ↓
    [Page / API Route] → Server Component / Route Handler
         ↓
    [Prisma] → PostgreSQL
         ↓
    [R2 SDK] → Cloudflare R2 (documents)
```

---

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:** All technology choices are compatible. Next.js 16 + React 19 + Prisma 7 + Auth.js v5 beta + TailwindCSS 4 form a cohesive modern stack. The bank-transfer payment model eliminates Stripe/CinetPay complexity entirely.

**Pattern Consistency:** Naming conventions align with Prisma/Next.js ecosystem standards. JWT session strategy is consistent with Edge middleware requirements. API response formats are uniform.

**Structure Alignment:** The App Router route group pattern `(public)` / `(dashboard)` / `(admin)` cleanly separates concerns and maps to the authorization boundaries defined in the middleware.

### Requirements Coverage Validation ✅

**Epic/Feature Coverage:**
- ✅ FR1–FR7 (Auth): Covered by Auth.js split config + middleware
- ✅ FR8–FR14 (Tiers/Subscriptions): Covered by bank-transfer flow + admin validation
- ✅ FR15–FR23 (Marketplace): Covered by Prisma models + API routes + R2 uploads
- ✅ FR24–FR30 (Networking): Covered by tag matching + WhatsApp deep links
- ✅ FR31–FR34 (Reviews): Covered by additional schema fields + API
- ✅ FR35–FR40 (Admin): Covered by admin route group + kanban UI
- ✅ FR41–FR45 (Landing): Covered by public route group + SSG

**Non-Functional Requirements Coverage:**
- ✅ NFR-P1–P4 (Performance): Standalone build, static generation, JWT sessions
- ✅ NFR-S1–S9 (Security): Rate limiting, bcrypt, HTTPS, CSP, audit trails
- ✅ NFR-SC1–SC3 (Scalability): PostgreSQL, stateless API, PM2 cluster
- ✅ NFR-A1–A3 (Accessibility): shadcn/ui primitives, Tailwind dark mode, French UI
- ✅ NFR-D1–D6 (Deployment): Standalone, PM2, Nginx, SSL scripts
- ✅ NFR-I1–I3 (Integration): WhatsApp links, Resend, R2

### Implementation Readiness Validation ✅

**Decision Completeness:** All critical and important decisions documented above with rationale. No blocking gaps.

**Structure Completeness:** Complete directory tree defined. All integration points mapped.

**Pattern Completeness:** Naming, structure, format, communication, and process patterns all specified with examples.

### Gap Analysis Results

**No Critical Gaps.** The brownfield codebase already has:
- Working middleware
- Defined schema
- Auth config
- Basic page structure

**Minor Gaps (non-blocking):**
1. `next.config.ts` needs `output: 'standalone'` (one-line change)
2. Rate limiting library not yet installed (`@upstash/ratelimit`)
3. `prepare-deploy.sh` and `ecosystem.config.js` not yet created
4. `prisma.config.ts` needed for Prisma v7 datasource configuration
5. PostgreSQL migration pending (dev-only for now)

### Architecture Completeness Checklist

**Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**Architectural Decisions**
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**Implementation Patterns**
- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High

**Key Strengths:**
- Clear brownfield foundation reduces risk
- Simple bank-transfer model eliminates payment complexity
- Strong trust infrastructure aligned with domain needs
- WhatsApp-native design fits target culture
- Auth.js v5 split config correctly implemented

**Areas for Future Enhancement:**
- Add Playwright E2E tests
- Implement Redis caching layer for > 500 users
- Add PWA support with service worker
- Implement real-time notifications (WebSockets or SSE)
- Integrate identity verification API at scale

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented above
- Use implementation patterns consistently across all components
- Respect project structure and boundaries
- Refer to this document for all architectural questions
- Never add Stripe or CinetPay payment code — bank-transfer is the only model
- Always import Prisma from `@/generated/prisma/client`
- Never import Prisma or bcrypt into `auth.config.ts` (Edge Runtime)

**First Implementation Priority:**
1. Add `output: 'standalone'` to `next.config.ts`
2. Install `@upstash/ratelimit` + `@upstash/redis` and protect `/api/auth/signup`
3. Remove Stripe/CinetPay files and dependencies
4. Create bank-transfer subscription flow (RIB display + admin validation)
5. Build admin kanban for opportunity verification
6. Add Cloudflare R2 document uploads

---

## Appendices

### Environment Variables Required

```
# Auth
NEXTAUTH_URL=
NEXTAUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Database
DATABASE_URL=                  # PostgreSQL connection string (production)

# Upstash Redis (rate limiting)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Cloudflare R2 (document storage)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=

# Resend (emails)
RESEND_API_KEY=

# App
APP_URL=                       # e.g., https://ivoirebusinessclub.com
```

### Technology Versions

| Technology | Version | Notes |
|-----------|---------|-------|
| Next.js | 16.2.6 | App Router, RSC, standalone output |
| React | 19.2.4 | Concurrent features |
| Prisma | 7.8.0 | Client + adapter pattern |
| Auth.js (next-auth) | 5.0.0-beta.31 | Split config (Edge + Node.js) |
| TailwindCSS | 4.x | CSS variables, dark mode |
| TypeScript | 5.x | Strict mode recommended |
| bcryptjs | 3.0.3 | Credential auth hashing |
| Zod | 4.4.3 | Schema validation |
| React Hook Form | 7.75.0 | Form state management |

### P0 Blockers to Resolve

1. **Add `output: 'standalone'`** to `next.config.ts`
2. **Install `@upstash/ratelimit`** and protect signup/signin routes
3. **Remove Stripe + CinetPay** from `package.json` and delete `src/lib/stripe.ts`, `src/lib/cinetpay.ts`, `src/app/api/stripe/**`, `src/app/api/cinetpay/**`
4. **Create bank-transfer flow** — RIB display page, admin validation UI
5. **Migrate schema** — Remove `PaymentProvider` enum values `STRIPE`/`CINETPAY`; adapt `Subscription` model for bank-transfer
6. **Create `prisma.config.ts`** for Prisma v7 datasource configuration

---

*Architecture document for IBC — completed via BMAD `bmad-create-architecture` workflow. All decisions validated and ready for AI agent implementation.*

```

## Diff

```diff
diff --git a/.env.example b/.env.example
index 9f79d1f..92e70f2 100644
--- a/.env.example
+++ b/.env.example
@@ -27,5 +27,8 @@ BANK_TRANSFER_IBAN=
 BANK_TRANSFER_BIC=
 BANK_TRANSFER_BANK_ADDRESS=
 
+# Support
+SUPPORT_WHATSAPP_NUMBER=
+
 # App
 APP_URL=
diff --git a/_bmad-output/implementation-artifacts/2-5-suivi-des-statuts-dabonnement-et-notifications.md b/_bmad-output/implementation-artifacts/2-5-suivi-des-statuts-dabonnement-et-notifications.md
index 9bdb352..b3e5132 100644
--- a/_bmad-output/implementation-artifacts/2-5-suivi-des-statuts-dabonnement-et-notifications.md
+++ b/_bmad-output/implementation-artifacts/2-5-suivi-des-statuts-dabonnement-et-notifications.md
@@ -2,7 +2,7 @@
 Story: "2.5"
 StoryKey: "2-5-suivi-des-statuts-dabonnement-et-notifications"
 Title: "Suivi des Statuts d'Abonnement et Notifications"
-Status: "ready-for-dev"
+Status: review
 Priority: "P0"
 Epic: "Epic 2 — Tiers et Paiement par Virement Bancaire"
 FRs: ["FR13", "FR14"]
@@ -12,7 +12,7 @@ Created: "2026-05-14"
 
 # Story 2.5: Suivi des Statuts d'Abonnement et Notifications
 
-Status: ready-for-dev
+Status: review
 
 <!-- Completion note: Ultimate context engine analysis completed - comprehensive developer guide created. -->
 
diff --git a/_bmad-output/implementation-artifacts/sprint-status.yaml b/_bmad-output/implementation-artifacts/sprint-status.yaml
index f65ede6..f1350ed 100644
--- a/_bmad-output/implementation-artifacts/sprint-status.yaml
+++ b/_bmad-output/implementation-artifacts/sprint-status.yaml
@@ -35,7 +35,7 @@
 # - Dev moves story to 'review', then runs code-review (fresh context, different LLM recommended)
 
 generated: 2026-05-12T23:04:29Z
-last_updated: 2026-05-14T22:22:20+02:00
+last_updated: 2026-05-14T22:26:51+02:00
 project: ibc
 project_key: NOKEY
 tracking_system: file-system
@@ -58,7 +58,7 @@ development_status:
   2-2-affichage-et-comparaison-des-tiers: done
   2-3-selection-du-tier-et-instructions-de-virement: done
   2-4-validation-manuelle-des-abonnements-par-ladmin: done
-  2-5-suivi-des-statuts-dabonnement-et-notifications: ready-for-dev
+  2-5-suivi-des-statuts-dabonnement-et-notifications: review
   epic-2-retrospective: optional
   epic-3: backlog
   3-1-creation-et-soumission-dopportunite: backlog
diff --git a/src/app/(dashboard)/dashboard/page.tsx b/src/app/(dashboard)/dashboard/page.tsx
index 3dcd7b4..88ea5f3 100644
--- a/src/app/(dashboard)/dashboard/page.tsx
+++ b/src/app/(dashboard)/dashboard/page.tsx
@@ -3,6 +3,13 @@ import Link from "next/link";
 import { auth } from "@/lib/auth";
 import { prisma } from "@/lib/prisma";
 import { redirect } from "next/navigation";
+import { SubscriptionActivationNotice } from "@/components/subscription-activation-notice";
+
+const ACTIVATION_NOTICE_DAYS = 7;
+
+function isRecent(date: Date, days: number) {
+  return Date.now() - date.getTime() <= days * 24 * 60 * 60 * 1000;
+}
 
 export default async function DashboardPage() {
   const session = await auth();
@@ -24,17 +31,29 @@ export default async function DashboardPage() {
 
   const statusLabel: Record<string, string> = {
     TRIAL: "Essai",
+    PENDING: "En attente",
     ACTIVE: "Actif",
     PAST_DUE: "En retard",
     CANCELLED: "Annulé",
   };
+  const showActivationNotice = subscription?.status === "ACTIVE"
+    ? isRecent(subscription.updatedAt, ACTIVATION_NOTICE_DAYS)
+    : false;
 
   return (
     <div className="mx-auto max-w-4xl px-4 py-8">
       <h1 className="text-2xl font-bold">Bienvenue, {user.name}</h1>
       <p className="mt-1 text-muted-foreground">Ton tableau de bord Ivoire Business Club</p>
 
-      {/* Subscription card */}
+      {showActivationNotice && subscription ? (
+        <SubscriptionActivationNotice
+          className="mt-8"
+          subscriptionId={subscription.id}
+          tier={subscription.tier}
+          ctaHref="/opportunities"
+        />
+      ) : null}
+
       <div className="mt-8 rounded-xl border bg-card p-6">
         <h2 className="text-lg font-semibold">Mon abonnement</h2>
         <div className="mt-4 grid gap-4 sm:grid-cols-3">
@@ -59,17 +78,16 @@ export default async function DashboardPage() {
             </p>
           </div>
         </div>
-        {(!subscription || subscription.status === "TRIAL") && (
+        {!subscription || subscription.status === "TRIAL" ? (
           <Link
             href="/pricing"
-            className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
+            className="mt-4 inline-flex min-h-11 items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
           >
             Choisir un plan
           </Link>
-        )}
+        ) : null}
       </div>
 
-      {/* Quick actions */}
       <div className="mt-8 grid gap-4 sm:grid-cols-3">
         <Link href="/opportunities" className="rounded-xl border bg-card p-6 hover:shadow-lg transition-shadow">
           <p className="text-lg font-semibold">🎯 Opportunités</p>
diff --git a/src/app/(dashboard)/opportunities/[id]/page.test.tsx b/src/app/(dashboard)/opportunities/[id]/page.test.tsx
new file mode 100644
index 0000000..321ce37
--- /dev/null
+++ b/src/app/(dashboard)/opportunities/[id]/page.test.tsx
@@ -0,0 +1,64 @@
+import React from "react";
+import { render, screen } from "@testing-library/react";
+import { beforeEach, describe, expect, it, vi } from "vitest";
+
+import OpportunityDetailPage from "./page";
+
+const mockAuth = vi.hoisted(() => vi.fn());
+const mockGetUserPremiumAccess = vi.hoisted(() => vi.fn());
+const mockOpportunityFindUnique = vi.hoisted(() => vi.fn());
+const mockNotFound = vi.hoisted(() => vi.fn(() => { throw new Error("notFound"); }));
+
+vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
+vi.mock("@/lib/subscription-access", () => ({ getUserPremiumAccess: mockGetUserPremiumAccess }));
+vi.mock("@/lib/prisma", () => ({
+  prisma: {
+    opportunity: { findUnique: mockOpportunityFindUnique },
+  },
+}));
+vi.mock("next/navigation", () => ({
+  redirect: vi.fn((path: string) => { throw new Error(`redirect:${path}`); }),
+  notFound: mockNotFound,
+}));
+
+const params = { params: Promise.resolve({ id: "opp-1" }) };
+
+describe("OpportunityDetailPage premium access gating", () => {
+  beforeEach(() => {
+    vi.clearAllMocks();
+    mockAuth.mockResolvedValue({ user: { id: "member-1" } });
+  });
+
+  it("blocks premium deal details for non-active members", async () => {
+    mockGetUserPremiumAccess.mockResolvedValue({ hasAccess: false });
+    mockOpportunityFindUnique.mockResolvedValueOnce({ id: "opp-1" });
+
+    render(await OpportunityDetailPage(params));
+
+    expect(screen.getByText("Votre abonnement est inactif. Renouvelez pour accéder aux deals.")).toBeInTheDocument();
+    expect(screen.getByRole("link", { name: "Voir les offres" })).toHaveAttribute("href", "/pricing");
+    expect(screen.queryByText("Dossier confidentiel premium")).not.toBeInTheDocument();
+    expect(mockOpportunityFindUnique).toHaveBeenCalledWith({ where: { id: "opp-1" }, select: { id: true } });
+  });
+
+  it("renders premium deal details for active members", async () => {
+    mockGetUserPremiumAccess.mockResolvedValue({ hasAccess: true });
+    mockOpportunityFindUnique.mockResolvedValueOnce({
+      id: "opp-1",
+      title: "Terrain à Cocody",
+      description: "Dossier confidentiel premium",
+      amount: 25000,
+      category: "IMMOBILIER",
+      verificationStatus: "VERIFIED",
+      createdAt: new Date("2026-05-14T00:00:00.000Z"),
+      author: { id: "author-1", name: "Koffi", location: "Abidjan" },
+      verifiedBy: { name: "Admin IBC" },
+    });
+
+    render(await OpportunityDetailPage(params));
+
+    expect(screen.getByText("Terrain à Cocody")).toBeInTheDocument();
+    expect(screen.getByText("Dossier confidentiel premium")).toBeInTheDocument();
+    expect(screen.queryByText("Votre abonnement est inactif. Renouvelez pour accéder aux deals.")).not.toBeInTheDocument();
+  });
+});
diff --git a/src/app/(dashboard)/opportunities/[id]/page.tsx b/src/app/(dashboard)/opportunities/[id]/page.tsx
index a4a2f56..2ca5aa7 100644
--- a/src/app/(dashboard)/opportunities/[id]/page.tsx
+++ b/src/app/(dashboard)/opportunities/[id]/page.tsx
@@ -3,12 +3,32 @@ import Link from "next/link";
 import { auth } from "@/lib/auth";
 import { prisma } from "@/lib/prisma";
 import { redirect, notFound } from "next/navigation";
+import { getUserPremiumAccess } from "@/lib/subscription-access";
+import { PremiumAccessBlockedPanel } from "@/components/premium-access-blocked-panel";
 
 export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
   const session = await auth();
   if (!session?.user?.id) redirect("/auth/signin");
   const { id } = await params;
 
+  const access = await getUserPremiumAccess(session.user.id);
+
+  if (!access.hasAccess) {
+    const exists = await prisma.opportunity.findUnique({
+      where: { id },
+      select: { id: true },
+    });
+
+    if (!exists) notFound();
+
+    return (
+      <div className="mx-auto max-w-3xl px-4 py-8">
+        <Link href="/opportunities" className="text-sm text-muted-foreground hover:text-primary">← Retour aux opportunités</Link>
+        <PremiumAccessBlockedPanel />
+      </div>
+    );
+  }
+
   const opportunity = await prisma.opportunity.findUnique({
     where: { id },
     include: {
@@ -46,11 +66,11 @@ export default async function OpportunityDetailPage({ params }: { params: Promis
 
         <div className="mt-4 flex gap-3">
           <span className="rounded-md bg-muted px-3 py-1 text-sm">{categoryLabels[opportunity.category] ?? opportunity.category}</span>
-          {opportunity.amount && (
+          {opportunity.amount ? (
             <span className="rounded-md bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
               {opportunity.amount.toLocaleString("fr-FR")} €
             </span>
-          )}
+          ) : null}
         </div>
 
         <div className="mt-6 rounded-xl border bg-card p-6">
@@ -61,20 +81,20 @@ export default async function OpportunityDetailPage({ params }: { params: Promis
           <h2 className="font-semibold">Auteur</h2>
           <p className="mt-1 text-sm">{opportunity.author.name}{opportunity.author.location ? ` — ${opportunity.author.location}` : ""}</p>
           <p className="mt-1 text-xs text-muted-foreground">Publié le {new Date(opportunity.createdAt).toLocaleDateString("fr-FR")}</p>
-          {opportunity.verifiedBy && (
+          {opportunity.verifiedBy ? (
             <p className="mt-2 text-xs text-accent">Vérifié par {opportunity.verifiedBy.name}</p>
-          )}
+          ) : null}
         </div>
 
-        {session.user.id === opportunity.author.id && (
+        {session.user.id === opportunity.author.id ? (
           <div className="mt-6">
             <form action={`/api/opportunities/${opportunity.id}/delete`} method="POST">
-              <button type="submit" className="rounded-md border border-destructive px-4 py-2 text-sm text-destructive hover:bg-destructive/10">
+              <button type="submit" className="min-h-11 rounded-md border border-destructive px-4 py-2 text-sm text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                 Supprimer cette opportunité
               </button>
             </form>
           </div>
-        )}
+        ) : null}
       </div>
     </div>
   );
diff --git a/src/app/(dashboard)/opportunities/page.test.tsx b/src/app/(dashboard)/opportunities/page.test.tsx
new file mode 100644
index 0000000..d1dc478
--- /dev/null
+++ b/src/app/(dashboard)/opportunities/page.test.tsx
@@ -0,0 +1,60 @@
+import React from "react";
+import { render, screen } from "@testing-library/react";
+import { beforeEach, describe, expect, it, vi } from "vitest";
+
+import OpportunitiesPage from "./page";
+
+const mockAuth = vi.hoisted(() => vi.fn());
+const mockGetUserPremiumAccess = vi.hoisted(() => vi.fn());
+const mockOpportunityFindMany = vi.hoisted(() => vi.fn());
+
+vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
+vi.mock("@/lib/subscription-access", () => ({ getUserPremiumAccess: mockGetUserPremiumAccess }));
+vi.mock("@/lib/prisma", () => ({
+  prisma: {
+    opportunity: { findMany: mockOpportunityFindMany },
+  },
+}));
+vi.mock("next/navigation", () => ({ redirect: vi.fn((path: string) => { throw new Error(`redirect:${path}`); }) }));
+
+describe("OpportunitiesPage premium access gating", () => {
+  beforeEach(() => {
+    vi.clearAllMocks();
+    mockAuth.mockResolvedValue({ user: { id: "member-1" } });
+  });
+
+  it.each(["TRIAL", "PENDING", "CANCELLED", "PAST_DUE", "NO_SUBSCRIPTION"])(
+    "blocks premium content for %s members through the subscription-access helper",
+    async () => {
+      mockGetUserPremiumAccess.mockResolvedValue({ hasAccess: false });
+
+      render(await OpportunitiesPage());
+
+      expect(screen.getByText("Votre abonnement est inactif. Renouvelez pour accéder aux deals.")).toBeInTheDocument();
+      expect(screen.getByRole("link", { name: "Voir les offres" })).toHaveAttribute("href", "/pricing");
+      expect(mockOpportunityFindMany).not.toHaveBeenCalled();
+    }
+  );
+
+  it("renders premium opportunity content for active members", async () => {
+    mockGetUserPremiumAccess.mockResolvedValue({ hasAccess: true });
+    mockOpportunityFindMany.mockResolvedValue([
+      {
+        id: "opp-1",
+        title: "Terrain à Cocody",
+        description: "Dossier complet et rendement estimé.",
+        amount: 25000,
+        category: "IMMOBILIER",
+        verificationStatus: "VERIFIED",
+        createdAt: new Date("2026-05-14T00:00:00.000Z"),
+        author: { id: "author-1", name: "Koffi" },
+      },
+    ]);
+
+    render(await OpportunitiesPage());
+
+    expect(screen.getByText("Terrain à Cocody")).toBeInTheDocument();
+    expect(screen.getByText("Dossier complet et rendement estimé.")).toBeInTheDocument();
+    expect(screen.queryByText("Votre abonnement est inactif. Renouvelez pour accéder aux deals.")).not.toBeInTheDocument();
+  });
+});
diff --git a/src/app/(dashboard)/opportunities/page.tsx b/src/app/(dashboard)/opportunities/page.tsx
index dc95140..88df04f 100644
--- a/src/app/(dashboard)/opportunities/page.tsx
+++ b/src/app/(dashboard)/opportunities/page.tsx
@@ -1,15 +1,16 @@
+import Link from "next/link";
+
 import { auth } from "@/lib/auth";
 import { prisma } from "@/lib/prisma";
 import { redirect } from "next/navigation";
+import { getUserPremiumAccess } from "@/lib/subscription-access";
+import { PremiumAccessBlockedPanel } from "@/components/premium-access-blocked-panel";
 
 export default async function OpportunitiesPage() {
   const session = await auth();
   if (!session?.user?.id) redirect("/auth/signin");
 
-  const opportunities = await prisma.opportunity.findMany({
-    orderBy: { createdAt: "desc" },
-    include: { author: { select: { name: true, id: true } } },
-  });
+  const access = await getUserPremiumAccess(session.user.id);
 
   const categoryLabels: Record<string, string> = {
     INVESTISSEMENT: "Investissement",
@@ -24,6 +25,33 @@ export default async function OpportunitiesPage() {
     REJECTED: "❌ Refusé",
   };
 
+  if (!access.hasAccess) {
+    return (
+      <div className="mx-auto max-w-4xl px-4 py-8">
+        <div className="flex items-center justify-between">
+          <div>
+            <h1 className="text-2xl font-bold">Opportunités</h1>
+            <p className="mt-1 text-muted-foreground">
+              Découvre des opportunités business en Afrique
+            </p>
+          </div>
+          <Link
+            href="/opportunities/new"
+            className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
+          >
+            + Publier
+          </Link>
+        </div>
+        <PremiumAccessBlockedPanel />
+      </div>
+    );
+  }
+
+  const opportunities = await prisma.opportunity.findMany({
+    orderBy: { createdAt: "desc" },
+    include: { author: { select: { name: true, id: true } } },
+  });
+
   return (
     <div className="mx-auto max-w-4xl px-4 py-8">
       <div className="flex items-center justify-between">
@@ -33,12 +61,12 @@ export default async function OpportunitiesPage() {
             Découvre des opportunités business en Afrique
           </p>
         </div>
-        <a
+        <Link
           href="/opportunities/new"
-          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
+          className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
         >
           + Publier
-        </a>
+        </Link>
       </div>
 
       {opportunities.length === 0 ? (
@@ -59,11 +87,11 @@ export default async function OpportunitiesPage() {
                   <h3 className="text-lg font-semibold">{opp.title}</h3>
                   <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{opp.description}</p>
                 </div>
-                {opp.amount && (
+                {opp.amount ? (
                   <span className="ml-4 rounded-md bg-primary/10 px-3 py-1 text-sm font-semibold text-primary whitespace-nowrap">
                     {opp.amount.toLocaleString("fr-FR")} €
                   </span>
-                )}
+                ) : null}
               </div>
               <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                 <span className="rounded-md bg-muted px-2 py-1">{categoryLabels[opp.category] ?? opp.category}</span>
diff --git a/src/app/(dashboard)/profile/page.test.tsx b/src/app/(dashboard)/profile/page.test.tsx
new file mode 100644
index 0000000..015a994
--- /dev/null
+++ b/src/app/(dashboard)/profile/page.test.tsx
@@ -0,0 +1,102 @@
+import React from "react";
+import { render, screen } from "@testing-library/react";
+import { beforeEach, describe, expect, it, vi } from "vitest";
+
+import ProfilePage from "./page";
+
+const mockAuth = vi.hoisted(() => vi.fn());
+const mockUserFindUnique = vi.hoisted(() => vi.fn());
+
+vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
+vi.mock("@/lib/prisma", () => ({
+  prisma: {
+    user: { findUnique: mockUserFindUnique },
+  },
+}));
+vi.mock("next/navigation", () => ({ redirect: vi.fn((path: string) => { throw new Error(`redirect:${path}`); }) }));
+vi.mock("@/components/features/auth/avatar-upload", () => ({ default: () => <div data-testid="avatar-upload" /> }));
+vi.mock("@/components/features/auth/profile-edit-form", () => ({ default: () => <div data-testid="profile-edit-form" /> }));
+vi.mock("@/components/subscription-activation-notice", () => ({
+  SubscriptionActivationNotice: ({ tier }: { tier: string }) => <div>Activation {tier}</div>,
+}));
+
+const baseUser = {
+  id: "user-1",
+  name: "Awa Traoré",
+  email: "awa@example.com",
+  bio: null,
+  image: null,
+  phone: null,
+  location: null,
+  country: null,
+  tier: "GRAND_FRERE",
+  role: "MEMBER",
+  verificationStatus: "PENDING",
+  createdAt: new Date("2026-05-01T00:00:00.000Z"),
+};
+
+describe("ProfilePage subscription status", () => {
+  beforeEach(() => {
+    vi.clearAllMocks();
+    vi.setSystemTime(new Date("2026-05-14T12:00:00.000Z"));
+    process.env.SUPPORT_WHATSAPP_NUMBER = "2250700000000";
+    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
+  });
+
+  it("renders the latest pending subscription tracker and WhatsApp support CTA after 24h", async () => {
+    mockUserFindUnique.mockResolvedValue({
+      ...baseUser,
+      subscriptions: [
+        {
+          id: "sub-1",
+          tier: "GRAND_FRERE",
+          status: "PENDING",
+          providerRef: "IBC-user-1-GRAND_FRERE",
+          createdAt: new Date("2026-05-13T08:00:00.000Z"),
+          updatedAt: new Date("2026-05-13T08:00:00.000Z"),
+          endDate: null,
+        },
+      ],
+    });
+
+    render(await ProfilePage());
+
+    expect(screen.getByText("Virement en cours de validation")).toBeInTheDocument();
+    expect(screen.getByText("En attente")).toBeInTheDocument();
+    const supportLink = screen.getByRole("link", { name: "Contacter le support" });
+    expect(supportLink).toHaveAttribute("target", "_blank");
+    expect(supportLink).toHaveAttribute("href", expect.stringContaining("https://wa.me/2250700000000"));
+    expect(supportLink).toHaveAttribute("href", expect.stringContaining("IBC-user-1-GRAND_FRERE"));
+    expect(screen.getByTestId("profile-edit-form")).toBeInTheDocument();
+  });
+
+  it("does not show support CTA before the 24h threshold", async () => {
+    mockUserFindUnique.mockResolvedValue({
+      ...baseUser,
+      subscriptions: [
+        {
+          id: "sub-2",
+          tier: "AFFRANCHI",
+          status: "PENDING",
+          providerRef: "IBC-user-1-AFFRANCHI",
+          createdAt: new Date("2026-05-14T00:00:00.000Z"),
+          updatedAt: new Date("2026-05-14T00:00:00.000Z"),
+          endDate: null,
+        },
+      ],
+    });
+
+    render(await ProfilePage());
+
+    expect(screen.queryByRole("link", { name: "Contacter le support" })).not.toBeInTheDocument();
+  });
+
+  it("renders a pricing CTA when no subscription exists", async () => {
+    mockUserFindUnique.mockResolvedValue({ ...baseUser, subscriptions: [] });
+
+    render(await ProfilePage());
+
+    expect(screen.getByText("Aucun abonnement pour le moment")).toBeInTheDocument();
+    expect(screen.getByRole("link", { name: "Voir les offres" })).toHaveAttribute("href", "/pricing");
+  });
+});
diff --git a/src/app/(dashboard)/profile/page.tsx b/src/app/(dashboard)/profile/page.tsx
index 86deeed..2aa2c88 100644
--- a/src/app/(dashboard)/profile/page.tsx
+++ b/src/app/(dashboard)/profile/page.tsx
@@ -1,3 +1,4 @@
+import Link from "next/link";
 import { auth } from "@/lib/auth";
 import { prisma } from "@/lib/prisma";
 import { redirect } from "next/navigation";
@@ -6,8 +7,51 @@ import { Badge } from "@/components/ui/badge";
 import { Separator } from "@/components/ui/separator";
 import AvatarUpload from "@/components/features/auth/avatar-upload";
 import ProfileEditForm from "@/components/features/auth/profile-edit-form";
+import SubscriptionStatusTracker from "@/components/subscription-status-tracker";
+import { SubscriptionActivationNotice } from "@/components/subscription-activation-notice";
+import { buildWhatsAppSupportLink } from "@/lib/whatsapp";
 import { getTierBadgeConfig } from "@/lib/tier-config";
 
+const SUPPORT_EMAIL = "support@ivoirebusinessclub.com";
+const SUPPORT_THRESHOLD_HOURS = 24;
+const ACTIVATION_NOTICE_DAYS = 7;
+
+const subscriptionStatusCopy: Record<string, { title: string; description: string }> = {
+  TRIAL: {
+    title: "Virement à effectuer",
+    description: "Ton compte est prêt. Suis les instructions de virement pour lancer la validation.",
+  },
+  PENDING: {
+    title: "Virement en cours de validation",
+    description: "Nous validons votre virement sous 24h. Merci de votre patience.",
+  },
+  ACTIVE: {
+    title: "Abonnement actif",
+    description: "Ton accès premium est ouvert. Tu peux consulter les deals vérifiés.",
+  },
+  CANCELLED: {
+    title: "Abonnement annulé",
+    description: "Votre abonnement n'est plus actif. Renouvelez pour accéder aux deals premium.",
+  },
+  PAST_DUE: {
+    title: "Paiement à régulariser",
+    description: "Ton accès premium est suspendu jusqu'à régularisation.",
+  },
+};
+
+function isOlderThanHours(date: Date, hours: number) {
+  return Date.now() - date.getTime() >= hours * 60 * 60 * 1000;
+}
+
+function isRecent(date: Date, days: number) {
+  return Date.now() - date.getTime() <= days * 24 * 60 * 60 * 1000;
+}
+
+function buildSupportMessage(providerRef?: string | null) {
+  const referenceLine = providerRef ? ` Ma référence d'abonnement est ${providerRef}.` : "";
+  return `Bonjour IBC, mon virement est en attente de validation depuis plus de 24h.${referenceLine} Pouvez-vous m'aider s'il vous plaît ?`;
+}
+
 export default async function ProfilePage() {
   const session = await auth();
   if (!session?.user?.id) redirect("/auth/signin");
@@ -27,16 +71,46 @@ export default async function ProfilePage() {
       role: true,
       verificationStatus: true,
       createdAt: true,
+      subscriptions: {
+        orderBy: { createdAt: "desc" },
+        take: 1,
+        select: {
+          id: true,
+          tier: true,
+          status: true,
+          providerRef: true,
+          createdAt: true,
+          updatedAt: true,
+          endDate: true,
+        },
+      },
     },
   });
 
   if (!user) redirect("/auth/signin");
 
+  const latestSubscription = user.subscriptions[0] ?? null;
   const tierInfo = getTierBadgeConfig(user.tier);
   const formattedDate = user.createdAt.toLocaleDateString("fr-FR", {
     year: "numeric",
     month: "long",
   });
+  const supportNumber = process.env.SUPPORT_WHATSAPP_NUMBER ?? process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP;
+  const supportLink = latestSubscription?.status === "PENDING"
+    ? buildWhatsAppSupportLink({
+        phoneNumber: supportNumber,
+        message: buildSupportMessage(latestSubscription.providerRef),
+      })
+    : null;
+  const showSupportCta = latestSubscription?.status === "PENDING"
+    ? isOlderThanHours(latestSubscription.createdAt, SUPPORT_THRESHOLD_HOURS)
+    : false;
+  const showActivationNotice = latestSubscription?.status === "ACTIVE"
+    ? isRecent(latestSubscription.updatedAt, ACTIVATION_NOTICE_DAYS)
+    : false;
+  const statusCopy = latestSubscription
+    ? subscriptionStatusCopy[latestSubscription.status] ?? subscriptionStatusCopy.TRIAL
+    : null;
 
   return (
     <div className="mx-auto max-w-2xl px-4 py-8">
@@ -45,7 +119,15 @@ export default async function ProfilePage() {
         Gère tes informations personnelles
       </p>
 
-      {/* Profile header card */}
+      {showActivationNotice && latestSubscription ? (
+        <SubscriptionActivationNotice
+          className="mt-6"
+          subscriptionId={latestSubscription.id}
+          tier={latestSubscription.tier}
+          ctaHref="/opportunities"
+        />
+      ) : null}
+
       <Card className="mt-6">
         <CardHeader className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
           <AvatarUpload
@@ -74,9 +156,65 @@ export default async function ProfilePage() {
         </CardHeader>
       </Card>
 
+      <Card className="mt-6">
+        <CardHeader>
+          <CardTitle>Mon abonnement</CardTitle>
+          <CardDescription>
+            Suis l&apos;avancement de ton abonnement IBC.
+          </CardDescription>
+        </CardHeader>
+        <CardContent>
+          {latestSubscription ? (
+            <div className="space-y-5">
+              <div>
+                <Badge variant="outline" className={getTierBadgeConfig(latestSubscription.tier).className}>
+                  {getTierBadgeConfig(latestSubscription.tier).label}
+                </Badge>
+                <h2 className="mt-3 text-lg font-semibold">{statusCopy?.title}</h2>
+                <p className="mt-1 text-sm text-muted-foreground">{statusCopy?.description}</p>
+              </div>
+              <SubscriptionStatusTracker
+                status={latestSubscription.status}
+                submittedAt={latestSubscription.createdAt}
+                validatedAt={latestSubscription.status === "ACTIVE" ? latestSubscription.updatedAt : null}
+                cancelledAt={latestSubscription.status === "CANCELLED" || latestSubscription.status === "PAST_DUE" ? latestSubscription.updatedAt : null}
+              />
+              {showSupportCta ? (
+                supportLink ? (
+                  <a
+                    href={supportLink}
+                    target="_blank"
+                    rel="noreferrer"
+                    className="inline-flex min-h-11 items-center rounded-md bg-[#25D366] px-4 py-2 text-sm font-medium text-white hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
+                  >
+                    Contacter le support
+                  </a>
+                ) : (
+                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
+                    Le support WhatsApp n&apos;est pas encore configuré. Écris-nous à {SUPPORT_EMAIL} avec ta référence {latestSubscription.providerRef ?? "IBC"}.
+                  </div>
+                )
+              ) : null}
+            </div>
+          ) : (
+            <div className="rounded-lg border border-dashed p-5 text-sm">
+              <p className="font-medium">Aucun abonnement pour le moment</p>
+              <p className="mt-1 text-muted-foreground">
+                Choisis un tier pour rejoindre le club et accéder aux deals premium.
+              </p>
+              <Link
+                href="/pricing"
+                className="mt-4 inline-flex min-h-11 items-center rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
+              >
+                Voir les offres
+              </Link>
+            </div>
+          )}
+        </CardContent>
+      </Card>
+
       <Separator className="my-6" />
 
-      {/* Edit form */}
       <Card>
         <CardContent className="pt-6">
           <ProfileEditForm user={user} />
diff --git a/src/components/premium-access-blocked-panel.tsx b/src/components/premium-access-blocked-panel.tsx
new file mode 100644
index 0000000..f5cc35b
--- /dev/null
+++ b/src/components/premium-access-blocked-panel.tsx
@@ -0,0 +1,21 @@
+import Link from "next/link";
+
+export function PremiumAccessBlockedPanel() {
+  return (
+    <section
+      aria-label="Accès premium bloqué"
+      className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
+    >
+      <h2 className="text-lg font-semibold">Accès réservé aux membres actifs</h2>
+      <p className="mt-2 text-sm">
+        Votre abonnement est inactif. Renouvelez pour accéder aux deals.
+      </p>
+      <Link
+        href="/pricing"
+        className="mt-4 inline-flex min-h-11 items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
+      >
+        Voir les offres
+      </Link>
+    </section>
+  );
+}
diff --git a/src/components/subscription-activation-notice.test.tsx b/src/components/subscription-activation-notice.test.tsx
new file mode 100644
index 0000000..6205944
--- /dev/null
+++ b/src/components/subscription-activation-notice.test.tsx
@@ -0,0 +1,32 @@
+import { render, screen, waitFor } from "@testing-library/react";
+import userEvent from "@testing-library/user-event";
+import { beforeEach, describe, expect, it } from "vitest";
+
+import { SubscriptionActivationNotice } from "./subscription-activation-notice";
+
+describe("SubscriptionActivationNotice", () => {
+  beforeEach(() => {
+    window.localStorage.clear();
+  });
+
+  it("renders French activation celebration with tier badge and deals CTA", async () => {
+    render(<SubscriptionActivationNotice subscriptionId="sub-1" tier="BOSS" />);
+
+    expect(await screen.findByText("Bienvenue dans le club IBC !")).toBeInTheDocument();
+    expect(screen.getByText("Boss")).toBeInTheDocument();
+    expect(screen.getByRole("link", { name: "Découvrir les deals" })).toHaveAttribute("href", "/opportunities");
+  });
+
+  it("persists dismissal in localStorage by subscription id", async () => {
+    const user = userEvent.setup();
+    render(<SubscriptionActivationNotice subscriptionId="sub-dismiss" tier="AFFRANCHI" />);
+
+    await screen.findByText("Bienvenue dans le club IBC !");
+    await user.click(screen.getByRole("button", { name: "Masquer" }));
+
+    await waitFor(() => {
+      expect(screen.queryByText("Bienvenue dans le club IBC !")).not.toBeInTheDocument();
+    });
+    expect(window.localStorage.getItem("ibc:subscription-activation-notice:sub-dismiss")).toBe("dismissed");
+  });
+});
diff --git a/src/components/subscription-activation-notice.tsx b/src/components/subscription-activation-notice.tsx
new file mode 100644
index 0000000..1bb5b79
--- /dev/null
+++ b/src/components/subscription-activation-notice.tsx
@@ -0,0 +1,82 @@
+"use client";
+
+import { useState } from "react";
+import Link from "next/link";
+
+import { Badge } from "@/components/ui/badge";
+import { getTierBadgeConfig } from "@/lib/tier-config";
+import { cn } from "@/lib/utils";
+
+type SubscriptionActivationNoticeProps = {
+  subscriptionId: string;
+  tier: string;
+  ctaHref?: string;
+  className?: string;
+};
+
+export function SubscriptionActivationNotice({
+  subscriptionId,
+  tier,
+  ctaHref = "/opportunities",
+  className,
+}: SubscriptionActivationNoticeProps) {
+  const storageKey = `ibc:subscription-activation-notice:${subscriptionId}`;
+  const [isDismissed, setIsDismissed] = useState(() =>
+    typeof window === "undefined"
+      ? true
+      : window.localStorage.getItem(storageKey) === "dismissed"
+  );
+  const tierBadge = getTierBadgeConfig(tier);
+
+  function dismiss() {
+    window.localStorage.setItem(storageKey, "dismissed");
+    setIsDismissed(true);
+  }
+
+  if (isDismissed) {
+    return null;
+  }
+
+  return (
+    <section
+      aria-label="Notification d'activation d'abonnement"
+      className={cn(
+        "rounded-2xl border border-teal-200 bg-teal-50 p-5 shadow-sm dark:border-teal-900 dark:bg-teal-950/50",
+        "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-reduce:animate-none",
+        className
+      )}
+    >
+      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
+        <div>
+          <div className="flex flex-wrap items-center gap-2">
+            <span className="text-2xl" aria-hidden="true">🎉</span>
+            <h2 className="text-lg font-semibold text-teal-950 dark:text-teal-50">
+              Bienvenue dans le club IBC !
+            </h2>
+            <Badge variant="outline" className={tierBadge.className}>
+              {tierBadge.label}
+            </Badge>
+          </div>
+          <p className="mt-2 text-sm text-teal-900 dark:text-teal-100">
+            Ton abonnement est activé. Tu peux maintenant accéder aux deals premium et découvrir les opportunités vérifiées.
+          </p>
+          <div className="mt-4 flex flex-wrap gap-3">
+            <Link
+              href={ctaHref}
+              className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
+            >
+              Découvrir les deals
+            </Link>
+            <button
+              type="button"
+              onClick={dismiss}
+              className="inline-flex min-h-11 items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
+            >
+              Masquer
+            </button>
+          </div>
+        </div>
+      </div>
+    </section>
+  );
+}
diff --git a/src/components/subscription-status-tracker.test.tsx b/src/components/subscription-status-tracker.test.tsx
new file mode 100644
index 0000000..f3adee4
--- /dev/null
+++ b/src/components/subscription-status-tracker.test.tsx
@@ -0,0 +1,48 @@
+import { render, screen } from "@testing-library/react";
+import { describe, expect, it } from "vitest";
+
+import SubscriptionStatusTracker from "./subscription-status-tracker";
+
+describe("SubscriptionStatusTracker", () => {
+  it("renders timestamps and pending current state for the bank-transfer lifecycle", () => {
+    render(
+      <SubscriptionStatusTracker
+        status="PENDING"
+        submittedAt={new Date(2026, 4, 14, 10, 30)}
+      />
+    );
+
+    expect(screen.getByText("Essai")).toBeInTheDocument();
+    expect(screen.getByText("En attente")).toBeInTheDocument();
+    expect(screen.getByText("Actif")).toBeInTheDocument();
+    expect(screen.getByText("Paiement par virement en cours")).toBeInTheDocument();
+    expect(screen.getAllByText(/14 mai 2026/).length).toBeGreaterThan(0);
+  });
+
+  it("renders active completion timestamp", () => {
+    render(
+      <SubscriptionStatusTracker
+        status="ACTIVE"
+        submittedAt={new Date(2026, 4, 13, 9, 0)}
+        validatedAt={new Date(2026, 4, 14, 11, 15)}
+      />
+    );
+
+    expect(screen.getByText("Abonnement confirmé")).toBeInTheDocument();
+    expect(screen.getByText(/14 mai 2026/)).toBeInTheDocument();
+  });
+
+  it("renders invalid subscription explanatory copy without hiding lifecycle", () => {
+    render(
+      <SubscriptionStatusTracker
+        status="CANCELLED"
+        cancelledAt={new Date(2026, 4, 15, 8, 0)}
+      />
+    );
+
+    expect(screen.getByText("Abonnement annulé")).toBeInTheDocument();
+    expect(screen.getByText(/Votre abonnement n'est plus actif/)).toBeInTheDocument();
+    expect(screen.getByText("Essai")).toBeInTheDocument();
+    expect(screen.getByText("Actif")).toBeInTheDocument();
+  });
+});
diff --git a/src/components/subscription-status-tracker.tsx b/src/components/subscription-status-tracker.tsx
index 9a8ba87..e558e15 100644
--- a/src/components/subscription-status-tracker.tsx
+++ b/src/components/subscription-status-tracker.tsx
@@ -10,7 +10,7 @@ export type SubscriptionStatus =
   | "CANCELLED";
 
 interface Step {
-  key: SubscriptionStatus;
+  key: "TRIAL" | "PENDING" | "ACTIVE";
   label: string;
   description: string;
 }
@@ -19,7 +19,7 @@ const STEPS: Step[] = [
   {
     key: "TRIAL",
     label: "Essai",
-    description: "Période d'essai activée",
+    description: "Compte prêt pour le virement",
   },
   {
     key: "PENDING",
@@ -33,27 +33,100 @@ const STEPS: Step[] = [
   },
 ];
 
+const INVALID_STATUS_COPY: Partial<Record<SubscriptionStatus, { title: string; description: string }>> = {
+  CANCELLED: {
+    title: "Abonnement annulé",
+    description: "Votre abonnement n'est plus actif. Renouvelez votre accès pour consulter les deals premium.",
+  },
+  PAST_DUE: {
+    title: "Paiement en retard",
+    description: "Votre abonnement demande une régularisation avant de réactiver l'accès premium.",
+  },
+};
+
+type StepTimestamps = Partial<Record<"TRIAL" | "PENDING" | "ACTIVE", Date | string | null | undefined>>;
+
 interface SubscriptionStatusTrackerProps {
   status: SubscriptionStatus;
   className?: string;
+  submittedAt?: Date | string | null;
+  validatedAt?: Date | string | null;
+  cancelledAt?: Date | string | null;
+  stepTimestamps?: StepTimestamps;
+}
+
+function formatTimestamp(value?: Date | string | null) {
+  if (!value) {
+    return null;
+  }
+
+  const date = value instanceof Date ? value : new Date(value);
+  if (Number.isNaN(date.getTime())) {
+    return null;
+  }
+
+  return date.toLocaleDateString("fr-FR", {
+    day: "2-digit",
+    month: "long",
+    year: "numeric",
+    hour: "2-digit",
+    minute: "2-digit",
+  });
+}
+
+function getActiveIndex(status: SubscriptionStatus) {
+  if (status === "ACTIVE") {
+    return 2;
+  }
+
+  if (status === "PENDING") {
+    return 1;
+  }
+
+  if (status === "TRIAL") {
+    return 0;
+  }
+
+  return -1;
 }
 
 export default function SubscriptionStatusTracker({
   status,
   className,
+  submittedAt,
+  validatedAt,
+  cancelledAt,
+  stepTimestamps,
 }: SubscriptionStatusTrackerProps) {
-  const activeIndex = STEPS.findIndex((s) => s.key === status);
+  const activeIndex = getActiveIndex(status);
+  const invalidCopy = INVALID_STATUS_COPY[status];
+  const timestamps: StepTimestamps = {
+    TRIAL: stepTimestamps?.TRIAL ?? submittedAt,
+    PENDING: stepTimestamps?.PENDING ?? submittedAt,
+    ACTIVE: stepTimestamps?.ACTIVE ?? validatedAt,
+  };
+  const invalidTimestamp = formatTimestamp(cancelledAt);
 
   return (
     <div className={cn("w-full max-w-sm", className)}>
-      <ol className="relative flex flex-col gap-6 pl-4">
+      {invalidCopy ? (
+        <div className="mb-5 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
+          <p className="font-medium text-destructive">{invalidCopy.title}</p>
+          <p className="mt-1 text-muted-foreground">{invalidCopy.description}</p>
+          {invalidTimestamp ? (
+            <p className="mt-2 text-xs text-muted-foreground">Mis à jour le {invalidTimestamp}</p>
+          ) : null}
+        </div>
+      ) : null}
+
+      <ol className="relative flex flex-col gap-6 pl-4" aria-label="Cycle de vie de l'abonnement">
         {STEPS.map((step, index) => {
-          const isCompleted = index < activeIndex;
-          const isCurrent = index === activeIndex;
+          const isCompleted = activeIndex >= 0 && index < activeIndex;
+          const isCurrent = activeIndex >= 0 && index === activeIndex;
+          const stepTimestamp = formatTimestamp(timestamps[step.key]);
 
           return (
             <li key={step.key} className="flex items-start gap-4">
-              {/* Step dot / line */}
               <div className="flex flex-col items-center">
                 <div
                   className={cn(
@@ -76,6 +149,7 @@ export default function SubscriptionStatusTracker({
                       strokeWidth="2.5"
                       strokeLinecap="round"
                       strokeLinejoin="round"
+                      aria-hidden="true"
                     >
                       <polyline points="20 6 9 17 4 12" />
                     </svg>
@@ -95,7 +169,6 @@ export default function SubscriptionStatusTracker({
                 ) : null}
               </div>
 
-              {/* Text */}
               <div className="flex flex-col pt-0.5">
                 <span
                   className={cn(
@@ -109,12 +182,17 @@ export default function SubscriptionStatusTracker({
                 >
                   {step.label}
                   {isCurrent && status === "PENDING" ? (
-                    <span className="ml-2 inline-flex h-2 w-2 rounded-full bg-amber-500 animate-pulse dark:bg-amber-400" />
+                    <span className="ml-2 inline-flex h-2 w-2 rounded-full bg-amber-500 motion-safe:animate-pulse motion-reduce:animate-none dark:bg-amber-400" />
                   ) : null}
                 </span>
                 <span className="text-xs text-muted-foreground">
                   {step.description}
                 </span>
+                {stepTimestamp ? (
+                  <time className="mt-1 text-xs text-muted-foreground" dateTime={new Date(timestamps[step.key] as string | Date).toISOString()}>
+                    {stepTimestamp}
+                  </time>
+                ) : null}
               </div>
             </li>
           );
diff --git a/src/lib/email.test.ts b/src/lib/email.test.ts
new file mode 100644
index 0000000..6d438c7
--- /dev/null
+++ b/src/lib/email.test.ts
@@ -0,0 +1,37 @@
+import { beforeEach, describe, expect, it, vi } from "vitest";
+
+const mockSend = vi.hoisted(() => vi.fn());
+
+vi.mock("resend", () => ({
+  Resend: vi.fn(function ResendMock() {
+    return { emails: { send: mockSend } };
+  }),
+}));
+
+describe("email helpers", () => {
+  beforeEach(() => {
+    vi.resetModules();
+    vi.clearAllMocks();
+    process.env.RESEND_API_KEY = "test-key";
+    process.env.RESEND_FROM_EMAIL = "IBC <noreply@example.com>";
+    delete process.env.APP_URL;
+  });
+
+  it("sends the exact French subscription activation copy once through the Resend wrapper", async () => {
+    const { sendSubscriptionActivatedEmail } = await import("./email");
+
+    await sendSubscriptionActivatedEmail({
+      to: "member@example.com",
+      name: "Awa",
+      tier: "GRAND_FRERE",
+    });
+
+    expect(mockSend).toHaveBeenCalledTimes(1);
+    expect(mockSend).toHaveBeenCalledWith({
+      from: "IBC <noreply@example.com>",
+      to: "member@example.com",
+      subject: "Votre abonnement IBC est activé",
+      text: expect.stringContaining("Votre abonnement IBC Grands Frères est activé. Bienvenue dans le club !"),
+    });
+  });
+});
diff --git a/src/lib/whatsapp.test.ts b/src/lib/whatsapp.test.ts
new file mode 100644
index 0000000..d07bdd7
--- /dev/null
+++ b/src/lib/whatsapp.test.ts
@@ -0,0 +1,20 @@
+import { describe, expect, it } from "vitest";
+
+import { buildWhatsAppSupportLink, normalizeWhatsAppNumber } from "./whatsapp";
+
+describe("whatsapp helpers", () => {
+  it("normalizes phone numbers and encodes support messages safely", () => {
+    expect(normalizeWhatsAppNumber("+225 07 00 00 00 00")).toBe("2250700000000");
+
+    const link = buildWhatsAppSupportLink({
+      phoneNumber: "+225 07 00 00 00 00",
+      message: "Bonjour IBC, référence IBC-user-GRAND_FRERE",
+    });
+
+    expect(link).toBe("https://wa.me/2250700000000?text=Bonjour%20IBC%2C%20r%C3%A9f%C3%A9rence%20IBC-user-GRAND_FRERE");
+  });
+
+  it("returns null when no usable number is configured", () => {
+    expect(buildWhatsAppSupportLink({ phoneNumber: "", message: "Bonjour" })).toBeNull();
+  });
+});
diff --git a/src/lib/whatsapp.ts b/src/lib/whatsapp.ts
new file mode 100644
index 0000000..5a5f85b
--- /dev/null
+++ b/src/lib/whatsapp.ts
@@ -0,0 +1,24 @@
+export function normalizeWhatsAppNumber(number: string): string {
+  return number.replace(/[^\d]/g, "");
+}
+
+type BuildWhatsAppSupportLinkInput = {
+  phoneNumber?: string | null;
+  message: string;
+};
+
+export function buildWhatsAppSupportLink({
+  phoneNumber,
+  message,
+}: BuildWhatsAppSupportLinkInput): string | null {
+  if (!phoneNumber?.trim()) {
+    return null;
+  }
+
+  const normalized = normalizeWhatsAppNumber(phoneNumber);
+  if (!normalized) {
+    return null;
+  }
+
+  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
+}

```
