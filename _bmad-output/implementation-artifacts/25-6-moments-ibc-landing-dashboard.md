---
story_key: 25-6-moments-ibc-landing-dashboard
epic: epic-25
title: Section « Moments IBC » sur landing + page dashboard events passés
status: review
created_at: 2026-07-05
baseline_commit: 1052b67
---

# Story 25.6 : Section « Moments IBC » sur landing + page dashboard events passés

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

**En tant que** visiteur ou membre,
**Je veux** voir les moments forts des événements IBC passés sur la landing page et dans le dashboard,
**Afin de** ressentir l'énergie de la communauté et être incité à participer aux événements ou à rejoindre le club.

## Contexte

Cette story est la 6ème et dernière story de l'**Epic 25 : Plateforme d'Événements — Couverture, Visibilité, Tarification & Galerie**. Elle valorise les photos collectées dans la galerie collaborative (Story 25-5) en créant une vitrine d'engagement visuel à deux niveaux :

1. **Sur la Landing Page publique (`/`)** : Une nouvelle section « Moments IBC » présentant un aperçu dynamique des meilleures photos issues des événements passés publiés et publics.
2. **Dans le Dashboard membres (`/dashboard/events`)** : Une page dédiée recensant l'historique des événements passés avec prévisualisation des photos de galerie et accès direct à la galerie collaborative de chaque événement.

**Sources :**
- [Sprint Change Proposal — Epic 25 (2026-07-04)](file:///d:/Code/ivoire-business-club-next/_bmad-output/planning-artifacts/sprint-change-proposal-2026-07-04.md) §1.2, §4.3, §4.5, Story 25-6
- [Story 25-5 — Galerie collaborative post-event](./25-5-galerie-collaborative-post-event.md)
- [Architecture Document](../planning-artifacts/architecture.md)
- Code existant : `src/app/(public)/page.tsx`, `src/lib/event-server-utils.ts`, `src/lib/media-path.ts`, `src/app/api/media/events/[eventId]/gallery/[filename]/route.ts`

---

## Acceptance Criteria

### AC1 — Section « Moments IBC » sur la Landing Page (`/`)
**Given** un visiteur non connecté ou un membre sur la landing page `/`
**When** il défile jusqu'à la section « Moments IBC » (composant `<MomentsIbc />`)
**Then** une grille responsive ou un carrousel présente jusqu'à 12 photos récentes issues des événements passés (`startDate < NOW`), avec `status = 'PUBLISHED'` et `visibility = 'PUBLIC'`
**And** chaque carte photo affiche un aperçu de l'image (via la route d'accès média `/api/media/events/{eventId}/gallery/{filename}`), la légende ou le titre de l'événement associé, et la date de l'événement
**And** si aucune photo publique n'est disponible en base de données, la section ne provoque pas d'erreur et ne s'affiche pas (ou affiche un fallback sobre).

### AC2 — Navigation depuis les photos « Moments IBC » de la Landing
**Given** un visiteur ou un membre consultant la section « Moments IBC » de la landing page
**When** il clique sur une photo d'un événement
**Then** il est redirigé vers la page publique de l'événement correspondant (`/events/[slug]`)
**And** si l'événement est PUBLIC, il accède aux détails complets et à la galerie ; si l'événement est PRIVÉ et le visiteur non connecté, la page de l'événement affiche le teaser privé avec le bouton "Devenir membre pour réserver" / s'inscrire.

### AC3 — Page Dashboard « Événements passés » (`/dashboard/events`)
**Given** un membre connecté sur le dashboard
**When** il accède à la page `/dashboard/events`
**Then** la page affiche la liste des événements passés (`startDate < NOW`) triés par date décroissante
**And** pour chaque événement passé, une carte présente :
  - L'image de couverture (ou placeholder si absente)
  - Le titre, la date du déroulement, le lieu ou lien visio, le type (`EN PRESENTIEL` / `EN LIGNE`) et le badge de visibilité (`PUBLIC` / `PRIVE`)
  - Le nombre total de photos dans sa galerie (`_count.galleryPhotos`)
  - Une bande d'aperçu des 3 à 4 premières photos de sa galerie
  - Un bouton « Voir la galerie photo » redirigeant vers `/dashboard/events/[slug]/gallery`.

### AC4 — Filtres et Navigation dans le Dashboard Événements
**Given** le membre connecté sur `/dashboard/events`
**When** il consulte la page
**Then** des onglets ou sélecteurs de filtre permettent d'alterner entre « Événements à venir » (redirection vers `/events` ou vue dédiée) et « Événements passés » (`/dashboard/events`).

