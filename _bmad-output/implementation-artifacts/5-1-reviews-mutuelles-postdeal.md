---
Story: "5.1"
StoryKey: "5-1-reviews-mutuelles-postdeal"
Title: "Reviews Mutuelles Post-Deal"
Status: "review"
Priority: "P1"
Epic: "Epic 5 — Reviews, Réputation et Confiance"
FRs: ["FR31", "FR34"]
NFRs: ["NFR-S5", "NFR-S8", "NFR-S9", "NFR-A1", "NFR-P2"]
Created: "2026-05-20"
---

# Story 5.1: Reviews Mutuelles Post-Deal

Status: review

<!-- Note: Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As an investor or project owner who completed a post-deal relationship,
I want to leave a review with a rating and comment for my counterpart,
so that transparency and trust inside IBC increase after each qualified relationship.

## Acceptance Criteria

1. **Show the post-deal review form only when the member is eligible**
   - Given a connected member is on a deal detail page,
   - When the member has marked interest in that deal and at least 7 days have elapsed since the `OpportunityInterest.createdAt`,
   - Then a section titled `Laisser un avis` appears with:
     - 5 clickable stars for the rating,
     - a text field for the comment with max 500 characters,
     - a `Soumettre mon avis` button.
   - And the section is not rendered before the 7-day delay.
   - And the section is not rendered for unauthenticated users, inactive subscriptions, insufficient tier access, non-interested members, deal authors reviewing themselves, or members who already reviewed the deal.

2. **Persist a valid review in the database**
   - Given an eligible member submits a review,
   - When the rating is an integer from 1 to 5 and the comment is non-empty and <= 500 characters,
   - Then the review is saved with `reviewerId`, `revieweeId`, `dealId`/`opportunityId`, `rating`, `comment`, `createdAt` (FR31),
   - And the response uses the project API success shape `{ data: ... }`,
   - And the deal page can refresh/revalidate to remove the form and show the new state.

3. **Display received reviews on member profiles**
   - Given a member has received at least one review,
   - When their profile page is consulted,
   - Then an `Avis reçus` section displays each review with star rating, comment, reviewer name, and date.
   - And the query only selects the fields required for display; do not leak private reviewer/reviewee data.

4. **Prevent duplicate reviews for the same deal**
   - Given a member already left a review for the same deal,
   - When they submit a second review,
   - Then the system refuses the request with `Vous avez déjà laissé un avis pour ce deal.`
   - And duplicate prevention is enforced both in application logic and via a database unique constraint.

5. **Guardrails and validation pass**
   - Given this is a brownfield Next.js 16 / Prisma 7 project,
   - When the story is implemented,
   - Then `./node_modules/.bin/prisma validate`, targeted Vitest tests, `npx vitest run`, and `npm run build` pass,
   - And all new JSX conditional rendering uses ternaries, never `&&`,
   - And every new conditional guard has tests covering both allowed and blocked branches.

## Tasks / Subtasks

- [x] **AC1/AC2: Add Review data model and migration**
  - [x] Extend `prisma/schema.prisma` with a new `Review` model; there is currently no Review model.
  - [x] Add `receivedReviews` and `writtenReviews` relations to `User`, and `reviews` relation to `Opportunity`.
  - [x] Use the existing brownfield naming conventions: Prisma PascalCase model, camelCase fields, `@@map("reviews")`, indexes on reviewee/date and opportunity/date.
  - [x] Enforce duplicate prevention with `@@unique([reviewerId, opportunityId])`; this allows mutual reviews because the author and investor have different `reviewerId` values for the same opportunity.
  - [x] Keep cascade delete behavior consistent with existing models (`OpportunityInterest`, `Document`, `Notification`) unless Prisma requires a safer relation strategy.
  - [x] Generate a migration with `prisma migrate dev --name add_reviews` or the project-standard equivalent; never hand-edit generated SQL unless needed and documented.

