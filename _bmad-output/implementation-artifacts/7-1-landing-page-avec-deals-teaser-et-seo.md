---
Story: "7.1"
StoryKey: "7-1-landing-page-avec-deals-teaser-et-seo"
Title: "Landing Page avec Deals Teaser et SEO"
Status: "ready-for-dev"
Priority: "P1"
Epic: "Epic 7 — Landing Page et Découverte Publique"
FRs: ["FR41", "FR43", "FR44", "FR45"]
UX_DRs: ["UX-DR29", "UX-DR24", "UX-DR25", "UX-DR26", "UX-DR27"]
Created: "2026-06-10"
---

# Story 7.1: Landing Page avec Deals Teaser et SEO

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a visitor,
I want to discover Ivory Business Club (IBC)'s mission, view public teaser deals, and compare membership tiers,
so that I can understand the club's value and be converted to sign up.

## Acceptance Criteria

1. **Immersive and high-performing Landing Page layout (LCP < 2s)**
   - Given a visitor on the landing page `/`,
   - When the page loads,
   - Then the Largest Contentful Paint (LCP) is under 2 seconds on a simulated 3G connection (NFR-P1).
   - And the page displays a premium visual experience:
     - Sleek dark mode background (`#090D16` / `#0F172A`), mesh gradients, and glassmorphism elements.
     - An interactive 3D hero scene (e.g., connected Europe-Afrique globe or rotating coin) loaded dynamically with a skeleton fallback.
     - Responsive adjustments: on mobile/slow connections, the 3D model falls back to an optimized 2D WebP image.

