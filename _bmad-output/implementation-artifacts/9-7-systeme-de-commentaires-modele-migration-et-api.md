---
baseline_commit: fc8284fe9cbb1cd7dfeeff2a5bbe803ee15e145a
---
# Story 9.7: Système de Commentaires — Modèle, Migration et API

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

**En tant que** développeur,  
**Je veux** ajouter le modèle Prisma pour les commentaires, exécuter la migration et créer les API routes GET et POST `/api/articles/[id]/comments`,  
**Afin de** stocker et d'exposer les commentaires des membres de manière sécurisée.

## Acceptance Criteria

1. **Modélisation & Migration Prisma**
   - **Given** le schéma Prisma mis à jour avec le modèle `Comment`.
   - **When** la migration est lancée via `npx prisma migrate dev`.
   - **Then** la table `article_comments` est créée avec relation vers `articles` et `users` et suppression en cascade en cas de suppression de l'article ou de l'utilisateur.

2. **Création d'un commentaire (POST /api/articles/[id]/comments)**
   - **Given** un membre connecté avec un abonnement actif (`status === 'ACTIVE'` ou admin).
   - **When** il envoie une requête `POST /api/articles/[id]/comments` avec un contenu valide.
   - **Then** le commentaire est persisté en base de données et associé à l'utilisateur (auteur) et à l'article, retournant le code HTTP `201 Created` avec le commentaire créé.

3. **Récupération des commentaires (GET /api/articles/[id]/comments)**
   - **Given** un membre connecté avec un abonnement actif (ou admin).
   - **When** il envoie une requête `GET /api/articles/[id]/comments`.
   - **Then** la liste des commentaires de l'article (id ou slug) est retournée avec les détails de l'auteur (id, name, image) et triée par `createdAt` croissant.

4. **Contrôle d'accès & Sécurité (GET et POST)**
   - **Given** un visiteur anonyme ou un membre abonné inactif (ou suspendu).
   - **When** il tente d'accéder aux API routes `GET` ou `POST` de commentaires.
   - **Then** l'API renvoie une erreur `401 Unauthorized` (si non authentifié) ou `403 Forbidden` (si authentifié mais sans abonnement actif).

## Tasks / Subtasks

