---
Story: "5.2"
StoryKey: "5-2-score-de-fiabilite-et-badge-membre-platinum"
Title: "Score de Fiabilité et Badge Membre Platinum"
Status: "ready-for-dev"
Priority: "P1"
Epic: "Epic 5 — Reviews, Réputation et Confiance"
FRs: ["FR32", "FR33"]
NFRs: ["NFR-S5", "NFR-S8", "NFR-S9", "NFR-A1", "NFR-P2"]
Created: "2026-05-21"
---

# Story 5.2: Score de Fiabilité et Badge Membre Platinum

Status: ready-for-dev

<!-- Note: Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As a member with post-deal reputation signals,
I want my IBC reliability score and Platinum status to be visible when I qualify,
so that other members can assess my credibility before contacting or working with me.

## Acceptance Criteria

1. **Display the reliability score from received reviews**
   - Given a verified member has received reviews,
   - When their profile is viewed,
   - Then the profile displays a `Score de fiabilité IBC` with:
     - 5-star visual display,
     - numeric score rounded to one decimal, e.g. `4,7/5`,
     - review count, e.g. `12 avis reçus`.
   - And the calculation uses only reviews received by the member (`reviewsReceived` / `revieweeId`), never reviews written by the member.
   - And the calculation is deterministic and centralized in a reusable helper; do not duplicate average logic in pages/components.
   - And the no-review state does not show fake stars or a fake numeric score.

2. **Auto-award the Platinum badge when the member qualifies**
   - Given a member has at least 3 validated deals and an average received-review score >= 4.5/5,
   - When profile or deal-page reputation data is loaded,
   - Then the system persists the first Platinum award if it was not already awarded.
   - And `Membre Platinum` is displayed beside the member name/tier with an accessible tooltip: `Membre distingué : 3+ deals validés et excellentes reviews`.
   - And the first unlock experience shows a subtle celebratory confetti animation on the member profile.
   - And reloading the page or recalculating eligibility does not re-trigger persistence side effects or duplicate audit/notification effects.

3. **Keep awarded Platinum badge visible below the maintenance threshold**
   - Given a member was already awarded Platinum,
   - When their current received-review average drops below 4.5,
   - Then the Platinum badge remains visible.
   - And it includes an `À maintenir` indicator.
   - And the tooltip/copy clearly communicates that the member should maintain review quality.
   - And the badge is not removed automatically in this story.

4. **Display project-owner reliability on deal pages**
   - Given a verified deal is viewed by a member with access,
   - When the deal author has received reviews,
   - Then the author card on the deal page displays the author's reliability score and Platinum badge state.
   - And the same score helper/component used on the profile is reused; do not create a separate calculation path for deal pages.
   - And existing premium, tier, unpublished-deal, document, WhatsApp CTA, interest, review-form, and trust-badge behavior remains unchanged.

5. **Integrate with existing trust-level/gold logic without regressions**
   - Given an opportunity author qualifies with >=3 verified authored opportunities and average received-review score >=4.5,
   - When `getOpportunityTrustLevel` receives author stats,
   - Then the existing community gold criteria can produce `or` as before.
   - And Story 5.2 replaces the current `averageRating = null` placeholder on the deal detail page with the real received-review average.
   - And no Stripe/CinetPay/payment-provider code is introduced.

6. **Validation, accessibility, and test coverage pass**
   - Given this is a brownfield Next.js 16 / Prisma 7 project,
   - When the story is implemented,
   - Then `./node_modules/.bin/prisma validate`, targeted Vitest tests, `npx vitest run`, and `npm run build` pass.
   - And all new JSX conditional rendering uses ternaries, never `&&`.
   - And every compound boolean used for rendering is precomputed as a `const` before JSX return.
   - And every new conditional guard has tests for both branches.
   - And confetti/animations respect `prefers-reduced-motion`.

## Tasks / Subtasks

