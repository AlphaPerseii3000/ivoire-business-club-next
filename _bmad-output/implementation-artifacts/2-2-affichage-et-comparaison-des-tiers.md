# Story 2.2: Affichage et Comparaison des Tiers

Status: review

<!-- Completion note: Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As a visitor or member,
I want to see the three IBC membership tiers (Affranchis, Grands Frères, Boss) with their benefits and prices,
so that I can choose the offer that matches my needs and see my current membership level clearly.

## Acceptance Criteria

1. **Three TierCards displayed with exact tier pricing and benefits**
   - Given a visitor on `/pricing` or the landing page tier section,
   - When they consult the tiers,
   - Then exactly three `TierCard` cards are displayed in this order:
     - **Affranchis**: `€29/mois`, benefit summary includes `accès deals vérifiés`
     - **Grands Frères**: `€49/mois`, benefit summary includes `deals prioritaires + events`
     - **Boss**: `€99/mois`, benefit summary includes `deals exclusifs + mentorat 1-1`
   - And the layout is vertical on mobile and horizontal/3-column on desktop.

2. **Current member tier visible on profile**
   - Given a connected member,
   - When they visit their profile page,
   - Then their current tier is displayed as a colored badge:
     - `AFFRANCHI` / Affranchis: teal
     - `GRAND_FRERE` / Grands Frères: amber
     - `BOSS` / Boss: violet
   - And the profile header displays the membership date in French (for the current schema, use `User.createdAt` as `Membre depuis ...`; do not add a schema field unless explicitly required by a later story).

3. **Mobile accessibility and French UX compliance**
   - Given a member or visitor on mobile,
   - When they interact with tier cards and their action buttons,
   - Then all tappable targets are at least `44×44px`, adjacent targets have sufficient spacing, all visible text is in French and jargon-free, and contrast meets WCAG 2.1 AA.
   - And color is never the only status indicator: selected/current tier states include text and/or icons in addition to color.

4. **No scope drift into payment submission**
   - Given Story 2.3 owns tier selection plus bank-transfer instructions,
   - When Story 2.2 is implemented,
   - Then it may create reusable `TierCard` selected/current-state UI support, but it must not create bank-transfer instruction screens, call `POST /api/subscriptions`, mutate subscriptions, or implement admin validation.

## Tasks / Subtasks

- [ ] Create a reusable tier configuration and remove contradictory hardcoded pricing (AC: 1)
  - [ ] Use existing `BANK_TRANSFER_CONFIG.amounts` from `src/lib/bank-transfer-config.ts` as the source of truth for monthly EUR amounts: `AFFRANCHI=29`, `GRAND_FRERE=49`, `BOSS=99`.
  - [ ] Create or update a small UI-facing tier config (recommended: `src/lib/tier-config.ts`) that adds labels, short descriptions, benefits, accent colors/classes, and CTA labels without duplicating amount literals.
  - [ ] Fix current incorrect `GRAND_FRERE` price (`59`) in `src/app/(public)/pricing/page.tsx` and `src/components/landing/pricing.tsx`.
  - [ ] Ensure labels are consistent: use `Affranchis`, `Grands Frères`, `Boss` in user-facing UI.

- [ ] Build reusable `TierCard` component (AC: 1, 3, 4)
  - [ ] Create `src/components/tier-card.tsx` (preferred for consistency with existing top-level `src/components/subscription-status-tracker.tsx`; do not create a broad component-directory refactor in this story).
  - [ ] Props should support display and future selection without forcing Story 2.3 behavior, for example: `tier`, `isSelected?`, `isCurrent?`, `actionLabel?`, `href?`, `onSelect?`, `disabled?`, `className?`.
  - [ ] Render tier name, `€XX/mois`, benefits list with check icons/text, and an action area.
  - [ ] Implement selected/current state with border/checkmark/text, not color alone. If using a clickable card, use `aria-pressed` when appropriate.
  - [ ] Use existing shadcn/base UI primitives where useful (`Card`, `Button`, `Badge`) and `cn()` from `src/lib/utils.ts`.
  - [ ] Ensure button/card interactive areas are `min-h-11` or equivalent (`44px`) and keyboard focus rings remain visible.

