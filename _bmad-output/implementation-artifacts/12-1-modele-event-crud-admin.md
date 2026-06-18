---
baseline_commit: d470eac1b8e7f7d4f9a7e6c6f3a9d8b7c6f5e4a3
---
# Story 12.1 : Modèle Event + CRUD admin

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

**En tant qu'** admin,  
**Je veux** créer et gérer des événements,  
**Afin de** informer les membres et le public des prochaines rencontres IBC.

## Acceptance Criteria

1. **Création d'un événement en brouillon**
   - **Given** l'admin sur `/admin/events`
   - **When** il crée un événement (titre, description, date, date de fin optionnelle, lieu, image, statut)
   - **Then** l'événement est créé en base avec un slug auto-généré et le statut par défaut `DRAFT`

2. **Publication d'un événement**
   - **Given** un événement en brouillon
   - **When** l'admin le publie (statut → `PUBLISHED`)
   - **Then** l'événement devient visible sur la page publique `/events`

3. **Annulation d'un événement publié**
   - **Given** un événement publié
   - **When** l'admin l'annule (statut → `CANCELLED`)
   - **Then** il reste visible sur `/events` avec un badge "Annulé" mais n'apparaît plus dans le composant "prochain événement"

4. **Liste admin des événements**
   - **Given** l'admin sur la liste des événements
   - **When** il consulte
   - **Then** les événements sont triés par date décroissante avec les actions Modifier/Supprimer/Changer statut

## Tasks / Subtasks

- [ ] **Modélisation Prisma (AC: 1)**
  - [ ] Ajouter l'enum `EventStatus` (`DRAFT`, `PUBLISHED`, `CANCELLED`) dans `prisma/schema.prisma` et `prisma/schema.dev.prisma`.
  - [ ] Ajouter le modèle `Event` avec : `id`, `title`, `slug` (@unique), `description`, `startDate`, `endDate` (optionnel), `location`, `imageUrl` (optionnel), `status` (default `DRAFT`), `createdAt`, `updatedAt`.
  - [ ] Ajouter la relation `events Event[]` sur le modèle `User`.
  - [ ] Ajouter un index sur `[startDate]` (décr.) et un index composite sur `[status, startDate]`.
  - [ ] Exécuter `npx prisma migrate dev --name add_event_model` et `npx prisma generate`.

- [ ] **Schémas de validation (AC: 1, 2, 3)**
  - [ ] Ajouter `eventCreateSchema` et `eventUpdateSchema` dans `src/lib/validations.ts` (champs : title, description, startDate, endDate optionnel, location, imageUrl optionnel, status optionnel).
  - [ ] Exporter les types TypeScript correspondants.
  - [ ] Garantir la cohérence des dates : `endDate` >= `startDate` si présente.

- [ ] **Utilitaire de slug (AC: 1)**
  - [ ] Créer `src/lib/event-utils.ts` et implémenter `generateUniqueSlug` basé sur `slugify` de `src/lib/utils.ts` (si conflit, suffixer avec un compteur).
  - [ ] Exporter `getNextPublishedEvent()` : retourne l'événement `PUBLISHED` futur le plus proche dont `startDate >= now()`, trié par `startDate asc`, excluant `CANCELLED`.

- [ ] **API routes REST admin/public (AC: 1, 2, 3, 4)**
  - [ ] Créer `src/app/api/events/route.ts` :
    - `GET` public : retourne uniquement les événements `PUBLISHED` + `CANCELLED`, triés par `startDate desc` (public page `/events`).
    - `POST` admin : protégé par `role === ADMIN`, valide le body, génère le slug unique, crée l'événement avec `status: DRAFT` par défaut.
  - [ ] Créer `src/app/api/events/[id]/route.ts` :
    - `GET` public : retourne l'événement si `PUBLISHED` ou `CANCELLED`, sinon 404.
    - `PUT` admin : met à jour l'événement, régénère le slug si le titre change, écrit un audit log `EVENT_UPDATE` et `EVENT_PUBLISH`/`EVENT_CANCEL` si le statut change.
    - `DELETE` admin : supprime l'événement et écrit un audit log `EVENT_DELETE`.

- [ ] **Interface admin CRUD (AC: 1, 2, 3, 4)**
  - [ ] Créer `src/app/(admin)/admin/events/page.tsx` : liste tous les événements triés par `startDate desc`, sérialise les dates, protège via `auth()` + `promoteConfiguredAdminUser`.
  - [ ] Créer `src/app/(admin)/admin/events/new/page.tsx` : page de création avec formulaire client.
  - [ ] Créer `src/app/(admin)/admin/events/[id]/edit/page.tsx` : page d'édition.
  - [ ] Créer `src/components/features/admin/event-form.tsx` : formulaire avec champs titre, description (textarea simple), date/heure début, date/heure fin optionnelle, lieu, image URL, statut. Utiliser `react-hook-form` + Zod.
  - [ ] Créer `src/components/features/admin/events-list-table.tsx` : tableau avec colonnes Titre, Date, Lieu, Statut (badge), actions Modifier / Supprimer / Changer statut. Permettre de passer de `DRAFT` à `PUBLISHED`, de `PUBLISHED` à `CANCELLED`, etc.

- [ ] **Sécurité & navigation admin**
  - [ ] Ajouter un item "Événements" dans `ADMIN_NAV` de `src/app/(admin)/layout.tsx` (après Articles).
  - [ ] Protéger toutes les pages admin via le pattern `promoteConfiguredAdminUser` + `role === ADMIN`.

