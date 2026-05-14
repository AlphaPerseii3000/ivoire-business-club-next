# Story 2.0: Consolidation post-rétrospective Epic 1 avant Epic 2

Status: done

<!-- Note: Story créée suite à la rétrospective Epic 1. Cette story est un prérequis bloquant avant toute story Epic 2. -->

## Story

As a développeur IBC,
I want corriger tous les findings critiques remontés par la rétrospective Epic 1,
so that l'Epic 2 démarre sur une base auth/paiement stable, sans dette Stripe/CinetPay, avec middleware testé et artefacts BMAD cohérents.

## Acceptance Criteria

1. **Purge Stripe/CinetPay runtime/build complète**
   - Given le codebase IBC,
   - When la story est terminée,
   - Then aucune dépendance runtime/build Stripe ou CinetPay ne reste dans `package.json`, le lockfile, `prisma/schema.prisma`, `src/**`, `scripts/**`, `next.config.ts` ou les fichiers de config de build/déploiement.
   - And `npm run build` passe sans import, type, enum ou référence build-time Stripe/CinetPay.
   - And les références historiques dans les artefacts BMAD restent autorisées uniquement si elles documentent la dette ou cette story.

2. **Schéma Prisma aligné virement bancaire**
   - Given `prisma/schema.prisma`,
   - When la purge paiement est appliquée,
   - Then `PaymentProvider` ne contient plus `STRIPE` ni `CINETPAY` et le modèle `Subscription` est adapté au provider `BANK_TRANSFER` ou à la stratégie équivalente prévue par l'architecture.
   - And une migration Prisma additive/sûre est créée si le changement de schéma l'exige.
   - And aucune donnée existante utile n'est supprimée sans stratégie d'archivage documentée.

3. **Tests middleware d'authentification ajoutés**
   - Given le bug rétrospectif `publicRoutes` où `"/"` rendait toutes les routes publiques,
   - When les tests sont exécutés,
   - Then des tests d'intégration couvrent explicitement les routes publiques, les routes protégées, les routes admin et l'edge case `"/"`.
   - And une route protégée comme `/dashboard` ou `/admin` ne peut pas être considérée publique par un simple `pathname.startsWith("/")`.
   - And toute évolution future du middleware auth/tier-gating échoue en test si elle réintroduit ce comportement.

4. **Cohérence BMAD Story 1.4 restaurée**
   - Given `_bmad-output/implementation-artifacts/1-4-gestion-du-profil-utilisateur.md`,
   - When cette story de consolidation est terminée,
   - Then son champ `Status:` est cohérent avec `sprint-status.yaml`, soit `done`.
   - And aucune autre story BMAD n'est modifiée hors nécessité explicitement liée à cette consolidation.

5. **Documentation Auth.js v5 et piège middleware disponible**
   - Given les patterns découverts pendant l'Epic 1,
   - When la story est terminée,
   - Then une documentation repo accessible décrit le pattern Auth.js v5 correct : `NextAuth({ ...authConfig, adapter, providers })` en objet unique.
   - And elle documente le piège `isPublic` / `pathname.startsWith("/")` et l'obligation de tests middleware lors des changements de routing auth.
   - And elle rappelle que le middleware Edge ne doit pas importer Prisma, bcrypt ou modules Node-only.

6. **Préparation Epic 2 vérifiée**
   - Given Epic 2 pivote vers virement bancaire,
   - When la story est terminée,
   - Then les artefacts Epic 2 et la story 2.1 ne contiennent plus d'hypothèse active Stripe/CinetPay comme provider à implémenter.
   - And le plan de Story 2.1 reste centré sur le virement bancaire, la validation manuelle admin et `BANK_TRANSFER`.
   - And les items de préparation rétrospective sont cochables/traçables avant lancement de `2-1-*`.

7. **Validation stakeholder préparée**
   - Given la rétrospective marque l'acceptation stakeholder comme en attente,
   - When cette story est terminée,
   - Then un court checkpoint/review note ou une section dans la story résume les corrections appliquées et les commandes de vérification pour validation par Jonathan.

