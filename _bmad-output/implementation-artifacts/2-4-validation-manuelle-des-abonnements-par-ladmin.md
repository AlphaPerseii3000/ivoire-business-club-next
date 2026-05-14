---
Story: "2.4"
StoryKey: "2-4-validation-manuelle-des-abonnements-par-ladmin"
Title: "Validation Manuelle des Abonnements par l'Admin"
Status: "in-progress"
Priority: "P0"
Epic: "Epic 2 — Tiers et Paiement par Virement Bancaire"
FRs: ["FR11", "FR12", "FR13", "FR14"]
NFRs: ["NFR-I2", "NFR-S9", "NFR-A1", "NFR-A3"]
Created: "2026-05-14"
---

# Story 2.4: Validation Manuelle des Abonnements par l'Admin

Status: in-progress

<!-- Completion note: Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As an IBC administrator,
I want to validate, refuse, or suspend subscriptions after confirming receipt of the bank transfer,
so that I can control access to the club.

## Acceptance Criteria

1. **Pending bank-transfer subscriptions are visible to admins**
   - Given an admin on `/admin/subscriptions`,
   - When they consult the pending subscription list,
   - Then they see subscriptions with `status = PENDING` and the following fields: member name, member email, tier, amount, submitted date, and bank-transfer reference.
   - And the list is protected by the existing `ADMIN` role guard and is inaccessible to non-admin members.

2. **Admin validates a pending subscription**
   - Given a subscription in `PENDING`,
   - When the admin clicks `Valider` after bank verification,
   - Then the subscription status becomes `ACTIVE`,
   - And the related payment status becomes `succeeded`,
   - And a confirmation email is sent to the member via Resend with French copy confirming activation,
   - And the member is considered eligible for premium access by the subscription-access helper.

3. **Admin refuses a pending subscription with a justification**
   - Given a subscription in `PENDING`,
   - When the admin clicks `Refuser`,
   - Then a required justification field appears before confirmation,
   - And submitting a non-empty justification changes the subscription status to `CANCELLED`,
   - And the related payment status becomes `failed`,
   - And the member receives a refusal email via Resend containing the justification.

4. **Admin suspends an active subscription**
   - Given a member with an `ACTIVE` subscription,
   - When the admin suspends the subscription,
   - Then the status changes to `CANCELLED` by default (or `PAST_DUE` only if the UI explicitly labels it as a payment delay),
   - And the related premium-access helper returns `false` for that member,
   - And no premium content gate treats the user as active after suspension.

5. **Lifecycle mismatch from Story 2.3 is resolved explicitly**
   - Given Story 2.3 currently creates a `Subscription` in `TRIAL` while Story 2.4 and the product lifecycle require admin processing of `PENDING`,
   - When this story is implemented,
   - Then the transfer-confirmation flow must produce a subscription that reaches `PENDING` before it appears in `/admin/subscriptions`.
   - Recommended implementation: update `POST /api/subscriptions` to set `Subscription.status = PENDING` after the user clicks `J'ai effectué le virement`, while preserving `Payment.status = pending` and the existing `SubscriptionStatusTracker status="PENDING"` UI.
   - Do not silently show `TRIAL` rows as `PENDING` without normalizing the stored status.

## Tasks / Subtasks

- [ ] Normalize the subscription lifecycle for submitted bank transfers (AC: 1, 5)
  - [ ] Update `src/app/api/subscriptions/route.ts` so a confirmed bank-transfer submission creates or transitions the subscription to `PENDING`, not only `TRIAL`.
  - [ ] Preserve current `provider = BANK_TRANSFER`, `providerRef = IBC-{userId}-{tier}`, and `Payment.status = pending` behavior from Story 2.3.
  - [ ] Update `src/app/api/subscriptions/route.test.ts` expectations from `TRIAL` to `PENDING` where the request represents `J'ai effectué le virement`.
  - [ ] Ensure `SubscriptionStatusTracker status="PENDING"` remains correct after confirmation; do not create a second tracker component.

