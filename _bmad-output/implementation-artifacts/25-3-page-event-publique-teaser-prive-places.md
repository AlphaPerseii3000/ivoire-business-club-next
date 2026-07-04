---
story_key: 25-3-page-event-publique-teaser-prive-places
epic: epic-25
title: Page event publique avec teaser privé + compteur places + grille tarifaire
status: ready-for-dev
created_at: 2026-07-04
baseline_commit: f6e1013d8f4a0d0c0f0e4d8f0e4d8f0e4d8f0e4d
---

# Story 25.3 : Page event publique avec teaser privé + compteur places + grille tarifaire

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

**En tant que** visiteur ou membre,
**Je veux** consulter la page d'un événement avec toutes les informations pertinentes,
**Afin de** décider si je m'inscris ou si je deviens membre pour accéder aux events privés.

## Contexte

Story 25-3 est la **troisième story de l'Epic 25 : Plateforme d'Événements — Couverture, Visibilité, Tarification & Galerie**. Elle dépend directement des stories 25-1 (modèle Event étendu : `visibility`, `maxCapacity`, `pricing`, `eventType`, `coverImagePath`) et 25-2 (upload couverture VPS + route média `/api/media/events/{id}/cover` + formulaire admin 5 sections).

**Cette story est un DELTA strict** : le modèle de données et la couverture sont prêts. L'objectif est exclusivement d'adapter l'expérience publique (liste + détail) pour :

1. Gérer la **visibilité** `PUBLIC` / `PRIVATE` côté visiteur et membre.
2. Afficher un **teaser flouté** pour les events privés aux visiteurs non connectés.
3. Afficher le **compteur de places restantes** sur le détail.
4. Afficher la **grille tarifaire** par tier (visiteur + membres) et mettre en avant le tarif du membre connecté.
5. Fournir les CTAs adaptés : « Devenir membre pour réserver » pour un visiteur sur event privé, « S'inscrire » pour un membre.

**Sources :**
- [Sprint Change Proposal — Epic 25 (2026-07-04)](../planning-artifacts/sprint-change-proposal-2026-07-04.md) §4.3, §4.5, Story 25-3
- [Story 25-1 — Migration modèle Event](./25-1-migration-modele-event-extended.md)
- [Story 25-2 — Upload couverture VPS + form admin](./25-2-upload-couverture-vps-form-admin.md)
- [Architecture Decision Document](../planning-artifacts/architecture.md) §API Patterns, §Frontend Architecture, §Auth Architecture
- Code existant : `src/app/(public)/events/page.tsx`, `src/app/(public)/events/[slug]/page.tsx`, `src/components/features/events/EventCard.tsx`, `src/components/features/events/EventPopup.tsx`, `src/components/features/events/NextEventCard.tsx`, `src/lib/event-utils.ts`, `src/lib/tier-config.ts`, `prisma/schema.prisma`

## Acceptance Criteria

### AC1 — Liste publique `/events` : events PUBLIC visibles normalement

**Given** un visiteur non connecté sur la page `/events`
**When** il consulte la liste des événements
**Then** les events `visibility = PUBLIC` s'affichent normalement (image de couverture via `/api/media/events/{id}/cover`, titre, date, lieu/lien, badge type En présentiel/En ligne, prix à partir de)

### AC2 — Liste publique `/events` : teaser d'un event PRIVÉ pour visiteur

**Given** un visiteur non connecté sur la page `/events`
**When** il consulte la liste et qu'un event `visibility = PRIVATE` existe
**Then** la card de l'event privé affiche :
- image de couverture floutée (CSS `blur-md` ou `blur-lg`)
- badge 🔒 Privé
- titre + date visibles
- lieu flouté
- prix membre barré visible (strikethrough)
- bouton « Devenir membre pour réserver » → `/signup`

### AC3 — Liste publique `/events` : event PRIVÉ déflouté pour membre

**Given** un membre connecté sur la page `/events`
**When** il consulte la liste
**Then** les events `visibility = PRIVATE` s'affichent sans flou et avec un bouton « S'inscrire »

### AC4 — Compteur de places restantes sur le détail

