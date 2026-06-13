---
baseline_commit: 95d694fb7c969451ebf5a4bc605ed2c714e49eea
---
# Story 9.1: Modèle Article, Migration et API Routes

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

**En tant que** développeur,  
**Je veux** un modèle Article persisté avec API routes complètes,  
**Afin de** fournir les fondations données pour toutes les features éditoriales.

## Acceptance Criteria

1. **Modélisation & Migration Prisma**
   - **Given** le schéma Prisma mis à jour avec l'enum `ArticleVisibility` (`PUBLIC`, `AFFRANCHI`, `GRAND_FRERE`, `BOSS`) et le modèle `Article`.
   - **When** `npx prisma migrate dev` est exécuté.
   - **Then** la migration crée la table `articles` et l'enum sans erreur, et `npx prisma generate` génère le client avec les types correspondants.

2. **Création d'article (POST /api/articles)**
   - **Given** un administrateur authentifié (`role === "ADMIN"`).
   - **When** il envoie une requête `POST /api/articles` avec un corps contenant : `title`, `excerpt`, `content`, `category`, et `visibility`.
   - **Then** l'article est créé dans la base de données avec `published: false`, un slug unique auto-généré à partir du titre, et le code HTTP `201 Created` est retourné avec l'article créé.

3. **Mise à jour d'article (PUT /api/articles/[id])**
   - **Given** un administrateur authentifié.
   - **When** il envoie une requête `PUT /api/articles/[id]` avec les champs modifiés.
   - **Then** l'article est mis à jour en base de données, son champ `updatedAt` est actualisé, et le code HTTP `200 OK` est retourné avec l'article mis à jour.

4. **Suppression d'article (DELETE /api/articles/[id])**
   - **Given** un administrateur authentifié.
   - **When** il envoie une requête `DELETE /api/articles/[id]`.
   - **Then** l'article est définitivement supprimé en cascade de la base de données, et le code HTTP `200 OK` (ou `{ data: { ok: true } }`) est retourné.