- [ ] Create the admin subscriptions page (AC: 1, 2, 3, 4)
  - [ ] Add `src/app/(admin)/admin/subscriptions/page.tsx` for `/admin/subscriptions`.
  - [ ] Fetch pending subscriptions with Prisma, ordered oldest first or newest first consistently; include `user` fields (`name`, `email`) and match the related `Payment` by `providerRef` when possible.
  - [ ] Display member name, email, tier label, amount in EUR, submission date formatted with `fr-FR`, and transfer reference.
  - [ ] Also include an `Actifs` or `Abonnements actifs` section/filter for suspension of `ACTIVE` subscriptions, because AC4 requires active-subscription suspension.
  - [ ] Use the existing admin layout/route group. Current project has both `src/app/(admin)/layout.tsx` and `src/app/(admin)/admin/layout.tsx`; inspect rendered behavior before editing and avoid broad layout refactors.
  - [ ] Add `Abonnements` to admin navigation wherever needed so `/admin/subscriptions` is discoverable.
  - [ ] Include empty states in French: `Aucun virement en attente` and `Aucun abonnement actif`.

- [ ] Add admin subscription mutation endpoints or server actions (AC: 2, 3, 4)
  - [ ] Preferred route-handler shape for consistency with current admin APIs: `src/app/api/admin/subscriptions/[id]/route.ts` with `PATCH` JSON body `{ action: "validate" | "reject" | "suspend", reason?: string }`.
  - [ ] Alternative acceptable shape: action subroutes such as `/api/admin/subscriptions/[id]/validate`, `/reject`, `/suspend`, but keep API response format consistent.
  - [ ] Authenticate with `auth()` from `@/lib/auth`, then verify the session user exists and has `role === "ADMIN"`; return `401` for unauthenticated and `403` for non-admin.
  - [ ] Validate request body with Zod; `reason` is required and non-empty for `reject`; `reason` is optional for `suspend` but recommended.
  - [ ] Only allow `validate` and `reject` from current `PENDING`; only allow `suspend` from current `ACTIVE`. Return `400` or `409` with French error copy for invalid transitions.
  - [ ] Use a Prisma transaction to update the subscription and the related payment status together (`succeeded` on validation, `failed` on refusal, normally unchanged or `failed` on suspension depending on the chosen semantics).
  - [ ] Return `NextResponse.json({ data: ... })` on success and `{ error: string, code?: string }` on errors, matching project API conventions.

- [ ] Implement Resend transactional emails (AC: 2, 3; FR13; NFR-I2)
  - [ ] Verify whether the `resend` package is already installed. It is currently not listed in `package.json`; add it only if still absent (`npm install resend`) and commit the lockfile change.
  - [ ] Create a small reusable email module, recommended `src/lib/email.ts`, that initializes Resend from `process.env.RESEND_API_KEY` in server-only code.
  - [ ] Add `sendSubscriptionActivatedEmail({ to, name, tier })` with subject similar to `Votre abonnement IBC est activé` and body copy: `Votre abonnement IBC [Tier] est activé. Bienvenue dans le club !`.
  - [ ] Add `sendSubscriptionRejectedEmail({ to, name, tier, reason })` with French refusal copy and the admin justification included verbatim after escaping/templating safely.
  - [ ] Use an app sender from env if available (for example `RESEND_FROM_EMAIL`) or a safe default configured for Resend sandbox/dev; document any new env var in `.env.example` without inline comments after values.
  - [ ] In tests, mock the email module; do not call Resend.
  - [ ] Do not expose bank account details, full internal errors, API keys, or stack traces in emails or client responses.

- [ ] Add premium-access source of truth (AC: 2, 4; FR14)
  - [ ] Create or update a helper such as `src/lib/subscription-access.ts` with `hasActiveSubscription(userId)` and/or `getUserPremiumAccess(userId)`.
  - [ ] The helper must return `true` only when the user has at least one `Subscription.status = ACTIVE` and return `false` for `TRIAL`, `PENDING`, `CANCELLED`, and `PAST_DUE`.
  - [ ] Use this helper in any existing premium-gated route/component if such a gate already exists. If no premium content route exists yet, add tests for the helper and explicitly document that Story 2.5 will wire it into member-facing status/gating UI.
  - [ ] Do not fake premium access with `User.tier` alone; tier indicates chosen product level, not paid/active access.

