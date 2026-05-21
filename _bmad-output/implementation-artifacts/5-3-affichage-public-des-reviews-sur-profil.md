---
Story: "5.3"
StoryKey: "5-3-affichage-public-des-reviews-sur-profil"
Title: "Affichage Public des Reviews sur Profil"
Status: "done"
Priority: "P1"
Epic: "Epic 5 — Reviews, Réputation et Confiance"
FRs: ["FR34"]
NFRs: ["NFR-S5", "NFR-S8", "NFR-A1", "NFR-P2"]
Created: "2026-05-21"
---

# Story 5.3: Affichage Public des Reviews sur Profil

Status: done

<!-- Note: Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As a member consulting another verified member profile,
I want to see the public reviews left for that member,
so that I can evaluate their reputation before contacting them.

## Acceptance Criteria

1. **Public profile shows an `Avis et Réputation` section when reviews exist**
   - Given a verified member or admin consults a verified member profile,
   - When the viewed member has received reviews,
   - Then a section titled `Avis et Réputation` displays:
     - the global average rating,
     - the total number of reviews,
     - the 5 most recent received reviews only,
     - for each preview review: reviewer avatar/fallback, reviewer name, rating, truncated comment, and French-formatted date,
     - a `Voir tous les avis` button/link only when the member has more than 5 reviews.
   - And all review data comes from reviews received by the member (`reviewsReceived` / `revieweeId`), never reviews written by the member.
   - And reviewer private data such as email, phone, subscription/payment fields, or admin-only fields is not selected or rendered.

2. **Profile without reviews renders the required EmptyState**
   - Given a verified member profile has no received reviews,
   - When it is consulted,
   - Then the shared `EmptyState` component displays the exact message: `Pas encore d'avis. Soyez le premier à collaborer avec ce membre.`
   - And no fake stars, fake numeric average, or empty `Avis reçus` legacy section is rendered.

3. **Platinum badge remains visible beside the member name with the required tooltip**
   - Given the viewed profile has an active or maintain Platinum state from Story 5.2,
   - When the profile is consulted,
   - Then the `Membre Platinum` badge remains displayed beside the member name/tier area with tooltip/accessible label: `Membre distingué : 3+ deals validés et excellentes reviews`.
   - And Story 5.3 does not duplicate or replace the Story 5.2 Platinum eligibility, persistence, confetti, or reliability-score helper logic.

4. **Full reviews view is reachable and paginated when there are more than 5 reviews**
   - Given a profile has more than 5 received reviews,
   - When the viewer clicks `Voir tous les avis`,
   - Then they can view the full public review list for that member with newest-first ordering and pagination or `page` query navigation.
   - And the full view preserves the same access rules as the member profile: authenticated dashboard route, active premium member access unless admin bypass is already established, verified profile guard, and no private reviewer/member data leakage.

5. **Regression and validation coverage passes**
   - Given this is a brownfield Next.js 16 / Prisma 7 project,
   - When the story is implemented,
   - Then `./node_modules/.bin/prisma validate`, targeted Vitest tests, `npx vitest run`, and `npm run build` pass.
   - And all new JSX conditional rendering uses ternaries, never `&&`.
   - And every compound boolean used for rendering is precomputed as a `const` before JSX return.
   - And every new branch has test coverage for both sides.

## Tasks / Subtasks

- [x] **AC1/AC2: Replace the legacy profile review block with a public review section**
  - [x] Audit `src/app/(dashboard)/members/[id]/page.tsx` before editing; preserve auth redirect, premium gate, verified-profile `notFound()`, profile header, tier badge, verified badge, Platinum badge, reliability score, bio/location/tags, and WhatsApp CTA behavior.
  - [x] Replace the current tail render `{member.reviewsReceived.length > 0 ? <ReviewList ... /> : null}` with a reusable public section that always covers the reviews area: populated state for reviews, required `EmptyState` for no reviews.
  - [x] Rename/rework display copy from legacy `Avis reçus` to required `Avis et Réputation` for this public profile section.
  - [x] Reuse Story 5.2 `calculateReliabilityScore` / `ReliabilityScore` for average/count where it fits; do not duplicate average calculation in the page or component.
  - [x] Ensure the preview section renders at most 5 newest reviews, even if the page query fetches more for counting.
  - [x] If keeping `ReviewList`, evolve it into a presentational component that can accept title, limit, avatar data, comment truncation, and empty-state behavior; otherwise create `src/components/features/reviews/public-review-section.tsx` and keep `ReviewList` only if still used elsewhere.