- [ ] Update public pricing surfaces to use `TierCard` (AC: 1, 3)
  - [ ] Update `/pricing` in `src/app/(public)/pricing/page.tsx` to render the three cards from shared config.
  - [ ] Update landing section `src/components/landing/pricing.tsx` to reuse the same `TierCard` and shared config.
  - [ ] Use mobile-first layout: `grid grid-cols-1 gap-... md:grid-cols-3` (or equivalent) with no horizontal overflow.
  - [ ] If annual/CFA launch toggles are kept, they must not obscure or contradict the AC monthly EUR prices; default view must clearly show `€29/€49/€99`.
  - [ ] CTA behavior in this story should be safe and non-mutating: unauthenticated users can go to `/auth/signup`; connected users can go to `/pricing`/future flow or see `Choisir` without payment creation. Do not call `/api/subscriptions` yet.

- [ ] Update profile tier badge and membership date display (AC: 2, 3)
  - [ ] Update `src/app/(dashboard)/profile/page.tsx` tier badge mapping to exact color semantics: teal for Affranchis, amber for Grands Frères, violet for Boss.
  - [ ] Preserve existing auth guard (`auth()` and redirect to `/auth/signin`) and Prisma query pattern.
  - [ ] Keep `Membre depuis {formattedDate}` using `fr-FR` formatting from `user.createdAt` unless a later story introduces a separate membership date.
  - [ ] Ensure badge text remains legible in light and dark mode; do not rely on `Badge variant` defaults if they map to the wrong color.

- [ ] Add focused tests / verification (AC: 1, 2, 3, 4)
  - [ ] Add component tests for `TierCard` rendering exact labels/prices/benefits and selected/current indicators.
  - [ ] Add/update page/component tests for landing pricing and `/pricing` to catch the `€49` regression for Grands Frères.
  - [ ] Add/update profile page test (or extract/test a tier badge helper if direct RSC testing is cumbersome) to verify tier color class mapping and `Membre depuis` copy.
  - [ ] Run `npx vitest run`.
  - [ ] Run `npm run build`.

## Dev Notes

### Critical context from Epic 2

Epic 2 enables members to choose a subscription tier, receive KS Investment bank-transfer instructions, and become active after manual admin validation. Story 2.2 is the display/comparison slice only. Story 2.3 owns actual selection continuation, bank-transfer instructions, and subscription creation. Story 2.4 owns admin validation. Story 2.5 owns status notifications. [Source: `_bmad-output/planning-artifacts/epics.md#Epic-2-Tiers-et-Paiement-par-Virement-Bancaire`]

### Existing implementation state to reuse, not reinvent

- `src/lib/bank-transfer-config.ts` already exists and defines monthly EUR amounts: `AFFRANCHI: 29`, `GRAND_FRERE: 49`, `BOSS: 99`. Treat this as the current pricing source of truth for Story 2.2. [Source: `src/lib/bank-transfer-config.ts`]
- `src/app/api/subscriptions/route.ts` already exists from Story 2.1. `POST /api/subscriptions` creates a `Subscription` in `TRIAL` and a pending `Payment` with `provider = BANK_TRANSFER`. Do **not** call it in Story 2.2; this belongs to Story 2.3 after the user has bank-transfer instructions/confirmation. [Source: `src/app/api/subscriptions/route.ts`]
- `src/components/subscription-status-tracker.tsx` already exists for future subscription state display. Do not duplicate it or expand subscription status UI in this story unless needed for profile layout compatibility. [Source: `src/components/subscription-status-tracker.tsx`]
- Prisma already has `Tier` enum values `AFFRANCHI`, `GRAND_FRERE`, `BOSS`, and `User.tier` defaults to `AFFRANCHI`. No schema change is required for Story 2.2. [Source: `prisma/schema.prisma`]

### Current files likely to modify and what to preserve