- [ ] Build admin action UI with refusal/suspension justification (AC: 2, 3, 4)
  - [ ] Use a small client component for action buttons/dialog state, e.g. `src/components/admin-subscription-actions.tsx`, or server forms if they can meet the required justification UX.
  - [ ] `Valider` should ask for confirmation or show a clear loading state before calling the mutation endpoint.
  - [ ] `Refuser` must reveal a required textarea/field labeled in French, e.g. `Justification du refus`, before submitting.
  - [ ] `Suspendre` must be visibly destructive and explain that premium access will be blocked.
  - [ ] Provide success/error feedback via the existing Sonner toaster (`src/components/ui/sonner.tsx` is already mounted in `src/app/layout.tsx`).
  - [ ] Buttons must meet 44px touch target requirements, preserve focus rings, and not rely on color alone.

- [ ] Add focused tests and run verification (AC: 1, 2, 3, 4, 5)
  - [ ] Add route tests for admin mutation endpoint: unauthenticated `401`, non-admin `403`, invalid transition rejected, validate updates to `ACTIVE` + payment `succeeded` + activation email mock called, reject requires reason and updates to `CANCELLED` + payment `failed` + refusal email mock called, suspend blocks active access.
  - [ ] Add page/component tests for `/admin/subscriptions` or extracted presentational components showing required columns/fields and action buttons.
  - [ ] Add tests for `src/lib/subscription-access.ts` covering `ACTIVE` true and all non-active statuses false.
  - [ ] Update existing `/api/subscriptions` tests for the `PENDING` lifecycle normalization.
  - [ ] Run `npx vitest run`.
  - [ ] Run `npm run build`.

### Review Findings

- [ ] [Review][Patch] Implement the specified `GET /api/admin/subscriptions` route; the current build exposes only `/api/admin/subscriptions/[id]`, so the listed admin subscriptions API contract is missing [src/app/api/admin/subscriptions/route.ts:1]
- [ ] [Review][Patch] Replace the new boolean `&&` JSX conditional with a ternary returning `null` to satisfy the Next.js 16 strict project guardrail [src/components/admin-subscription-actions.tsx:69]

## Dev Notes

### Critical product context

Epic 2 enables members to select a tier, receive KS Investment bank-transfer instructions, submit the transfer, and become active only after manual admin validation. Stripe and CinetPay must remain completely absent. Story 2.4 is the operational control point: admins confirm receipt of bank transfers and decide whether membership access becomes active. [Source: `_bmad-output/planning-artifacts/epics.md#Epic-2-Tiers-et-Paiement-par-Virement-Bancaire`]

### Requirements traced to PRD / Epic / UX

- FR11: admin validates subscription after confirming bank transfer receipt. [Source: `_bmad-output/planning-artifacts/prd.md#8.2-Tiers--Abonnements`]
- FR12: admin refuses or suspends with justification. [Source: `_bmad-output/planning-artifacts/prd.md#8.2-Tiers--Abonnements`]
- FR13: member receives confirmation email after activation. [Source: `_bmad-output/planning-artifacts/prd.md#8.2-Tiers--Abonnements`]
- FR14: premium content is blocked for `CANCELLED` or `PAST_DUE`; for this story, implement the helper/source of truth even if Story 2.5 wires more member-facing UI. [Source: `_bmad-output/planning-artifacts/prd.md#8.2-Tiers--Abonnements`]
- NFR-I2: transactional emails via Resend or SendGrid; project planning standardizes on Resend. [Source: `_bmad-output/planning-artifacts/architecture.md#Integration-Points`]
- NFR-S9: audit trail is required for subscription transactions. There is no existing audit model; at minimum keep sanitized server logs and deterministic DB state transitions. Do not create a broad audit-log subsystem unless the implementation can keep it additive and tested. [Source: `_bmad-output/planning-artifacts/prd.md#9.2-Sécurité`]
- UX expects `StatusPill` semantics for PENDING/ACTIVE/CANCELLED, admin dashboard subscription management, French copy, and no dead-end states. [Source: `_bmad-output/planning-artifacts/ux-spec.md#Admin-Kanban-Dashboard`, `_bmad-output/planning-artifacts/ux-spec.md#Interaction-States`]

