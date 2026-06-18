# Story 11.3 : Modèle de paiement mobile money — Extension PaymentProvider

Status: review

## Story

As a développeur,  
I want étendre le modèle de paiement pour supporter Wave et Orange Money,  
so that offrir aux membres des moyens de paiement adaptés à l'Afrique de l'Ouest.

## Acceptance Criteria

1. **Given** le schéma Prisma mis à jour  
   **When** `npx prisma migrate dev` est exécuté  
   **Then** l'enum `PaymentProvider` inclut `WAVE` et `ORANGE_MONEY` (migration additive, non destructive)

2. **Given** le modèle Subscription  
   **When** un paiement mobile money est initié  
   **Then** le champ `providerPhone` stocke le numéro de téléphone mobile money

3. **Given** la page de sélection de tier (`/dashboard/subscribe`)  
   **When** le membre choisit Wave ou Orange Money  
   **Then** un champ "Numéro de téléphone mobile money" apparaît (validation : format international, pays supporté)

## Tasks / Subtasks

- [x] Task 1 : Audit du code existant lié aux paiements (AC : #1, #2)
  - [x] 1.1 Lire `prisma/schema.prisma` et `prisma/schema.dev.prisma` : modèles `Subscription`, `Payment` et enum `PaymentProvider`
  - [x] 1.2 Lire `src/lib/validations.ts` : `subscriptionCreateSchema` actuel (uniquement `tier` + `period`)
  - [x] 1.3 Lire `src/app/api/subscriptions/route.ts` et `src/app/api/admin/subscriptions/[id]/route.ts` pour comprendre le cycle TRIAL/PENDING → ACTIVE existant
  - [x] 1.4 Lire `src/app/(admin)/admin/subscriptions/page.tsx` pour comprendre les colonnes affichées côté admin
  - [x] 1.5 Lire `src/lib/bank-transfer-config.ts` et `src/components/bank-transfer-instructions.tsx` pour le flux virement bancaire existant
  - [x] 1.6 Identifier toute référence existante à Wave, Orange Money, mobile money ou `providerPhone` (attendu : aucune)

- [x] Task 2 : Étendre l'enum Prisma `PaymentProvider` (AC : #1)
  - [x] 2.1 Modifier `prisma/schema.prisma` : ajouter `WAVE` et `ORANGE_MONEY` à l'enum `PaymentProvider`
  - [x] 2.2 Modifier `prisma/schema.dev.prisma` de façon identique
  - [x] 2.3 Vérifier que les modèles `Subscription` et `Payment` utilisent déjà `PaymentProvider` ; ne PAS modifier leur type provider

- [x] Task 3 : Ajouter le champ `providerPhone` au modèle `Subscription` (AC : #2)
  - [x] 3.1 Modifier `prisma/schema.prisma` : ajouter `providerPhone String?` dans `Subscription`
  - [x] 3.2 Modifier `prisma/schema.dev.prisma` de façon identique
  - [x] 3.3 Vérifier que le champ est `nullable` pour ne pas casser les abonnements existants (virement bancaire)
  - [x] 3.4 NE PAS ajouter `@map` si aucun mapping personnalisé n'est nécessaire ; si `@map` est utilisé, vérifier que la migration ne génère pas de `RENAME COLUMN` destructeur (pitfall #40)

- [x] Task 4 : Créer une migration additive sûre (AC : #1, #2)
  - [x] 4.1 Exécuter `npx prisma migrate dev --name add_mobile_money_providers` en local (SQLite dev)
  - [x] 4.2 Vérifier le fichier SQL généré : doit contenir uniquement `ALTER TYPE ... ADD VALUE` (PostgreSQL) ou équivalent SQLite, et `ALTER TABLE "subscriptions" ADD COLUMN "providerPhone" TEXT` avec default NULL
  - [x] 4.3 S'assurer que la migration ne contient PAS de `DROP TABLE`, `CREATE TABLE new_*`, ni recréation de table (pitfall #42)
  - [x] 4.4 Si un drift est détecté, résoudre par `npx prisma migrate resolve` ou reset local uniquement si acceptable ; ne jamais modifier une migration déjà appliquée en prod
  - [x] 4.5 Lancer `npx prisma generate` et vérifier que le client Prisma compile

- [x] Task 5 : Étendre le schéma de validation `subscriptionCreateSchema` (AC : #3)
  - [x] 5.1 Modifier `src/lib/validations.ts` : ajouter `provider` optionnel de type `z.enum(["BANK_TRANSFER", "WAVE", "ORANGE_MONEY"])` avec défaut `"BANK_TRANSFER"`
  - [x] 5.2 Ajouter `providerPhone` optionnel : validation conditionnelle requise si `provider` est `WAVE` ou `ORANGE_MONEY`
  - [x] 5.3 Règle de validation du numéro mobile money :
    - format international (E.164) : regex `/^\+[1-9]\d{7,14}$/` ou utilisation d'une librairie si ajoutée
    - pays supportés : Côte d'Ivoire (`+225`), Sénégal (`+221`), Burkina Faso (`+226`), Mali (`+223`), Bénin (`+229`), Togo (`+228`), Niger (`+227`), Guinée-Bissau (`+245`), Ghana (`+233`), Guinée (`+224`), Cap-Vert (`+238`)
    - message d'erreur en français : "Veuillez saisir un numéro mobile money international valide (ex. +225 01 23 45 67)."
  - [x] 5.4 Valider que `providerPhone` est `null` ou `undefined` si `provider === "BANK_TRANSFER"`
  - [x] 5.5 Exporter `SubscriptionCreateInput` mis à jour

- [x] Task 6 : Mettre à jour l'API de création d'abonnement pour mobile money (AC : #2, #3)
  - [x] 6.1 Modifier `src/app/api/subscriptions/route.ts` :
    - accepter `provider` et `providerPhone` via `subscriptionCreateSchema`
    - si `provider` est `WAVE` ou `ORANGE_MONEY`, créer l'abonnement avec `status: "TRIAL"` (pas `PENDING` — conforme Story 11.4 / FR63)
    - stocker `providerPhone` sur la `Subscription`
    - conserver `providerRef` généré (`IBC-${userId}-${tier}`)
    - créer le `Payment` associé avec le même `provider` et `providerRef`
  - [x] 6.2 S'assurer que le flux virement bancaire reste inchangé (`provider: "BANK_TRANSFER"`, `status: "PENDING"`, `providerPhone: null`)
  - [x] 6.3 Conserver le format de réponse `{ data: { subscription, payment } }`

- [x] Task 7 : Tests unitaires et d'intégration (AC : #1, #2, #3)
  - [x] 7.1 Créer/mettre à jour `src/app/api/subscriptions/route.test.ts` :
    - création d'abonnement `WAVE` avec `providerPhone` valide → statut `TRIAL`, `provider: "WAVE"`, `providerPhone` stocké
    - création d'abonnement `ORANGE_MONEY` avec `providerPhone` valide → statut `TRIAL`, `provider: "ORANGE_MONEY"`, `providerPhone` stocké
    - refus 400 si `providerPhone` manquant pour `WAVE`/`ORANGE_MONEY`
    - refus 400 si `providerPhone` invalide (format national ou pays non supporté)
    - refus 400 si `providerPhone` fourni pour `BANK_TRANSFER`
    - vérifier que `BANK_TRANSFER` conserve `status: "PENDING"` et `providerPhone: null`
  - [x] 7.2 Créer des tests pour la validation Zod dans `src/lib/validations.test.ts` (si le fichier existe ; sinon le créer) :
    - `providerPhone` +225 valide
    - `providerPhone` +33 rejeté (pays non supporté)
    - `providerPhone` `01234567` rejeté (pas de +)
    - `providerPhone` manquant pour `WAVE` → erreur

- [x] Task 8 : Vérifications finales
  - [x] 8.1 Lancer `npm run test` (Vitest) : tous les tests passent
  - [x] 8.2 Lancer `npm run build` : build Next.js passe sans erreur TypeScript liée au schéma Prisma
  - [x] 8.3 Lancer `npx prisma migrate dev` une deuxième fois : aucune nouvelle migration ne doit être générée (drift vérifié)
  - [x] 8.4 Vérifier que `git diff` ne contient pas de fichier `.db`, `.sqlite3`, `.env` ou de migration non voulue

## Dev Notes

### Contexte métier critique

Cette story est **uniquement backend/modèle** : elle prépare le terrain pour Story 11.4 (UI sélection paiement) et Story 11.5 (validation admin mobile money). Conformément au Sprint Change Proposal (§4.2, §4.3) :

- L'enum `PaymentProvider` passe de `[BANK_TRANSFER]` à `[BANK_TRANSFER, WAVE, ORANGE_MONEY]`.
- Le modèle `Subscription` reçoit un champ `providerPhone String?` pour stocker le numéro mobile money.
- Le flux reste **manuel** : aucune intégration API Wave ou Orange Money, pas de webhook, pas de paiement automatique. Le membre recevra des instructions manuelles (numéro à appeler / code USSD) dans Story 11.4 ; l'admin validera manuellement dans Story 11.5 (même workflow virement : TRIAL → ACTIVE).
- L'AC #3 mentionne une UI de champ "Numéro de téléphone mobile money" : cette story ne construit **PAS** la page. Elle doit cependant fournir la validation côté API (Zod) et le champ en base pour que Story 11.4 puisse consommer le contrat sans modifications de schéma.

### Scope strictement limité

- **IN scope** : Prisma enum + champ, migration additive, validation Zod, API route adaptée, tests.
- **OUT of scope** : tout composant UI, page `/dashboard/subscribe`, instructions Wave/Orange Money, icônes, couleurs, validation admin visuelle, email mobile money. Ces éléments appartiennent aux stories 11.4 et 11.5.
- **Ne PAS** modifier `src/components/bank-transfer-instructions.tsx` ni la page `/dashboard/subscribe` dans cette story.
- **Ne PAS** ajouter de dépendance de paiement tiers (Stripe, CinetPay, Wave SDK, Orange Money SDK) — interdit par l'architecture (architecture.md §Core Decisions, §Anti-patterns).

### Schéma Prisma — modifications attendues

```prisma
enum PaymentProvider {
  BANK_TRANSFER
  WAVE
  ORANGE_MONEY
}

model Subscription {
  id            String             @id @default(cuid())
  userId        String
  tier          Tier
  period        String             // MONTHLY | ANNUAL
  provider      PaymentProvider    @default(BANK_TRANSFER)
  providerPhone String?            // Numéro mobile money (WAVE / ORANGE_MONEY)
  providerRef   String?            // External reference from the payment provider
  status        SubscriptionStatus @default(TRIAL)
  startDate     DateTime
  endDate       DateTime?
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("subscriptions")
}
```

**Pitfall #40 — `@map()`** : le schéma actuel n'utilise pas `@map` sur `providerPhone`. Si un mapping personnalisé est ajouté (`@map("provider_phone")`), vérifier impérativement que Prisma ne génère pas un `RENAME COLUMN` pour les migrations existantes. Avec un champ **nouveau**, `@map` est acceptable car il n'y a pas de colonne existante à renommer.

**Pitfall #42 — migration additive** : la migration doit être générée avec `npx prisma migrate dev --name add_mobile_money_providers`. Le SQL généré doit ressembler à :

```sql
-- SQLite (dev)
ALTER TABLE "subscriptions" ADD COLUMN "providerPhone" TEXT;
-- Prisma gère l'extension d'enum nativement ; en SQLite les enums sont TEXT, donc aucun ALTER TYPE n'est requis
```

Pour PostgreSQL (prod), Prisma génèrera `ALTER TYPE "PaymentProvider" ADD VALUE 'WAVE';` et `ALTER TYPE "PaymentProvider" ADD VALUE 'ORANGE_MONEY';` plus `ALTER TABLE "subscriptions" ADD COLUMN "providerPhone" TEXT;`. Vérifier manuellement le fichier généré avant commit.

### Architecture & patterns à suivre

- **Prisma 7** : importer `prisma` depuis `@/lib/prisma`. Le client généré est dans `src/generated/prisma`. Toujours exécuter `npx prisma generate` après modification du schéma.
- **Validation** : Zod dans `src/lib/validations.ts` ; réutiliser les patterns existants (`subscriptionCreateSchema`, `profileUpdateSchema` pour la regex téléphone).
- **API routes** : Next.js App Router `route.ts` ; format de réponse `{ data: T }` ; erreurs avec `sanitizeError`.
- **Tests** : Vitest + `@testing-library/react` si composant ; tests d'API en mockant `@/lib/prisma` et `@/lib/auth` (voir `route.test.ts` existants).
- **Base de données** : dev = SQLite via `prisma/schema.dev.prisma` + `prisma/migrations` ; prod = PostgreSQL via `prisma/schema.prisma` + `prisma/migrations-postgresql` (à créer si l'équipe utilise déjà le dossier dédié — actuellement `migrations-postgresql` n'existe pas, donc la migration SQLite est suffisante pour le repo local).
- **Git** : ne jamais committer de fichier `.db`, `.sqlite3`, `.env`, ou de migration modifiée après application.

### Validation du numéro mobile money

L'AC #3 impose :

1. **Format international** : E.164 recommandé (`+22501234567`). La regex `/^\+[1-9]\d{7,14}$/` est un minimum ; elle peut être affinée dans Story 11.4 si besoin UX.
2. **Pays supportés** : UEMOA + Ghana + Guinée. Liste des indicatifs acceptés : `+225`, `+221`, `+226`, `+223`, `+229`, `+228`, `+227`, `+245`, `+233`, `+224`, `+238`.

Option : utiliser `google-libphonenumber` si une validation plus robuste est jugée nécessaire. Avantages : parsing E.164 fiable, validation de longueur par pays. Inconvénients : dépendance supplémentaire. Pour cette story, une regex + liste blanche d'indicatifs est suffisante et évite d'ajouter une librairie. Si le dev agent choisit d'ajouter `google-libphonenumber`, il doit :
- l'ajouter dans `package.json`
- créer une fonction dédiée dans `src/lib/phone-validation.ts`
- couvrir les tests pour les pays UEMOA + Ghana + Guinée

### Anti-patterns à éviter

1. **NE PAS** modifier le type `provider` des modèles `Subscription`/`Payment` en `String` : rester sur l'enum `PaymentProvider`.
2. **NE PAS** stocker `providerPhone` sur le modèle `Payment` : c'est un attribut de l'abonnement, pas de la transaction.
3. **NE PAS** créer de nouvelles routes API dans cette story : seul `src/app/api/subscriptions/route.ts` est mis à jour.
4. **NE PAS** créer de table `MobileMoneyProvider` séparée : deux valeurs d'enum suffisent.
5. **NE PAS** changer le statut par défaut de `BANK_TRANSFER` : il reste `PENDING` à la création.
6. **NE PAS** rendre `providerPhone` obligatoire globalement : il ne doit être requis que pour `WAVE`/`ORANGE_MONEY`.
7. **NE PAS** recréer la table `subscriptions` dans la migration (pitfall #42).
8. **NE PAS** oublier d'aligner `prisma/schema.dev.prisma` et `prisma/schema.prisma`.

### File Structure

Fichiers à MODIFIER :
- `prisma/schema.prisma` — enum + champ
- `prisma/schema.dev.prisma` — enum + champ
- `src/lib/validations.ts` — `subscriptionCreateSchema`
- `src/app/api/subscriptions/route.ts` — logique `provider`/`providerPhone`
- `src/app/api/subscriptions/route.test.ts` — tests mobile money

Fichiers à CRÉER (si absent) :
- `prisma/migrations/YYYYMMDDHHMMSS_add_mobile_money_providers/migration.sql` — via `npx prisma migrate dev`
- `src/lib/validations.test.ts` — tests Zod si non existant

Fichiers à LIRE pour le contexte (NE PAS modifier sauf indication) :
- `prisma/schema.prisma` et `prisma/schema.dev.prisma`
- `src/lib/validations.ts`
- `src/app/api/subscriptions/route.ts`
- `src/app/api/admin/subscriptions/[id]/route.ts`
- `src/app/(admin)/admin/subscriptions/page.tsx`
- `src/lib/bank-transfer-config.ts`
- `src/components/bank-transfer-instructions.tsx`
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-18.md` §4.2, §4.3, §Story 11.3
- `_bmad-output/planning-artifacts/architecture.md` §Data Architecture, §API Patterns

### References

- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-06-18.md#Story 11.3] — AC et scope backend
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-06-18.md#4.2] — modifications schéma Prisma
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-06-18.md#4.3] — extension module Paiement
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture] — modèle de données et Prisma 7
- [Source: _bmad-output/planning-artifacts/architecture.md#API Patterns] — route handlers et format de réponse
- [Source: _bmad-output/planning-artifacts/prd.md#8.2 Tiers & Abonnements] — FR8–FR14 (base virement bancaire)
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-06-18.md#Paiement Mobile Money] — FR61, FR62, FR63
- [Source: prisma/schema.prisma] — modèles Subscription/Payment existants
- [Source: src/lib/validations.ts] — subscriptionCreateSchema actuel
- [Source: src/app/api/subscriptions/route.ts] — API subscription existante
- [Source: src/app/api/subscriptions/route.test.ts] — patterns de tests existants
- [Source: _bmad-output/implementation-artifacts/sprint-status.yaml] — status tracking

## Dev Agent Record

### Agent Model Used

kimi-k2.7-code (ollama-cloud)

### Debug Log References

- Clean baseline : 704 tests passent, build OK (commit `23d660e`).
- Story 11.2 a créé une migration additive SQLite (`add_onboarding_form`) : référence pour le pattern de migration sûre.
- Le repo utilise actuellement `prisma/migrations` (SQLite) ; `prisma/migrations-postgresql` n'existe pas encore.
- Build with SQLite DATABASE_URL fails due to a pre-existing schema/provider mismatch in the generated client (provider `postgres` vs adapter `sqlite`). Re-running `npx prisma generate` with `PRISMA_SCHEMA=prisma/schema.prisma DATABASE_URL=postgresql://...` allows the build to complete, confirming no TypeScript/schema error introduced by this story.

### Completion Notes List

- [x] Schéma Prisma modifié (`PaymentProvider` + `providerPhone`) et aligné entre `schema.prisma` et `schema.dev.prisma`.
- [x] Migration additive générée avec `npx prisma migrate dev --name add_mobile_money_providers` et vérifiée (pas de `DROP TABLE`).
- [x] `npx prisma generate` exécuté avec succès.
- [x] `subscriptionCreateSchema` mis à jour avec validation conditionnelle de `providerPhone`.
- [x] `src/app/api/subscriptions/route.ts` mis à jour pour `WAVE`/`ORANGE_MONEY` → statut `TRIAL` + `providerPhone` stocké.
- [x] Tests ajoutés/couverts pour les nouveaux providers et la validation du numéro.
- [x] `npx vitest run` passe (719 tests).
- [x] `npm run build` passe après régénération du client Prisma avec PostgreSQL schema (pas d'erreur liée au schéma).
- [x] Aucun fichier `.db`, `.sqlite3`, `.env` ni migration modifiée post-application dans le diff.

### File List

- `prisma/schema.prisma`
- `prisma/schema.dev.prisma`
- `prisma/migrations/20260618111153_add_mobile_money_providers/migration.sql`
- `src/lib/validations.ts`
- `src/lib/validations.test.ts`
- `src/app/api/subscriptions/route.ts`
- `src/app/api/subscriptions/route.test.ts`
- `_bmad-output/implementation-artifacts/story-11-3-modele-paiement-mobile-money.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