- [ ] **AC1: Add centralized reputation calculation helpers**
  - [ ] Create `src/lib/reputation.ts` (or equivalent) with pure functions for:
    - `calculateReliabilityScore(reviews)` returning `{ averageRating, reviewCount }`.
    - `roundReliabilityScore(value)` rounding to one decimal for display and threshold checks.
    - `isPlatinumEligible({ validatedDealsCount, averageRating })` using `validatedDealsCount >= 3 && averageRating >= 4.5`.
    - `getPlatinumDisplayState({ awardedAt, averageRating })` returning `none | active | maintain`.
  - [ ] Treat the MVP “weighted average” as equal weight per received review because no PRD/architecture artifact defines amount, tier, or recency weights. Implement the helper as an explicit weighted-average function with default weight `1` per review so future weighting can be added without changing page code.
  - [ ] Use only `review.rating` values from `Review` rows where the member is the `reviewee`; never include `reviewsWritten`.
  - [ ] Add `src/lib/reputation.test.ts` covering: no reviews, one review, multiple reviews, one-decimal rounding, threshold at exactly `4.5`, below threshold (`4.49`), and equal-weight behavior.

- [ ] **AC2/AC3: Persist first Platinum award state safely**
  - [ ] Extend `prisma/schema.prisma` `User` with persistent Platinum fields. Recommended minimal shape:
    ```prisma
    platinumAwardedAt DateTime?
    platinumUpdatedAt DateTime?
    ```
    Use existing Prisma naming conventions and let `@@map("users")` keep the mapped table.
  - [ ] Generate a migration with the project-standard Prisma command; do not hand-edit generated SQL unless necessary and documented.
  - [ ] Implement `ensurePlatinumAwarded(userId, stats)` in `src/lib/reputation.ts` or `src/lib/platinum.ts`.
  - [ ] Persistence side effect must be idempotent: update only when eligible and `platinumAwardedAt === null`; never overwrite first award timestamp.
  - [ ] Do not remove/clear `platinumAwardedAt` when the score drops below 4.5; display `À maintenir` instead.
  - [ ] If adding audit/notification entries for the award, guard them with the same persisted-state transition (`null -> timestamp`) so repeated page loads do not duplicate side effects. Audit/notification is optional unless an existing local pattern is trivial to reuse.
  - [ ] Add tests for: newly eligible persists once, already awarded does not update timestamp, below threshold does not award, previously awarded below threshold returns maintain state.

- [ ] **AC1/AC2/AC3: Build reusable score and badge UI components**
  - [ ] Add `src/components/features/reputation/reliability-score.tsx` for stars + numeric value + review count.
  - [ ] Add `src/components/features/reputation/platinum-badge.tsx` for active/maintain states.
  - [ ] Add `src/components/features/reputation/platinum-confetti.tsx` only if needed for first-unlock animation; prefer CSS/keyframes and existing UI primitives over adding a new dependency.
  - [ ] Use French UI copy:
    - `Score de fiabilité IBC`
    - `Pas encore d'avis reçus` for no-score state if rendered.
    - `Membre Platinum`
    - `À maintenir`
    - Tooltip: `Membre distingué : 3+ deals validés et excellentes reviews`.
  - [ ] Use accessible star text (`aria-label="4,7 sur 5 étoiles"`) and ensure color is not the only signal for Platinum/maintain state.
  - [ ] Use ternaries, not `&&`, in all JSX.
  - [ ] Add component tests for rendered score, no-score state, active Platinum, maintain Platinum, and reduced-motion-safe confetti rendering.