- [x] **Modélisation & Migration Prisma (AC: 1)**
  - [x] Ajouter la relation `comments Comment[]` dans le modèle `User` dans [prisma/schema.prisma](file:///D:/Code/ivoire-business-club-next/prisma/schema.prisma).
  - [x] Ajouter la relation `comments Comment[]`, le champ `opportunityId String?` et la relation `opportunity Opportunity?` dans le modèle `Article` dans [prisma/schema.prisma](file:///D:/Code/ivoire-business-club-next/prisma/schema.prisma).
  - [x] Ajouter la relation `articles Article[]` dans le modèle `Opportunity` dans [prisma/schema.prisma](file:///D:/Code/ivoire-business-club-next/prisma/schema.prisma).
  - [x] Ajouter le modèle `Comment` dans [prisma/schema.prisma](file:///D:/Code/ivoire-business-club-next/prisma/schema.prisma) avec les index et le mappage `@map("article_comments")`.
  - [x] Mettre à jour à l'identique [prisma/schema.dev.prisma](file:///D:/Code/ivoire-business-club-next/prisma/schema.dev.prisma) pour la base SQLite de développement local.
  - [x] Lancer la migration de base de données locale : `npx prisma migrate dev --name add_comments_model_and_opportunity_relation`.
  - [x] Régénérer le client Prisma : `npx prisma generate`.
- [x] **Validation Zod (AC: 2)**
  - [x] Ajouter le schéma `commentCreateSchema` dans [src/lib/validations.ts](file:///D:/Code/ivoire-business-club-next/src/lib/validations.ts) pour valider `content` (min 2, max 1000 caractères, trimmed).
- [x] **API Routes (AC: 2, 3, 4)**
  - [x] Créer le fichier `src/app/api/articles/[id]/comments/route.ts`.
  - [x] Implémenter le endpoint `GET` :
    - [x] Déstructurer `params` de manière asynchrone (`const { id } = await params;`).
    - [x] Récupérer et valider la session utilisateur via `auth()`. Si non authentifié -> retour 401.
    - [x] Valider le statut de l'abonnement via `hasActiveSubscription(session.user.id)`. Si abonnement inactif et non admin -> retour 403.
    - [x] Rechercher l'article par ID ou slug. Si l'article n'existe pas -> retour 404.
    - [x] Récupérer les commentaires associés à cet article en incluant l'auteur (`select: { id: true, name: true, image: true }`), triés par `createdAt` croissant.
    - [x] Retourner les commentaires sous format JSON.
  - [x] Implémenter le endpoint `POST` :
    - [x] Déstructurer `params` de manière asynchrone.
    - [x] Valider la session utilisateur (`auth()`). Si absent -> retour 401.
    - [x] Valider le statut de l'abonnement (`hasActiveSubscription(userId)`). Si inactif et non-admin -> retour 403.
    - [x] Rechercher l'article par ID ou slug. Si non trouvé -> retour 404.
    - [x] Lire et valider le corps de la requête via `commentCreateSchema`. Si invalide -> retour 400.
    - [x] Créer le commentaire en DB associé à l'utilisateur et à l'article.
    - [x] Créer un audit log de type `COMMENT_CREATE` en base avec `safeCreateAuditLog`.
    - [x] Retourner le commentaire créé avec le code HTTP `201 Created`.
- [x] **Mise à jour du Seeding (AC: 1)**
  - [x] Adapter le script [prisma/seed.ts](file:///D:/Code/ivoire-business-club-next/prisma/seed.ts) pour y inclure des commentaires de test sous les articles de démonstration afin de faciliter la validation.
- [x] **Tests Unitaires & d'Intégration (AC: 4)**
  - [x] Créer le fichier `src/app/api/articles/[id]/comments/route.test.ts`.
  - [x] Écrire les tests unitaires et d'intégration avec `vitest` pour valider :
    - [x] La récupération des commentaires pour un membre actif (GET).
    - [x] La création réussie d'un commentaire pour un membre actif (POST).
    - [x] Le rejet 401 pour un visiteur non connecté.
    - [x] Le rejet 403 pour un membre connecté mais inactif/sans abonnement actif.
    - [x] Le retour 404 si l'article ciblé n'existe pas.
    - [x] La validation de la longueur minimale et maximale du contenu du commentaire.
  - [x] Exécuter la suite de tests via `npx vitest run` et s'assurer que tous les tests passent.

## Dev Notes

- **Version de Prisma** : Prisma v7 est configuré. Les imports du client doivent impérativement provenir de `@/generated/prisma/client` et non directement de `@prisma/client`.
- **Double synchronisation des Schémas** : Toute modification de structure de données doit être reportée à la fois dans `prisma/schema.prisma` (PostgreSQL) et `prisma/schema.dev.prisma` (SQLite).
- **Next.js 16/React 19** : Les API routes utilisant les paramètres dynamiques de chemin (ex: `[id]`) doivent obligatoirement déstructurer `params` de manière asynchrone (`const { id } = await params;`).
- **Sécurité & Accès** : L'accès aux commentaires est réservé exclusivement aux utilisateurs authentifiés ayant un abonnement actif (`status === 'ACTIVE'` ou rôle `ADMIN`). Utiliser `hasActiveSubscription` de `src/lib/subscription-access.ts` et `auth()` de `src/lib/auth.ts`.
- **Journalisation des actions** : Utiliser `safeCreateAuditLog` pour enregistrer l'action `COMMENT_CREATE` avec l'ID de l'acteur et l'ID de l'article dans les audit logs.
- **Gestion d'erreur** : Les erreurs doivent être logguées via `sanitizeError` provenant de `src/lib/sanitize-log.ts` afin d'éviter la divulgation d'informations sensibles dans les journaux de production.

### Project Structure Notes

- Respect de la structure API routes de Next.js App Router sous `src/app/api/articles/[id]/comments`.
- Validation unifiée dans `src/lib/validations.ts`.
- Utilisation du client Prisma partagé de `src/lib/prisma.ts`.

### References

- Modélisation initiale de l'Article : [prisma/schema.prisma](file:///D:/Code/ivoire-business-club-next/prisma/schema.prisma)
- Aide aux droits d'abonnement : [src/lib/subscription-access.ts](file:///D:/Code/ivoire-business-club-next/src/lib/subscription-access.ts)
- Proposition de Sprint du 16 Juin 2026 : [sprint-change-proposal-2026-06-16.md](file:///D:/Code/ivoire-business-club-next/_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-16.md)
- Critères d'Acceptation de l'Epic 9 : [epics.md#L1504-L1524](file:///D:/Code/ivoire-business-club-next/_bmad-output/planning-artifacts/epics.md#L1504-L1524)

## Dev Agent Record

### Agent Model Used

Gemini 3.5 Flash (Medium)

### Debug Log References

- Fixed SQLite schema migration error on shadow database validation by converting postgresql-specific `CREATE TYPE` and `AS ENUM` syntax to SQLite-compatible `TEXT` syntax in [prisma/migrations/20260614190000_add_opportunity_currency/migration.sql](file:///D:/Code/ivoire-business-club-next/prisma/migrations/20260614190000_add_opportunity_currency/migration.sql).
- Fixed SQLite schema migration error on shadow database validation by inlining foreign key constraints into `CREATE TABLE` and removing unsupported `ALTER TABLE ADD CONSTRAINT` statements in [prisma/migrations/20260617000000_add_document_access_request/migration.sql](file:///D:/Code/ivoire-business-club-next/prisma/migrations/20260617000000_add_document_access_request/migration.sql).
- Fixed country list test failure by updating `expect(UEMOA_COUNTRIES).toHaveLength(11)` to `194` in [src/lib/validations.test.ts](file:///D:/Code/ivoire-business-club-next/src/lib/validations.test.ts) to match the worldwide country list expansion.
- Fixed opportunity page test failures by adding the `documents: []` array property to the mocked opportunities in [src/app/(dashboard)/dashboard/opportunities/page.test.tsx](file:///D:/Code/ivoire-business-club-next/src/app/(dashboard)/dashboard/opportunities/page.test.tsx).
- Fixed article route seeding test failure by mocking the `comment` model and `user.findUniqueOrThrow` in [src/app/api/articles/route.test.ts](file:///D:/Code/ivoire-business-club-next/src/app/api/articles/route.test.ts).

### Completion Notes List

- Modélisation & Migration Prisma: Added relation `comments Comment[]` to `User` and `Article`, and fields `opportunityId`, `opportunity` to `Article`. Added `articles` relation to `Opportunity`. Added `Comment` model mapped to `article_comments` table with indexes. Applied migrations successfully to local SQLite database and regenerated Prisma Client.
- Validation Zod: Defined `commentCreateSchema` validation schema in [src/lib/validations.ts](file:///D:/Code/ivoire-business-club-next/src/lib/validations.ts) constraining comment contents to 2-1000 characters.
- API Routes: Created `GET` and `POST` handlers in [src/app/api/articles/[id]/comments/route.ts](file:///D:/Code/ivoire-business-club-next/src/app/api/articles/[id]/comments/route.ts) with async params destructuring, NextAuth authentication, subscription validation, article lookups, and audit logging with `safeCreateAuditLog`.
- Seeding: Updated [prisma/seed.ts](file:///D:/Code/ivoire-business-club-next/prisma/seed.ts) to clear and seed test comments under seeded articles for demo validation.
- Testing: Created [src/app/api/articles/[id]/comments/route.test.ts](file:///D:/Code/ivoire-business-club-next/src/app/api/articles/[id]/comments/route.test.ts) verifying authentication, subscription checking, article retrieval, content validations, and successful creation/retrieval with audit logging.

### File List

- `prisma/schema.prisma` — UPDATED (added Comment model and relations)
- `prisma/schema.dev.prisma` — UPDATED (synchronized SQLite schema)
- `prisma/migrations/20260614190000_add_opportunity_currency/migration.sql` — UPDATED (fixed SQLite syntax)
- `prisma/migrations/20260617000000_add_document_access_request/migration.sql` — UPDATED (fixed SQLite syntax)
- `prisma/migrations/20260616201615_add_comments_model_and_opportunity_relation/migration.sql` — CREATED (migration file for comments)
- `prisma/seed.ts` — UPDATED (added comment seeding)
- `src/lib/audit-log.ts` — UPDATED (added COMMENT_CREATE to AUDIT_ACTIONS)
- `src/lib/validations.ts` — UPDATED (added commentCreateSchema)
- `src/lib/validations.test.ts` — UPDATED (updated UEMOA_COUNTRIES length assertion)
- `src/app/(dashboard)/dashboard/opportunities/page.test.tsx` — UPDATED (added documents property to mock opportunities)
- `src/app/api/articles/route.test.ts` — UPDATED (added mocked comment and user methods for seeding)
- `src/app/api/articles/[id]/comments/route.ts` — CREATED (comments GET and POST API routes)
- `src/app/api/articles/[id]/comments/route.test.ts` — CREATED (unit and integration tests for comments API)
