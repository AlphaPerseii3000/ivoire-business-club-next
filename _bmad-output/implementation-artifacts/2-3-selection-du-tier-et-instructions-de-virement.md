---
Story: "2.3"
StoryKey: "2-3-selection-du-tier-et-instructions-de-virement"
Title: "Sélection du Tier et Instructions de Virement"
Status: "ready-for-dev"
Priority: "P0"
Epic: "Epic 2 — Tiers et Paiement par Virement Bancaire"
FRs: ["FR9", "FR10"]
UX_DRs: ["UX-DR6", "UX-DR11", "UX-DR32", "UX-DR13"]
Created: "2026-05-14"
---

# Story 2.3: Sélection du Tier et Instructions de Virement

Status: ready-for-dev

<!-- Completion note: Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As a connected member,
I want to select a membership tier and receive KS Investment bank-transfer instructions,
so that I can pay my IBC subscription by bank transfer and enter the manual validation flow.

## Acceptance Criteria

1. **Connected member selects a tier on `/pricing`**
   - Given a connected member on `/pricing`,
   - When they click `Sélectionner` for a tier,
   - Then the selected `TierCard` enters selected state with a thicker border and visible checkmark/text indicator,
   - And a `Continuer` button appears only after a tier is selected.

2. **Bank-transfer instruction page shows complete payment details**
   - Given a member has selected a tier,
   - When they click `Continuer`,
   - Then a bank-transfer instruction page is displayed with:
     - `Bénéficiaire : KS Investment`,
     - IBAN/RIB with a `Copier` button,
     - Amount auto-filled from the selected tier,
     - Auto-generated reference exactly in the format `IBC-{userId}-{tier}`,
     - A `Copier tout` button,
     - FAQ entry `Combien de temps pour la validation ?` → `Sous 24h ouvrées`.

3. **Member confirms bank transfer submission**
   - Given a member has made the transfer externally,
   - When they click `J'ai effectué le virement`,
   - Then a subscription is created with `status = TRIAL` and `provider = BANK_TRANSFER` (FR10),
   - And a pending bank-transfer payment record is created with the same reference and the tier amount,
   - And a toast appears: `Merci ! Nous validons sous 24h.`,
   - And `SubscriptionStatusTracker` displays the activation journey as `TRIAL → PENDING`, with the waiting/current step using the existing pulsing amber treatment.

## Tasks / Subtasks

- [ ] Convert `/pricing` into a member-aware tier selection flow without breaking public pricing (AC: 1)
  - [ ] Keep `/pricing` publicly readable for visitors; unauthenticated visitors must still be guided to `/auth/signup` or `/auth/signin`, not allowed to create subscriptions.
  - [ ] For authenticated members, render the existing three tiers from `MEMBERSHIP_TIERS` and reuse `TierCard` from `src/components/tier-card.tsx`.
  - [ ] Use `TierCard` props already created by Story 2.2: `isSelected`, `onSelect`, `actionLabel`, and selected/current text indicators. Do not duplicate tier card markup.
  - [ ] CTA copy for connected members must be `Sélectionner`; after selection, show exactly one `Continuer` action tied to the selected tier.
  - [ ] Preserve the mobile-first grid (`grid-cols-1 md:grid-cols-3`), 44px minimum touch targets, visible focus rings, and French copy.