- [ ] **AC1/AC2/AC3: Update member profile reputation display**
  - [ ] Update `src/app/(dashboard)/members/[id]/page.tsx` to fetch the minimum required fields:
    - member `platinumAwardedAt`,
    - received review ratings/count for score,
    - count of validated deals authored by the member (`Opportunity` rows with `authorId = member.id` and `verificationStatus = "VERIFIED"`).
  - [ ] Keep the existing verified-profile guard: non-verified member profiles still call `notFound()`.
  - [ ] Preserve existing profile UI: back link, tier badge, verified badge, bio, location, tags, WhatsApp CTA, and `ReviewList`.
  - [ ] Display the reliability score near the header card before the detailed `Avis reçus` list.
  - [ ] Show `Membre Platinum` next to the name/tier only when `platinumAwardedAt` exists or the member qualifies and persistence succeeds.
  - [ ] Show `À maintenir` when `platinumAwardedAt` exists and current average is below 4.5.
  - [ ] Trigger the first-unlock confetti only when this request newly awards Platinum; do not show confetti just because the user is already Platinum.
  - [ ] If the current profile page is treated as a dashboard route, it must keep its auth redirect. If a new dashboard/public profile page is created, it must call `getUserPremiumAccess()` and render `PremiumAccessBlockedPanel` for non-subscribers unless explicitly public in route design.
  - [ ] Add page tests for: score visible with reviews, no fake score without reviews, active Platinum, maintain Platinum, no badge when not awarded/not eligible, confetti only on first award, and profile remains `notFound()` for unverified members.

- [ ] **AC4/AC5: Update deal detail author reputation display**
  - [ ] Update `src/app/(dashboard)/dashboard/opportunities/[id]/page.tsx` author include/query to get the author's received-review ratings and existing Platinum fields.
  - [ ] Replace the current `const averageRating = null;` with the real average from received reviews.
  - [ ] Preserve the existing `validatedDealsCount = opportunity.author.opportunities.length` pattern for authored verified opportunities.
  - [ ] Pass the real average to `getOpportunityTrustLevel` and `VerificationTimeline`.
  - [ ] Render the reusable `ReliabilityScore` and `PlatinumBadge` in the author card.
  - [ ] Do not expose deal details, documents, or author-only controls to users blocked by premium/tier/unpublished guards.
  - [ ] Do not change review form eligibility from Story 5.1; `canShowReviewForm` remains based on verified opportunity, premium access, tier access, interest age >=7 days, and no duplicate review.
  - [ ] Add page tests for: author score shown on deal page, `averageRating` passed into trust-level/gold criteria, blocked premium/tier users still see blocked panels instead of reputation internals, and existing review form branches still behave.

- [ ] **AC5/AC6: Integrate with trust-level tests and validation**
  - [ ] Update `src/lib/trust-level.test.ts` only if helper signatures change; preserve existing expectations that `validatedDealsCount >= 3 && averageRating >= 4.5` can yield `or` when the opportunity is verified and double verification is complete.
  - [ ] Add a regression test showing an author with `averageRating = 4.49` does not produce `or`/Platinum eligibility.
  - [ ] Add a regression test showing an already-awarded Platinum member with current `averageRating = 4.49` displays `À maintenir` but is not de-awarded.
  - [ ] Run `grep -rn '&&' src/ --include='*.tsx'` or equivalent and verify no new JSX conditional rendering uses `&&`.
  - [ ] Run required validation commands and record results in the Dev Agent Record.
  - [ ] Stage explicitly; never use unsafe `git add -A` that can include `dev.db` or SQLite artifacts.

## Dev Notes

### Critical product context

Epic 5 is the reputation layer: reviews are created in Story 5.1, Story 5.2 converts those reviews into reputation signals, and Story 5.3 later expands public review display. The business value is trust at a distance: members should see who is credible before contacting or investing. [Source: `_bmad-output/planning-artifacts/epics.md#Epic-5-Reviews-Réputation-et-Confiance`; `_bmad-output/planning-artifacts/prd.md#2.3-Lexpérience-de-confiance`]