2. **Core Sections display verified content and social proof**
   - Given the landing page is rendered,
   - When the visitor scrolls down,
   - Then the following sections are displayed:
     - **Hero Section:** Headline "Bâtir son futur en Afrique", subheadline, CTA "Rejoins le club", and the 3D model.
     - **Mission / Comment ça marche:** Explains the 3-step value loop (Rejoindre → Accéder → Passer à l'action).
     - **Mur des Succès:** Horizontal scroll or carousel of testimonials with photos, member names, localizations, closed deals, and quotes (FR43).
     - **Teaser Deals Feed:** Displays 3–5 `DealCard` elements representing verified opportunities (FR41).
     - **Tiers Comparison:** Shows the three offers (Affranchis, Grands Frères, Boss) with prices (€29, €49, €99) and benefits comparison.
     - **Trust Signals & FAQ:** Compliance notes, FAQ accordion, partner logos.
     - **Footer:** Terms (CGV), contact link, newsletter input.

3. **Teaser Deals Gating and Security**
   - Given a visitor on the teaser deals section,
   - When they view a deal card,
   - Then only the title, category, and location are visible (FR41).
   - And a persistent overlay "Devenez membre pour voir les détails" covers the card with a signup CTA link.
   - And the API / Server Components securely strip out sensitive details (amount, attachments, creator contacts) for unauthenticated requests.

4. **SEO Optimization and Indexability**
   - Given the landing page is crawled by a search engine,
   - When the HTML is parsed,
   - Then metadata (title, description, open graph tags) are present in French.
   - And the teaser deals are server-side rendered (SSG/ISR) and indexable by search engine bots.

5. **Responsive and Accessible Design**
   - Given the landing page on mobile devices (320px–767px),
   - When a visitor scrolls,
   - Then all interactive components use a single-column layout, touch targets are at least 44×44px, and the primary CTA is sticky at the bottom of the viewport.
   - And screen-readers receive descriptive `aria-label` tags for the 3D visual viewer and icons.
   - And if the user has `prefers-reduced-motion: reduce` active, all animations (glows, 3D rotations, transitions) are deactivated.

## Tasks / Subtasks

- [ ] Propose and integrate the 3D / AI asset strategy (AC: 1)
  - [ ] Reference the asset guide in [docs/AI-Powered-3D-website.md](file:///d:/Fichiers%20Code/ivoire-business-club-next/docs/AI-Powered-3D-website.md).
  - [ ] Add instructions for the user (Jonathan) to supply WebP images and Spline URL codes.
  - [ ] Implement `SplineViewer` component at `src/components/ui/spline-viewer.tsx` with dynamic imports (`ssr: false`) and a skeleton loader matching the 2D visual layout.
  - [ ] Add a performance fallback: check connection type (using `navigator.connection`) or screen width to render a static WebP image instead of loading the heavy Spline scene on mobile or slow networks.

- [ ] Redesign the Landing Page layout and styling (AC: 1, 2, 5)
  - [ ] Update `src/app/globals.css` with the design tokens: dark mode base colors, glassmorphism utilities, and animated gradient keyframes.
  - [ ] Refactor `src/app/(public)/page.tsx` to set up server-side rendering (SSG / ISR with a sensible revalidation time like 3600 seconds) for public teasers.
  - [ ] Modify `src/components/landing/hero.tsx` to integrate the interactive Spline scene (or its fallback) and align headline copy from `NEW landing page.md`.
  - [ ] Implement the "Mur des Succès" component at `src/components/landing/success-wall.tsx` containing horizontal scrolls of testimonials, avatars, and total deals/members metrics.
  - [ ] Update `src/components/landing/pricing.tsx` to display comparison cards (stacked on mobile, horizontal comparison table on desktop) using prices and details from `src/lib/tier-config.ts`.
  - [ ] Ensure all buttons and touch elements respect the 44px boundary and clear focus rings.

- [ ] Implement secure public deal gating in teaser cards (AC: 3)
  - [ ] Modify `src/components/landing/opportunity-teasers.tsx` to match the exact teaser card design with an overlay and lock icon.
  - [ ] Ensure the Server Component query in `src/app/(public)/page.tsx` only queries non-sensitive fields from the database: `id`, `title`, and `location` (through author relation). Never fetch or serialize `amount`, `documents`, or `author.phoneNumber` for public routes.
  - [ ] Ensure `InterestButton` on public pages behaves correctly (redirects to signup/login modal rather than initiating a soft commitment).

- [ ] Implement SEO, metadata, and accessibility options (AC: 4, 5)
  - [ ] Configure page-level metadata in `src/app/(public)/page.tsx` with French Title: "Ivoire Business Club — Bâtir son futur en Afrique", description, and OpenGraph parameters.
  - [ ] Apply `prefers-reduced-motion` media queries in Tailwind or component code to disable keyframe animations or 3D rotations if active.
  - [ ] Add `aria-label` tags to visualizers, links, and forms.

- [ ] Verification and automated testing (AC: 1, 2, 3, 4, 5)
  - [ ] Add unit tests for `SplineViewer` to verify it falls back to 2D image when connection is slow or widths are small.
  - [ ] Update tests in `src/components/landing/opportunity-teasers.test.tsx` to assert that sensitive info is missing and signup links exist.
  - [ ] Add SEO metadata checks in route tests.
  - [ ] Run `npx vitest run`.
  - [ ] Run `npm run build`.

## Dev Notes

### Critical product context

Epic 7 introduces the public identity of IBC. Because the club sells trust and risk reduction, the landing page is the first point of validation. It must feel premium and interactive while protecting the exclusivity of the marketplace content by masking details behind a teaser wall. It also uses 3D models to stand out as a state-of-the-art digital network for the diaspora. [Source: `_bmad-output/planning-artifacts/epics.md#Epic-7-Landing-Page-et-Découverte-Publique`, `docs/AI-Powered-3D-website.md`]

### Requirements traced to PRD / Epic / UX / 3D Spec

- FR41: The landing page displays public teaser deals without authentication. [Source: `_bmad-output/planning-artifacts/prd.md#8.5-Landing--Contenu`]
- FR43: The landing page displays a success wall (testimonials, closed deals). [Source: `_bmad-output/planning-artifacts/prd.md#8.5-Landing--Contenu`]
- FR45 / UX-DR24: Mobile-first layout (single column base, bottom sticky CTAs). [Source: `_bmad-output/planning-artifacts/ux-spec.md#13-Responsive-Design--Accessibility`]
- NFR-P1: Landing page load time < 2s on 3G. [Source: `_bmad-output/planning-artifacts/architecture.md#Technical-Constraints--Dependencies`]
- 3D Recommendations: Glassmorphism, deep dark background `#090D16`, dynamic spline imports, WebP format. [Source: `docs/AI-Powered-3D-website.md`]

### Existing implementation state to reuse, not reinvent

- `src/components/tier-card.tsx` and `src/lib/tier-config.ts` are ready and support selecting tiers. Reuse them. [Source: `src/components/tier-card.tsx`]
- `src/components/landing/opportunity-teasers.tsx` already has basic teaser card gating with `InterestButton`. Refine it rather than rebuilding it. [Source: `src/components/landing/opportunity-teasers.tsx`]

### Current files likely to modify and what to preserve

- `src/app/(public)/page.tsx`
  - Modify: Refactor page content, database queries, and static generation params.
  - Preserve: Dynamic routing constraints, layout skeleton, and secure auth session verification.
- `src/components/landing/hero.tsx`
  - Modify: Integrate the 3D visual component and responsive fallback.
- `src/components/landing/opportunity-teasers.tsx`
  - Modify: Add overlay graphics, accessibility tags, and limit displayed metadata.
- `src/app/globals.css`
  - Modify: Add design tokens (colors, animations, background grids).

### Architecture and coding guardrails

- **JSX Boolean Guardrail (Next.js 16 Strict):** Do not use `&&` inside JSX. Pre-compute compound booleans as a `const` before the JSX return.
- **Card Component Anti-Pattern (Nested Anchors):** Do not nest links inside the `DealCard` or teaser card. Ensure all teaser card buttons (like InterestButton or signup links) do not create nested `<a>` structures.
- **Public Route Middleware Matching:** Public route `/` must be checked with exact equality (`pathname === "/"`) in `src/middleware.ts` to prevent bypasses.
- **R2 Upload Security / Documents Gating:** Ensure no documents from the database are serialized to public pages. Only `title`, `id`, and basic locations may be returned for unauthenticated users.

### Testing Standards

- Framework: Vitest 4 + React Testing Library.
- Mock all dynamic Spline calls, window size listeners, and database models.
- Assert correct metadata properties are present on components.
- Run test commands: `npx vitest run` and `npm run build`.

### Non-goals / Do Not Do

- Do not implement real-time messaging or in-app chat systems.
- Do not add Stripe or payment processing buttons.
- Do not build dashboard/admin subroutes in this story.
- Do not change Prisma schema files.

### References

- [Source: `docs/AI-Powered-3D-website.md`]
- [Source: `NEW landing page.md`]
- [Source: `_bmad-output/planning-artifacts/epics.md#Story-7.1-Landing-Page-avec-Deals-Teaser-et-Seo`]
- [Source: `_bmad-output/planning-artifacts/ux-spec.md#10.1-Landing-Page-Public-No-Login`]
- [Source: `src/app/(public)/page.tsx`]
- [Source: `src/components/landing/opportunity-teasers.tsx`]
- [Source: `src/middleware.ts`]

## Dev Agent Record

### Agent Model Used

Gemini 3.5 Flash (High)

### Debug Log References

N/A

### Completion Notes List

N/A