- [ ] Create the bank-transfer instruction screen/page (AC: 2)
  - [ ] Add a route for the continuation step. Recommended: `src/app/(public)/pricing/virement/page.tsx` plus a small client child component for copy/confirm interactions; protect this route server-side with `auth()` and redirect unauthenticated users to `/auth/signin`.
  - [ ] Pass the selected tier through a validated query param or route segment; only allow `AFFRANCHI`, `GRAND_FRERE`, or `BOSS`.
  - [ ] Resolve the current `userId` from `auth()` and generate the displayed reference exactly as `IBC-{userId}-{tier}`. Do not append a timestamp on the user-visible transfer reference for this story.
  - [ ] Use `getBankTransferDetails()` / `BANK_TRANSFER_CONFIG` from `src/lib/bank-transfer-config.ts` for `beneficiary`, `iban`, `bic`, `bankAddress`, and `currency`; do not hardcode payment data in the page.
  - [ ] Use `getTierConfig()` / `getAmountForTier()` so the displayed amount remains `€29`, `€49`, or `€99` according to the selected tier.
  - [ ] Implement `Copier` for IBAN/RIB and `Copier tout` for a formatted block containing beneficiary, IBAN/RIB, BIC if present, amount, currency, and reference.
  - [ ] Include the FAQ copy exactly: `Combien de temps pour la validation ?` and `Sous 24h ouvrées`.
  - [ ] Use shadcn/base primitives already in the repo (`Card`, `Button`, `Badge`, optionally `Separator`) and TailwindCSS 4 classes. Client-only clipboard code must stay in a client component.

- [ ] Wire `J'ai effectué le virement` to subscription creation (AC: 3)
  - [ ] On confirm, call the existing authenticated `POST /api/subscriptions` endpoint with the selected tier and `period: "MONTHLY"`.
  - [ ] Update `src/app/api/subscriptions/route.ts` so the created `providerRef` matches the displayed reference format `IBC-{userId}-{tier}` for this flow; avoid a mismatch between the UI reference and database/API reference.
  - [ ] Fix the deferred Story 2.1 payment amount issue in the same endpoint: set `Payment.amount` to the tier amount from `getAmountForTier(tier)` instead of `0`, with `currency: "EUR"`, `provider: "BANK_TRANSFER"`, and `status: "pending"`.
  - [ ] Preserve `Subscription.status = "TRIAL"` per this story's AC/FR10. If the UI needs to show waiting validation, pass/display `SubscriptionStatusTracker status="PENDING"` after confirmation based on the pending transfer/payment state; do not silently mark the subscription `ACTIVE`.
  - [ ] Return enough data from the POST response for the UI to render confirmation safely: subscription id/status, tier, provider, providerRef, and amount/payment status if practical.
  - [ ] Show the success toast exactly: `Merci ! Nous validons sous 24h.` If using `sonner`, ensure a `Toaster` is present in the app without causing duplicate toasters.
  - [ ] Handle API errors with plain French copy and an actionable retry path; do not leave a dead-end state.

- [ ] Reuse and refine existing Epic 2 components/configuration (AC: 1, 2, 3)
  - [ ] Reuse `src/lib/tier-config.ts` labels, benefits, pricing, and badge/color classes from Story 2.2.
  - [ ] Reuse `src/lib/bank-transfer-config.ts`; extend it only if needed for an explicit `rib` display value, keeping env-driven bank details and `KS Investment` as the beneficiary.
  - [ ] Reuse `src/components/subscription-status-tracker.tsx` for the post-confirmation waiting state; do not create a second tracker component.
  - [ ] Preserve current Auth.js v5 split config: server code imports `auth` from `@/lib/auth`; middleware stays Edge-only and must not import Prisma/bcrypt.
  - [ ] Do not reintroduce Stripe, CinetPay, webhooks, checkout sessions, payment SDKs, or related env vars.

- [ ] Add focused tests and verification (AC: 1, 2, 3)
  - [ ] Update/add tests for `/pricing` covering connected-member selection: clicking `Sélectionner` marks the card selected and reveals `Continuer`.
  - [ ] Add tests for the instruction page/component covering beneficiary `KS Investment`, IBAN/RIB copy button, tier amount, `IBC-{userId}-{tier}` reference, `Copier tout`, and the 24h FAQ.
  - [ ] Add/update API route tests for `POST /api/subscriptions`: authenticated required, invalid tier rejected, valid tier creates `Subscription.status=TRIAL`, `provider=BANK_TRANSFER`, reference format `IBC-{userId}-{tier}`, and `Payment.amount` equals `29/49/99` instead of `0`.
  - [ ] Add a test that the confirmation UI renders `SubscriptionStatusTracker` in the pending/waiting visual state and shows the exact success toast copy (mock `toast` if needed).
  - [ ] Run `npx vitest run`.
  - [ ] Run `npm run build`.

