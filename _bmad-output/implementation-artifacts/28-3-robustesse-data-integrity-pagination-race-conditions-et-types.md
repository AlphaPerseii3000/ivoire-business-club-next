---
baseline_commit: b71f463bc8d47d50746528d9e60cb9cd939025b9
---
# Story 28.3: Robustesse & Data Integrity — Pagination, Race Conditions & Types

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

En tant que membre d'Ivoire Business Club et administrateur,
Je veux que la plateforme garantisse l'intégrité des données (anti-overbooking), gère proprement la pagination des grandes listes, dispose d'un typage session robuste et permette la modération des commentaires,
afin d'assurer la stabilité technique, la performance et une expérience utilisateur sans faille sous forte charge.

## Acceptance Criteria

```gherkin
Given un événement avec 10 places disponibles
When 12 utilisateurs s'inscrivent simultanément
Then exactement 10 inscriptions réussissent et 2 sont refusées (places épuisées)
And la vérification du compteur et la création sont dans une transaction atomique

Given la liste admin des articles avec 50+ articles
When l'admin ouvre /admin/articles
Then la page affiche 20 articles par page avec navigation

Given l'API GET /api/companies avec 50+ entreprises
When un client la consulte
Then elle retourne 20 résultats par page avec métadonnées de pagination

Given l'API GET /api/events/[id]/gallery avec 50+ photos
When un client la consulte
Then elle retourne 20 résultats par page

Given les endpoints d'API articles (route.ts, [id]/route.ts)
When on inspecte le code
Then session.user est typé via le type SessionUser généré par Auth.js (pas de `as any`)

Given un membre connecté qui a posté un commentaire
When il consulte le commentaire
Then il voit un bouton "Modifier" et "Supprimer"
And la modification met à jour le contenu avec un timestamp `updatedAt`
And la suppression est soft (marqué deleted, contenu masqué)

Given un utilisateur qui poste 6 commentaires en 1 minute
When le 6ème est soumis
Then l'API retourne 429 avec Retry-After

Given le projet après implémentation
When npm run build est exécuté
Then le build passe sans erreur

Given les tests existants
When npx vitest run est exécuté
Then ils passent sans régression
```

## Tasks / Subtasks

