---
baseline_commit: f46bb86
---

# Story 12.2 : Page calendrier d'événements publique

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

**En tant que** visiteur,  
**Je veux** consulter le calendrier des événements IBC,  
**Afin de** savoir quand se tiennent les prochaines rencontres.

## Acceptance Criteria

1. **Liste publique des événements à venir**
   - **Given** un visiteur sur `/events`
   - **When** la page se charge
   - **Then** les événements publiés et à venir (`status = PUBLISHED`, `startDate >= now()`) sont affichés triés par date croissante, avec une carte par événement (titre, date, lieu, image)

2. **Page de détail d'un événement**
   - **Given** un visiteur sur `/events/[slug]`
   - **When** il consulte un événement
   - **Then** la page affiche tous les détails (titre, description complète, dates, lieu, image)

3. **État vide**
   - **Given** aucun événement publié à venir
   - **When** la page `/events` se charge
   - **Then** un `EmptyState` s'affiche : "Aucun événement à venir. Revenez bientôt !"

## Tasks / Subtasks

- [x] **Page liste publique `/events` (AC: 1, 3)**
  - [x] Créer `src/app/(public)/events/page.tsx` en Server Component.
  - [x] Requêter Prisma directement pour les événements `PUBLISHED` avec `startDate >= now()`, triés par `startDate asc`.
  - [x] Réutiliser le header/nav et le `Footer` du pattern `src/app/(public)/articles/page.tsx`.
  - [x] Créer et utiliser `src/components/features/events/EventCard.tsx` affichant titre, date formatée en français, lieu et image (avec fallback si absent).
  - [x] Afficher la grille d'événements si `events.length > 0`, sinon `<EmptyState title="Aucun événement à venir" description="Revenez bientôt !" />`.
  - [x] Ajouter un titre de page et une description en français.

- [x] **Page détail `/events/[slug]` (AC: 2)**
  - [x] Créer `src/app/(public)/events/[slug]/page.tsx` en Server Component.
  - [x] Implémenter `generateMetadata({ params })` avec titre et description SEO de l'événement.
  - [x] Requêter Prisma par `slug` avec `status in [PUBLISHED, CANCELLED]` ; appeler `notFound()` si absent.
  - [x] Afficher : bannière image (fallback), titre, dates (début et fin optionnelle), lieu, description complète.
  - [x] Ajouter un lien "Retour aux événements" vers `/events`.
  - [x] Réutiliser le header/nav et le `Footer` du pattern articles.

- [x] **Composant `EventCard` (AC: 1)**
  - [x] Créer `src/components/features/events/EventCard.tsx`.
  - [x] Props : `{ event: { id, slug, title, startDate, endDate?, location, imageUrl? } }`.
  - [x] Wrapper l'entièreté de la carte dans un `Link` vers `/events/${slug}` (pas de nested anchors — voir guardrail anti-pattern).
  - [x] Afficher l'image via `next/image` (unoptimized) avec fallback en gradient.
  - [x] Formater la date avec `toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })`.
  - [x] Utiliser les composants shadcn `Card`, `CardHeader`, `CardTitle`, `CardContent`.

- [x] **Navigation publique (AC: 1, 2)**
  - [x] Ajouter un lien "Événements" dans le header des pages publiques (`/events`, `/events/[slug]`), à côté des liens existants (Accueil, Articles, Tarifs).
  - [x] Reporter le même lien dans le header de la landing page `src/app/(public)/page.tsx`.

- [x] **Tests (AC: 1, 2, 3)**
  - [x] Créer `src/app/(public)/events/page.test.tsx` : vérifie l'affichage des cartes triées, le format de date, le lien vers le détail, et l'`EmptyState` quand la liste est vide.
  - [x] Créer `src/app/(public)/events/[slug]/page.test.tsx` : vérifie `generateMetadata` et le rendu des détails, ainsi que `notFound` si l'événement est en brouillon ou inexistant.
  - [x] Créer `src/components/features/events/EventCard.test.tsx` : vérifie le rendu sans image et le non-nested-anchor.
  - [x] Lancer `npx vitest run` et vérifier la non-régression.

## Dev Notes

### Patterns d'Architecture & Contraintes

- **Langue du projet** : Tous les artefacts (stories, UI, commentaires de code, messages d'erreur, logs) doivent être en **français**.
- **Next.js 16 / React 19 / App Router** : les paramètres dynamiques de route (`params`, `searchParams`) sont asynchrones et doivent être `await`és (ex: `const { slug } = await params;`).
- **Server Components par défaut** : aucune interactivité client requise pour cette story ; pas de `"use client"`.
- **Prisma 7.8.0** : importer le client généré depuis `@/generated/prisma/client`, jamais directement `@prisma/client`. Utiliser le singleton `prisma` de `@/lib/prisma`.
- **Auth.js v5** : les pages publiques n'ont PAS besoin d'authentification ; ne pas bloquer l'accès. La session peut être lue via `auth()` si besoin de contextualiser l'UI, mais elle est optionnelle.
- **UX / JSX** : préférer les ternaires `condition ? <X /> : null` au court-circuit `&&`. Pré-computer les booléens composés avant le JSX.
- **Anti-pattern nested anchors** : ne jamais wrapper une carte cliquable dans `<Link>` tout en rendant un sous-composant qui produit un `<a>` ou un `Link`. `EventCard` ne contient qu'un seul `Link` racine ; les badges/dates sont non interactifs.
- **Images** : accepter une URL absolue ou un chemin relatif (pattern `imageUrl` des articles). Utiliser `unoptimized` pour supporter les URLs externes.
- **Dates** : stockées en `DateTime` ISO ; les sérialiser en ISO si passées à un client, mais ici tout se fait en Server Component. Affichage en français via `toLocaleDateString('fr-FR')`.
- **API vs Prisma direct** : les pages publiques doivent requêter Prisma directement pour bénéficier du SSR et éviter un appel HTTP interne. L'API `/api/events` existante reste inchangée (elle sert potentiellement à d'autres consommateurs et au futur composant landing Story 12.3).
- **Scope strict** : cette story ne modifie PAS le modèle Prisma, les API routes admin, ni le CRUD admin (déjà livré en Story 12.1). Elle ne crée que les pages publiques et le composant de carte.