- [x] **AC2/AC4: Add validation and mutation endpoint**
  - [x] Add a `reviewCreateSchema` in `src/lib/validations.ts` with `rating: int 1..5` and `comment: string.trim().min(1).max(500)`.
  - [x] Create `src/app/api/opportunities/[id]/reviews/route.ts` for authenticated review submission.
  - [x] Use `auth()` from `@/lib/auth`; never import Prisma/bcrypt into `auth.config.ts` or middleware.
  - [x] Verify premium access with `getUserPremiumAccess(userId)` and tier access with `canUserAccessOpportunity(opportunity.requiredTier, currentUser.tier)` before allowing the mutation.
  - [x] Verify the opportunity exists, is `VERIFIED`, and the reviewer is not reviewing themselves.
  - [x] Verify eligibility from `OpportunityInterest`: current user must have an interest record for the opportunity and `interest.createdAt <= now - 7 days`.
  - [x] Compute `revieweeId` as the opportunity author for an interested investor review. If author-to-investor mutual reviews are implemented in this story, require an explicit eligible interested member target and validate that target has an interest on the same opportunity; never trust a raw `revieweeId` without this check.
  - [x] Use a Prisma transaction or safe create path that handles Prisma `P2002` unique constraint errors and returns the exact duplicate message.
  - [x] Return structured errors with project format `{ error, code?, details? }`; log unexpected errors with `sanitizeError` to avoid sensitive data in logs.
  - [x] Revalidate `/dashboard/opportunities/[id]` or use a client refresh after success so the duplicate prevention state is reflected immediately.

- [x] **AC1: Add review form on the deal detail page**
  - [x] Create a client component such as `src/components/features/deals/review-form.tsx` using existing UI primitives and no new form library unless already present patterns require React Hook Form.
  - [x] Render 5 accessible star buttons (`aria-label` per rating) and a max-500-character textarea/counter.
  - [x] Disable submit while pending; show inline validation and server errors in French.
  - [x] In `src/app/(dashboard)/dashboard/opportunities/[id]/page.tsx`, include the current user interest `createdAt` and any existing review by the current user for this opportunity.
  - [x] Precompute booleans before JSX, e.g. `const canShowReviewForm = ...`; render with `{canShowReviewForm ? <ReviewForm ... /> : null}`.
  - [x] Preserve existing premium gate, tier gate, document access rules, WhatsApp CTA, interest button, and trust badge behavior.
  - [x] Do not introduce nested anchors; keep interactive controls outside any parent `Link` wrapper.

- [x] **AC3: Display received reviews on profiles**
  - [x] Update `src/app/(dashboard)/members/[id]/page.tsx` to query received reviews ordered newest-first.
  - [x] Add `Avis reçus` section with stars, comment, reviewer name, and `toLocaleDateString("fr-FR")` date formatting.
  - [x] Render an empty state only if needed for this story; Story 5.3 will expand public review display, average rating, pagination, and `Avis et Réputation` public section.
  - [x] If also displaying on the current user's own `/profile` page, reuse a shared display component to avoid duplicate UI logic.
  - [x] Preserve the verified-profile guard: non-verified member profiles still call `notFound()`.

- [x] **AC4/AC5: Add comprehensive tests for branch coverage**
  - [x] Add route tests for `POST /api/opportunities/[id]/reviews`: unauthenticated, inactive subscription, tier too low, opportunity missing, not verified, author self-review blocked, no interest, interest younger than 7 days, valid create, duplicate `P2002` path.
  - [x] Add validation tests for rating bounds, integer-only rating, empty comment, max 500 characters.
  - [x] Add component/page tests covering form hidden before 7 days and visible after 7 days.
  - [x] Add profile page tests covering `Avis reçus` rendered when reviews exist and hidden/empty when none exist.
  - [x] Ensure tests assert no duplicate notification/email side effects are created; this story does not require notifications for reviews unless explicitly added later.

- [x] **AC5: Validation and final hygiene**
  - [x] Run `./node_modules/.bin/prisma validate`.
  - [x] Run targeted tests for the new review route/components/pages.
  - [x] Run `npx vitest run`.
  - [x] Run `npm run build`.
  - [x] Run a JSX guardrail check such as `grep -rn '&&' src/ --include='*.tsx'` and confirm no new `&&` JSX render guards were introduced.
  - [x] Stage explicitly; do not use unsafe `git add -A` that can include `dev.db` or SQLite artifacts.

## Dev Notes

### Critical context

Epic 5 begins the reputation layer. Story 5.1 is the first persistence/UI slice for reviews: create the missing Review model, let eligible interested members submit one review after a 7-day post-interest delay, display received reviews on profiles, and prevent duplicate reviews per reviewer/deal. [Source: `_bmad-output/planning-artifacts/epics.md#Story-5.1-Reviews-Mutuelles-Post-Deal`]