### Existing implementation state to reuse, not reinvent

- `src/app/api/subscriptions/route.ts` exists from Stories 2.1/2.3. It authenticates with `auth()`, validates `{ tier, period }`, creates a bank-transfer `Subscription`, and creates a pending `Payment` with amount from `getAmountForTier(tier)`. It currently stores `Subscription.status = "TRIAL"`; Story 2.4 must normalize submitted transfers to `PENDING` for admin validation. [Source: `src/app/api/subscriptions/route.ts`]
- `src/components/bank-transfer-instructions.tsx` already calls `POST /api/subscriptions` after `J'ai effectué le virement`, shows the exact toast `Merci ! Nous validons sous 24h.`, and renders `SubscriptionStatusTracker status="PENDING"`. Reuse this flow; only adjust expectations/status normalization as needed. [Source: `src/components/bank-transfer-instructions.tsx`]
- `src/components/subscription-status-tracker.tsx` already renders `TRIAL → PENDING → ACTIVE` and the pulsing amber `PENDING` state. Do not duplicate it. [Source: `src/components/subscription-status-tracker.tsx`]
- `src/lib/tier-config.ts` and `src/lib/bank-transfer-config.ts` are the sources of truth for labels and amounts (`AFFRANCHI=29`, `GRAND_FRERE=49`, `BOSS=99`, currency EUR, beneficiary KS Investment). Use them for admin display and emails. [Source: `src/lib/tier-config.ts`, `src/lib/bank-transfer-config.ts`]
- `src/app/(admin)/admin/opportunities/page.tsx` and `src/app/api/admin/opportunities/[id]/verify/route.ts` show current admin page/API patterns: `auth()` + Prisma role check + French UI. Improve quality where needed, but avoid unrelated refactors. [Source: `src/app/(admin)/admin/opportunities/page.tsx`, `src/app/api/admin/opportunities/[id]/verify/route.ts`]
- `src/app/layout.tsx` already mounts `<Toaster richColors />`; admin action components can use `sonner` without adding duplicate toasters. [Source: `src/app/layout.tsx`]

### Current files likely to create or modify and what to preserve

- `src/app/(admin)/admin/subscriptions/page.tsx` (NEW)
  - Purpose: protected admin list for `PENDING` subscriptions and active subscriptions that can be suspended.
  - Preserve: route URL `/admin/subscriptions`; server-side auth/role protection; French copy; accessible empty states.

- `src/app/api/admin/subscriptions/[id]/route.ts` (NEW)
  - Purpose: validate/reject/suspend status transitions.
  - Preserve: existing API response format, no raw SQL, no sensitive logs, strict admin authorization.

- `src/components/admin-subscription-actions.tsx` (NEW, recommended)
  - Purpose: client-side action buttons, loading states, refusal justification UI, toast feedback.
  - Preserve: no direct Prisma import in client components; call internal API only.

- `src/lib/email.ts` (NEW, recommended)
  - Purpose: Resend wrapper and subscription email helpers.
  - Preserve: server-only env usage, mockable functions for tests, French templates.

- `src/lib/subscription-access.ts` (NEW, recommended)
  - Purpose: single source of truth for premium access.
  - Preserve: `User.tier` is not enough; only active subscriptions grant access.

- `src/app/api/subscriptions/route.ts` (UPDATE)
  - Current state: creates a `TRIAL` subscription despite user already confirming bank transfer.
  - Change: create/transition to `PENDING` so `/admin/subscriptions` can list real pending subscriptions.
  - Preserve: provider/reference/amount behavior from Story 2.3 and existing JSON validation/auth handling.

- `src/app/(admin)/layout.tsx` and `src/app/(admin)/admin/layout.tsx` (UPDATE only if needed)
  - Current state: both contain admin navigation/sidebar-like UI. Inspect before changing to avoid creating duplicate navigation or broken layout.
  - Change: add `Abonnements` link where the active admin navigation actually renders.
  - Preserve: existing `ADMIN` role protection and `/dashboard` redirect for unauthorized users.