- `src/app/(public)/pricing/page.tsx`
  - Current state: client component with local period/currency toggles and an inline `tiers` array. It incorrectly sets `GRAND_FRERE.monthlyEur = 59`, while Epic/Story 2.1 config requires `49`.
  - Change: render shared tier config through `TierCard`; correct monthly EUR prices; preserve page route and public access.
  - Preserve: French headings, public navigation, responsive max-width layout, no auth requirement.

- `src/components/landing/pricing.tsx`
  - Current state: standalone landing pricing section with duplicated `tiers` data and the same incorrect `GRAND_FRERE.monthlyEur = 59`.
  - Change: reuse `TierCard` and shared tier config so landing and `/pricing` cannot diverge.
  - Preserve: section id `pricing` because landing nav links target `#pricing`.

- `src/app/(dashboard)/profile/page.tsx`
  - Current state: server component protected by `auth()`, queries `User` by session id, displays `Badge` for tier and `Membre depuis {formattedDate}` using `user.createdAt`.
  - Change: adjust tier badge colors/classes so `AFFRANCHI=teal`, `GRAND_FRERE=amber`, `BOSS=violet`.
  - Preserve: redirect behavior, selected user fields, profile edit form, avatar upload, verification badge, and French date formatting.

- `src/components/ui/button.tsx`
  - Current state: default button sizes are `h-8`/`h-9`, which are below the 44px touch-target requirement if used directly on mobile.
  - Change: do not globally change Button sizes in this story unless tests prove safe. Instead, pass `className="min-h-11 ..."` or equivalent from `TierCard` action buttons.
  - Preserve: existing Base UI/shadcn primitive behavior and focus-visible classes.

- `src/components/ui/badge.tsx`
  - Current state: variants do not map to Story 2.2 tier colors. `default` is primary/teal, `secondary` is amber, `outline` is neutral.
  - Change: use explicit tier badge class names or a small `TierBadge` helper; do not overload generic badge variants in a way that breaks other badges.

### Architecture and coding guardrails

- Framework: Next.js 16 App Router + React 19; use Server Components by default and Client Components only for interactivity. [Source: `_bmad-output/planning-artifacts/architecture.md#Frontend-Architecture`]
- UI stack: TailwindCSS 4 + shadcn/Base UI primitives; use `cn()` for class composition. [Source: `_bmad-output/planning-artifacts/ux-spec.md#Design-System-Foundation`]
- Component structure: current code uses `src/components/landing/*`, `src/components/ui/*`, and top-level reusable components such as `src/components/subscription-status-tracker.tsx`. Keep Story 2.2 changes localized; do not perform a broad move to `src/components/ibc/` or `src/components/shared/` in this story. [Source: `src/components/subscription-status-tracker.tsx`, `_bmad-output/planning-artifacts/architecture.md#Project-Structure-Boundaries`]
- Data access: Prisma remains the only data access layer; profile page should continue querying via `src/lib/prisma.ts`. [Source: `_bmad-output/planning-artifacts/architecture.md#Architectural-Boundaries`]
- Payment providers: never reintroduce Stripe or CinetPay. Story 2.0 and 2.1 removed runtime payment-provider code and established `BANK_TRANSFER` only. [Source: `_bmad-output/planning-artifacts/architecture.md#Implementation-Handoff`, `_bmad-output/implementation-artifacts/2-1-retrait-des-providers-de-paiement-tiers-et-preparation-virement.md`]

### UX requirements to implement exactly

- Tier colors from UX spec:
  - Affranchis: teal / primary
  - Grands Frères: amber / secondary
  - Boss: violet `#7C3AED` or Tailwind violet equivalent with AA-safe foreground
  [Source: `_bmad-output/planning-artifacts/ux-spec.md#Visual-Design-Foundation`]
- Tier card anatomy: header with name + price, feature list with checkmarks, CTA button; selected state uses thicker border + checkmark. [Source: `_bmad-output/planning-artifacts/ux-spec.md#Component-Strategy`]
- Onboarding/tier layout: mobile vertical stack; desktop horizontal/3-column layout. [Source: `_bmad-output/planning-artifacts/ux-spec.md#Onboarding-Tier-Selection`]
- Profile header: avatar + name + tier badge + member since date. [Source: `_bmad-output/planning-artifacts/ux-spec.md#Profile-Page`]
- Accessibility: 44×44px minimum touch targets, visible focus rings, semantic HTML, `lang="fr"`, French UI copy with diacritics, WCAG AA contrast. [Source: `_bmad-output/planning-artifacts/ux-spec.md#Responsive-Design-Accessibility`]