FR32 requires an IBC reliability score for members/project owners. FR33 requires automatic `Membre Platinum` after 3+ validated deals and average reviews >=4.5/5. The badge must remain visible with `À maintenir` if the score later drops below 4.5. [Source: `_bmad-output/planning-artifacts/prd.md#8.5-Reviews--Réputation`; `_bmad-output/planning-artifacts/epics.md#Story-5.2-Score-de-Fiabilité-et-Badge-Membre-Platinum`]

### Scope boundaries to prevent mistakes

- Do not implement Story 5.3 pagination, latest-5 truncation, `Voir tous les avis`, or full public review-section redesign unless needed for clean reuse. Story 5.2 only needs score + badge + deal-page author reputation. [Source: `_bmad-output/planning-artifacts/epics.md#Story-5.3-Affichage-Public-des-Reviews-sur-Profil`]
- Do not invent an in-app messaging system; WhatsApp remains the primary contact exit. [Source: `_bmad-output/planning-artifacts/ux-spec.md#4.3-Anti-Patterns-to-Avoid`]
- Do not add Stripe/CinetPay or any payment-provider code; the product uses bank transfer only. [Source: `_bmad-output/planning-artifacts/architecture.md#Implementation-Handoff`]
- Do not create duplicate review models. Story 5.1 already added `Review` with `reviewerId`, `revieweeId`, `opportunityId`, `rating`, `comment`, unique `[reviewerId, opportunityId]`, and `reviewsReceived` / `reviewsWritten` relations. [Source: `_bmad-output/implementation-artifacts/5-1-reviews-mutuelles-postdeal.md#Brownfield-schema-state`; `prisma/schema.prisma#Review`]

### Brownfield state from Story 5.1

Story 5.1 is done and created the persistence and UI baseline this story must reuse:

- `Review` model exists in `prisma/schema.prisma` with relations to `User` and `Opportunity`.
- `src/app/api/opportunities/[id]/reviews/route.ts` creates reviews with auth, premium, tier, verified opportunity, self-review, interest-age, duplicate, and `P2002` guards.
- `src/components/features/deals/review-form.tsx` handles post-deal review submission.
- `src/components/features/reviews/review-list.tsx` displays received reviews on member profiles.
- `src/app/(dashboard)/members/[id]/page.tsx` already selects `reviewsReceived` newest-first and renders `ReviewList` when reviews exist.
- `src/app/(dashboard)/dashboard/opportunities/[id]/page.tsx` already includes the review form and still has `const averageRating = null;` for trust-level stats; this is the placeholder Story 5.2 must replace.

Do not rebuild any of these from scratch. Extend them. [Source: `_bmad-output/implementation-artifacts/5-1-reviews-mutuelles-postdeal.md#File-List`; `_bmad-output/implementation-artifacts/5-1-reviews-mutuelles-postdeal.md#Trust-level-integration-note`]

### Validated deals definition for this MVP

Use the existing model because there is no separate “closed deal” table:

- `validatedDealsCount` = count of `Opportunity` rows authored by the member with `verificationStatus === "VERIFIED"`.
- This matches existing `src/lib/trust-level.ts`, where community gold criteria already uses `{ validatedDealsCount, averageRating }` from the opportunity author. [Source: `src/lib/trust-level.ts#hasCommunityGoldCriteria`; `src/app/(dashboard)/dashboard/opportunities/[id]/page.tsx#validatedDealsCount`]
- Do not count `OpportunityInterest` rows as validated deals; they are soft commitments, not completed/validated deals.
- Do not count reviews written by a user as validated deals; reviews are reputation feedback, not deal validation.

### Reliability score calculation requirements

The artifacts say “moyenne pondérée” but define no business weights by amount, tier, recency, or reviewer status. To avoid inventing product logic, implement a centralized weighted-average helper using equal weight `1` for every received review in MVP. This satisfies the weighted-average shape while keeping the weighting rule explicit and future-proof.

Required behavior:

- Input: received review ratings only (`revieweeId = member.id`).
- Output average: `null` when no reviews; otherwise one decimal.
- Threshold comparisons: use the same rounded/normalized value consistently; avoid UI showing `4,5/5` while eligibility code treats the raw value as below threshold.
- Display locale: French decimal comma (`4,7/5`) using `Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })` or equivalent.
- Stars: render 5-star visual based on the numeric average; include screen-reader text. Partial stars are optional, but numeric score is mandatory.

### Platinum persistence requirements

A badge that “stays visible” cannot be purely computed from current score. Persist first award state on `User`, e.g. `platinumAwardedAt`. Without persistence, a member whose average later drops below 4.5 would lose the badge, violating AC3.

Recommended state logic:

```ts
type PlatinumState = "none" | "active" | "maintain";

const isEligibleNow = validatedDealsCount >= 3 && averageRating !== null && averageRating >= 4.5;
const hasAwardedBadge = user.platinumAwardedAt !== null;
const shouldAwardNow = isEligibleNow && !hasAwardedBadge;
const displayState = hasAwardedBadge || shouldAwardNow
  ? (isEligibleNow ? "active" : "maintain")
  : "none";
```

Implementation detail: do not put that compound ternary directly in JSX. Precompute booleans and display state before return.

### Existing files likely touched

- `prisma/schema.prisma` — add persistent Platinum fields to `User`.
- `prisma/migrations/**` — generated migration for Platinum fields.
- `src/lib/reputation.ts` or `src/lib/platinum.ts` — score calculation, eligibility, display state, idempotent award helper.
- `src/lib/reputation.test.ts` / `src/lib/platinum.test.ts` — calculation and transition tests.
- `src/components/features/reputation/reliability-score.tsx` and `.test.tsx` — score UI.
- `src/components/features/reputation/platinum-badge.tsx` and `.test.tsx` — badge UI.
- Optional `src/components/features/reputation/platinum-confetti.tsx` and `.test.tsx` — first-unlock celebration.
- `src/app/(dashboard)/members/[id]/page.tsx` and `.test.tsx` — score + badge on member profile.
- `src/app/(dashboard)/dashboard/opportunities/[id]/page.tsx` and `.test.tsx` — author score + badge on deal page; replace `averageRating = null`.
- `src/lib/trust-level.test.ts` — regression coverage if average integration changes.

### Current profile page behavior to preserve

`src/app/(dashboard)/members/[id]/page.tsx` currently:

- requires auth and redirects to `/auth/signin`,
- loads the member by id,
- calls `notFound()` for missing/non-verified profiles,
- displays name, tier badge, verified badge, member-since date, bio, location/country, tags, WhatsApp CTA for other profiles,
- renders `ReviewList` only when `reviewsReceived.length > 0`,
- uses `TagChips` directly and must avoid nested anchors if later wrapped by links.

Story 5.2 changes: add score and Platinum display while preserving all above behavior. [Source: `src/app/(dashboard)/members/[id]/page.tsx`]

### Current deal detail behavior to preserve

`src/app/(dashboard)/dashboard/opportunities/[id]/page.tsx` currently:

- requires auth and redirects to `/auth/signin`,
- loads premium access, current user, and opportunity in parallel,
- returns `PremiumAccessBlockedPanel` for inactive non-author/non-admin members,
- blocks insufficient tiers with the tier-blocked panel,
- hides unpublished opportunities from non-authors/non-admins,
- renders `TrustBadge`, `VerificationTimeline`, `DocumentUploadSection`, `WhatsAppCTA`, `InterestButton`, and Story 5.1 `ReviewForm`,
- computes `validatedDealsCount` from `opportunity.author.opportunities.length`,
- currently passes `averageRating = null` into `getOpportunityTrustLevel` and `VerificationTimeline`.

Story 5.2 changes: calculate real author average rating and display reusable reputation components on the author card. Do not move premium/tier guards after reputation queries in a way that leaks protected details. [Source: `src/app/(dashboard)/dashboard/opportunities/[id]/page.tsx`]

### Architecture and code guardrails