- `.env.example` and `package.json` / lockfile (UPDATE only if needed)
  - `RESEND_API_KEY` is documented, but `resend` is not currently in `package.json` at story creation time. Add `RESEND_FROM_EMAIL` only if the implementation uses it.
  - Do not add inline comments after env values; previous stories fixed dotenv parser issues.

### Architecture and coding guardrails

- Framework: Next.js 16.2.6 App Router + React 19.2.4. Use Server Components for admin data fetching and small Client Components for interactive actions. [Source: `_bmad-output/planning-artifacts/architecture.md#Technical-Constraints--Dependencies`, `package.json`]
- Auth: Auth.js v5 beta split config is mandatory. Server route/page code may import `auth` from `@/lib/auth`; middleware must import only Edge-safe `auth.config.ts`. Do not alter middleware/auth architecture. [Source: `_bmad-output/planning-artifacts/architecture.md#Authentication--Security`]
- Prisma: Prisma 7.8.0 generated client lives at `src/generated/prisma`; access DB through `src/lib/prisma.ts` only. Do not use raw SQL or old Prisma datasource URL assumptions. [Source: `_bmad-output/planning-artifacts/architecture.md#Data-Boundaries`]
- API: Route Handlers return `NextResponse.json({ data })` on success and `{ error, code?, details? }` on failure. Use `try/catch`, Zod validation, and sanitized server logging. [Source: `_bmad-output/planning-artifacts/architecture.md#API--Communication-Patterns`]
- Payments: `BANK_TRANSFER` only. Do not add Stripe/CinetPay files, SDKs, env vars, comments, checkout/webhook concepts, or placeholder code. [Source: `_bmad-output/planning-artifacts/architecture.md#Implementation-Handoff`]
- UI: TailwindCSS 4 + shadcn/Base UI primitives. All visible text in French with diacritics, no jargon for non-technical admins. [Source: `_bmad-output/planning-artifacts/ux-spec.md#Design-System-Foundation`]
- Accessibility: 44×44px touch targets, visible focus rings, semantic headings/buttons, status conveyed with text/icons and not color alone, WCAG 2.1 AA contrast. [Source: `_bmad-output/planning-artifacts/ux-spec.md#Responsive-Design--Accessibility`]

### Subscription status and payment semantics

Use this lifecycle for the dev implementation:

1. `TRIAL`: account exists / pre-payment state, not yet submitted for admin validation.
2. `PENDING`: member clicked `J'ai effectué le virement`; `Payment.status = pending`; admin must verify bank receipt.
3. `ACTIVE`: admin verified receipt; `Payment.status = succeeded`; premium access helper returns true.
4. `CANCELLED`: admin refused or suspended; premium access helper returns false.
5. `PAST_DUE`: reserved for explicit payment delay/renewal flow; only use if the UI labels the reason clearly.

The current code skips the stored `PENDING` subscription state. Fixing that mismatch is part of this story because `/admin/subscriptions` cannot satisfy AC1 otherwise.

### Email implementation notes

- Current planning says Resend is the chosen provider, but code search at story creation found no existing `src/lib/email.ts` and no `resend` dependency in `package.json`. Confirm before implementing because dependencies may change.
- Keep email templates simple and French. Minimum activation body: member name, tier label, activation confirmation, link to dashboard if `APP_URL` is available.
- Minimum refusal body: member name, tier label, refusal explanation, exact admin justification, support/contact guidance.
- Do not block future retry architecture in this story. If Resend fails, return a clear admin-facing error and log a sanitized server error; tests should cover the chosen behavior.

### Previous story intelligence (Story 2.3)

- Story 2.3 implemented the connected member tier-selection flow, `/pricing/virement`, copy controls, `POST /api/subscriptions`, payment amount storage (`29/49/99`), and global Sonner toaster. [Source: `_bmad-output/implementation-artifacts/2-3-selection-du-tier-et-instructions-de-virement.md`]
- The 2.3 code review found no unresolved decision/patch/defer findings and verified `npx vitest run` (164/164 tests) and `npx next build`. Keep this test suite green and update expectations intentionally rather than deleting coverage. [Source: `_bmad-output/implementation-artifacts/2-3-selection-du-tier-et-instructions-de-virement.md#Review-Findings`]
- Recent 2.3 implementation changed `src/lib/auth.ts` callback/provider behavior; do not make unrelated auth changes in Story 2.4. [Source: `git log --oneline -5`, commit `6875f0a feat(story-2.3): implement tier selection and bank transfer instructions`]
- 2.3 currently states admin validation and activation emails are non-goals; those responsibilities now belong to Story 2.4. [Source: `_bmad-output/implementation-artifacts/2-3-selection-du-tier-et-instructions-de-virement.md#Non-goals--Do-Not-Do`]