### Latest technical/version notes

- Project currently pins/uses: Next.js `16.2.6`, React `19.2.4`, Prisma `7.8.0`, next-auth `5.0.0-beta.31`, TailwindCSS `4.x`, Base UI `1.4.1`. Do not upgrade dependencies for this UI story. [Source: `package.json`]
- `npm view` on 2026-05-14 showed Next.js `16.2.6`, Prisma `7.8.0`, Base UI `1.4.1`, TailwindCSS `4.3.0`; React latest patch was newer than the pinned project version. This story must stay on the pinned project versions to avoid lockfile/build churn.
- `npm view next-auth version` reports the stable v4 line, while this project intentionally uses Auth.js v5 beta with split config. Do not downgrade or alter Auth.js for this story. [Source: `_bmad-output/planning-artifacts/architecture.md#Authentication-Security`, `package.json`]

### Previous story intelligence (Story 2.1)

- Story 2.1 created the bank-transfer foundation and passed `npx vitest run` and `npm run build` after review patch.
- Review finding P-002 was deferred: `Payment.amount` is currently `0`; Story 2.2 must not try to fix payment creation. Keep pricing display correct and leave payment amount semantics for Story 2.3/2.4 when the transfer flow consumes amount data.
- Avoid repeating the previous scope-drift risk: 2.2 is UI display/comparison, not bank-transfer submission.
- Recent commits show the project expects BMAD story status consistency: story file status and `sprint-status.yaml` must both be `ready-for-dev` before dev starts.

### Testing Standards

- Use Vitest and Testing Library patterns already present in the repo (`*.test.ts(x)` co-located with source files).
- Minimum test coverage for this story:
  - `TierCard` renders exact tier labels, prices, benefits, CTA text, and selected/current indicators.
  - Landing pricing and `/pricing` consume shared data and show `€29`, `€49`, `€99`.
  - Tier badge mapping returns/uses teal, amber, violet classes and profile copy includes `Membre depuis`.
- Required verification commands before moving to review:
  - `npx vitest run`
  - `npm run build`

### Non-goals / Do Not Do

- Do not implement bank-transfer instruction page, IBAN/RIB copy UI, reference generation UI, or `J'ai effectué le virement` flow (Story 2.3).
- Do not call `POST /api/subscriptions` from tier cards yet.
- Do not implement admin subscription validation, refusal, suspension, or emails (Story 2.4/2.5).
- Do not add or migrate Prisma schema fields for membership date; use `User.createdAt` for this story.
- Do not add Stripe/CinetPay dependencies, env vars, imports, comments, or placeholder code.
- Do not perform broad design-system refactors or directory reshuffles.

### References

- [Source: `_bmad-output/implementation-artifacts/sprint-status.yaml`]
- [Source: `_bmad-output/planning-artifacts/epics.md#Story-2.2-Affichage-et-Comparaison-des-Tiers`]
- [Source: `_bmad-output/planning-artifacts/prd.md#Tiers-Abonnements`]
- [Source: `_bmad-output/planning-artifacts/architecture.md#Frontend-Architecture`]
- [Source: `_bmad-output/planning-artifacts/ux-spec.md#Component-Strategy`]
- [Source: `_bmad-output/implementation-artifacts/2-1-retrait-des-providers-de-paiement-tiers-et-preparation-virement.md`]
- [Source: `src/lib/bank-transfer-config.ts`]
- [Source: `src/components/subscription-status-tracker.tsx`]
- [Source: `prisma/schema.prisma`]
- [Source: `src/app/(public)/pricing/page.tsx`]
- [Source: `src/components/landing/pricing.tsx`]
- [Source: `src/app/(dashboard)/profile/page.tsx`]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

### Change Log

- 2026-05-14: Story context created and marked ready-for-dev.