- [x] **Task 1 : Inscription événement transactionnelle anti-overbooking** (AC: Given un événement avec 10 places disponibles...)
  - [x] Modifier [src/app/api/events/[id]/register/route.ts](file:///d:/Code/ivoire-business-club-next/src/app/api/events/[id]/register/route.ts).
  - [x] Utiliser la fonction `getDatabaseProvider(process.env.DATABASE_URL!)` importée de `@/lib/prisma-runtime` pour déterminer le type de base de données active.
  - [x] Si le provider est `postgresql`, verrouiller la ligne de l'événement de manière pessimiste dans la transaction Prisma en exécutant : `await tx.$executeRaw` ou `await tx.$queryRaw` avec `SELECT id FROM events WHERE id = ${id} FOR UPDATE`.
  - [x] Compter les inscriptions actives (`status: { in: ["REGISTERED", "ATTENDED"] }`) à l'intérieur de la transaction *après* l'obtention du verrou.
  - [x] Si le compteur atteint ou dépasse `maxCapacity`, jeter une erreur dans la transaction pour effectuer un rollback et renvoyer une erreur 400.

- [x] **Task 2 : Pagination de la liste admin des articles** (AC: Given la liste admin des articles...)
  - [x] Modifier [src/app/(admin)/admin/articles/page.tsx](file:///d:/Code/ivoire-business-club-next/src/app/(admin)/admin/articles/page.tsx) pour accepter `searchParams: Promise<{ page?: string }>`.
  - [x] Extraire et parser la valeur de `page` (par défaut `1`).
  - [x] Configurer `limit = 20` et calculer le décalage `skip = (pageNumber - 1) * limit`.
  - [x] Récupérer les articles avec `skip` et `take: limit`, ainsi que le `totalCount` d'articles via `prisma.article.count()`.
  - [x] Calculer `totalPages` et afficher les liens de pagination standard (`Page précédente` / `Page suivante`) en utilisant les styles Tailwind/Base UI du projet.

- [x] **Task 3 : Pagination de l'API publique des entreprises** (AC: Given l'API GET /api/companies...)
  - [x] Modifier [src/app/api/companies/route.ts](file:///d:/Code/ivoire-business-club-next/src/app/api/companies/route.ts) dans le handler `GET`.
  - [x] Récupérer le paramètre de requête `page` depuis les URL SearchParams (par défaut `1`).
  - [x] Fetch les entreprises publiées en limitant à 20 par page via `skip` et `take: 20`, et compter le total des entreprises publiées.
  - [x] Retourner la réponse JSON au format `{ data: companies, meta: { page, limit: 20, totalCount, totalPages } }`.

- [x] **Task 4 : Pagination de l'API galerie d'événements** (AC: Given l'API GET /api/events/[id]/gallery...)
  - [x] Modifier [src/app/api/events/[id]/gallery/route.ts](file:///d:/Code/ivoire-business-club-next/src/app/api/events/[id]/gallery/route.ts) dans le handler `GET`.
  - [x] Extraire `page` des URL SearchParams (par défaut `1`).
  - [x] Fetch les photos de la galerie de l'événement ciblé avec `skip` et `take: 20`, et compter le total de photos pour cet événement.
  - [x] Retourner la réponse JSON au format `{ data: photos, meta: { page, limit: 20, totalCount, totalPages } }`.

- [x] **Task 5 : Typage SessionUser sans as any** (AC: Given les endpoints d'API articles...)
  - [x] Créer le fichier [src/types/next-auth.d.ts](file:///d:/Code/ivoire-business-club-next/src/types/next-auth.d.ts) pour étendre les types de session d'Auth.js v5 (module augmentation de `"next-auth"`).
  - [x] Typer proprement `session.user` pour inclure : `id`, `tier` (Tier), `role` (UserRole), `status` (UserStatus), `emailVerified` (boolean), `onboardingCompleted` (boolean), et optionnellement `provider` (string).
  - [x] Modifier [src/app/api/articles/route.ts](file:///d:/Code/ivoire-business-club-next/src/app/api/articles/route.ts) et [src/app/api/articles/[id]/route.ts](file:///d:/Code/ivoire-business-club-next/src/app/api/articles/[id]/route.ts) pour supprimer les casts `as any` sur `session.user`.

- [x] **Task 6 : Modération et rate-limiting des commentaires** (AC: Given un membre connecté..., Given un utilisateur qui poste 6 commentaires...)
  - [x] Ajouter `commentCreateRateLimiter` dans [src/lib/rate-limit.ts](file:///d:/Code/ivoire-business-club-next/src/lib/rate-limit.ts) avec une limite de 5 requêtes par 60 secondes.
  - [x] Appliquer ce rate-limiter au handler `POST` dans [src/app/api/articles/[id]/comments/route.ts](file:///d:/Code/ivoire-business-club-next/src/app/api/articles/[id]/comments/route.ts) sur la base de l'identifiant `user:${session.user.id}`. Retourner une erreur 429 avec header `Retry-After` en cas d'excès.
  - [x] Implémenter un handler `PUT` dans [src/app/api/articles/[id]/comments/route.ts](file:///d:/Code/ivoire-business-club-next/src/app/api/articles/[id]/comments/route.ts) acceptant `{ commentId, content }`. Valider avec Zod, vérifier que l'utilisateur connecté est bien l'auteur du commentaire, mettre à jour le contenu, assigner `updatedAt = new Date()` et générer le log d'audit `COMMENT_UPDATE`.
  - [x] Implémenter un handler `DELETE` acceptant `{ commentId }` (ou via query param/body). Vérifier que l'utilisateur est soit l'auteur du commentaire soit ADMIN. Effectuer un soft-delete (marquer `deletedAt = new Date()` en DB). Générer le log d'audit `COMMENT_DELETE`.
  - [x] Mettre à jour le handler `GET` pour masquer le contenu des commentaires soft-supprimés (retourner par exemple `content: "Ce commentaire a été supprimé."` si `deletedAt` est non nul).

- [x] **Task 7 : Migration du schéma Prisma Comment** (AC: la suppression est soft...)
  - [x] Modifier [prisma/schema.prisma](file:///d:/Code/ivoire-business-club-next/prisma/schema.prisma) pour ajouter `deletedAt DateTime?` au modèle `Comment`.
  - [x] Régénérer le client Prisma (`npx prisma generate`).
  - [x] Mettre à jour le schéma en base de données locale (`npx prisma db push`).

- [x] **Task 8 : Validation finale et tests** (AC: build et tests)
  - [x] Mettre à jour [src/app/api/articles/[id]/comments/route.test.ts](file:///d:/Code/ivoire-business-club-next/src/app/api/articles/[id]/comments/route.test.ts) pour couvrir le rate-limiting du POST, le handler PUT, le handler DELETE, et le masquage des commentaires supprimés dans le GET.
  - [x] Ajouter des tests unitaires/d'intégration pour la pagination de l'API companies, l'API gallery, and la page admin des articles.
  - [x] Vérifier que `npm run build` et `npx vitest run` s'exécutent avec succès.

### Review Findings

- [x] [Review][Decision] Rate limiting on PUT and DELETE comments — While comment creation (POST) is rate limited, updates (PUT) and deletions (DELETE) are left unprotected, presenting vectors for abuse.
- [x] [Review][Decision] GDPR/Metadata leak on soft-deleted comments — When retrieving comments, soft-deleted comments have their content masked, but return full user details (ID, name, avatar) and dates, exposing the identity of the user who made the deleted comment.
- [x] [Review][Patch] Missing active subscription check on comment updates (PUT) [src/app/api/articles/[id]/comments/route.ts:759]
- [x] [Review][Patch] Inconsistent code indentation in admin page [src/app/(admin)/admin/articles/page.tsx:288-289]
- [x] [Review][Patch] Inconsistent comment validation logic between POST and PUT [src/app/api/articles/[id]/comments/route.ts]
- [x] [Review][Patch] Pagination query parameter integer overflow risk in multiple routes [src/app/(admin)/admin/articles/page.tsx:24]
- [x] [Review][Patch] Missing article containment verification on comment edit/delete [src/app/api/articles/[id]/comments/route.ts:207]
- [x] [Review][Patch] Overwriting existing soft-delete timestamp on duplicate deletion [src/app/api/articles/[id]/comments/route.ts:303]
- [x] [Review][Patch] Missing Comment Edit & Delete UI Buttons and Interaction Handlers [src/components/features/articles/ArticleCommentsSection.tsx]
- [x] [Review][Defer] Non-standard parameter parsing in DELETE endpoint [src/app/api/articles/[id]/comments/route.ts:866] — deferred, pre-existing
- [x] [Review][Defer] Lack of system-wide soft-delete query filters [prisma/schema.prisma] — deferred, pre-existing

## Dev Notes

- **Gestion des transactions et blocages :** La fonction `getDatabaseProvider` est indispensable car SQLite (dev/tests) ne supporte pas `SELECT ... FOR UPDATE` et lèverait une exception. Veiller à n'exécuter la requête SQL brute de verrouillage pessimiste que si le provider est `postgresql`.
- **Modération soft-delete :** Ne jamais supprimer physiquement la ligne du commentaire pour conserver la cohérence historique et l'intégrité référentielle en DB.
- **Module Augmentation :** L'augmentation de module dans `src/types/next-auth.d.ts` doit importer le type `Session` de `"next-auth"` pour que TypeScript fusionne correctement les interfaces.

### Project Structure Notes

- Tous les nouveaux types et fichiers doivent respecter le kebab-case et s'insérer dans les structures de dossiers établies.
- Le client Prisma partagé doit provenir uniquement de `@/lib/prisma`.

### References

- Proposition d'Epic 28 : [sprint-change-proposal-2026-07-11-consolidation.md](file:///d:/Code/ivoire-business-club-next/_bmad-output/planning-artifacts/sprint-change-proposal-2026-07-11-consolidation.md)
- Code original des commentaires : [src/app/api/articles/[id]/comments/route.ts](file:///d:/Code/ivoire-business-club-next/src/app/api/articles/[id]/comments/route.ts)
- Base de données schema : [prisma/schema.prisma](file:///d:/Code/ivoire-business-club-next/prisma/schema.prisma)

## Dev Agent Record

### Agent Model Used

Gemini 3.5 Flash (High) (using Antigravity coding agent)

### Debug Log References

- None (all validations and tests passed without issues)

### Completion Notes List

- Added pessimistic locking `FOR UPDATE` in `src/app/api/events/[id]/register/route.ts` if PostgreSQL is active to prevent registration race conditions.
- Implemented offset-based pagination on public `/api/companies` API, `/api/events/[id]/gallery` API, and `/admin/articles` page with standard `Page précédente` / `Page suivante` UI links.
- Augmented next-auth module types to include custom session properties (id, tier, role, status, emailVerified, onboardingCompleted, provider) and removed `as any` casts.
- Added `deletedAt` field to Comment model, regenerated Prisma client and pushed to SQLite database.
- Implemented rate limiting and moderation for comments (PUT/DELETE handlers, GET soft-delete content masking).
- Updated/created tests for comments API, companies API, event gallery API, registration API, and admin articles page.

### File List

- [src/app/api/events/[id]/register/route.ts](file:///d:/Code/ivoire-business-club-next/src/app/api/events/[id]/register/route.ts)
- [src/app/(admin)/admin/articles/page.tsx](file:///d:/Code/ivoire-business-club-next/src/app/(admin)/admin/articles/page.tsx)
- [src/app/api/companies/route.ts](file:///d:/Code/ivoire-business-club-next/src/app/api/companies/route.ts)
- [src/app/api/events/[id]/gallery/route.ts](file:///d:/Code/ivoire-business-club-next/src/app/api/events/[id]/gallery/route.ts)
- [src/types/next-auth.d.ts](file:///d:/Code/ivoire-business-club-next/src/types/next-auth.d.ts)
- [src/app/api/articles/route.ts](file:///d:/Code/ivoire-business-club-next/src/app/api/articles/route.ts)
- [src/app/api/articles/[id]/route.ts](file:///d:/Code/ivoire-business-club-next/src/app/api/articles/[id]/route.ts)
- [prisma/schema.prisma](file:///d:/Code/ivoire-business-club-next/prisma/schema.prisma)
- [prisma/schema.dev.prisma](file:///d:/Code/ivoire-business-club-next/prisma/schema.dev.prisma)
- [src/lib/rate-limit.ts](file:///d:/Code/ivoire-business-club-next/src/lib/rate-limit.ts)
- [src/lib/audit-log.ts](file:///d:/Code/ivoire-business-club-next/src/lib/audit-log.ts)
- [src/app/api/articles/[id]/comments/route.ts](file:///d:/Code/ivoire-business-club-next/src/app/api/articles/[id]/comments/route.ts)
- [src/app/api/articles/[id]/comments/route.test.ts](file:///d:/Code/ivoire-business-club-next/src/app/api/articles/[id]/comments/route.test.ts)
- [src/app/api/companies/route.test.ts](file:///d:/Code/ivoire-business-club-next/src/app/api/companies/route.test.ts)
- [src/app/api/events/[id]/gallery/route.test.ts](file:///d:/Code/ivoire-business-club-next/src/app/api/events/[id]/gallery/route.test.ts)
- [src/app/(admin)/admin/articles/page.test.tsx](file:///d:/Code/ivoire-business-club-next/src/app/(admin)/admin/articles/page.test.tsx)
- [src/app/api/events/[id]/register/route.test.ts](file:///d:/Code/ivoire-business-club-next/src/app/api/events/[id]/register/route.test.ts)