### Filtre de la liste publique

La page `/events` doit afficher uniquement les événements publiés **et à venir** :

```typescript
const now = new Date();
const events = await prisma.event.findMany({
  where: {
    status: "PUBLISHED",
    startDate: { gte: now },
  },
  orderBy: { startDate: "asc" },
});
```

Contrairement à l'API `/api/events` existante qui retourne `PUBLISHED` + `CANCELLED` triés par `startDate desc` (usage plus général / potentiellement admin/landing), la page publique filtre sur `PUBLISHED` futurs uniquement.

### Composants & Chemins à créer / modifier

| Fichier | Action | Raison |
|---------|--------|--------|
| `src/app/(public)/events/page.tsx` | NEW | Page liste publique |
| `src/app/(public)/events/[slug]/page.tsx` | NEW | Page détail publique |
| `src/components/features/events/EventCard.tsx` | NEW | Carte événement réutilisable |
| `src/components/features/events/EventCard.test.tsx` | NEW | Tests composant carte |
| `src/app/(public)/events/page.test.tsx` | NEW | Tests page liste |
| `src/app/(public)/events/[slug]/page.test.tsx` | NEW | Tests page détail + metadata |
| `src/app/(public)/articles/page.tsx` | UPDATE | Ajouter lien "Événements" dans le header |
| `src/app/(public)/articles/[slug]/page.tsx` | UPDATE | Ajouter lien "Événements" dans le header |
| `src/app/(public)/page.tsx` | UPDATE | Ajouter lien "Événements" dans le header |

### Références

- SCP Epic 12 & Story 12.2 : `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-18.md` lignes 457-476
- Story 12.1 (implémenté) : `_bmad-output/implementation-artifacts/12-1-modele-event-crud-admin.md`
- Modèle Event existant : `prisma/schema.prisma` (modèle `Event`)
- API events existantes : `src/app/api/events/route.ts`, `src/app/api/events/[id]/route.ts`
- Pages publiques pattern : `src/app/(public)/articles/page.tsx`, `src/app/(public)/articles/[slug]/page.tsx`
- Composant EmptyState : `src/components/shared/empty-state.tsx`
- Utilitaire de slug / next event : `src/lib/event-utils.ts`
- Schémas de validation : `src/lib/validations.ts` (`eventCreateSchema`/`eventUpdateSchema`)
- Guardrail JSX : `_bmad-output/planning-artifacts/architecture.md` section "JSX Boolean Guardrail"
- Guardrail nested anchors : `_bmad-output/planning-artifacts/architecture.md` section "Card Component Anti-Pattern: Nested Anchors"

Status: review

## Dev Agent Record

### Agent Model Used

kimi-k2.7-code

### Debug Log References

### Completion Notes List

- Implémenté la page liste publique `/events` (Server Component) requêtant Prisma pour les événements `PUBLISHED` à venir triés par `startDate asc`, avec header/nav/Footer réutilisés du pattern articles.
- Implémenté la page détail `/events/[slug]` avec `generateMetadata`, requête par `slug` sur `PUBLISHED|CANCELLED`, `notFound()` si absent, et affichage complet (titre, dates, lieu, description, image fallback).
- Créé le composant `EventCard` avec un seul `Link` racine (pas de nested anchors), image `next/image` unoptimized et fallback gradient, date formatée en français.
- Ajouté le lien "Événements" dans les headers de `src/app/(public)/articles/page.tsx`, `src/app/(public)/articles/[slug]/page.tsx` et `src/app/(public)/page.tsx`.
- Créé les tests pour la page liste, la page détail et `EventCard` ; toutes les suites passent (801 tests, non-régression confirmée).
- Build Next.js 16 passé avec succès (`/events` et `/events/[slug]` apparaissent en routes dynamiques).
- Aucun `&&` dans les expressions JSX des fichiers créés/modifiés pour cette story.

### File List

- src/app/(public)/events/page.tsx (NEW)
- src/app/(public)/events/[slug]/page.tsx (NEW)
- src/app/(public)/events/page.test.tsx (NEW)
- src/app/(public)/events/[slug]/page.test.tsx (NEW)
- src/components/features/events/EventCard.tsx (NEW)
- src/components/features/events/EventCard.test.tsx (NEW)
- src/app/(public)/articles/page.tsx (UPDATE)
- src/app/(public)/articles/[slug]/page.tsx (UPDATE)
- src/app/(public)/page.tsx (UPDATE)
- _bmad-output/implementation-artifacts/12-2-page-calendrier-evenements-publique.md (UPDATE)
- _bmad-output/implementation-artifacts/sprint-status.yaml (UPDATE)