The PRD positions post-deal reviews as part of the trust infrastructure and explicitly scopes Phase 1 to mutual post-deal reviews. FR31 requires investor/project-owner reviews with rating + comment; FR34 requires reviews visible on member profiles. [Source: `_bmad-output/planning-artifacts/prd.md#8.5-Reviews--Réputation`]

### Brownfield schema state

`prisma/schema.prisma` already has `User`, `Opportunity`, and `OpportunityInterest`, but no `Review` model. `OpportunityInterest` is the existing soft-commitment model and is the correct eligibility source for this story. Do not create a separate "deal commitment" table. [Source: `prisma/schema.prisma#OpportunityInterest`]

Recommended model shape:

```prisma
model Review {
  id            String   @id @default(cuid())
  reviewerId    String
  revieweeId    String
  opportunityId String
  rating        Int
  comment       String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  reviewer    User        @relation("ReviewsWritten", fields: [reviewerId], references: [id], onDelete: Cascade)
  reviewee    User        @relation("ReviewsReceived", fields: [revieweeId], references: [id], onDelete: Cascade)
  opportunity Opportunity @relation(fields: [opportunityId], references: [id], onDelete: Cascade)

  @@unique([reviewerId, opportunityId])
  @@index([revieweeId, createdAt])
  @@index([opportunityId, createdAt])
  @@map("reviews")
}
```

Add matching relation fields:

```prisma
// User
reviewsWritten  Review[] @relation("ReviewsWritten")
reviewsReceived Review[] @relation("ReviewsReceived")

// Opportunity
reviews Review[]
```

If Prisma relation naming or generated SQL requires slight adjustment, preserve the same semantics: one review per reviewer per opportunity, explicit reviewer/reviewee relations, and query indexes for profile display.

### Eligibility and duplicate rules

Eligibility is not just "connected user on page": the user must be able to access the verified opportunity, have an `OpportunityInterest` record for the opportunity, and the record must be at least 7 days old. This avoids reviews from drive-by users and aligns with the AC wording. [Source: `_bmad-output/planning-artifacts/epics.md#Story-5.1-Reviews-Mutuelles-Post-Deal`]

Use the existing access model:

- Dashboard deal pages already gate inactive subscriptions with `getUserPremiumAccess + PremiumAccessBlockedPanel`.
- Deal detail page already checks `canUserAccessOpportunity` for tier access.
- The review API must repeat server-side premium/tier/verified/interest eligibility checks; UI hiding is not security.

Duplicate prevention must be enforced twice:

1. Query existing review to hide the form and produce a friendly UI state.
2. Database `@@unique([reviewerId, opportunityId])` plus `P2002` handling to prevent race-condition duplicates.

Exact duplicate message: `Vous avez déjà laissé un avis pour ce deal.`

### Existing files likely touched

- `prisma/schema.prisma` — add `Review` and relations.
- `prisma/migrations/**` — generated migration for reviews table and indexes.
- `src/lib/validations.ts` and `src/lib/validations.test.ts` — `reviewCreateSchema` and validation tests.
- `src/app/api/opportunities/[id]/reviews/route.ts` and `.test.ts` — review creation endpoint.
- `src/components/features/deals/review-form.tsx` and `.test.tsx` — client review UI.
- `src/app/(dashboard)/dashboard/opportunities/[id]/page.tsx` and `.test.tsx` — eligibility data, form rendering, preserve gates.
- `src/app/(dashboard)/members/[id]/page.tsx` and `.test.tsx` — `Avis reçus` section.
- Optional shared component: `src/components/features/reviews/review-list.tsx` if profile and current-user profile share rendering.

### Current deal detail page behavior to preserve

`src/app/(dashboard)/dashboard/opportunities/[id]/page.tsx` currently:

- requires auth and redirects to `/auth/signin`,
- loads premium access, current user role/tier, and opportunity in parallel,
- returns `PremiumAccessBlockedPanel` for inactive non-author/non-admin members,
- returns a tier-blocked panel if active but insufficient tier,
- hides unpublished opportunities from non-authors/non-admins,
- renders `TrustBadge`, `VerificationTimeline`, `DocumentUploadSection`, `WhatsAppCTA`, and `InterestButton`,
- uses `interestCount` and notification `highlight=interests`,
- currently sets `averageRating = null` while `validatedDealsCount` is already wired into `getOpportunityTrustLevel`.