- [x] **AC1: Fetch only review data required for public display**
  - [x] Update the profile Prisma select for `reviewsReceived` to select newest-first preview fields only: `id`, `rating`, `comment`, `createdAt`, and `reviewer: { select: { name: true, image: true } }`.
  - [x] Fetch or compute the total review count reliably. Preferred options:
    - select all ratings only for score/count plus a separate `take: 5` preview query, or
    - use `_count: { select: { reviewsReceived: true } }` plus a ratings-only aggregate/query if needed by `calculateReliabilityScore`.
  - [x] Avoid loading every full comment solely to display 5 previews if a member has many reviews; keep full comments for the preview/full-list rows only.
  - [x] Confirm the query still uses `revieweeId = member.id` semantics via the `reviewsReceived` relation.

- [x] **AC1: Implement reviewer avatar, rating, truncated comment, and date display**
  - [x] Use existing `src/components/ui/avatar.tsx` primitives for reviewer image/fallback. Fallback should use the reviewer name initial or a safe placeholder.
  - [x] Render rating with accessible star text, e.g. `aria-label="5 sur 5 étoiles"`; preserve French copy.
  - [x] Truncate comments in the 5-review preview with a deterministic helper or CSS line clamp. If using string truncation, add tests for comments below/above the limit and avoid breaking multi-byte text.
  - [x] Display dates with `toLocaleDateString("fr-FR")` and a machine-readable `<time dateTime={createdAt.toISOString()}>`.
  - [x] Do not render reviewer email, phone, tier, subscription status, or any admin-only fields.

- [x] **AC1/AC4: Add `Voir tous les avis` behavior for >5 reviews**
  - [x] Precompute `const hasMoreReviews = totalReviewCount > 5;` before JSX.
  - [x] Render `Voir tous les avis` only when `hasMoreReviews` is true.
  - [x] Preferred route: create `src/app/(dashboard)/members/[id]/reviews/page.tsx` for the full list, unless a cleaner existing route pattern is discovered during implementation.
  - [x] Full list page must call `auth()` and `getUserPremiumAccess()` before exposing review data; render `PremiumAccessBlockedPanel` for inactive non-admin subscribers unless an existing admin bypass pattern is already present and tested.
  - [x] Full list page must call `notFound()` for missing/non-verified profile members, use newest-first ordering, and paginate with a safe `page` query (`page >= 1`, fixed page size such as 10).
  - [x] Full list page must include a back link to `/members/[id]`, show the same aggregate average/count, and reuse the same review-row component as the profile preview.

- [x] **AC2: Use required EmptyState for no-review profiles**
  - [x] Import `EmptyState` from `src/components/shared/empty-state.tsx`.
  - [x] Render `EmptyState` with its `title` set to the exact visible copy: `Pas encore d'avis. Soyez le premier à collaborer avec ce membre.`
  - [x] Do not split the required sentence across separate title/description assertions unless tests still verify the exact full sentence as visible text.
  - [x] Ensure the no-review state is shown where the `Avis et Réputation` section belongs, not as a global page replacement.

- [x] **AC3: Preserve Story 5.2 Platinum behavior without duplication**
  - [x] Keep `PlatinumBadge`, `PlatinumConfetti`, `calculateReliabilityScore`, and `ensurePlatinumAwarded` usage as established by Story 5.2 unless a bug is discovered.
  - [x] Do not add new Platinum fields, new migrations, new eligibility thresholds, or a second badge component.
  - [x] Ensure the badge remains beside the name/tier/verified header area. The existing `PlatinumBadge` already exposes the required active tooltip text; preserve it.
  - [x] Preserve maintain-state behavior (`À maintenir`) for already-awarded members whose current average drops below 4.5.