**Given** un visiteur ou membre sur la page de détail `/events/[slug]`
**When** l'événement a un `maxCapacity` défini
**Then** le nombre de places restantes s'affiche : « X places restantes » (`maxCapacity - count` des inscriptions `REGISTERED`).

**Given** un événement sans `maxCapacity`
**Then** le compteur affiche « Places illimitées ».

### AC5 — Grille tarifaire sur le détail

**Given** un visiteur ou membre sur la page de détail
**When** l'événement a une grille tarifaire
**Then** les prix s'affichent :
- « Visiteur : X FCFA »
- « Membres : à partir de Y FCFA » (minimum des prix non nuls des tiers)
- Le membre connecté voit son tarif spécifique mis en avant : « Votre tarif (Affranchis) : Y FCFA »

**Given** un événement gratuit (`pricing = null`)
**Then** la section affiche « Gratuit ».

### AC6 — Teaser privé sur le détail `/events/[slug]`

**Given** un event `visibility = PRIVATE` et un visiteur non connecté
**When** il tente d'accéder à `/events/[slug]`
**Then** la page affiche le teaser (titre, date, description floutée) avec CTA « Devenir membre » au lieu du contenu complet, du lieu/lien visio, du compteur de places complet et du bouton d'inscription

### AC7 — Build + tests verts

**Given** le build et les tests
**When** `npm run build` et les tests sont exécutés
**Then** le build passe et les tests vérifient : affichage public/privé, blur conditionnel, compteur places, grille tarifaire, tarif membre mis en avant.

## Tasks / Subtasks

- [ ] **Task 1 — Adapter la requête liste `/events` pour intégrer visibilité + tarifs (AC1, AC2, AC3)**
  - [ ] 1.1 Mettre à jour `src/app/(public)/events/page.tsx` pour appeler `auth()` et récupérer la session (optionnelle)
  - [ ] 1.2 Sélectionner en Prisma : `id`, `slug`, `title`, `startDate`, `endDate`, `location`, `onlineUrl`, `coverImagePath`, `eventType`, `visibility`, `maxCapacity`, `pricing`, `status`
  - [ ] 1.3 Filtrer la liste publique : `status = PUBLISHED`, `startDate >= now()` ET `visibility = PUBLIC` si visiteur non authentifié ; inclure `visibility = PRIVATE` si membre connecté
  - [ ] 1.4 Passer la session/tier aux composants `EventCard` si nécessaire pour les états conditionnels
  - [ ] 1.5 Mettre à jour les tests `src/app/(public)/events/page.test.tsx` pour couvrir public/privé/gratuit

- [ ] **Task 2 — Refactor de `EventCard` pour gérer public / privé / tarifs (AC1, AC2, AC3)**
  - [ ] 2.1 Étendre l'interface `EventCardEvent` avec `eventType`, `visibility`, `pricing`, `maxCapacity` (optionnels)
  - [ ] 2.2 Ajouter une prop `userTier?: string | null` et `isAuthenticated?: boolean`
  - [ ] 2.3 Afficher le badge type d'événement (En présentiel / En ligne)
  - [ ] 2.4 Calculer et afficher le prix « à partir de » (minimum des tiers non nuls) ; si `pricing = null` afficher « Gratuit »
  - [ ] 2.5 Pour un event `PRIVATE` et un visiteur non authentifié :
    - image floutée (`blur-md`)
    - badge 🔒 Privé
    - lieu masqué/flouté
    - prix membre barré
    - bouton « Devenir membre pour réserver » (pas un lien sur toute la carte ; ne pas casser le wrapper `Link` existant — voir § nested anchors)
  - [ ] 2.6 Pour un event `PRIVATE` et un membre authentifié : afficher normal avec CTA « S'inscrire »
  - [ ] 2.7 Pour un event `PUBLIC` : afficher normal avec CTA « S'inscrire »
  - [ ] 2.8 Mettre à jour/créer `src/components/features/events/EventCard.test.tsx`