- [ ] **Audit logs**
  - [ ] Étendre `AUDIT_ACTIONS` dans `src/lib/audit-log.ts` avec `EVENT_CREATE`, `EVENT_UPDATE`, `EVENT_PUBLISH`, `EVENT_CANCEL`, `EVENT_DELETE`.
  - [ ] Appeler `safeCreateAuditLog` après chaque opération réussie dans les API routes admin.

- [ ] **Seeding**
  - [ ] Ajouter dans `prisma/seed.ts` 3 événements de démo : 1 `PUBLISHED` futur, 1 `PUBLISHED` passé, 1 `CANCELLED`.
  - [ ] Rendre le seed idempotent (supprimer les anciens `Event` avant de recréer).

- [ ] **Tests**
  - [ ] Créer `src/app/api/events/route.test.ts` et `src/app/api/events/[id]/route.test.ts` : tests de CRUD admin, filtrage public, génération de slug, transitions de statut.
  - [ ] Créer `src/components/features/admin/event-form.test.tsx` et `src/components/features/admin/events-list-table.test.tsx` : validation des champs, sérialisation, actions.
  - [ ] Lancer `npx vitest run` et vérifier la non-régression.

## Dev Notes

### Patterns d'Architecture & Contraintes

- **Langue du projet** : Tous les artefacts (stories, UI, commentaires de code, messages d'erreur, logs) doivent être en **français**.
- **Next.js 16 / React 19 / App Router** : les paramètres dynamiques de route (`params`) sont asynchrones et doivent être `await`és (ex: `const { id } = await params;`).
- **Prisma 7.8.0** : importer le client généré impérativement depuis `@/generated/prisma/client`, jamais directement `@prisma/client`. Utiliser le singleton `prisma` de `@/lib/prisma`.
- **Schémas Prisma** : maintenir `prisma/schema.prisma` (PostgreSQL cible) et `prisma/schema.dev.prisma` (SQLite dev) synchronisés (mêmes enums / modèles, seul `datasource.provider` diffère).
- **Auth.js v5** : utiliser `auth()` de `@/lib/auth` pour récupérer la session. Vérifier le rôle `ADMIN` via `(session.user as any).role === "ADMIN"` (pattern existant).
- **Promotion admin automatique** : dans les pages admin, utiliser `promoteConfiguredAdminUser(currentAdminId)` puis vérifier `admin?.role === "ADMIN"`, sinon redirect `/dashboard`.
- **Validation** : utiliser Zod via `src/lib/validations.ts` et `@hookform/resolvers/zod` côté client.
- **Gestion d'erreurs** : logger avec `sanitizeError` de `@/lib/sanitize-log`. Retourner des messages en français.
- **Audit** : utiliser `safeCreateAuditLog` pour ne pas faire échouer la requête si le log ne passe pas.
- **UX / JSX** : préférer les ternaires `condition ? <X /> : null` au court-circuit `&&`.
- **Images** : accepter une URL absolue ou un chemin relatif (pattern `imageUrl` des articles). Pas d'upload de fichier obligatoire pour cette story.

### Composants & Chemins à créer / modifier

| Fichier | Action | Raison |
|---------|--------|--------|
| `prisma/schema.prisma` | UPDATE | Ajout enum `EventStatus` et modèle `Event` + relation `User` |
| `prisma/schema.dev.prisma` | UPDATE | Synchronisation dev SQLite |
| `src/lib/validations.ts` | UPDATE | Schémas Zod `eventCreateSchema` / `eventUpdateSchema` |
| `src/lib/event-utils.ts` | NEW | Slug unique + helper `getNextPublishedEvent()` |
| `src/lib/audit-log.ts` | UPDATE | Ajout des actions `EVENT_*` |
| `src/app/api/events/route.ts` | NEW | GET public + POST admin |
| `src/app/api/events/[id]/route.ts` | NEW | GET public + PUT/DELETE admin |
| `src/app/(admin)/admin/events/page.tsx` | NEW | Page liste admin |
| `src/app/(admin)/admin/events/new/page.tsx` | NEW | Page création admin |
| `src/app/(admin)/admin/events/[id]/edit/page.tsx` | NEW | Page édition admin |
| `src/components/features/admin/event-form.tsx` | NEW | Formulaire événement |
| `src/components/features/admin/events-list-table.tsx` | NEW | Tableau + actions |
| `src/app/(admin)/layout.tsx` | UPDATE | Ajouter l'entrée "Événements" dans `ADMIN_NAV` |
| `prisma/seed.ts` | UPDATE | Événements de démo |
| `src/app/api/events/route.test.ts` | NEW | Tests API list/create |
| `src/app/api/events/[id]/route.test.ts` | NEW | Tests API détail/update/delete |
| `src/components/features/admin/event-form.test.tsx` | NEW | Tests composant formulaire |
| `src/components/features/admin/events-list-table.test.tsx` | NEW | Tests composant liste |

### Références

- SCP Epic 12 & Story 12.1 : `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-18.md` lignes 423-454
- Pattern CRUD admin le plus proche : `_bmad-output/implementation-artifacts/9-1-modele-article-migration-et-api-routes.md` et `9-2-interface-admin-crud-articles.md`
- Modèle Article existant : `prisma/schema.prisma` (modèle `Article`)
- Routes API articles : `src/app/api/articles/route.ts` et `src/app/api/articles/[id]/route.ts`
- Pages admin articles : `src/app/(admin)/admin/articles/page.tsx`, `new/page.tsx`, `[id]/edit/page.tsx`
- Formulaire/table admin articles : `src/components/features/admin/article-form.tsx`, `articles-list-table.tsx`
- Layout admin : `src/app/(admin)/layout.tsx`
- Utilitaire de slug : `src/lib/utils.ts` (`slugify`)
- Audit log : `src/lib/audit-log.ts`
- Schémas de validation : `src/lib/validations.ts`

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