- [x] **AC5: Add focused tests and run validation**
  - [x] Update `src/app/(dashboard)/members/[id]/page.test.tsx` for:
    - section title `Avis et Réputation` when reviews exist,
    - average/count displayed from received reviews,
    - newest 5 reviews rendered and 6th hidden in preview,
    - reviewer avatar/fallback is present,
    - long comment is truncated in preview,
    - `Voir tous les avis` visible when total count > 5 and hidden when <= 5,
    - exact no-review `EmptyState` copy,
    - premium-blocked users do not trigger member/reputation queries,
    - Platinum badge still visible when applicable.
  - [x] Add component tests for the new/reworked review display component.
  - [x] Add `src/app/(dashboard)/members/[id]/reviews/page.test.tsx` if the full list route is created, covering auth redirect, premium block, non-verified `notFound()`, page bounds, paginated row rendering, and no private field rendering.
  - [x] Run `grep -rn '&&' src/ --include='*.tsx'` and verify no new JSX conditional `&&` was introduced.
  - [x] Run `./node_modules/.bin/prisma validate`, targeted tests, `npx vitest run`, and `npm run build`; record results in the Dev Agent Record.
  - [x] Stage explicitly; do not use unsafe `git add -A` that can include `dev.db` or SQLite artifacts.

## Dev Notes

### Critical product context

Epic 5 is the reputation and confidence layer. Story 5.1 created the review model and submission/display baseline; Story 5.2 converted received reviews into a reliability score and Platinum badge; Story 5.3 is the FR34 public-display slice that makes individual received reviews useful on member profiles. [Source: `_bmad-output/planning-artifacts/epics.md#Story-5.3-Affichage-Public-des-Reviews-sur-Profil`; `_bmad-output/planning-artifacts/prd.md#8.5-Reviews--Réputation`]

FR34 requires reviews to be visible on the member public profile. In the current app, `/members/[id]` lives under `(dashboard)`, so "public profile" means the profile visible to authenticated active members/admins, not anonymous visitors, unless product routing is intentionally changed in a later story. [Source: `src/app/(dashboard)/members/[id]/page.tsx`; `_bmad-output/planning-artifacts/architecture.md#Route-Boundaries`]

### Delta scope — do not duplicate completed work

Story 5.2 already displays the reliability score and Platinum badge on the member profile. Story 5.3 must focus on public display of individual received reviews: latest 5 preview, reviewer avatar/name, truncated comment, date, empty state, and full reviews view when needed. Do not recreate the reliability-score or Platinum systems. [Source: `_bmad-output/implementation-artifacts/5-2-score-de-fiabilite-et-badge-membre-platinum.md#Completion-Notes-List`]

Story 5.1 already created the `Review` model and `ReviewList` baseline. Reuse or evolve this code; do not create a second review table, second review relation, or new submission endpoint. [Source: `_bmad-output/implementation-artifacts/5-1-reviews-mutuelles-postdeal.md#Completion-Notes-List`; `prisma/schema.prisma#Review`]

### Current brownfield state to preserve

`src/app/(dashboard)/members/[id]/page.tsx` currently:

- requires `auth()` and redirects unauthenticated users to `/auth/signin`,
- calls `getUserPremiumAccess(session.user.id)` before member lookup and returns `PremiumAccessBlockedPanel` for blocked viewers,
- selects verified profile fields, tags, `opportunities` for validated-deal count, and `reviewsReceived`,
- calls `notFound()` for missing or non-`VERIFIED` member profiles,
- displays profile header, tier badge, verified badge, optional Story 5.2 `PlatinumBadge`, `PlatinumConfetti`, `ReliabilityScore`, bio, location, tags, and WhatsApp CTA for other profiles,
- currently renders `ReviewList` only when `member.reviewsReceived.length > 0`.

Story 5.3 changes the reviews area only. Preserve the above behavior and test the premium-blocked branch so review data is not fetched for blocked users. [Source: `src/app/(dashboard)/members/[id]/page.tsx`; `src/app/(dashboard)/members/[id]/page.test.tsx`]

### Existing components/helpers to reuse

- `src/lib/reputation.ts` — `calculateReliabilityScore`, `roundReliabilityScore`, `isPlatinumEligible`, `getPlatinumDisplayState`, `ensurePlatinumAwarded`. Use these for aggregate score/badge state; do not duplicate average logic.
- `src/components/features/reputation/reliability-score.tsx` — French `Score de fiabilité IBC` display with stars, numeric average, and review count.
- `src/components/features/reputation/platinum-badge.tsx` — active/maintain `Membre Platinum` badge. Active tooltip already matches required copy exactly.
- `src/components/features/reputation/platinum-confetti.tsx` — first-unlock animation; do not re-trigger for existing Platinum members.
- `src/components/features/reviews/review-list.tsx` — current received-review list. It lacks reviewer avatars, title override, latest-5 limit/truncation, empty-state behavior, and `Voir tous les avis`; evolve or replace carefully.
- `src/components/shared/empty-state.tsx` — required no-review empty-state primitive.
- `src/components/ui/avatar.tsx` — reviewer avatar/fallback primitive.