### Git intelligence

Recent commits show the Epic 2 pattern: story context is created/marked ready-for-dev first, dev implementation follows, then status moves through review/done with sprint-status synchronization. Relevant recent work:

- `6875f0a feat(story-2.3): implement tier selection and bank transfer instructions` created the bank-transfer UI/API/tests used by this story.
- `b11456e chore: mark Story 2-3 as in review in sprint-status and story file` and `f07fd3b chore(bmad): complete Story 2.3 code review` updated story/sprint metadata only.
- Continue the reuse-first pattern from Stories 2.2 and 2.3: shared config/helpers and focused tests, not duplicated pricing/status/payment logic.

### Latest technical/version notes

- Project pinned versions at story creation: Next.js `16.2.6`, React `19.2.4`, Prisma `7.8.0`, next-auth `5.0.0-beta.31`, TailwindCSS `4.x`, Vitest `4.1.6`, sonner `2.0.7`. Do not upgrade these for this story. [Source: `package.json`]
- `npm view` on 2026-05-14 reported: `resend` latest `6.12.3`, Next.js latest `16.2.6`, Prisma latest `7.8.0`, TailwindCSS latest `4.3.0`, and `npm view next-auth version` reports stable v4 (`4.24.14`) while this project intentionally uses Auth.js v5 beta. Do not downgrade next-auth.

### Testing Standards

- Test framework: Vitest 4 + Testing Library / user-event where relevant, with co-located `*.test.ts(x)` files matching current repo style. [Source: `package.json`, `src/app/api/subscriptions/route.test.ts`, `src/components/bank-transfer-instructions.test.tsx`]
- Mock `auth()`, `prisma`, email helpers, `fetch`, and `toast` as needed. Never call Resend in tests.
- Required verification before moving to review:
  - `npx vitest run`
  - `npm run build`

### Non-goals / Do Not Do

- Do not add Stripe, CinetPay, card payments, checkout pages, webhook handlers, payment SDKs, or related env vars/comments.
- Do not build member-facing notification center or full status profile UI; Story 2.5 owns broader member tracking/notifications.
- Do not implement marketplace premium deal visibility end-to-end unless a small existing gate can use the new helper safely; Epic 3/Story 2.5 will expand content gating.
- Do not perform broad admin layout refactors, design-system moves, or Prisma schema changes unrelated to subscription validation.
- Do not use `User.tier` alone as proof of paid access.

### References

- [Source: `_bmad-output/implementation-artifacts/sprint-status.yaml`]
- [Source: `_bmad-output/planning-artifacts/epics.md#Story-2.4-Validation-Manuelle-des-Abonnements-par-lAdmin`]
- [Source: `_bmad-output/planning-artifacts/prd.md#8.2-Tiers--Abonnements`]
- [Source: `_bmad-output/planning-artifacts/architecture.md#API--Communication-Patterns`]
- [Source: `_bmad-output/planning-artifacts/architecture.md#Authentication--Security`]
- [Source: `_bmad-output/planning-artifacts/ux-spec.md#Admin-Kanban-Dashboard`]
- [Source: `_bmad-output/implementation-artifacts/2-3-selection-du-tier-et-instructions-de-virement.md`]
- [Source: `src/app/api/subscriptions/route.ts`]
- [Source: `src/components/bank-transfer-instructions.tsx`]
- [Source: `src/components/subscription-status-tracker.tsx`]
- [Source: `src/lib/tier-config.ts`]
- [Source: `src/lib/bank-transfer-config.ts`]
- [Source: `src/app/(admin)/admin/opportunities/page.tsx`]
- [Source: `src/app/api/admin/opportunities/[id]/verify/route.ts`]
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