Do not regress any of these. The review work should be additive and must not expose documents or deal details to users blocked by premium/tier gates. [Source: `src/app/(dashboard)/dashboard/opportunities/[id]/page.tsx`]

### Trust-level integration note

`src/lib/trust-level.ts` already supports `authorStats.averageRating` and `validatedDealsCount`. Story 5.1 does not need to complete Story 5.2 score/badge automation, but it should avoid blocking it:

- It is acceptable to leave deal trust average as `null` in 5.1 if the story focuses only on review create/display.
- If average rating is easy to query without scope creep, compute it from received reviews and pass it into `authorStats.averageRating`.
- Do not implement Platinum badge rules or unlock animation in this story; those belong to Story 5.2. [Source: `src/lib/trust-level.ts`; `_bmad-output/planning-artifacts/epics.md#Story-5.2-Score-de-Fiabilité-et-Badge-Membre-Platinum`]

### Profile display scope

Story 5.1 requires an `Avis reçus` profile section. Story 5.3 later expands this into public `Avis et Réputation` with average rating, total review count, latest 5, avatars, truncation, and "Voir tous les avis" behavior. Keep 5.1 minimal and do not implement Story 5.3 pagination/aggregate UI unless necessary for clean reuse. [Source: `_bmad-output/planning-artifacts/epics.md#Story-5.3-Affichage-Public-des-Reviews-sur-Profil`]

### Architecture guardrails to follow

- Prisma 7: use `src/lib/prisma.ts` / generated client patterns; do not instantiate a separate Prisma client. [Source: `_bmad-output/planning-artifacts/architecture.md#Technical-Constraints-Dependencies`]
- API response shape: success `{ data: T }`, errors `{ error: string, code?: string, details?: ... }`. [Source: `_bmad-output/planning-artifacts/architecture.md#API-Communication-Patterns`]
- Auth.js v5 split config: route handlers can use `auth()` from `@/lib/auth`; middleware and `auth.config.ts` must remain Edge-safe. [Source: `_bmad-output/planning-artifacts/architecture.md#Authentication-Security`]
- JSX guardrail: no `&&` in JSX; precompute compound booleans and render with ternaries. [Source: `_bmad-output/planning-artifacts/architecture.md#JSX-Boolean-Guardrail-Nextjs-16-Strict`]
- Nested anchors: do not put interactive review controls or tag links inside parent `<Link>` wrappers. [Source: `_bmad-output/planning-artifacts/architecture.md#Card-Component-Anti-Pattern-Nested-Anchors`]
- Idempotent side effects: if adding any notification/email/audit side effects, gate them by actual persisted state change. This story does not require review notifications. [Source: `_bmad-output/planning-artifacts/architecture.md#Idempotent-State-Transition-Side-Effects`]
- New dashboard pages or gated dashboard sections must replicate sibling premium access gates (`getUserPremiumAccess + PremiumAccessBlockedPanel`). [Source: `src/app/(dashboard)/dashboard/opportunities/page.tsx`; `src/app/(dashboard)/dashboard/matching/page.tsx`]
- Git safety: do not stage `dev.db` or SQLite artifacts. [Source: `_bmad-output/planning-artifacts/architecture.md#Dev-Agent-Git-Safety`]

### Testing guidance

Use Vitest, following the existing route/page test patterns:

- `src/app/api/opportunities/[id]/interest/route.test.ts` demonstrates auth, premium access, opportunity access, transaction, and unique constraint-style testing for the existing soft-commitment endpoint.
- `src/app/(dashboard)/dashboard/opportunities/[id]/page.test.tsx` demonstrates page rendering tests with mocked auth, premium access, user lookup, opportunity lookup, and access-blocking branches.
- `src/lib/validations.test.ts` is the nearest existing validation test file for Zod schema additions.

Every new conditional guard must have both branches covered. At minimum, add tests for:

- `canShowReviewForm = false` because no interest,
- `canShowReviewForm = false` because interest is younger than 7 days,
- `canShowReviewForm = false` because existing review exists,
- `canShowReviewForm = true` because interest is 7+ days old and no existing review,
- route-level duplicate `P2002` handling with exact French message,
- profile `Avis reçus` present when reviews exist and not incorrectly rendered when empty.

### Previous story intelligence