### Data model and query guardrails

`Review` currently has `reviewerId`, `revieweeId`, `opportunityId`, `rating`, `comment`, `createdAt`, `updatedAt`, relations to `reviewer`, `reviewee`, and `opportunity`, a unique `[reviewerId, opportunityId]`, and indexes on `[revieweeId, createdAt]` and `[opportunityId, createdAt]`. This is sufficient for Story 5.3; no migration is expected. [Source: `prisma/schema.prisma#Review`]

Use received reviews only. The display must never mix in `reviewsWritten`, because the viewed member's public reputation is based on feedback received from counterparties. [Source: `_bmad-output/planning-artifacts/epics.md#Story-5.3-Affichage-Public-des-Reviews-sur-Profil`]

For performance, avoid fetching unlimited full review comments on the profile page. Fetch aggregate count/rating data and a `take: 5` preview list, or document why the existing relation fetch is acceptable for MVP after tests. The schema index `[revieweeId, createdAt]` supports newest-first profile review display. [Source: `prisma/schema.prisma#Review`; `_bmad-output/planning-artifacts/prd.md#9.1-Performance`]

### Access/security requirements

- `(dashboard)` routes require authentication; keep `auth()` redirect behavior. [Source: `_bmad-output/planning-artifacts/architecture.md#Route-Boundaries`]
- Dashboard profile/review pages must call `getUserPremiumAccess()` and render `PremiumAccessBlockedPanel` for non-subscribers, unless an explicit existing admin bypass is discovered and covered by tests. [Source: `src/app/(dashboard)/members/[id]/page.tsx`; `_bmad-output/implementation-artifacts/5-2-score-de-fiabilite-et-badge-membre-platinum.md#Review-Findings`]
- Do not leak reviewer email/phone/subscription/payment/admin details. Select only name/image plus review fields needed for display. [Source: `_bmad-output/planning-artifacts/architecture.md#Data-Boundaries`; `_bmad-output/planning-artifacts/prd.md#9.2-Sécurité`]
- Keep the verified-profile guard: missing or non-verified profile members must call `notFound()`. [Source: `src/app/(dashboard)/members/[id]/page.tsx`]

### UI/UX requirements

- UI copy must be French and understandable to non-technical members. [Source: `_bmad-output/planning-artifacts/prd.md#9.4-Accessibilité`; `_bmad-output/planning-artifacts/ux-spec.md#2.5-Experience-Principles`]
- Trust signals are a UX moat; reviews, score, and badges should be visually prominent but not noisy. [Source: `_bmad-output/planning-artifacts/ux-spec.md#1.4-Design-Opportunities`]
- Use mobile-first card/list layout, spacing consistent with existing profile card, and touch targets at least 44px for `Voir tous les avis`. [Source: `_bmad-output/planning-artifacts/ux-spec.md#4.2-Transferable-UX-Patterns`; `_bmad-output/planning-artifacts/architecture.md#Cross-Cutting-Concerns-Identified`]
- Accessibility: use semantic `<section>`, headings with stable `aria-labelledby`, accessible star labels, `<time dateTime>`, and avatar alt/fallback. Do not rely on color alone for ratings or Platinum maintain state. [Source: `_bmad-output/planning-artifacts/prd.md#9.4-Accessibilité`]

### Architecture and code guardrails

- Next.js 16 App Router with Server Components by default; add client components only for real interactivity. [Source: `_bmad-output/planning-artifacts/architecture.md#Frontend-Architecture`]
- Prisma 7 client is generated under `src/generated/prisma`; use the existing singleton in `src/lib/prisma.ts`, never instantiate a second Prisma client. [Source: `_bmad-output/planning-artifacts/architecture.md#Data-Boundaries`; `prisma/schema.prisma#generator-client`]
- API routes are not required for this story unless a client-side pagination pattern is chosen. Prefer Server Component data fetching for profile/full reviews pages. [Source: `_bmad-output/planning-artifacts/architecture.md#Integration-Points`]
- JSX strict guardrail: no `&&` in JSX. Precompute compound booleans like `hasReviews`, `hasMoreReviews`, `shouldShowFullReviewsLink`, `shouldShowPlatinumBadge` before JSX and render with ternaries. [Source: `_bmad-output/planning-artifacts/architecture.md#JSX-Boolean-Guardrail-Nextjs-16-Strict`]
- Avoid nested anchors: if a review row or card becomes clickable later, do not place `Link`/button-as-link elements inside another `Link`. [Source: `_bmad-output/planning-artifacts/architecture.md#Card-Component-Anti-Pattern-Nested-Anchors`]
- Git safety: stage explicit files only; avoid staging `dev.db`, SQLite files, or generated local artifacts. [Source: `_bmad-output/planning-artifacts/architecture.md#Dev-Agent-Git-Safety`]