### AC5 — Qualité, Build et Tests Unitaires/Intégration
**Given** le code développé
**When** `npm run build` et `npx vitest run` sont exécutés
**Then** le build Next.js passe sans erreur TypeScript/ESLint et les tests couvrent :
  - `getMomentsIbcPhotos()` dans `src/lib/event-server-utils.ts` (filtrage `PUBLIC`, `PUBLISHED`, `startDate < NOW`, limite 12)
  - Rendu du composant `MomentsIbc.tsx` (gestion état vide, affichage des cartes)
  - Page Dashboard `/dashboard/events/page.tsx` et son composant `PastEventCard.tsx`
  - Sécurité des médias (uniquement événements publics pour la landing page afin d'éviter les 404 sur médias privés).

---

## Tasks / Subtasks

- [x] **Task 1 — Extensions Helpers de requêtes Événements (`src/lib/event-server-utils.ts`) (AC1, AC3)**
  - [x] 1.1 Ajouter la fonction `getMomentsIbcPhotos(limit = 12)` : requêter `prisma.eventGalleryPhoto.findMany` avec condition `event: { status: "PUBLISHED", visibility: "PUBLIC", startDate: { lt: new Date() } }`, ordonné par `createdAt desc`, incluant `event: { select: { id: true, slug: true, title: true, startDate: true } }`.
  - [x] 1.2 Ajouter la fonction `getPastEventsWithGalleryPreview(limit = 20)` : requêter `prisma.event.findMany` avec condition `startDate: { lt: new Date() }, status: "PUBLISHED"`, incluant `galleryPhotos` (take: 4, order: createdAt desc) et `_count: { select: { galleryPhotos: true, registrations: true } }`.

- [x] **Task 2 — Composant Landing Page « Moments IBC » (`src/components/landing/moments-ibc.tsx`) (AC1, AC2)**
  - [x] 2.1 Créer `MomentsIbc.tsx` : Composant serveur ou client affichant une section haut de gamme avec titre "Moments IBC", sous-titre élégant et grille responsive de cartes photo (hover zoom, badge événement, lien vers `/events/[slug]`).
  - [x] 2.2 Gérer les cas d'absence de photos (retourner `null` si le tableau est vide pour ne pas encombrer la landing).
  - [x] 2.3 Utiliser `getEventGalleryRelativePath` pour formater les URLs `/api/media/events/[eventId]/gallery/[filename]`.

- [x] **Task 3 — Intégration sur la Landing Page (`src/app/(public)/page.tsx`) (AC1)**
  - [x] 3.1 Appeler `getMomentsIbcPhotos()` dans le Server Component `HomePage`.
  - [x] 3.2 Placer le composant `<MomentsIbc photos={momentsPhotos} />` entre les témoignages/articles et la section Tarifs ou Événements à venir.

- [x] **Task 4 — Page Dashboard Événements Passés (`src/app/(dashboard)/dashboard/events/page.tsx`) (AC3, AC4)**
  - [x] 4.1 Authentification requise (`await auth()`). Redirection vers `/auth/signin` si non connecté.
  - [x] 4.2 Charger les événements passés via `getPastEventsWithGalleryPreview()`.
  - [x] 4.3 Créer la mise en page du dashboard avec un header clair "Événements passés & Galeries" et une barre d'onglets pour passer des événements passés aux événements à venir.

- [x] **Task 5 — Composants UI Dashboard Événements Passés (`src/components/features/events/PastEventCard.tsx`) (AC3, AC4)**
  - [x] 5.1 Créer `PastEventCard.tsx` : Carte présentant un événement passé, son type (présentiel/en ligne), sa visibilité, sa date, le compteur de photos de galerie, et une rangée de 3 à 4 vignettes d'aperçu de la galerie.
  - [x] 5.2 Ajouter un bouton CTA « Consulter la galerie » redirigeant vers `/dashboard/events/[slug]/gallery`.

- [x] **Task 6 — Tests Unitaires et d'Intégration (AC5)**
  - [x] 6.1 Écrire `src/lib/event-server-utils.test.ts` : tester `getMomentsIbcPhotos` et `getPastEventsWithGalleryPreview` avec mocks Prisma.
  - [x] 6.2 Écrire `src/components/landing/moments-ibc.test.tsx` : vérifier le rendu du composant avec des photos mockées et le retour `null` si aucune photo.
  - [x] 6.3 Écrire `src/app/(dashboard)/dashboard/events/page.test.tsx` : tester le rendu de la page dashboard et l'affichage des événements passés.
  - [x] 6.4 Lancer `npm run build` et `npx vitest run` pour s'assurer que zéro régression n'est introduite.

---

## Dev Notes

### Architecture & Patterns à suivre

- **Langue du projet** : Interfaces et messages utilisateur en **français**.
- **Serveur Media Route** : La route `/api/media/events/[eventId]/gallery/[filename]/route.ts` vérifie la visibilité de l'événement. Pour éviter tout HTTP 404 sur la landing page publique, **seules les photos d'événements `visibility = PUBLIC`** doivent être sélectionnées pour "Moments IBC".
- **URLs Média** : Les chemins `filePath` enregistrés dans `EventGalleryPhoto` sont sous la forme `/events/[eventId]/gallery/[filename]`. L'URL d'affichage dans le navigateur est `/api/media${filePath}`.
- **Optimisation Image** : Utiliser le composant `<Image />` de Next.js avec `unoptimized` ou les attributs `width`/`height` appropriés pour les cartes et vignettes.
- **Style Avant-Garde** : Adhérer à la charte sombre & dorée d'IBC (`#090D16`, `#D4A847`, glassmorphism, effets hover subtils, micro-animations Tailwind).

---

## Dev Agent Record

### Implementation Plan
- Implemented `getMomentsIbcPhotos` and `getPastEventsWithGalleryPreview` in `src/lib/event-server-utils.ts` with strict filters and graceful fallback handling.
- Developed `MomentsIbc.tsx` landing section following IBC dark & gold design system. Returns `null` when no public photos exist.
- Integrated `MomentsIbc` into `src/app/(public)/page.tsx`.
- Built `PastEventCard.tsx` for dashboard view showcasing past event details, badges, gallery photo count, and 4-thumbnail gallery previews.
- Built `/dashboard/events` page with authentication enforcement (`auth()`), header, tabs navigation, past event cards grid, and empty state.
- Wrote unit tests for server helpers, landing component, past event card, and dashboard events page. All tests pass and `npm run build` succeeds cleanly.

---

## File List

- `src/lib/event-server-utils.ts` (modified)
- `src/lib/event-server-utils.test.ts` (created)
- `src/components/landing/moments-ibc.tsx` (created)
- `src/components/landing/moments-ibc.test.tsx` (created)
- `src/app/(public)/page.tsx` (modified)
- `src/app/(public)/page.test.tsx` (modified)
- `src/components/features/events/PastEventCard.tsx` (created)
- `src/components/features/events/PastEventCard.test.tsx` (created)
- `src/app/(dashboard)/dashboard/events/page.tsx` (created)
- `src/app/(dashboard)/dashboard/events/page.test.tsx` (created)
- `src/lib/event-utils.test.ts` (modified)
- `_bmad-output/implementation-artifacts/25-6-moments-ibc-landing-dashboard.md` (modified)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified)