- Next.js 16 App Router with Server Components by default; only use client components for interactivity/animation. [Source: `_bmad-output/planning-artifacts/architecture.md#Frontend-Architecture`]
- Prisma 7: use the project Prisma singleton and generated client patterns; do not instantiate a separate Prisma client. [Source: `_bmad-output/planning-artifacts/architecture.md#Technical-Constraints-Dependencies`]
- API/Server Action response patterns: success `{ data: T }`, errors `{ error, code?, details? }` if any new mutation endpoint is added. Prefer direct server helper calls for page-level award checks if no external API is needed. [Source: `_bmad-output/planning-artifacts/architecture.md#API--Communication-Patterns`]
- Auth.js v5 split config: route handlers/server helpers can use `auth()` from `@/lib/auth`; never import Prisma or bcrypt into `auth.config.ts` or middleware. [Source: `_bmad-output/planning-artifacts/architecture.md#Authentication--Security`]
- Dashboard premium gating: all new dashboard pages must call `getUserPremiumAccess()` and render `PremiumAccessBlockedPanel` for non-subscribers. If this story only modifies existing pages, preserve their gates. [Source: `_bmad-output/implementation-artifacts/5-1-reviews-mutuelles-postdeal.md#Architecture-guardrails-to-follow`]
- JSX strict guardrail: use ternaries in JSX, never `&&`; precompute compound booleans as `const` before JSX return. [Source: `_bmad-output/planning-artifacts/architecture.md#JSX-Boolean-Guardrail-Nextjs-16-Strict`]
- Idempotent side effects: state-transition side effects must guard against re-execution on idempotent transitions. For Platinum, only persist/audit/notify on `platinumAwardedAt: null -> timestamp`. [Source: `_bmad-output/planning-artifacts/architecture.md#Idempotent-State-Transition-Side-Effects`]
- Any new conditional guard must have test coverage for both branches. [Source: `_bmad-output/implementation-artifacts/5-1-reviews-mutuelles-postdeal.md#Testing-guidance`]
- Git safety: do not use unsafe `git add -A`; explicitly exclude `dev.db` and SQLite artifacts. [Source: `_bmad-output/planning-artifacts/architecture.md#Dev-Agent-Git-Safety`]

### UX requirements

- UI language is French; avoid English terms in labels. [Source: `_bmad-output/planning-artifacts/ux-spec.md#2.5-Experience-Principles`]
- Trust signals must be visually prominent and understandable to non-technical members. [Source: `_bmad-output/planning-artifacts/ux-spec.md#1.4-Design-Opportunities`]
- Use teal/amber trust-first visual language; Platinum can use premium gold/amber styling, but maintain state must include text/icon and not rely on color alone. [Source: `_bmad-output/planning-artifacts/ux-spec.md#7.1-Color-System`]
- Confetti should be subtle and celebratory, matching UX success-state guidance, but must respect reduced motion. [Source: `_bmad-output/planning-artifacts/ux-spec.md#12.2-Feedback-Patterns`; `_bmad-output/planning-artifacts/ux-spec.md#13.3-Accessibility-Strategy`]
- Touch targets must be at least 44x44px where interactive. [Source: `_bmad-output/planning-artifacts/ux-spec.md#7.3-Spacing--Layout-Foundation`]

### Testing guidance

Use Vitest and existing patterns from Story 5.1:

- `src/lib/trust-level.test.ts` for pure trust logic.
- `src/lib/subscription-access.test.ts` for mocking Prisma helpers.
- `src/app/(dashboard)/dashboard/opportunities/[id]/page.test.tsx` for page branch tests with mocked auth/access/prisma.
- `src/app/(dashboard)/members/[id]/page.test.tsx` for profile rendering/notFound tests.
- `src/components/features/reviews/review-list.test.tsx` or analogous component tests for display components.

Minimum branch coverage:

- score: no reviews vs reviews present,
- eligibility: exactly 3 deals/4.5 score vs below deals vs below score,
- persistence: first award vs already awarded vs not eligible,
- display: no badge vs active badge vs maintain badge,
- profile: own profile vs other profile preserves WhatsApp CTA behavior,
- deal page: premium blocked/tier blocked still block before reputation UI,
- trust-level: real average feeds `or` when criteria pass and does not when average is below 4.5,
- confetti: first award true vs false; reduced motion does not create inaccessible animation behavior.

### Previous story intelligence

Story 5.1 completed the review foundation and established strict implementation patterns:

- Reuse the `Review` model and `ReviewList`; do not duplicate review storage or display logic.
- The route/page tests already cover premium, tier, verified opportunity, review eligibility, and duplicate branches; preserve them when editing deal/profile pages.
- Review route/server logic uses `sanitizeError` for unexpected errors; keep sensitive details out of logs if adding new server helpers.
- Existing review work intentionally did not implement Platinum; this story is the correct place to complete the average-rating and badge automation.
- Validation baseline after Story 5.1: Prisma validate passed, targeted review tests passed, `npx vitest run` passed, `npm run build` passed. Preserve that baseline. [Source: `_bmad-output/implementation-artifacts/5-1-reviews-mutuelles-postdeal.md#Debug-Log-References`; `_bmad-output/implementation-artifacts/5-1-reviews-mutuelles-postdeal.md#Completion-Notes-List`]

### Recent git intelligence

Recent commits show the current working pattern:

- `02ecdb4 chore(bmad): mark story 5-1 reviews mutuelles post-deal done — review PASS`
- `dda6a60 feat(story-5.1): reviews mutuelles post-deal`
- `7e8d941 docs(bmad): create story 5-1 reviews post-deal`
- `9e2592f chore(bmad): mark story 5-0 consolidation done — status done`
- `c71a19a test: add test for omitted tags in profile update API`

Continue the same pattern: update story/status separately from implementation, add focused tests, then full validation. [Source: `git log --oneline -5`]

### Latest technical specifics

Use the pinned project stack; do not upgrade dependencies as part of this story:

- Next.js `16.2.6`, React `19.2.4`, Prisma `7.8.0`, Auth.js `5.0.0-beta.31`, TailwindCSS `4.x`, Zod `4.4.3`, Vitest `4.1.6`. [Source: `package.json`; `_bmad-output/planning-artifacts/architecture.md#Technology-Versions`]
- Prefer pure TypeScript helpers for score/eligibility logic and existing shadcn/Tailwind primitives for UI. Do not add a confetti package unless absolutely necessary; CSS animation is sufficient and avoids dependency risk.

### References

- `_bmad-output/planning-artifacts/epics.md#Story-5.2-Score-de-Fiabilité-et-Badge-Membre-Platinum` — source ACs.
- `_bmad-output/planning-artifacts/epics.md#Epic-5-Reviews-Réputation-et-Confiance` — Epic objective.
- `_bmad-output/planning-artifacts/prd.md#8.5-Reviews--Réputation` — FR31–FR34.
- `_bmad-output/planning-artifacts/prd.md#6.5-Badge-Membre-Platinum` — Platinum as trust innovation.
- `_bmad-output/planning-artifacts/architecture.md#Implementation-Patterns--Consistency-Rules` — stack, structure, API, JSX, idempotence, git guardrails.
- `_bmad-output/planning-artifacts/ux-spec.md#3.4-Design-Implications` — badge animation and profile pride.
- `_bmad-output/implementation-artifacts/5-1-reviews-mutuelles-postdeal.md` — previous story implementation intelligence.
- `prisma/schema.prisma#Review` — existing review persistence.
- `src/lib/trust-level.ts` — existing community gold criteria.
- `src/app/(dashboard)/members/[id]/page.tsx` — profile page to extend.
- `src/app/(dashboard)/dashboard/opportunities/[id]/page.tsx` — deal detail page to extend.

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