## Tasks / Subtasks

- [x] Purger Stripe/CinetPay du runtime et du build (AC: 1, 2)
  - [x] Retirer `stripe` et toute dépendance CinetPay de `package.json` et du lockfile.
  - [x] Supprimer ou migrer les fichiers runtime `src/lib/stripe.ts`, `src/lib/cinetpay.ts`, `src/app/api/stripe/**`, `src/app/api/cinetpay/**` s'ils existent encore.
  - [x] Nettoyer les imports/types/références Stripe/CinetPay dans `src/**`, `scripts/**`, configs et Prisma.
  - [x] Adapter `PaymentProvider` / `Subscription` vers le modèle virement bancaire attendu.
  - [x] Générer la migration Prisma nécessaire et vérifier le client Prisma.

- [x] Ajouter la garde de tests middleware auth (AC: 3)
  - [x] Localiser le pattern de test Vitest existant pour middleware/auth.
  - [x] Ajouter les cas publicRoutes/protectedRoutes/adminRoutes.
  - [x] Ajouter le test anti-régression pour `"/"` : `/` public ne doit pas rendre `/dashboard` ou `/admin` public.
  - [x] Vérifier que ces tests couvrent le futur tier-gating Epic 2.

- [x] Corriger la dette BMAD Story 1.4 (AC: 4)
  - [x] Mettre `Status: done` dans `1-4-gestion-du-profil-utilisateur.md`.
  - [x] Vérifier que `sprint-status.yaml` garde `1-4-gestion-du-profil-utilisateur: done`.

- [x] Documenter les patterns critiques Epic 1 (AC: 5)
  - [x] Créer ou mettre à jour une doc repo sur Auth.js v5 et middleware auth.
  - [x] Inclure le pattern single-object spread `NextAuth({ ...authConfig, adapter, providers })`.
  - [x] Inclure les contraintes Edge Runtime : pas de Prisma/bcrypt/modules Node-only dans `middleware.ts` ou `auth.config.ts`.
  - [x] Inclure le piège `pathname.startsWith("/")` et les tests obligatoires.

- [x] Vérifier le readiness Epic 2 (AC: 6)
  - [x] Relire les sections Epic 2 / Story 2.1 dans `epics.md`.
  - [x] Confirmer que le modèle actif est virement bancaire + validation manuelle admin.
  - [x] Ne pas implémenter les écrans de sélection tier/instructions virement de Story 2.2/2.3 dans cette story.

- [x] Préparer le checkpoint stakeholder (AC: 7)
  - [x] Ajouter dans le Dev Agent Record les corrections réalisées et les commandes de vérification.
  - [x] Lister explicitement les findings rétro couverts.

- [x] Vérification finale
  - [x] Lancer les tests ciblés middleware/auth.
  - [x] Lancer `npm run build`.
  - [x] Lancer une recherche ciblée : aucune référence Stripe/CinetPay active dans runtime/build (`src/**`, `prisma/**`, `scripts/**`, configs, package files), hors artefacts BMAD historiques.

## Dev Notes

### Findings rétrospective couverts

- **Purge Stripe/CinetPay** : dette technique haute priorité ; critère rétro : `npm run build` passe sans référence Stripe/CinetPay active. [Source: `_bmad-output/implementation-artifacts/epic-1-retro-2026-05-13.md#Dette-Technique`]
- **Tests middleware auth** : le bug Story 1.3 venait de `publicRoutes` incluant `"/"`, où `pathname.startsWith("/")` matchait toutes les routes. [Source: `_bmad-output/implementation-artifacts/epic-1-retro-2026-05-13.md#Défis`]
- **Status Story 1.4** : le fichier story indique encore `ready-for-dev` alors que `sprint-status.yaml` indique `done`. [Source: `_bmad-output/implementation-artifacts/epic-1-retro-2026-05-13.md#Défis`]
- **Documentation Auth.js v5** : pattern découvert pendant l'Epic 1, à rendre accessible dans le repo. [Source: `_bmad-output/implementation-artifacts/epic-1-retro-2026-05-13.md#Documentation`]
- **Review stakeholder / readiness Epic 2** : Epic 1 est terminé côté stories, mais la consolidation est bloquante avant Epic 2. [Source: `_bmad-output/implementation-artifacts/epic-1-retro-2026-05-13.md#Chemin-Critique`]