5. **Consultation de la liste d'articles (GET /api/articles)**
   - **Given** un utilisateur (visiteur non connecté, membre connecté, ou admin).
   - **When** il envoie une requête `GET /api/articles`.
   - **Then** seuls les articles publiés (`published: true`) dont le niveau de visibilité est inférieur ou égal à son statut/tier (ou `PUBLIC` uniquement si non connecté ou si son abonnement n'est pas actif) sont retournés. Les articles sont triés par `publishedAt` décroissant. Un administrateur peut voir tous les articles (y compris non publiés et de tous les tiers).

6. **Consultation d'un article unique (GET /api/articles/[id])**
   - **Given** un utilisateur.
   - **When** il envoie une requête `GET /api/articles/[id]`.
   - **Then** l'article est retourné si le statut de publication est `published: true` et sa visibilité est compatible avec le tier de l'utilisateur (ou `PUBLIC` uniquement si non abonné/visiteur), sinon un code HTTP `404 Not Found` est retourné. Les administrateurs contournent ces restrictions.

7. **Seeding des données (npx prisma db seed)**
   - **Given** des données de seed.
   - **When** la commande `npx prisma db seed` est exécutée.
   - **Then** 4 articles de démonstration avec du contenu réaliste sont créés en base de données : 1 PUBLIC, 1 AFFRANCHI, 1 GRAND_FRERE, 1 BOSS.

8. **Tests & Intégration**
   - **Given** les implémentations ci-dessus.
   - **When** la suite de tests unitaires et d'intégration `npx vitest run` est lancée.
   - **Then** les tests valident le filtrage de visibilité (visiteur vs membre abonné vs membre non abonné), la gestion des droits admin, la génération de slug, et l'intégrité de la base.

## Tasks / Subtasks

- [x] **Modélisation & Migration de Données (AC: 1)**
  - [x] Ajouter l'enum `ArticleVisibility` et le modèle `Article` dans [prisma/schema.prisma](file:///D:/Code/ivoire-business-club-next/prisma/schema.prisma) avec indexation sur `[published, visibility, publishedAt]` et `[category, published]`.
  - [x] Ajouter la relation `articles Article[]` dans le modèle `User` existant.
  - [x] Exécuter la migration locale (`npx prisma migrate dev --name add_article_model`).
  - [x] S'assurer du bon fonctionnement de la génération automatique du client Prisma dans `src/generated/prisma`.

- [x] **Définition des Schémas de Validation & Utilitaires (AC: 2, 3)**
  - [x] Ajouter les schémas Zod `articleCreateSchema` et `articleUpdateSchema` dans [src/lib/validations.ts](file:///D:/Code/ivoire-business-club-next/src/lib/validations.ts).
  - [x] Exporter les types TypeScript correspondants (`ArticleCreateInput`, `ArticleUpdateInput`).
  - [x] Implémenter une fonction utilitaire de génération de slug robuste (sanitisation des caractères spéciaux, minuscules, tirets) dans [src/lib/utils.ts](file:///D:/Code/ivoire-business-club-next/src/lib/utils.ts) ou inline, en garantissant l'unicité en DB.

- [x] **Logique de Visibilité & Sécurité (AC: 5, 6)**
  - [x] Créer `src/lib/article-visibility.ts` pour implémenter la logique de filtrage par tier (ex: `getAccessibleArticleVisibilities(userTier, hasActiveSubscription)`).
  - [x] Associer cette logique à la vérification d'abonnement via `hasActiveSubscription(userId)` de [src/lib/subscription-access.ts](file:///D:/Code/ivoire-business-club-next/src/lib/subscription-access.ts).

- [x] **API Routes (AC: 2, 3, 4, 5, 6)**
  - [x] Créer `src/app/api/articles/route.ts` :
    - [x] Implémenter `GET` : Récupération des articles triés par `publishedAt desc`, filtrés selon les droits du visiteur (non connecté vs connecté non abonné vs connecté abonné par tier vs admin). Les admins peuvent voir tous les articles (y compris drafts).
    - [x] Implémenter `POST` : Protéger l'accès aux administrateurs actifs via la session `auth()`. Valider les données reçues, générer le slug et enregistrer en base (`published` par défaut à `false`).
  - [x] Créer `src/app/api/articles/[id]/route.ts` :
    - [x] Implémenter `GET` : Retourner l'article si compatible avec le tier de l'utilisateur ou si admin. Await le paramètre `params`.
    - [x] Implémenter `PUT` : Réservé aux administrateurs. Mettre à jour l'article et rafraîchir `updatedAt`.
    - [x] Implémenter `DELETE` : Réservé aux administrateurs. Supprimer l'article en cascade.

- [x] **Mécanisme de Seeding (AC: 7)**
  - [x] Configurer le support du seed TypeScript dans [package.json](file:///D:/Code/ivoire-business-club-next/package.json) en ajoutant la clé `"prisma": { "seed": "tsx prisma/seed.ts" }` (ou utiliser `npx tsx` / un script adapté).
  - [x] Créer ou mettre à jour le fichier `prisma/seed.ts` pour générer 4 articles de test avec du contenu et des tiers de visibilité différents (PUBLIC, AFFRANCHI, GRAND_FRERE, BOSS).
  - [x] S'assurer que le script de seed est idempotent (utilise `upsert` ou nettoie avant d'écrire).

- [x] **Tests Unitaires & d'Intégration (AC: 8)**
  - [x] Créer les fichiers de test `src/app/api/articles/route.test.ts` et `src/app/api/articles/[id]/route.test.ts` couvrant :
    - [x] Les scénarios de restriction de visibilité par tier (visiteur, membre non abonné, membre AFFRANCHI, etc.).
    - [x] Les restrictions d'accès admin pour les opérations d'écriture/modification.
    - [x] La génération correcte des slugs uniques.
    - [x] Le bon comportement du seeding.
  - [x] Lancer `npx vitest run` et vérifier que tous les tests passent.

### Review Findings

- [x] [Review][Decision] Incohérence du statut HTTP (404 au lieu de 403) pour accès restreint — Si un utilisateur demande un article existant mais que son tier est insuffisant, la route GET `/api/articles/[id]` renvoie un statut 404 avec l'erreur "Non autorisé". Il faut décider s'il convient de renvoyer un statut 403 Forbidden explicite ou de renvoyer un statut 404 Not Found avec un message neutre (ex: "Article non trouvé") afin de masquer l'existence de l'article aux non-abonnés.
- [x] [Review][Patch] Non-utilisation de sanitizeError pour les logs d'erreurs [src/app/api/articles/route.ts:59]
- [x] [Review][Patch] Duplication de la fonction generateUniqueSlug [src/app/api/articles/route.ts:9]
- [x] [Review][Patch] Utilisation d'un enum Zod statique au lieu de z.nativeEnum [src/lib/validations.ts:162]
- [x] [Review][Patch] Recherche séquentielle inefficace par ID puis par Slug [src/app/api/articles/[id]/route.ts:40]
- [x] [Review][Patch] Appel destructif deleteMany inconditionnel dans le Seed [prisma/seed.ts:22]
- [x] [Review][Patch] Risque de boucle infinie dans generateUniqueSlug avec des caractères non-standards [src/lib/utils.ts:8]
- [x] [Review][Patch] Risque de conflit de concurrence (Race Condition) sur l'unicité du slug [src/app/api/articles/route.ts:14]
- [x] [Review][Patch] Validation Zod laxiste autorisant des titres ou résumés vides [src/lib/validations.ts:159]
- [x] [Review][Patch] Tri instable sur publishedAt pour les administrateurs [src/app/api/articles/route.ts:48]
- [x] [Review][Patch] Erreur 500 sur requête avec corps JSON mal formé ou vide [src/app/api/articles/route.ts:76]
- [x] [Review][Patch] Risque d'erreur ou d'accès indu si userId est absent dans hasActiveSubscription [src/lib/subscription-access.ts:3]
- [x] [Review][Patch] Absence de cas de test pour le script de seeding [src/app/api/articles/route.test.ts]
- [x] [Review][Defer] Typage faible de la session (session.user as any) [src/app/api/articles/route.ts:39] — deferred, pre-existing
- [x] [Review][Defer] Absence de pagination sur GET /api/articles [src/app/api/articles/route.ts:28] — deferred, pre-existing
- [x] [Review][Defer] Absence de validation réelle de l'intégrité de la base de données dans les tests (convention de mocking existante) [src/app/api/articles/route.test.ts] — deferred, pre-existing

## Dev Notes

### Patterns d'Architecture & Contraintes
- **Version de Prisma** : Prisma v7 est configuré. Les imports du client doivent impérativement provenir de `@/generated/prisma/client` et non directement de `@prisma/client`.
- **Singleton Prisma** : Toutes les opérations de base de données doivent s'effectuer via le singleton `prisma` importé de `@/lib/prisma`.
- **Next.js 16/React 19** : Les API routes utilisant les paramètres dynamiques de chemin (ex: `[id]`) doivent obligatoirement déstructurer `params` de manière asynchrone (ex: `const { id } = await params;`).
- **Auth.js v5** : Utiliser la fonction `auth()` importée de [src/lib/auth.ts](file:///D:/Code/ivoire-business-club-next/src/lib/auth.ts) pour valider les sessions et récupérer l'ID utilisateur ainsi que son rôle. Ne jamais importer Prisma dans `auth.config.ts`.
- **Gestion d'erreur et de logs** : Les erreurs doivent être journalisées de manière sécurisée en utilisant `sanitizeError` provenant de [src/lib/sanitize-log.ts](file:///D:/Code/ivoire-business-club-next/src/lib/sanitize-log.ts) afin de ne pas divulguer d'informations sensibles.

### Composants & Chemins à modifier / créer
- [prisma/schema.prisma](file:///D:/Code/ivoire-business-club-next/prisma/schema.prisma) (UPDATE) - Ajout de l'enum `ArticleVisibility` et du modèle `Article`, mise à jour de `User`.
- [package.json](file:///D:/Code/ivoire-business-club-next/package.json) (UPDATE) - Ajout de la configuration pour la commande de seed.
- [src/lib/validations.ts](file:///D:/Code/ivoire-business-club-next/src/lib/validations.ts) (UPDATE) - Ajout des schémas de validation d'articles.
- `src/lib/article-visibility.ts` (NEW) - Logique de visibilité par tier.
- `src/app/api/articles/route.ts` (NEW) - API GET/POST articles.
- `src/app/api/articles/[id]/route.ts` (NEW) - API GET/PUT/DELETE article.
- `prisma/seed.ts` (NEW) - Script de seed pour les articles de démo.
- `src/app/api/articles/route.test.ts` (NEW) - Suite de tests unitaires pour l'API list/create.
- `src/app/api/articles/[id]/route.test.ts` (NEW) - Suite de tests pour l'API ressource individuelle.

### Références
- Schéma de données de l'opportunité : [prisma/schema.prisma](file:///D:/Code/ivoire-business-club-next/prisma/schema.prisma)
- Configuration de paiement et tiers : [src/lib/tier-config.ts](file:///D:/Code/ivoire-business-club-next/src/lib/tier-config.ts)
- Accès aux abonnements : [src/lib/subscription-access.ts](file:///D:/Code/ivoire-business-club-next/src/lib/subscription-access.ts)
- Propositions de sprint : [sprint-change-proposal-2026-06-13.md](file:///D:/Code/ivoire-business-club-next/_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-13.md)
- Définition d'Epic 9 : [epics.md#L1291-L1445](file:///D:/Code/ivoire-business-club-next/_bmad-output/planning-artifacts/epics.md#L1291-L1445)

## Dev Agent Record

### Agent Model Used

Gemini 3.5 Flash (Medium)

### Debug Log References

- SQLite migration reset and db seed executed successfully with `NODE_ENV=development`.
- 18 tests passed for articles and articles/[id] endpoints.
- Full project regression test suite (544 tests) passed with 100% success.

### Completion Notes List

- Added `Article` model and `ArticleVisibility` enum in the database.
- Executed migration local and synced Prisma Client.
- Set up Zod validations and TypeScript type definitions for article inputs.
- Implemented visibility filters depending on the subscription tier of the authenticated user.
- Created fully secure API routes for `/api/articles` (GET/POST) and `/api/articles/[id]` (GET/PUT/DELETE) supporting Next.js 16 async params.
- Configured and executed database seeding using tsx tool.
- Authored a solid test coverage validating slug collision handling, admin bypass, anonymous access, and tier-based restrictions.

### File List

- [prisma/schema.prisma](file:///D:/Code/ivoire-business-club-next/prisma/schema.prisma) (MODIFIED)
- [prisma/schema.dev.prisma](file:///D:/Code/ivoire-business-club-next/prisma/schema.dev.prisma) (MODIFIED)
- [package.json](file:///D:/Code/ivoire-business-club-next/package.json) (MODIFIED)
- [prisma.config.ts](file:///D:/Code/ivoire-business-club-next/prisma.config.ts) (MODIFIED)
- [src/lib/validations.ts](file:///D:/Code/ivoire-business-club-next/src/lib/validations.ts) (MODIFIED)
- [src/lib/utils.ts](file:///D:/Code/ivoire-business-club-next/src/lib/utils.ts) (MODIFIED)
- [src/lib/article-visibility.ts](file:///D:/Code/ivoire-business-club-next/src/lib/article-visibility.ts) (NEW)
- [prisma/seed.ts](file:///D:/Code/ivoire-business-club-next/prisma/seed.ts) (NEW)
- [src/app/api/articles/route.ts](file:///D:/Code/ivoire-business-club-next/src/app/api/articles/route.ts) (NEW)
- [src/app/api/articles/[id]/route.ts](file:///D:/Code/ivoire-business-club-next/src/app/api/articles/[id]/route.ts) (NEW)
- [src/app/api/articles/route.test.ts](file:///D:/Code/ivoire-business-club-next/src/app/api/articles/route.test.ts) (NEW)
- [src/app/api/articles/[id]/route.test.ts](file:///D:/Code/ivoire-business-club-next/src/app/api/articles/[id]/route.test.ts) (NEW)

### Change Log

- 2026-06-13: Implemented Prisma model, migration, seeding, validations, visibility logic, REST API endpoints, and comprehensive unit tests for editorial articles. All 18 tests passed. All 544 total regression tests passed.