## Dev Notes

### Critical product context

Epic 2 lets members choose an IBC tier, receive KS Investment bank-transfer instructions, and become active after manual admin validation. It intentionally removes dependency on third-party payment providers. Story 2.3 is the first mutating user-facing slice: tier selection → transfer instructions → bank-transfer subscription creation. Admin validation remains Story 2.4; activation notifications and invalid-access handling remain Story 2.5. [Source: `_bmad-output/planning-artifacts/epics.md#Epic-2-Tiers-et-Paiement-par-Virement-Bancaire`]

### Requirements traced to PRD / Epic / UX

- FR9: member can select a tier and receive bank-transfer instructions containing RIB KS Investment, amount, and reference. [Source: `_bmad-output/planning-artifacts/prd.md#8.2-Tiers--Abonnements`]
- FR10: system creates a subscription in `TRIAL` when the transfer is submitted. [Source: `_bmad-output/planning-artifacts/prd.md#8.2-Tiers--Abonnements`]
- Epic AC adds the success toast and `SubscriptionStatusTracker` display requirement after `J'ai effectué le virement`. [Source: `_bmad-output/planning-artifacts/epics.md#Story-2.3-Sélection-du-Tier-et-Instructions-de-Virement`]
- UX expects the subscription activation flow to be: select tier on `/pricing`, show RIB/amount/reference, user transfers externally, user clicks `J'ai effectué le virement`, feedback shows `TRIAL → PENDING`, admin later marks `ACTIVE`. [Source: `_bmad-output/planning-artifacts/ux-spec.md#6.5-Experience-Mechanics`]
- UX onboarding success target is a 3-click guided path: Google auth → tier choice → virement instructions. Keep this flow direct and low-friction. [Source: `_bmad-output/planning-artifacts/ux-spec.md#6.3-Success-Criteria`]

### Existing implementation state to reuse, not reinvent

- `src/components/tier-card.tsx` already supports `isSelected`, `isCurrent`, `actionLabel`, `href`, `onSelect`, disabled state, 44px action buttons, and text/checkmark selected/current indicators. Use it for AC1 instead of rebuilding tier cards. [Source: `src/components/tier-card.tsx`]
- `src/lib/tier-config.ts` already defines `AFFRANCHI`, `GRAND_FRERE`, `BOSS`, labels (`Affranchis`, `Grands Frères`, `Boss`), benefits, tier colors, and `priceLabel` from `BANK_TRANSFER_CONFIG.amounts`. [Source: `src/lib/tier-config.ts`]
- `src/lib/bank-transfer-config.ts` already defines `beneficiary: "KS Investment"`, `currency: "EUR"`, and amounts `AFFRANCHI=29`, `GRAND_FRERE=49`, `BOSS=99`; `getBankTransferDetails()` reads IBAN/BIC/address from environment. [Source: `src/lib/bank-transfer-config.ts`]
- `src/app/api/subscriptions/route.ts` already authenticates with `auth()`, validates `{ tier, period }`, creates a `Subscription` in `TRIAL`, and creates a pending `Payment` in a Prisma transaction. It currently appends a timestamp to `providerRef` and sets `Payment.amount = 0`; Story 2.3 should align these with the visible transfer reference and amount. [Source: `src/app/api/subscriptions/route.ts`]
- `src/components/subscription-status-tracker.tsx` already renders `TRIAL → PENDING → ACTIVE` with pulsing amber for current `PENDING`. Reuse it after confirmation. [Source: `src/components/subscription-status-tracker.tsx`]

### Current files likely to modify and what to preserve

- `src/app/(public)/pricing/page.tsx`
  - Current state: server component rendering public pricing cards with `href="/auth/signup"` and a note that detailed selection arrives later.
  - Change: make it member-aware and introduce selection for authenticated members, likely by splitting into a server wrapper plus client selection component.
  - Preserve: public readability, header/navigation, exact tier order/prices, mobile-first grid, and no payment mutation until the member confirms on the instruction page.