---

## Change Log

- 2026-07-05: Implementation of Story 25-6 (Moments IBC section on landing page & Dashboard past events page with gallery previews). Status moved to review.

---

## Story Completion Status

- Status: review
- Completion Note: All acceptance criteria (AC1 to AC5) fully implemented and tested. Build and test suite pass 100%. Ready for code review.

### Enseignements de la Story 25-5 (`25-5-galerie-collaborative-post-event.md`)

- **Stockage et URLs médias** : `filePath` contient `/events/${eventId}/gallery/${filename}`. Pour afficher les photos dans une balise `<img>` ou `<Image>`, utiliser le préfixe `/api/media${filePath}`.
- **Sécurité et Contrôle d'accès** : La route `/api/media/events/[eventId]/gallery/[filename]` requiert une session si l'événement est `PRIVATE`. Sur la landing page publique, un visiteur anonyme se verrait refuser l'accès si la photo provient d'un événement privé. D'où la contrainte de filtrer `visibility: "PUBLIC"` dans `getMomentsIbcPhotos()`.
- **Rendu dynamique et Prisma** : La page `src/app/(public)/page.tsx` est configurée avec `export const dynamic = 'force-dynamic';` pour éviter l'accès DB durant le build statique. Envelopper tout appel Prisma dans un bloc `try/catch` avec un tableau vide par défaut pour éviter tout crash de la landing page.

---

## Git Intelligence Summary

Commits récents sur l'Epic 25 :
- `1052b67`: `dev story 25-5` — Implémentation complète de la galerie collaborative post-event (`EventGallery`, modération, API upload/delete, servie media).
- `6bddf2e`: `Create story 25-5` — Spécification contextuelle Story 25-5.
- `0ee1d79`: `Dev story 25-4` — Inscription et paiements événements (virement + mobile money + sur place).
- `3040326`: `create story 25-4` — Spécification contextuelle Story 25-4.
- `0a22f09`: `chore(bmad): mark story 25-3 as done — CR PASS after DS fix`.

---

## Project Context Reference

- [Sprint Change Proposal — Epic 25 (2026-07-04)](file:///d:/Code/ivoire-business-club-next/_bmad-output/planning-artifacts/sprint-change-proposal-2026-07-04.md)
- [Architecture Document](../planning-artifacts/architecture.md)

## Story Completion Status

- Status: ready-for-dev
- Completion Note: Ultimate context engine analysis completed — comprehensive developer guide created for Story 25-6.
