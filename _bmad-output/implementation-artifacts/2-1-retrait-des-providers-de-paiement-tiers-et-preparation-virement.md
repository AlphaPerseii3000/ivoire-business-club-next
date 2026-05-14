# Story 2.1: Retrait des Providers de Paiement Tiers et Préparation Virement

Status: ready-for-dev

<!-- Note: La consolidation Story 2.0 a déjà purgé les dépendances Stripe/CinetPay du runtime et migré le schéma Prisma vers BANK_TRANSFER. Cette story se concentre sur la finalisation du modèle de données virement et la préparation des composants/API pour Epic 2. -->

## Story

As a développeur IBC,
I want finaliser le modèle de données pour le paiement par virement bancaire et créer les fondations API/composants nécessaires,
so that les stories 2.2–2.5 peuvent construire les interfaces tier, instructions virement et validation admin sur une base solide.

## Acceptance Criteria

1. **Schéma Prisma virement bancaire complet**
   - Given `prisma/schema.prisma`,
   - When la story est terminée,
   - Then les modèles `Subscription` et `Payment` ont un champ `providerRef` adapté au virement bancaire (`String` suffisant pour la référence `IBC-{userId}-{tier}`, pas de contrainte NOT NULL si aucune référence n'existe au moment de la création TRIAL),
   - And une migration Prisma additive/sûre est créée si le schéma change,
   - And `npm run build` passe sans erreur.

2. **Suppression résiduelle Stripe/CinetPay**
   - Given le codebase IBC,
   - When la story est terminée,
   - Then aucun fichier runtime, import, type, dépendance, variable d'environnement ou configuration active ne référence Stripe ou CinetPay (les artefacts BMAD historiques restent autorisés),
   - And `npm run build` passe,
   - And `grep -ri "stripe\|cinetpay" src/ prisma/ scripts/ package.json next.config.ts` ne retourne aucune référence active (hors artefacts BMAD et `generated/prisma`).

3. **API route `/api/subscriptions` créée (CRUD fondation)**
   - Given les modèles Prisma `Subscription` et `Payment`,
   - When un membre authentifié envoie `POST /api/subscriptions` avec `{ tier, period }`,
   - Then une `Subscription` est créée en statut `TRIAL` avec `provider = BANK_TRANSFER`, `providerRef = IBC-{userId}-{tier}-{timestamp}`,
   - And un `Payment` est créé avec `status = pending`, `provider = BANK_TRANSFER`, `providerRef` correspondant,
   - And la réponse retourne la subscription créée avec son statut et sa référence virement.

4. **Configuration virement bancaire centralisée**
   - Given les paramètres du compte KS Investment,
   - When la story est terminée,
   - Then un module `src/lib/bank-transfer-config.ts` exporte les constantes du virement : bénéficiaire, IBAN, BIC, adresse bancaire, devise (EUR),
   - And ces constantes sont réutilisables par les futures stories (instructions virement, emails).

5. **Composant `SubscriptionStatusTracker` scaffold**
   - Given la UX Spec (UX-DR11),
   - When la story est terminée,
   - Then un composant React `SubscriptionStatusTracker` existe dans `src/components/subscription-status-tracker.tsx`,
   - And il affiche les statuts TRIAL → PENDING → ACTIVE avec un stepper vertical,
   - And il accepte une prop `status: SubscriptionStatus` et affiche le statut courant avec une animation pulsing amber pour PENDING.

6. **Pas de régression sur l'existant**
   - Given le codebase existant (auth, middleware, profil, etc.),
   - When la story est terminée,
   - Then `npx vitest run` passe tous les tests existants,
   - And `npm run build` passe,
   - And les routes existantes (`/auth/*`, `/dashboard`, `/admin`, `/profile`, `/settings`) restent fonctionnelles.

## Tasks / Subtasks

- [ ] Finaliser le schéma Prisma virement bancaire (AC: 1)
  - [ ] Vérifier que `Subscription.providerRef` n'est pas NOT NULL (adapté au virement : référence générée à la création TRIAL)
  - [ ] Vérifier que `Payment` modèle est cohérent avec `BANK_TRANSFER`
  - [ ] Si changements schéma : créer migration additive via `npx prisma migrate dev`
  - [ ] Régénérer le client Prisma via `npx prisma generate`
  - [ ] Vérifier que `npm run build` passe

- [ ] Nettoyage résiduel Stripe/CinetPay (AC: 2)
  - [ ] Lancer `grep -ri "stripe\|cinetpay" src/ prisma/ scripts/ package.json next.config.ts` (hors `generated/prisma`)
  - [ ] Retirer toute référence résiduelle dans .env.example, configs, commentaires
  - [ ] Vérifier que `.env.example` n'a plus de variables Stripe/CinetPay
  - [ ] Relancer `npm run build` pour confirmer

- [ ] Créer API route `/api/subscriptions` (AC: 3)
  - [ ] Créer `src/app/api/subscriptions/route.ts` avec `GET` (liste utilisateur) et `POST` (création TRIAL)
  - [ ] POST crée une `Subscription` + un `Payment` en une transaction Prisma
  - [ ] Le `providerRef` est auto-généré : `IBC-{userId}-{tier}-{timestamp}`
  - [ ] Ajouter validation Zod pour le body POST (`tier`, `period`)
  - [ ] Protéger la route : utilisateur authentifié uniquement
  - [ ] Ajouter tests Vitest pour la route `/api/subscriptions`

- [ ] Créer configuration virement bancaire centralisée (AC: 4)
  - [ ] Créer `src/lib/bank-transfer-config.ts` avec constants exportées
  - [ ] Bénéficiaire : KS Investment
  - [ ] IBAN, BIC, adresse bancaire (à partir de variables d'environnement ou constantes)
  - [ ] Devise : EUR
  - [ ] Montants par tier : AFFRANCHI=29, GRAND_FRERE=49, BOSS=99
  - [ ] Ajouter les variables dans `.env.example` si nécessaire

- [ ] Créer composant `SubscriptionStatusTracker` (AC: 5)
  - [ ] Créer `src/components/subscription-status-tracker.tsx`
  - [ ] Stepper vertical : TRIAL → PENDING → ACTIVE
  - [ ] Passe le statut courant en prop (`status: SubscriptionStatus`)
  - [ ] Animation pulsing amber pour le statut PENDING
  - [ ] Support dark mode via TailwindCSS
  - [ ] Textes en français

- [ ] Vérifier non-régression (AC: 6)
  - [ ] Lancer `npx vitest run` et vérifier que tous les tests passent
  - [ ] Lancer `npm run build` et vérifier que le build passe
  - [ ] Tester manuellement les routes existantes dans le navigateur

## Dev Notes

### Contexte critique : ce que la Story 2.0 a déjà fait

La story de consolidation 2.0 a **déjà** accompli :
- Suppression de `stripe`, `@stripe/stripe-js`, `@stripe/stripe-js` de `package.json`
- Suppression de `src/lib/stripe.ts`, `src/lib/cinetpay.ts`, `src/app/api/stripe/**`, `src/app/api/cinetpay/**`
- Migration de `PaymentProvider` enum vers `BANK_TRANSFER` uniquement dans Prisma
- Création de la migration `20260513230121_bank_transfer_provider`
- Ajout des tests middleware auth anti-régression
- Documentation Auth.js v5 dans `docs/auth-and-middleware.md`
- Correction du `.env.example` (retrait commentaires Stripe orphelins)

**Les changements ci-dessus sont déjà merge dans le code mais NON commit dans git.** Vérifier avec `git status` et `git diff` avant de commencer.

### Ce que cette Story 2.1 doit encore faire

1. **Vérifier et finaliser** le schéma Prisma (le `providerRef` Subscription peut-être `NOT NULL` — à vérifier et adapter si nécessaire pour le workflow TRIAL où la référence n'existe pas encore)
2. **Nettoyage résiduel** si des références Stripe/CinetPay persistent dans `.env.example`, configs, ou commentaires
3. **Créer l'API `/api/subscriptions`** qui n'existe pas encore
4. **Créer la config virement bancaire centralisée**
5. **Scaffold le composant `SubscriptionStatusTracker`**

### Architecture et conventions à respecter

- **Auth.js v5** : config split `auth.config.ts` (Edge) + `auth.ts` (Node). Jamais importer Prisma/bcrypt dans middleware. Pattern : `NextAuth({ ...authConfig, adapter, providers })` en objet unique.
- **Prisma 7** : datasource URL dans `prisma.config.ts`, pas dans `schema.prisma`. Import client depuis `@/generated/prisma/client`. Adapter SQLite : `PrismaBetterSqlite3`.
- **Route groups** : `(public)`, `(dashboard)`, `(admin)` dans App Router.
- **API Routes** : `src/app/api/{resource}/route.ts` avec exports `GET`, `POST`, etc.
- **Composants** : `src/components/` pour composants réutilisables.
- **Validation** : Zod schemas dans `src/lib/validations.ts` ou co-located avec la route.
- **Tests** : Vitest, fichiers `.test.ts`/`.test.tsx` co-located, mocks dans `__mocks__/`.
- **Styles** : TailwindCSS 4 + shadcn/ui. Thème teal primary `#0F766E`.
- **Language** : Tout le texte UI en français.
- **Prisma enum SQLite** : les enums sont enforceés au niveau PrismaClient, pas au niveau DB. Les raw SQL inserts peuvent contourner — normal pour SQLite.

### Contraintes de sécurité

- Routes API protégées : vérifier `session` via `auth()` (de `@/lib/auth`).
- Rate limiting existant sur `/api/auth/signup` (5/min) et `/api/auth/signin` (10/min) avec `@upstash/ratelimit`.
- Headers de sécurité dans `next.config.ts`.

### Références

- [Source: `_bmad-output/planning-artifacts/epics.md#Story-2.1`]
- [Source: `_bmad-output/planning-artifacts/architecture.md#Cross-Cutting-Concerns`]
- [Source: `_bmad-output/planning-artifacts/architecture.md#Decision-Priority-Analysis`]
- [Source: `_bmad-output/implementation-artifacts/2-0-consolidation-post-retrospective-epic-1.md`]
- [Source: `docs/auth-and-middleware.md`]
- [Source: `prisma/schema.prisma`]
- [Source: `src/lib/auth.config.ts`, `src/lib/auth.ts`, `src/middleware.ts`]

### Pièges connus (learnings Epic 1 et consolidation 2.0)

- **Prisma migration drift** : ne jamais accepter une migration destructive (`npx prisma migrate dev` qui propose un reset). Créer des migrations additives manuelles si nécessaire.
- **`.env.example` inline comments** : ne pas mettre de commentaires après les valeurs — les parsers dotenv les interprètent de manière incohérente.
- **Auth.js v5 deux arguments** : `NextAuth(authConfig, { providers })` est INVALIDE. Utiliser `NextAuth({ ...authConfig, adapter, providers })`.
- **Middleware Edge** : `src/middleware.ts` et `src/lib/auth.config.ts` doivent rester compatibles Edge Runtime — pas d'import Prisma/bcrypt/Node-only.
- **Subscription.providerRef NOT NULL** : à vérifier si le champ est NOT NULL dans le schéma actuel. Si oui, l'adapter en optionnel (`String?`) ou avec un default, car au moment de créer une Subscription en TRIAL, la référence bancaire n'est pas encore connue.
- **Story 1.4 Status mismatch** : le fichier `1-4-*.md` contenait `ready-for-dev` au lieu de `done`. Corrigé dans 2.0. Ne pas réintroduire d'incohérence Status entre story .md et sprint-status.yaml.

### Non-goals

- Ne pas implémenter les pages UI complètes de pricing, sélection tier ou instructions virement (Stories 2.2 et 2.3).
- Ne pas implémenter la validation admin des abonnements (Story 2.4).
- Ne pas implémenter les emails de confirmation (Story 2.5).
- Ne pas modifier l'architecture middleware/auth existante.
- Ne pas créer de routes admin pour les abonnements (sera en Story 2.4).

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List