### Previous story intelligence

Story 5.1 learnings:

- The review relation is already persisted and tested; use `reviewsReceived` for profile reputation.
- Review creation eligibility and duplicate prevention are already implemented; Story 5.3 should not change the submission API unless tests reveal a display-blocking bug.
- Existing review display was intentionally minimal because Story 5.3 owns average/latest-5/avatar/truncation/full-list behavior.
- Validation baseline after Story 5.1 passed: Prisma validate, targeted review tests, full Vitest, and Next build. [Source: `_bmad-output/implementation-artifacts/5-1-reviews-mutuelles-postdeal.md#Profile-display-scope`; `_bmad-output/implementation-artifacts/5-1-reviews-mutuelles-postdeal.md#Debug-Log-References`]

Story 5.2 learnings:

- `src/app/(dashboard)/members/[id]/page.tsx` was patched after review because dashboard member profiles must gate premium access before loading reputation data or persisting Platinum awards. Preserve this order.
- `calculateReliabilityScore` uses equal-weight received reviews and French one-decimal formatting; do not implement a second average.
- Platinum first-award persistence is idempotent; do not create new side effects on page refresh.
- Existing profile tests already cover no fake score, score with reviews, active/maintain/no Platinum, confetti first-award only, premium blocking, and verified profile `notFound()`. Extend them rather than replacing them. [Source: `_bmad-output/implementation-artifacts/5-2-score-de-fiabilite-et-badge-membre-platinum.md#Review-Findings`; `_bmad-output/implementation-artifacts/5-2-score-de-fiabilite-et-badge-membre-platinum.md#Completion-Notes-List`]

Story 5.0 guardrails still apply:

- Do not reintroduce JSX `&&` rendering.
- Test all new branches.
- Stage explicitly; prior review cycles had `dev.db` staging risk. [Source: `_bmad-output/implementation-artifacts/5-0-consolidation-post-retrospective-epic-4.md#Previous-story-intelligence`]

### Recent git intelligence

Recent commits show the correct workflow pattern: create story doc/status, implement feature with focused tests, mark ready for review, then patch review findings. Relevant recent commits:

- `ok187371c fix(story-5.2): gate member profile reputation`
- `b15d630 chore(bmad): mark story 5-2 ready for review`
- `2ea62ab feat(story-5.2): add reliability score and platinum badge`
- `09b069c docs(bmad): create story 5-2 score de fiabilité et badge membre platinum`
- `02ecdb4 chore(bmad): mark story 5-1 reviews mutuelles post-deal done — review PASS`

Continue with a docs/status commit for Story 5.3 before implementation. [Source: `git log --oneline -5`]

### Latest technical specifics

Use the pinned project stack; do not upgrade dependencies as part of this story. `npm view` on 2026-05-21 shows the project pins are current for core framework packages used here: Next.js `16.2.6`, Prisma `7.8.0`, Auth.js beta `5.0.0-beta.31`; React latest is `19.2.6` while the project pins `19.2.4`, so stay pinned unless a separate upgrade story is planned. [Source: `package.json`; `npm view next version`; `npm view prisma version`; `npm view next-auth@beta version`; `npm view react version`]

Do not add a new UI library for avatars, truncation, pagination, or tooltips. Existing shadcn/ui primitives, TailwindCSS 4 classes, and small local helpers are sufficient. [Source: `package.json`; `_bmad-output/planning-artifacts/architecture.md#Frontend-Architecture`]

### Testing guidance

Use Vitest and existing co-located test patterns:

- `src/app/(dashboard)/members/[id]/page.test.tsx` for profile branch tests with mocked `auth`, `getUserPremiumAccess`, and Prisma.
- `src/components/features/reputation/reputation-components.test.tsx` as a component-test style reference.
- `src/components/features/reviews/review-list.test.tsx` if still present/needed, or create tests next to the new review component.
- `src/app/(dashboard)/members/[id]/reviews/page.test.tsx` for a new full-list route.