- [ ] **Task 3 — Adapter `EventPopup` et `NextEventCard` (AC1, AC2 cohérence)**
  - [ ] 3.1 Étendre les interfaces `NextEventCardEvent` avec les champs visibilité/tarifs si utilisés
  - [ ] 3.2 `NextEventCard` ne promeut que le prochain event PUBLISHED (déjà le cas via `getNextPublishedEvent`)
  - [ ] 3.3 `EventPopup` : conserver le comportement existant (prochain event PUBLISHED) ; optionnellement afficher le prix à partir de
  - [ ] 3.4 Mettre à jour les tests si les props changent

- [ ] **Task 4 — Adapter la page détail `/events/[slug]` (AC4, AC5, AC6)**
  - [ ] 4.1 Appeler `auth()` dans la page détail pour connaître l'utilisateur et son tier
  - [ ] 4.2 Requêter l'event avec `include: { registrations: { where: { status: 'REGISTERED' } } } }` pour compter les places
  - [ ] 4.3 Si `visibility = PRIVATE` et visiteur non authentifié : rendre le teaser
    - titre, date visibles
    - description floutée (`blur-md`)
    - badge 🔒 Privé
    - CTA « Devenir membre » → `/signup`
    - masquer le lieu/lien visio, le compteur, la grille tarifaire, le bouton S'inscrire
  - [ ] 4.4 Si `visibility = PUBLIC` ou membre authentifié : rendre la page complète
    - afficher le badge type (En présentiel / En ligne)
    - afficher le compteur de places (AC4)
    - afficher la grille tarifaire (AC5)
    - CTA « S'inscrire »
  - [ ] 4.5 Conserver le rendu annulé existant
  - [ ] 4.6 Mettre à jour `generateMetadata` pour ne pas exposer la description complète d'un event privé aux visiteurs (optionnel : description générique pour privé)
  - [ ] 4.7 Mettre à jour les tests `src/app/(public)/events/[slug]/page.test.tsx`

- [ ] **Task 5 — Helpers de calcul tarifaire et places (AC4, AC5)**
  - [ ] 5.1 Créer/étendre `src/lib/event-utils.ts` avec :
    - `getRemainingSpots(event: EventWithRegistrations): number | null`
    - `formatEventPricing(pricing: Pricing | null): { visitorPrice: number | null, memberMinPrice: number | null, isFree: boolean }`
    - `getPriceForTier(pricing: Pricing | null, tier: Tier): number | null`
  - [ ] 5.2 Ajouter `src/lib/event-utils.test.ts` pour tester ces helpers

- [ ] **Task 6 — Routes API existantes (pas de modification fonctionnelle majeure, compatibilité)**
  - [ ] 6.1 Vérifier que `src/app/api/events/route.ts` et `src/app/api/events/[id]/route.ts` continuent de retourner `visibility`, `pricing`, `maxCapacity` (déjà prêt grâce à 25-1)
  - [ ] 6.2 S'assurer que `GET /api/events/[id]` ne retourne pas les events `DRAFT` aux visiteurs (déjà implémenté)
  - [ ] 6.3 Les routes API ne sont PAS le focus de cette story ; la logique de visibilité est appliquée côté Server Component

- [ ] **Task 7 — Tests (AC7)**
  - [ ] 7.1 Mettre à jour `src/app/(public)/events/page.test.tsx` :
    - event PUBLIC visible normalement
    - event PRIVATE flouté pour visiteur
    - event PRIVATE visible pour membre
    - prix à partir de affiché
  - [ ] 7.2 Mettre à jour `src/app/(public)/events/[slug]/page.test.tsx` :
    - compteur places restantes
    - « Places illimitées » si `maxCapacity = null`
    - grille tarifaire par tier
    - tarif membre mis en avant
    - teaser privé pour visiteur
    - contenu complet pour membre
  - [ ] 7.3 Créer/adapter `src/components/features/events/EventCard.test.tsx`
  - [ ] 7.4 Créer/adapter `src/lib/event-utils.test.ts`
  - [ ] 7.5 Exécuter `npm run build` et `npx vitest run`, corriger les régressions

## Dev Notes

### Architecture & patterns à suivre