### Contexte Epic 2

- Epic 2 cible les tiers et le paiement par virement bancaire sur le compte KS Investment, avec validation manuelle admin. [Source: `_bmad-output/planning-artifacts/epics.md#Epic-2-Tiers-et-Paiement-par-Virement-Bancaire`]
- Story 2.1 prévoit déjà le retrait des providers tiers et l'adaptation du modèle de données. Cette Story 2.0 consolide les prérequis transverses avant d'autoriser 2.1. [Source: `_bmad-output/planning-artifacts/epics.md#Story-2.1`]

### État constaté au moment de création CS

- `package.json` contient encore `stripe` en dépendance runtime.
- `prisma/schema.prisma` contient encore `STRIPE`, `CINETPAY` et un commentaire `Stripe subscription ID or CinetPay ref`.
- `_bmad-output/implementation-artifacts/1-4-gestion-du-profil-utilisateur.md` contient `Status: ready-for-dev`, incohérent avec `sprint-status.yaml`.

### Contraintes techniques à respecter

- Stack active : Next.js 16, React 19, Prisma 7, Auth.js v5, Vitest, TailwindCSS 4.
- Auth.js v5 doit utiliser un seul objet fusionné : `NextAuth({ ...authConfig, adapter, providers })`.
- Le middleware Edge doit importer uniquement la config Edge-compatible ; aucun import transitif vers Prisma, bcrypt ou modules Node-only.
- Les headers de sécurité doivent rester configurés dans `next.config.ts` pour couvrir aussi les redirects Auth.js.
- Prisma 7 : le datasource URL vit dans `prisma.config.ts`; le client généré s'importe depuis `@/generated/prisma/client`; SQLite local utilise l'adapter `PrismaBetterSqlite3`.

### Project Structure Notes

- Artefacts BMAD : `_bmad-output/implementation-artifacts/`.
- Schéma Prisma : `prisma/schema.prisma`.
- Auth config attendue : `src/lib/auth.config.ts` pour Edge, `src/lib/auth.ts` pour Node/runtime complet.
- Middleware : `src/middleware.ts`.
- Tests : réutiliser la convention existante du repo pour Vitest et tests d'intégration auth/middleware.
- Documentation : préférer un chemin repo stable comme `docs/auth-and-middleware.md` si aucun fichier équivalent n'existe déjà.

### Non-goals

- Ne pas implémenter les écrans de pricing, sélection tier, instructions de virement ou validation admin : ces sujets restent dans les stories Epic 2 dédiées.
- Ne pas refactoriser l'architecture auth au-delà de ce qui est nécessaire pour tester et sécuriser le middleware existant.
- Ne pas modifier les avatars non suivis dans `public/avatars/`.

### Références

- `_bmad-output/implementation-artifacts/epic-1-retro-2026-05-13.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/implementation-artifacts/1-4-gestion-du-profil-utilisateur.md`
- `package.json`
- `prisma/schema.prisma`

## Dev Agent Record

### Agent Model Used

gpt-5.5 via OpenAI Codex

### Debug Log References

- `npx vitest run src/lib/auth.config.test.ts` → 10 tests pass.
- `npx vitest run` → 16 files / 135 tests pass.
- `npm run build` → Next.js production build pass; warnings only for deprecated middleware convention and missing local Upstash env fallback.
- Targeted active-reference searches in `src/**`, `prisma/**`, `scripts/**`, package/config files → 0 active Stripe/CinetPay references.