Minimum branch coverage:

- no reviews -> required `EmptyState`, no fake score/stars,
- 1-5 reviews -> section and preview rows, no `Voir tous les avis`,
- 6+ reviews -> 5 previews, `Voir tous les avis`, hidden 6th preview row,
- full reviews route page 1 vs page 2 vs invalid page query,
- premium blocked -> no member/review query and no Platinum persistence,
- non-verified member -> `notFound()`,
- active/maintain/no Platinum states preserved,
- avatar image vs fallback,
- long vs short comment truncation.

### References

- `_bmad-output/planning-artifacts/epics.md#Story-5.3-Affichage-Public-des-Reviews-sur-Profil` — source story and ACs.
- `_bmad-output/planning-artifacts/prd.md#8.5-Reviews--Réputation` — FR34.
- `_bmad-output/planning-artifacts/architecture.md#Frontend-Architecture` — Server Component/client component patterns.
- `_bmad-output/planning-artifacts/architecture.md#JSX-Boolean-Guardrail-Nextjs-16-Strict` — no JSX `&&`.
- `_bmad-output/planning-artifacts/architecture.md#Data-Boundaries` — Prisma-only data access and protected route boundaries.
- `_bmad-output/planning-artifacts/ux-spec.md#1.4-Design-Opportunities` — reviews as trust infrastructure.
- `_bmad-output/implementation-artifacts/5-1-reviews-mutuelles-postdeal.md` — review persistence/display baseline.
- `_bmad-output/implementation-artifacts/5-2-score-de-fiabilite-et-badge-membre-platinum.md` — reliability score and Platinum baseline.
- `src/app/(dashboard)/members/[id]/page.tsx` — primary UPDATE file.
- `src/components/features/reviews/review-list.tsx` — legacy display component to evolve/replace.
- `src/components/shared/empty-state.tsx` — required empty-state primitive.
- `prisma/schema.prisma#Review` — existing review schema.

## Change Log

- 2026-05-21: Story context created for Story 5.3 with status ready-for-dev.
- 2026-05-21: Implemented public profile reviews display and moved story to review.

## Dev Agent Record

### Agent Model Used

gpt-5.5 (openai-codex)

### Debug Log References

- 2026-05-21: Targeted Vitest for profile reviews/full reviews/components passed (`npx vitest run src/components/features/reviews/review-list.test.tsx src/app/(dashboard)/members/[id]/page.test.tsx src/app/(dashboard)/members/[id]/reviews/page.test.tsx`) — 22 passed.
- 2026-05-21: Prisma validation passed (`./node_modules/.bin/prisma validate`).
- 2026-05-21: Full Vitest passed (`npx vitest run`) — 370 passed.
- 2026-05-21: Production build passed (`npm run build`).
- 2026-05-21: JSX guardrail grep run (`grep -rn '&&' src/ --include='*.tsx'`); no new `&&` occurrences in files changed for Story 5.3. Existing unrelated occurrences remain elsewhere.
- 2026-05-21: `npm run lint` was run; it reported pre-existing unrelated warnings/errors outside Story 5.3 files.

### Completion Notes List

- Implemented the `Avis et Réputation` public review section on member profiles, replacing the legacy `Avis reçus` tail block.
- Profile page now fetches only 5 newest received review previews with reviewer name/image and uses a ratings-only query plus `_count` for aggregate score/count.
- Added reviewer avatar/fallback, accessible star labels, French `<time>` dates, deterministic multibyte-safe comment truncation, and required EmptyState copy.
- Added `/members/[id]/reviews` authenticated/premium-gated full reviews route with verified-member guard, newest-first ordering, safe page query handling, and pagination links.
- Preserved Story 5.2 reliability score, Platinum badge/tooltip, confetti, maintain state, premium gate order, and WhatsApp/profile behavior.
- Added focused profile, full-route, and component tests covering populated, empty, pagination, access, guard, avatar, truncation, and Platinum branches.

### File List

- `_bmad-output/implementation-artifacts/5-3-affichage-public-des-reviews-sur-profil.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/app/(dashboard)/members/[id]/page.tsx`
- `src/app/(dashboard)/members/[id]/page.test.tsx`
- `src/app/(dashboard)/members/[id]/reviews/page.tsx`
- `src/app/(dashboard)/members/[id]/reviews/page.test.tsx`
- `src/components/features/reviews/review-list.tsx`
- `src/components/features/reviews/review-list.test.tsx`