- `src/components/tier-card.tsx`
  - Current state: reusable card with selected/current support and non-mutating `onSelect` callback.
  - Change: only minor prop/class/test adjustments if AC1 needs a clearer thick border/checkmark; avoid broad refactors.
  - Preserve: Story 2.2 tests and landing/profile reuse.

- `src/app/(public)/pricing/virement/page.tsx` and/or child components (new)
  - Purpose: authenticated bank-transfer instruction page, copy controls, FAQ, confirmation action, and post-confirmation tracker.
  - Keep server-only auth/userId and env access in server code; keep clipboard/fetch/toast interactions in client components.

- `src/app/api/subscriptions/route.ts`
  - Current state: creates `TRIAL` subscription and pending payment with timestamped providerRef and `amount: 0`.
  - Change: reference must match `IBC-{userId}-{tier}` and payment amount must match the selected tier.
  - Preserve: `auth()` guard, Zod validation, transaction, `BANK_TRANSFER` provider, generic sanitized error logging, and French errors.

- `src/lib/bank-transfer-config.ts`
  - Current state: centralizes beneficiary, currency, amounts, and env-read bank details.
  - Change: extend only if the UI needs an explicit RIB string; keep the existing module as the source of truth.

- `src/app/layout.tsx` / toast plumbing
  - Current state: root layout has `ThemeProvider` and `AuthProvider`; no `Toaster` is currently visible in the root layout.
  - Change: if confirmation uses `sonner`, add one `Toaster` in a safe global location or reuse any existing project toaster if discovered.
  - Preserve: `html lang="fr"`, metadata, providers, and hydration behavior.

### Architecture and coding guardrails

- Framework: Next.js 16.2.6 App Router + React 19.2.4; prefer Server Components for auth/data and isolate interactivity in Client Components. [Source: `_bmad-output/planning-artifacts/architecture.md#Technical-Constraints--Dependencies`, `package.json`]
- Auth: Auth.js v5 beta split config is mandatory. Server route/page code may import `auth` from `@/lib/auth`; middleware must import only Edge-safe `auth.config.ts`. Do not alter auth architecture for this story. [Source: `_bmad-output/planning-artifacts/architecture.md#Technical-Constraints--Dependencies`]
- Prisma: Prisma 7.8.0 uses generated client at `src/generated/prisma` and the better-sqlite3 adapter via project setup. Do not introduce direct datasource URL assumptions or old Prisma import paths. [Source: `_bmad-output/planning-artifacts/architecture.md#Technical-Constraints--Dependencies`]
- UI: TailwindCSS 4 + shadcn/base UI primitives; use `cn()` for composed classes. Keep all visible UI copy in French and accessible. [Source: `_bmad-output/planning-artifacts/ux-spec.md#5.2-Implementation-Approach`]
- Accessibility: touch targets ≥44px, visible focus rings, semantic headings/buttons, color not the only indicator, WCAG 2.1 AA contrast. [Source: `_bmad-output/planning-artifacts/architecture.md#Cross-Cutting-Concerns-Identified`, `_bmad-output/planning-artifacts/ux-spec.md#2.5-Experience-Principles`]
- Payments: `BANK_TRANSFER` only. No Stripe/CinetPay dependencies, imports, comments, provider enums, API routes, SDKs, or env vars. [Source: `_bmad-output/planning-artifacts/architecture.md#Key-Architectural-Decisions`]

### UX requirements to implement exactly

- Tier selection state must be visibly selected through border/checkmark/text, not color alone. [Source: `_bmad-output/planning-artifacts/epics.md#Story-2.3-Sélection-du-Tier-et-Instructions-de-Virement`]
- Bank-transfer screen should feel professional and reassuring: clean RIB display, copy buttons, and `Nous validons sous 24h` reassurance. [Source: `_bmad-output/planning-artifacts/ux-spec.md#3.2-Emotional-Journey-Mapping`]
- Tier names are culturally meaningful; use `Affranchis`, `Grands Frères`, and `Boss` consistently in headings, CTAs, references, and confirmations. [Source: `_bmad-output/planning-artifacts/ux-spec.md#3.3-Micro-Emotions`]
- Journey copy must stay plain French and avoid banking jargon beyond required terms (`IBAN`, `RIB`, `BIC`, `Référence`). [Source: `_bmad-output/planning-artifacts/ux-spec.md#2.5-Experience-Principles`]