Story 5.0 completed consolidation guardrails before Epic 5. Actionable lessons:

- The codebase is sensitive to JSX `&&`; do not reintroduce it in review UI.
- Premium access gates are required on dashboard pages and must be tested.
- Guard every new branch with tests; Story 5.0 added explicit branch tests for `tags` absent vs empty.
- Explicitly stage only intended files. Previous review cycles had `dev.db` staging risk.
- Existing build/test baseline after Story 5.0: Prisma validate passed, Vitest passed, Next build passed; new review work should preserve this baseline. [Source: `_bmad-output/implementation-artifacts/5-0-consolidation-post-retrospective-epic-4.md#Completion-Notes-List`]

### Recent git intelligence

Recent commits show the current work pattern: story status commits, targeted tests first, architecture guardrails, then implementation fixes. Continue that pattern for this story: add focused tests for review eligibility/duplicates/profile display before or alongside implementation, then run full validation. [Source: `git log --oneline -5`]

### References

- `_bmad-output/planning-artifacts/epics.md#Story-5.1-Reviews-Mutuelles-Post-Deal` — story source and ACs.
- `_bmad-output/planning-artifacts/epics.md#Epic-5-Reviews-Réputation-et-Confiance` — Epic 5 objective.
- `_bmad-output/planning-artifacts/prd.md#8.5-Reviews--Réputation` — FR31–FR34.
- `_bmad-output/planning-artifacts/prd.md#2.3-Lexpérience-de-confiance` — reviews as post-deal trust flow.
- `_bmad-output/planning-artifacts/architecture.md#Implementation-Patterns--Consistency-Rules` — stack, structure, API, JSX, nested anchors, idempotence, git guardrails.
- `prisma/schema.prisma#OpportunityInterest` — existing soft-commitment/interest model.
- `src/app/(dashboard)/dashboard/opportunities/[id]/page.tsx` — deal detail page to extend.
- `src/app/api/opportunities/[id]/interest/route.ts` — existing interest mutation pattern.
- `src/app/(dashboard)/members/[id]/page.tsx` — profile display page to extend.
- `src/lib/trust-level.ts` — future average rating hook already present.

## Dev Agent Record

### Agent Model Used

gpt-5.5 (Hermes Agent)

### Debug Log References

- `npx prisma generate` — passed.
- `./node_modules/.bin/prisma validate` — passed.
- Targeted review tests — passed (48 tests).
- `npx vitest run` — passed (330 tests).
- `npm run build` — passed.
- JSX guardrail grep reviewed for new review/opportunity/member files; no JSX `&&` conditional rendering introduced.

### Completion Notes List

- Added persisted `Review` model with reviewer/reviewee/opportunity relations, indexes, cascade behavior, and unique duplicate prevention per reviewer/opportunity.
- Added validated review submission API with auth, premium, tier, verified-opportunity, self-review, interest-age, duplicate, and P2002 guard coverage.
- Added eligible post-deal review form on the opportunity detail page after the 7-day interest delay, with 5 stars, 500-character comment, French validation/server errors, and refresh/revalidation behavior.
- Added received reviews display on verified member profiles with minimal field selection, newest-first ordering, stars, comment, reviewer name, and French date formatting.
- Added route, validation, component, opportunity page, and profile page tests covering allowed and blocked branches; no review notification/email side effects were introduced.

### File List

- `_bmad-output/implementation-artifacts/5-1-reviews-mutuelles-postdeal.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `prisma/schema.prisma`
- `prisma/migrations/20260520190000_add_reviews/migration.sql`
- `src/lib/validations.ts`
- `src/lib/validations.test.ts`
- `src/app/api/opportunities/[id]/reviews/route.ts`
- `src/app/api/opportunities/[id]/reviews/route.test.ts`
- `src/components/features/deals/review-form.tsx`
- `src/components/features/deals/review-form.test.tsx`
- `src/components/features/reviews/review-list.tsx`
- `src/app/(dashboard)/dashboard/opportunities/[id]/page.tsx`
- `src/app/(dashboard)/dashboard/opportunities/[id]/page.test.tsx`
- `src/app/(dashboard)/members/[id]/page.tsx`
- `src/app/(dashboard)/members/[id]/page.test.tsx`

### Change Log

- 2026-05-20 — Implemented Story 5.1 reviews mutuelles post-deal and marked ready for review.
