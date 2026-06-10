---
Story: "7.1"
StoryKey: "7-1-landing-page-avec-deals-teaser-et-seo"
Title: "Landing Page avec Deals Teaser et SEO"
Status: "review"
Priority: "P1"
Epic: "Epic 7 — Landing Page et Découverte Publique"
FRs: ["FR41", "FR43", "FR44", "FR45"]
UX_DRs: ["UX-DR29", "UX-DR24", "UX-DR25", "UX-DR26", "UX-DR27"]
Created: "2026-06-10"
---

# Story 7.1: Landing Page avec Deals Teaser et SEO

Status: review

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
     - A video-based hero scene displaying a custom loops video (`/animated-hero-section.mp4`) blended seamlessly with black-to-transparent overlays.
     - Responsive adjustments: on mobile/slow connections, the video falls back to the static WebP image (`/hero-background-ibc-next-with-blue-vignette.webp` or `/hero-background-ibc-next.webp`).

2. **Core Sections display verified content and social proof**
   - Given the landing page is rendered,
   - When the visitor scrolls down,
   - Then the following sections are displayed with their designated assets:
     - **Hero Section:** Headline "Bâtir son futur en Afrique", subheadline, CTA "Rejoins le club" (using React Bits `ShinyText`), and the background/side video loops.
     - **Mission / Comment ça marche:** Explains the 3-step value loop (Rejoindre → Accéder → Passer à l'action) featuring the following assets:
       - Rejoindre: `/section-reseautage-synergie.webp`
       - Accéder: `/section-mentorat-accompagnement.webp`
       - Passer à l'action: `/section-club-affaires-prestige.webp`
     - **Mur des Succès:** Carousel of testimonials featuring member profile photos:
       - `/profil-1-jeune-entrepreneure-tech.webp`
       - `/profil-2-investisseur-senior-business-angel.webp`
       - `/profil-3-entrepreneur-local-cote-divoire.webp`
       - `/profil-4-cadre-financiere-experte-en-investissement.webp`
     - **Teaser Deals Feed:** Displays 3–5 teaser deal cards with `/section-investissement-deals.webp` used in the card background/container.
     - **Tiers Comparison:** Shows the three offers (Affranchis, Grands Frères, Boss) with prices (€29, €49, €99) and benefits comparison, using React Bits `SpotlightCard` or `TiltCard`.
     - **Trust Signals & FAQ:** Compliance notes, FAQ accordion, partner logos.
     - **Footer:** Terms (CGV), contact link, newsletter input, and `/logo-ibc.webp`.

3. **Scroll-Tied Animation Experience**
   - Given the visitor scrolls through the middle sections of the page,
   - When they scroll down,
   - Then a custom `ScrollVideoPlayer` component plays the video `/animated-network-lines-abidjan.mp4` based on scroll progress.
   - And the video seeking is optimized using `requestAnimationFrame` to smooth frame seek operations (interleaved seeking) and avoid repaints/reflows.

4. **Teaser Deals Gating and Security**
   - Given a visitor on the teaser deals section,
   - When they view a deal card,
   - Then only the title, category, and location are visible (FR41).
   - And a persistent overlay "Devenez membre pour voir les détails" covers the card with a signup CTA link.
   - And the API / Server Components securely strip out sensitive details (amount, attachments, creator contacts) for unauthenticated requests.

5. **SEO Optimization and Indexability**
   - Given the landing page is crawled by a search engine,
   - When the HTML is parsed,
   - Then metadata (title, description, open graph tags) are present in French.
   - And the site logo is configured using `/logo-ibc.webp` and the favicon is configured using `/favicon-ibc.webp` in the app's metadata.
   - And the teaser deals are server-side rendered (SSG/ISR) and indexable by search engine bots.

6. **Responsive and Accessible Design**
   - Given the landing page on mobile devices (320px–767px),
   - When a visitor scrolls,
   - Then all interactive components use a single-column layout, touch targets are at least 44×44px, and the primary CTA is sticky at the bottom of the viewport.
   - And screen-readers receive descriptive `aria-label` tags for the video visualizers and icons.
   - And if the user has `prefers-reduced-motion: reduce` active, all animations (glows, video seeking, transitions) are deactivated.

## Tasks / Subtasks

- [x] Integrate Higgsfield AI video and static WebP fallbacks (AC: 1, 3)
  - [x] Reference the asset guide in [docs/AI-Powered-3D-website.md](file:///d:/Code/ivoire-business-club-next/docs/AI-Powered-3D-website.md).
  - [x] Implement a `ScrollVideoPlayer` component at `src/components/ui/scroll-video-player.tsx` with a scroll-tied `requestAnimationFrame` mechanism to play `/animated-network-lines-abidjan.mp4`.
  - [x] Implement a `HeroVideoPlayer` component at `src/components/ui/hero-video-player.tsx` that plays `/animated-hero-section.mp4` in a looping, muted state.
  - [x] Apply black-to-transparency gradient overlays at the top and bottom of the video elements to blend them seamlessly into the dark `#090D16` background.
  - [x] Integrate connection/performance fallback check (via `navigator.connection` or screen width) to show static `/hero-background-ibc-next-with-blue-vignette.webp` instead of loading heavy video elements on slow mobile networks.

- [x] Manage project dependencies for React Bits components (AC: 1, 2)
  - [x] Install `gsap` and `@gsap/react` as dependencies in `package.json` for GSAP-based animations (like `SplitText`).
  - [x] If using `BlurText`, install `framer-motion` (referenced as `motion` in React Bits dependencies).

- [x] Redesign the Landing Page layout and styling with React Bits (AC: 1, 2, 6)
  - [x] Update `src/app/globals.css` with dark mode tokens (`#090D16` / `#0F172A`), glassmorphism utility classes, and custom keyframes.
  - [x] Refactor `src/app/(public)/page.tsx` for server-side rendering (SSG / ISR, revalidate every 3600 seconds) for public teasers.
  - [x] Modify `src/components/landing/hero.tsx` to include React Bits typography component (`SplitText` or `BlurText` for title intro) and dynamic hero video/static fallback.
  - [x] Implement the "Mur des Succès" component at `src/components/landing/success-wall.tsx` containing horizontal scrolls of testimonials utilizing the profile photos:
    - `/profil-1-jeune-entrepreneure-tech.webp`
    - `/profil-2-investisseur-senior-business-angel.webp`
    - `/profil-3-entrepreneur-local-cote-divoire.webp`
    - `/profil-4-cadre-financiere-experte-en-investissement.webp`
  - [x] Update `src/components/landing/pricing.tsx` to display comparison cards (stacked on mobile, horizontal comparison table on desktop) wrapped in React Bits `SpotlightCard` or `TiltCard` components.
  - [x] Ensure all buttons use `ShinyText` from React Bits and respect 44px touch targets.
  - [x] Incorporate `SplashCursor` React Bits component to add premium interactive fluid trails on the page background.

- [x] Implement secure public deal gating in teaser cards (AC: 4)
  - [x] Modify `src/components/landing/opportunity-teasers.tsx` to match the exact teaser card design with an overlay and lock icon.
  - [x] Ensure the Server Component query in `src/app/(public)/page.tsx` only queries non-sensitive fields from the database: `id`, `title`, and `location` (through author relation). Never fetch or serialize `amount`, `documents`, or `author.phoneNumber` for public routes.
  - [x] Ensure `InterestButton` on public pages behaves correctly (redirects to signup/login modal rather than initiating a soft commitment).

- [x] Implement SEO, metadata, and accessibility options (AC: 5, 6)
  - [x] Configure page-level metadata in `src/app/(public)/page.tsx` (and root `src/app/layout.tsx` for global elements) with French Title: "Ivoire Business Club — Bâtir son futur en Afrique", description, and OpenGraph parameters.
  - [x] Configure the site logo using `/logo-ibc.webp` and the favicon using `/favicon-ibc.webp` (referencing it in `layout.tsx` metadata icons or as standard app icon).
  - [x] Apply `prefers-reduced-motion` media queries in Tailwind or component code to disable keyframe animations or video frame seek logic if active.
  - [x] Add `aria-label` tags to visualizers, links, and forms.

- [x] Verification and automated testing (AC: 1, 2, 3, 4, 5, 6)
  - [x] Add unit tests for `ScrollVideoPlayer` and `HeroVideoPlayer` to verify it falls back to 2D image when connection is slow or widths are small.
  - [x] Update tests in `src/components/landing/opportunity-teasers.test.tsx` to assert that sensitive info is missing and signup links exist.
  - [x] Add SEO metadata checks in route tests.
  - [x] Run `npx vitest run`.
  - [x] Run `npm run build`.

### Review Findings

- [ ] [Review][Decision] Cartes Teaser n'utilisant pas DealCard — AC 2 exige l'utilisation de DealCard, mais OpportunityTeasers utilise des balises article personnalisées. Utiliser DealCard nécessite soit de l'adapter pour supporter un mode "teaser" (floutage, masquage des données sensibles et absence de liens internes), soit de conserver les balises article personnalisées pour la Landing Page.
- [ ] [Review][Patch] React lifecycle timer et décalage de mise en page (Layout Shift) dans BlurText [src/components/ui/blur-text.tsx]
- [ ] [Review][Patch] Problèmes de fallback lors du chargement des vidéos dans HeroVideoPlayer [src/components/ui/hero-video-player.tsx]
- [ ] [Review][Patch] Gestion des erreurs de vidéo, position initiale et hauteur de défilement dans ScrollVideoPlayer [src/components/ui/scroll-video-player.tsx]
- [ ] [Review][Patch] Respect de la préférence accessibilité prefers-reduced-motion dans ScrollVideoPlayer et HeroVideoPlayer [src/components/ui/scroll-video-player.tsx]
- [ ] [Review][Patch] Conflit de spécificité CSS inline dans ShinyText [src/components/ui/shiny-text.tsx]
- [ ] [Review][Patch] Alignement Flexbox cassé par le wrapper parent de SpotlightCard [src/components/ui/spotlight-card.tsx]
- [ ] [Review][Patch] Surcharge CPU (layout thrashing) sur mousemove dans SpotlightCard [src/components/ui/spotlight-card.tsx]
- [ ] [Review][Patch] Boucle requestAnimationFrame indéfinie en veille dans ScrollVideoPlayer [src/components/ui/scroll-video-player.tsx]
- [ ] [Review][Patch] Flash de contenu non stylisé (FOUC) et dépendances useGSAP obsolètes dans SplitText [src/components/ui/split-text.tsx]
- [ ] [Review][Patch] Dépendance à la base de données au build via la configuration ISR [src/app/(public)/page.tsx]
- [ ] [Review][Patch] Caractères corrompus dans les liens du pied de page (Footer) [src/components/landing/footer.tsx]
- [ ] [Review][Patch] Absence de boutons de navigation et de défilement par glissé (drag scroll) pour SuccessWall [src/components/landing/success-wall.tsx]
- [ ] [Review][Patch] Bouton d'action principal (CTA) collant manquant en bas d'écran sur mobile [src/app/(public)/page.tsx]
- [ ] [Review][Patch] Champ category manquant dans les requêtes et affichage des cartes Teaser [src/app/(public)/page.tsx]
- [ ] [Review][Patch] Classe mesh-gradient-bg inutilisée dans le layout [src/app/globals.css]
- [ ] [Review][Patch] Échec du test unitaire après la suppression de SplashCursor [src/app/(public)/page.test.tsx]

## Dev Notes

### Critical product context

Epic 7 introduces the public identity of IBC. Because the club sells trust and risk reduction, the landing page is the first point of validation. It must feel premium and interactive while protecting the exclusivity of the marketplace content by masking details behind a teaser wall. It uses Higgsfield AI loops videos, scroll-tied animation components, and React Bits visual micro-interactions to deliver a state-of-the-art cinematic experience for the diaspora. [Source: `_bmad-output/planning-artifacts/epics.md#Epic-7-Landing-Page-et-Découverte-Publique`, `docs/AI-Powered-3D-website.md`]

### Requirements traced to PRD / Epic / UX / 3D Spec

- FR41: The landing page displays public teaser deals without authentication. [Source: `_bmad-output/planning-artifacts/prd.md#8.5-Landing--Contenu`]
- FR43: The landing page displays a success wall (testimonials, closed deals). [Source: `_bmad-output/planning-artifacts/prd.md#8.5-Landing--Contenu`]
- FR45 / UX-DR24: Mobile-first layout (single column base, bottom sticky CTAs). [Source: `_bmad-output/planning-artifacts/ux-spec.md#13-Responsive-Design--Accessibility`]
- NFR-P1: Landing page load time < 2s on 3G. [Source: `_bmad-output/planning-artifacts/architecture.md#Technical-Constraints--Dependencies`]
- Premium Design Recommendations: Glassmorphism, deep dark background `#090D16`, dynamic video masking with overlays, React Bits widgets (ShinyText, SplitText, SpotlightCard, SplashCursor). [Source: `docs/AI-Powered-3D-website.md`]

### React Bits Integration & Dependency Matrix (Verified via Context7)

| Component | Purpose / Section | Key Props / Configuration | Dependencies |
|---|---|---|---|
| `SplitText` | Hero Title Entrance Animation | `tag="h1" delay={50} duration={1.25} ease="power3.out" splitType="chars"` | `gsap`, `@gsap/react` |
| `BlurText` | Hero Subheadline / Text | `text="..." animateBy="words" direction="top" delay={200} stepDuration={0.35}` | `framer-motion` |
| `ShinyText` | Primary CTA Button ("Rejoins le club") | `text="..." speed={2} className="..." disabled={false}` | CSS-only keyframes transition (Zero-dependency) |
| `SpotlightCard` | Tiers & Pricing Cards / Teasers | `spotlightColor="rgba(255, 255, 255, 0.15)" className="..."` | Mouse coords (Zero-dependency) |
| `SplashCursor` | Page-wide Background Fluid Trail | Interactive WebGL liquid canvas | Canvas/WebGL (Zero-dependency) |

### Existing implementation state to reuse, not reinvent

- `src/components/tier-card.tsx` and `src/lib/tier-config.ts` are ready and support selecting tiers. Reuse them. [Source: `src/components/tier-card.tsx`]
- `src/components/landing/opportunity-teasers.tsx` already has basic teaser card gating with `InterestButton`. Refine it rather than rebuilding it. [Source: `src/components/landing/opportunity-teasers.tsx`]

### Current files likely to modify and what to preserve

- `src/app/(public)/page.tsx`
  - Modify: Refactor page content, database queries, and static generation params.
  - Preserve: Dynamic routing constraints, layout skeleton, and secure auth session verification.
- `src/components/landing/hero.tsx`
  - Modify: Integrate the `HeroVideoPlayer` component and responsive fallback.
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
- Mock all dynamic video player component calls, window size listeners, and database models.
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

Gemini 3.5 Flash (Medium)

### Debug Log References

N/A

### Completion Notes List

N/A