### Previous story intelligence (Story 2.2)

- Story 2.2 completed TierCard display/comparison and corrected the Grands Frères price to `€49/mois`; do not reintroduce the old `€59` regression. [Source: `_bmad-output/implementation-artifacts/2-2-affichage-et-comparaison-des-tiers.md`]
- Story 2.2 intentionally did not implement bank-transfer instructions or `POST /api/subscriptions`; Story 2.3 owns that mutation now. [Source: `_bmad-output/implementation-artifacts/2-2-affichage-et-comparaison-des-tiers.md#Non-goals--Do-Not-Do`]
- Existing Story 2.2 tests cover `TierCard`, tier config, landing pricing, and `/pricing` display. Update them carefully rather than deleting coverage. [Source: `src/components/tier-card.test.tsx`, `src/lib/tier-config.test.ts`, `src/app/(public)/pricing/page.test.tsx`]
- Story 2.2 implementation also added Link fixes in dashboard/opportunity pages; avoid unrelated route/link churn in Story 2.3. [Source: `_bmad-output/implementation-artifacts/2-2-affichage-et-comparaison-des-tiers.md#Dev-Agent-Record`]

### Git intelligence

Recent commits show the expected Epic 2 pattern: BMAD story context created first, dev implementation next, status moved through review, then completion recorded. Story 2.2 implementation commit created/reused shared tier config and tests instead of duplicating pricing data. Continue that reuse-first pattern for Story 2.3. [Source: `git log --oneline -5`, commit `36ca629 feat(tiers): Story 2.2 - TierCard component, tier config, pricing/profile integration, accessibility`]

### Testing Standards

- Test framework: Vitest 4 + Testing Library / user-event, with co-located `*.test.ts(x)` files matching current repo style. [Source: `package.json`, `src/components/tier-card.test.tsx`]
- Required verification before moving to review:
  - `npx vitest run`
  - `npm run build`
- Keep tests deterministic: mock `auth()`, `prisma`, `fetch`, clipboard (`navigator.clipboard.writeText`), and `toast`/sonner where needed.

### Non-goals / Do Not Do

- Do not implement admin subscription validation/refusal/suspension UI; that is Story 2.4.
- Do not send activation emails or in-app activation notifications; that is Story 2.5 / FR13.
- Do not implement premium content gating or invalid subscription blocking; that is Story 2.5 / FR14.
- Do not add Stripe, CinetPay, card payments, checkout pages, webhook handlers, or payment SDK dependencies.
- Do not add a new broad design-system/component folder structure; keep changes localized.
- Do not change Prisma schema unless a narrowly justified additive field is required. Existing `providerRef` and `Payment.amount` are sufficient for this story.

### References

- [Source: `_bmad-output/implementation-artifacts/sprint-status.yaml`]
- [Source: `_bmad-output/planning-artifacts/epics.md#Story-2.3-Sélection-du-Tier-et-Instructions-de-Virement`]
- [Source: `_bmad-output/planning-artifacts/prd.md#8.2-Tiers--Abonnements`]
- [Source: `_bmad-output/planning-artifacts/architecture.md#Technical-Constraints--Dependencies`]
- [Source: `_bmad-output/planning-artifacts/ux-spec.md#6.5-Experience-Mechanics`]
- [Source: `_bmad-output/implementation-artifacts/2-2-affichage-et-comparaison-des-tiers.md`]
- [Source: `src/components/tier-card.tsx`]
- [Source: `src/lib/tier-config.ts`]
- [Source: `src/lib/bank-transfer-config.ts`]
- [Source: `src/app/api/subscriptions/route.ts`]
- [Source: `src/components/subscription-status-tracker.tsx`]
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