### Completion Notes List

- Removed Stripe dependency from `package.json` / `package-lock.json` and deleted Stripe/CinetPay runtime API/lib files.
- Updated Prisma payment provider model to the single `BANK_TRANSFER` provider and regenerated the Prisma client.
- Added safe migration to normalize existing subscription/payment provider values to `BANK_TRANSFER` without deleting data.
- Added middleware auth regression tests for public/protected/admin routes and the `/` public-route trap.
- Restored BMAD Story 1.4 file status to `done`, matching `sprint-status.yaml`.
- Added repo documentation for Auth.js v5 single-object config, Edge Runtime constraints, and middleware route guardrails.
- Confirmed Epic 2 and Story 2.1 remain centered on bank transfer + manual admin validation; no Story 2.2/2.3 UI was implemented.

### Stakeholder Checkpoint

- Findings covered: Stripe/CinetPay purge, middleware auth test gap, Story 1.4 BMAD status inconsistency, Auth.js v5 documentation, Epic 2 readiness.
- Verification commands for Jonathan: `npx vitest run src/lib/auth.config.test.ts`, `npx vitest run`, `npm run build`.
- Active payment model after consolidation: `BANK_TRANSFER` only; Epic 2 can proceed after BMAD code review.

### File List

- `.env.example`
- `_bmad-output/implementation-artifacts/1-4-gestion-du-profil-utilisateur.md`
- `_bmad-output/implementation-artifacts/2-0-consolidation-post-retrospective-epic-1.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/auth-and-middleware.md`
- `package-lock.json`
- `package.json`
- `prisma/migrations/20260513230121_bank_transfer_provider/migration.sql`
- `prisma/schema.prisma`
- `src/app/api/cinetpay/checkout/route.ts` (deleted)
- `src/app/api/cinetpay/webhook/route.ts` (deleted)
- `src/app/api/stripe/checkout/route.ts` (deleted)
- `src/app/api/stripe/webhook/route.ts` (deleted)
- `src/lib/auth.config.test.ts`
- `src/lib/cinetpay.ts` (deleted)
- `src/lib/stripe.ts` (deleted)

### Change Log

- 2026-05-13: Implemented Story 2.0 consolidation and moved story to review.

### Review Findings

- [x] [Review][Decision] .env.example : commentaire Stripe orphelin sur la ligne RESEND_API_KEY — La ligne `RESEND_API_KEY=*** Stripe (to be removed in Story 2.1)` contenait un commentaire Stripe orphelin et un placeholder `***`. **Fix**: nettoyé dans la version finale, la ligne est maintenant `RESEND_API_KEY=` sans commentaire Stripe.
- [ ] [Review][Patch] sprint-status.yaml : clé dupliquée epic-1 — Le diff ajoute `epic-1: done` sans retirer `epic-1: in-progress`, créant du YAML invalide. ✅ **Aucune action nécessaire** — le fichier actuel ne contient pas de clé dupliquée, la ligne `in-progress` a été correctement remplacée.
- [x] [Review][Patch] .env.example : pas de newline en fin de fichier — Le fichier se termine sans newline POSIX. **Fix**: newline final ajouté.
- [x] [Review][Patch] prisma/schema.prisma : commentaire providerRef trop spécifique — `// Bank transfer reference` sera inexact si un autre provider est ajouté. **Fix**: remplacé par `// External reference from the payment provider`.
- [x] [Review][Defer] avatarUrl vs image : mismatch colonne DB/schéma Prisma (pré-existant de Story 1.4) — Le schéma déclare `image String?` mais la migration initiale crée la colonne `avatarUrl`. Pas de `@map("avatarUrl")`. Bug pré-existant, hors scope de cette story. À corriger dans un story dédiée.
- [x] [Review][Defer] Subscription.providerRef NOT NULL sans default — Risque pour les créations de subscription sans référence immédiate. Probablement OK pour le modèle virement bancaire, mais à vérifier lors de l'implémentation Epic 2.