- **Langue du projet** : Tous les artefacts, UI, messages d'erreur, logs et commentaires de code en **français**.
- **Next.js 16 / React 19 / App Router** : les `params` des routes dynamiques sont asynchrones et doivent être `await`és.
- **Prisma 7.8.0** : importer le client généré depuis `@/generated/prisma/client`, jamais directement `@prisma/client`. Utiliser le singleton `prisma` de `@/lib/prisma`.
- **Auth.js v5** : utiliser `auth()` de `@/lib/auth` ; vérifier `ADMIN` via `(session.user as any).role === "ADMIN"`. Pour un membre, `(session.user as any).tier` contient son tier (`AFFRANCHI`, `GRAND_FRERE`, `BOSS`).
- **Server Components par défaut** : les pages `/events` et `/events/[slug]` restent des Server Components. La session est lue via `auth()`.
- **UX / JSX** : préférer les ternaires `condition ? <X /> : null` au court-circuit `&&` (Next.js 16 strict). Pré-computer les booléens composés avant le JSX.
- **Anti-pattern nested anchors** : `EventCard` est déjà wrappé dans un `<Link>`. Si on ajoute un bouton CTA à l'intérieur, il faut soit sortir le bouton hors du `<Link>`, soit ne plus wrapper toute la carte dans `<Link>`. Solution recommandée : conserver la carte cliquable vers le détail, mais faire du CTA un élément non interactif visuel (badge texte) à l'intérieur, et laisser le clic sur la carte mener au détail. Sur la page détail, le CTA est un vrai bouton `button` (pas d'ancre imbriquée).
- **Tailwind v4** : utiliser les classes existantes (`blur-md`, `backdrop-blur`, `line-through`, `strikethrough`, etc.).
- **Gestion d'erreurs** : logger avec `sanitizeError`. Réponses API en français, format `{ data: T }` / `{ error: string, code?: string }`.

### Structure JSON `pricing`

```json
{
  "visitor": 10000,
  "affranchi": 5000,
  "grand_frere": 3000,
  "boss": 0
}
```

Un tier absent, `null` ou `0` signifie gratuit pour ce tier. Si `pricing = null`, l'événement est gratuit.

### Logique de filtre visibilité

```typescript
const session = await auth();
const isMember = Boolean(session?.user?.id);

const visibilityWhere = isMember
  ? { in: [EventVisibility.PUBLIC, EventVisibility.PRIVATE] }
  : EventVisibility.PUBLIC;

const events = await prisma.event.findMany({
  where: {
    status: EventStatus.PUBLISHED,
    visibility: visibilityWhere,
    startDate: { gte: now },
  },
  orderBy: { startDate: "asc" },
  select: { /* champs visibilité + tarifs inclus */ },
});
```

### Compteur de places

```typescript
const registeredCount = event.registrations?.filter((r) => r.status === RegistrationStatus.REGISTERED).length ?? 0;
const remainingSpots = event.maxCapacity !== null ? Math.max(0, event.maxCapacity - registeredCount) : null;
```

Affichage :
- `remainingSpots === null` → « Places illimitées »
- `remainingSpots <= 0` → « Complet »
- sinon → `${remainingSpots} places restantes`

### Grille tarifaire

- `visitorPrice = pricing?.visitor ?? null`
- `memberPrices = [pricing?.affranchi, pricing?.grand_frere, pricing?.boss].filter((p) => p !== null && p !== undefined && p > 0)`
- `memberMinPrice = memberPrices.length > 0 ? Math.min(...memberPrices) : null`
- Si `pricing === null` OU tous les prix sont null/0 → « Gratuit »
- Sinon afficher :
  - Visiteur : X FCFA (ou « Gratuit »)
  - Membres : à partir de Y FCFA
  - Si membre connecté : « Votre tarif (Affranchis) : Z FCFA »

### Helper recommandé dans `src/lib/event-utils.ts`

```typescript
import { Tier, RegistrationStatus } from "@/generated/prisma/client";

export type Pricing = {
  visitor?: number | null;
  affranchi?: number | null;
  grand_frere?: number | null;
  boss?: number | null;
};

export function getRemainingSpots(maxCapacity: number | null | undefined, registrations: { status: string }[]): number | null {
  if (maxCapacity === null || maxCapacity === undefined) return null;
  const registered = registrations.filter((r) => r.status === RegistrationStatus.REGISTERED).length;
  return Math.max(0, maxCapacity - registered);
}

export function getPriceForTier(pricing: Pricing | null, tier: Tier): number | null {
  if (!pricing) return null;
  const key = tier.toLowerCase() as keyof Pricing;
  const value = pricing[key];
  return typeof value === "number" && value > 0 ? value : null;
}

export function formatEventPricing(pricing: Pricing | null) {
  const visitor = pricing?.visitor ?? null;
  const memberValues = [pricing?.affranchi, pricing?.grand_frere, pricing?.boss].filter(
    (v): v is number => typeof v === "number" && v > 0
  );
  const memberMin = memberValues.length > 0 ? Math.min(...memberValues) : null;
  const isFree = !pricing || [pricing.visitor, pricing.affranchi, pricing.grand_frere, pricing.boss].every(
    (v) => v === null || v === undefined || v === 0
  );
  return { visitor, memberMin, isFree };
}
```

### Rendu teaser privé (page détail)

```typescript
const isPrivate = event.visibility === EventVisibility.PRIVATE;
const isAuthenticated = Boolean(session?.user?.id);

const showTeaser = isPrivate && !isAuthenticated;
```

Quand `showTeaser` est vrai :
- Afficher titre, date, badge 🔒 Privé
- Afficher la description dans un conteneur `blur-md select-none` (visuellement floutée)
- CTA principal : `Link` vers `/signup` avec le texte « Devenir membre pour débloquer »
- Ne PAS afficher : lieu, lien visio, compteur de places, grille tarifaire, bouton S'inscrire

### Composants & chemins à créer / modifier

| Fichier | Action | Raison |
|---------|--------|--------|
| `src/app/(public)/events/page.tsx` | UPDATE | Filtrage visibilité + session + props étendues |
| `src/app/(public)/events/page.test.tsx` | UPDATE | Tests public/privé/tarifs |
| `src/app/(public)/events/[slug]/page.tsx` | UPDATE | Teaser privé + compteur + grille tarifaire + CTA |
| `src/app/(public)/events/[slug]/page.test.tsx` | UPDATE | Tests teaser/compteur/tarifs |
| `src/components/features/events/EventCard.tsx` | UPDATE | Blur privé, badge visibilité, tarifs, CTA |
| `src/components/features/events/EventCard.test.tsx` | NEW/UPDATE | Tests carte public/privé |
| `src/components/features/events/EventPopup.tsx` | UPDATE (mineur) | Props pricing/visibilité si besoin |
| `src/components/features/events/NextEventCard.tsx` | UPDATE (mineur) | Props pricing/visibilité si besoin |
| `src/lib/event-utils.ts` | UPDATE | Helpers places + tarifs |
| `src/lib/event-utils.test.ts` | NEW | Tests helpers |
| `src/app/api/events/[id]/route.ts` | READ-ONLY | Vérifier compatibilité champs retournés |

### Références

- [Sprint Change Proposal — Epic 25](../planning-artifacts/sprint-change-proposal-2026-07-04.md) — Story 25-3
- [Story 25-1 — Migration modèle Event](./25-1-migration-modele-event-extended.md)
- [Story 25-2 — Upload couverture VPS + form admin](./25-2-upload-couverture-vps-form-admin.md)
- [Story 12-2 — Page calendrier événements publique](./12-2-page-calendrier-evenements-publique.md)
- [Architecture Decision Document](../planning-artifacts/architecture.md)

## Previous Story Intelligence

- **Story 25-1** a consolidé le modèle de données avec `EventVisibility`, `maxCapacity`, `pricing` JSON, `eventType` et `coverImagePath`. Les types générés Prisma sont disponibles via `@/generated/prisma/client`.
- **Story 25-2** a créé la route média `/api/media/events/{eventId}/cover`, le formulaire admin en 5 sections et l'upload VPS. Tous les composants publics (`EventCard`, `EventPopup`, `NextEventCard`) ont été migrés vers `coverImagePath` et utilisent l'URL média.
- Les tests existants des pages events (`page.test.tsx`, `[slug]/page.test.tsx`) utilisent des mocks Prisma et ne testent actuellement que le cas PUBLIC.
- Le pattern de visibilité par tier existe déjà pour les articles (`src/lib/article-visibility.ts`) et les opportunités (`src/lib/opportunity-visibility.ts`) ; pour les events, la visibilité est binaire PUBLIC/PRIVATE (pas de filtre par tier pour l'instant).

## Git Intelligence Summary

Derniers commits pertinents :
- `f6e1013` — chore(bmad): mark story 25-2 as done — CR PASS after DS fix (cycle 2)
- `dc631a1` — fix(story-25-2): CR fixes — tsc exports, magic bytes, private media, JSX &&, atomic write
- `541f24a` — chore(bmad): story 25-2 footer status → review
- `3ce3db9` — feat(story-25-2): upload couverture VPS + form admin sections

**Baseline commit pour cette story : `f6e1013`**

**Patterns observés :**
- Commit de status BMAD séparé (`chore(bmad): CS story ...`).
- Commit d'implémentation `feat(story-25-2): ...` puis éventuellement `fix(story-25-2): ...` puis `chore(bmad): mark story ... as done`.
- Le DS en charge de l'implémentation renseigne le champ `baseline_commit` après le premier commit d'implémentation.

## Latest Technical Information

- Stack confirmée : Next.js 16.2.6, React 19.2.4, Prisma 7.8.0, Auth.js 5.0.0-beta.31, TailwindCSS 4, Zod 4.4.3, React Hook Form 7.75.0.
- Prisma client généré dans `src/generated/prisma`.
- `sharp` est installé depuis la Story 25-2.
- Les `params` des Server Components sont asynchrones et doivent être `await`és.
- Les pages publiques requêtent Prisma directement (pas d'appel API interne) pour bénéficier du SSR.

## Pitfalls à éviter

- **Ne pas modifier le modèle Prisma** : il est prêt. Cette story est purement front + logique d'affichage.
- **Ne pas dupliquer la logique de tarification** : centraliser dans `src/lib/event-utils.ts` pour réutilisation carte + détail.
- **Ne pas exposer les données privées aux visiteurs** : filtrer `visibility` côté Prisma ; ne pas compter sur le client.
- **Attention aux nested anchors** : `EventCard` est wrappé dans `<Link>`. Le CTA à l'intérieur doit être visuel uniquement (pas un vrai `button`/`Link` cliquable) OU il faut refactor la carte pour sortir le CTA du wrapper `<Link>`.
- **Calcul du compteur** : compter UNIQUEMENT les inscriptions avec `status = REGISTERED`. `CANCELLED` et `NO_SHOW` ne libèrent pas automatiquement une place à ce stade (story 25-4 s'en chargera).
- **Gestion du pricing null** : `pricing = null` signifie gratuit, indépendamment de `maxCapacity`.
- **Tarif membre mis en avant** : utiliser le tier présent dans le JWT (`(session.user as any).tier`), pas un appel API supplémentaire.
- **Edge runtime** : les pages publiques peuvent utiliser `auth()` (Node runtime), car elles sont rendues côté serveur Next.js. Éviter d'importer Prisma dans `middleware.ts`.
- **Tests** : les tests des Server Components peuvent mocker `auth()` et `prisma.event.findMany` / `prisma.event.findFirst`. Prévoir des données de test avec `visibility`, `pricing`, `maxCapacity` et `registrations`.

## Dev Agent Record

### Agent Model Used

À renseigner par le DS.

### Debug Log References

### Completion Notes List

### File List

- À modifier : `src/app/(public)/events/page.tsx`, `src/app/(public)/events/page.test.tsx`, `src/app/(public)/events/[slug]/page.tsx`, `src/app/(public)/events/[slug]/page.test.tsx`, `src/components/features/events/EventCard.tsx`, `src/components/features/events/EventCard.test.tsx`, `src/components/features/events/EventPopup.tsx`, `src/components/features/events/NextEventCard.tsx`, `src/lib/event-utils.ts`.
- À créer : `src/lib/event-utils.test.ts`.
- À lire/auditer : `src/app/api/events/route.ts`, `src/app/api/events/[id]/route.ts`, `prisma/schema.prisma`, `src/lib/tier-config.ts`.

## Story Completion Status

- Status: **ready-for-dev**
- Note: Ultimate context engine analysis completed — comprehensive developer guide created.
