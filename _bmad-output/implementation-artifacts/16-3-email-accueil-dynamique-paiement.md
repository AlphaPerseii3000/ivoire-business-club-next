---
baseline_commit: ecb660bd8a8a51f1b5f8cd55a19d63da70b6a5443
---

# Story 16.3 : Email d'accueil dynamique selon le mode de paiement

Status: done

<!-- Note : la validation est optionnelle. Lancer validate-create-story avant dev-story si souhaité. -->

## Story

En tant que nouveau membre IBC,
Je veux que l'email d'accueil contienne les instructions de paiement correspondant au mode que j'ai choisi (virement bancaire, Wave, ou Orange Money),
Afin que je sache exactement comment finaliser mon adhésion sans devoir chercher l'information sur le site.

## Acceptance Criteria

1. **AC1 — L'email d'accueil post-sélection de paiement est dynamique**
   - **Given** un membre qui vient de choisir son tier et son mode de paiement sur `/pricing` (API `POST /api/subscriptions`)
   - **When** la souscription est créée
   - **Then** un email d'accueil est envoyé avec `paymentProvider` correspondant au choix du membre (`BANK_TRANSFER`, `WAVE`, ou `ORANGE_MONEY`)
   - **And** le `tier` dans l'email correspond au tier choisi (pas `AFFRANCHI` par défaut)
   - **And** les instructions de paiement correspondent au provider (IBAN pour virement, numéro marchand Wave/Orange Money + référence)
   - **And** le `providerPhone` est inclus si le membre a fourni un numéro mobile money

2. **AC2 — L'email d'accueil post-inscription reste générique (sans instructions de paiement)**
   - **Given** un membre qui vient de s'inscrire (signup ou Google OAuth)
   - **When** l'email de bienvenue est envoyé
   - **Then** il ne contient **pas** d'instructions de paiement spécifiques (le membre n'a pas encore choisi son tier ni son mode de paiement)
   - **And** le `tier` affiché est `AFFRANCHI` (par défaut, comme actuellement)
   - **And** l'email invite le membre à choisir son abonnement dans son espace membre
   - **And** l'email inclut le lien vers `/pricing`

3. **AC3 — Non-doublon**
   - **Given** un membre qui reçoit l'email de bienvenue post-inscription
   - **When** il choisit ensuite son mode de paiement sur `/pricing`
   - **Then** l'email d'accueil dynamique (post-sélection) est envoyé une seule fois
   - **And** le membre ne reçoit pas l'email de bienvenue post-inscription à nouveau

4. **AC4 — Extraction du corps d'email dans `sendWelcomeEmail`**
   - **Given** la fonction `sendWelcomeEmail`
   - **When** elle est appelée sans `paymentProvider` (ou avec `paymentProvider = null`)
   - **Then** le corps de l'email ne contient aucune section "Pour finaliser votre adhésion, merci d'effectuer..."
   - **And** le corps contient à la place un lien vers `/pricing` : "Choisissez votre formule d'abonnement dans votre espace membre : {appUrl}/pricing"

5. **AC5 — Tests**
   - **Given** les tests unitaires
   - **When** ils s'exécutent
   - **Then** les tests vérifient que `sendWelcomeEmail` avec `paymentProvider = "WAVE"` génère les instructions Wave
   - **And** les tests vérifient que `sendWelcomeEmail` avec `paymentProvider = "ORANGE_MONEY"` génère les instructions Orange Money
   - **And** les tests vérifient que `sendWelcomeEmail` sans `paymentProvider` ne génère pas de section paiement mais inclut le lien `/pricing`
   - **And** les tests vérifient que l'API `POST /api/subscriptions` appelle `sendWelcomeEmail` avec le bon `paymentProvider` et `tier`
   - **And** les tests existants de signup sont mis à jour : l'email post-inscription ne contient plus de section paiement

## Tasks / Subtasks

- [x] Task 1 : Adapter la signature et la logique de `sendWelcomeEmail` (AC: #1, #2, #4)
  - [x] 1.1 Changer la signature : `paymentProvider?: "BANK_TRANSFER" | "WAVE" | "ORANGE_MONEY" | null` et default à `null` au lieu de `"BANK_TRANSFER"`
  - [x] 1.2 Si `paymentProvider` est défini et non-null : générer la section paiement correspondante (virement ou mobile money)
  - [x] 1.3 Si `paymentProvider` est absent ou `null` : ne PAS inclure de section "Pour finaliser votre adhésion, merci d'effectuer..."
  - [x] 1.4 Si `paymentProvider` est absent ou `null` : inclure le lien `/pricing` "Choisissez votre formule d'abonnement dans votre espace membre : {appUrl}/pricing"
  - [x] 1.5 Pour virement : afficher IBAN/BIC/adresse banque si configurés
  - [x] 1.6 Pour Wave/Orange Money : afficher `Numéro marchand {label}`, `Depuis votre numéro {label} : {providerPhone}` (si fourni), `Référence du transfert : IBC-{userId}-{tier}`, et les lignes d'instruction depuis `MOBILE_MONEY_CONFIG`
  - [x] 1.7 Adapter le message d'introduction : post-inscription = "Vous démarrez avec le tier {label} (plan par défaut). Vous pourrez choisir votre abonnement définitif dans votre espace membre." ; post-sélection = message de bienvenue avec tier choisi et instructions de paiement

- [x] Task 2 : Mettre à jour les appelants post-inscription pour ne plus forcer `BANK_TRANSFER` (AC: #2)
  - [x] 2.1 Dans `src/app/api/auth/signup/route.ts` L74 : conserver l'appel `sendWelcomeEmail` sans `paymentProvider` et s'assurer que le default est `null`
  - [x] 2.2 Dans `src/lib/auth.ts` L116 : conserver l'appel `sendWelcomeEmail` sans `paymentProvider` et s'assurer que le default est `null`
  - [x] 2.3 Vérifier que les deux appelants continuent de passer `tier: "AFFRANCHI"` et `userId`

- [x] Task 3 : Déclencher l'email dynamique depuis `POST /api/subscriptions` (AC: #1, #3)
  - [x] 3.1 Dans `src/app/api/subscriptions/route.ts`, après la création réussie de la subscription (L80, après la transaction), appeler `sendWelcomeEmail` dans un bloc try/catch non-bloquant
  - [x] 3.2 Passer à `sendWelcomeEmail` : `to: user.email`, `name: user.name`, `tier: subscription.tier`, `paymentProvider: subscription.provider`, `providerPhone: subscription.providerPhone`, `userId: user.id`
  - [x] 3.3 Récupérer l'utilisateur via `tx.user.findUnique` ou `prisma.user.findUnique` selon le pattern du projet ; utiliser le `userId` de la session
  - [x] 3.4 **Guardrail transaction :** si la transaction Prisma échoue (catch retourne 500), ne pas envoyer d'email ; l'email doit être envoyé seulement après succès de `prisma.$transaction`
  - [x] 3.5 L'envoi est non-bloquant : si l'email échoue, logger l'erreur et ne pas impacter la réponse 201

- [x] Task 4 : Mettre à jour les tests unitaires (AC: #5)
  - [x] 4.1 Dans `src/lib/email.test.ts` :
    - Mettre à jour le test existant "sends welcome email with tier label, profile link and payment instructions" : sans `paymentProvider`, le corps ne doit plus contenir de section paiement, mais doit contenir le lien `/pricing` et le texte "Choisissez votre formule d'abonnement"
    - Ajouter un test avec `paymentProvider: "BANK_TRANSFER"` : section virement et IBAN présents
    - Ajouter/renforcer le test Wave existant : vérifier `paymentProvider: "WAVE"`, `providerPhone`, `userId`, `tier` et instructions Wave
    - Ajouter/renforcer le test Orange Money existant : vérifier `paymentProvider: "ORANGE_MONEY"`, `providerPhone`, `userId`, `tier` et instructions Orange Money
    - Ajouter un test avec `paymentProvider: null` : pas de section "Pour finaliser votre adhésion", mais présence du lien `/pricing`
  - [x] 4.2 Dans `src/app/api/auth/signup/route.test.ts` :
    - Mettre à jour les assertions `sendWelcomeEmail` pour ne plus s'attendre à de section paiement
    - Vérifier que l'appel se fait sans `paymentProvider` (donc default `null`)
  - [x] 4.3 Dans `src/app/api/subscriptions/route.test.ts` :
    - Mocker `sendWelcomeEmail` depuis `@/lib/email`
    - Vérifier que `POST` appelle `sendWelcomeEmail` avec `paymentProvider`, `tier`, `providerPhone`, `userId` après création d'un abonnement
    - Vérifier que `sendWelcomeEmail` n'est pas appelé si la transaction échoue (test 500 DB down)

- [x] Task 5 : Vérifications finales
  - [x] 5.1 Lancer `npm run lint` et corriger les erreurs dans les fichiers modifiés
  - [x] 5.2 Lancer `npm run test -- src/lib/email.test.ts src/app/api/auth/signup/route.test.ts src/app/api/subscriptions/route.test.ts`
  - [x] 5.3 Lancer `npm run build` pour vérifier la compilation

## Dev Notes

### Contexte métier critique

La fonction `sendWelcomeEmail` supporte déjà 3 modes de paiement (`BANK_TRANSFER`, `WAVE`, `ORANGE_MONEY`) avec des instructions dédiées. Cependant, les deux appelants actuels (signup route + Google OAuth) ne passent jamais `paymentProvider` ni `tier` réel — tout est hardcodé `AFFRANCHI` + default `BANK_TRANSFER`. Cela crée une expérience dégradée :

- L'utilisateur reçoit un email avec des instructions de virement bancaire alors qu'il n'a pas encore choisi son mode de paiement.
- Le tier affiché est toujours `AFFRANCHI`, même après avoir choisi `GRAND_FRERE` ou `BOSS`.
- Après avoir choisi Wave/Orange Money sur `/pricing`, aucun email ne lui donne les instructions spécifiques.

Cette story corrige le comportement en différenciant clairement :

1. **Email post-inscription** : générique, sans instructions de paiement, incite à choisir un abonnement sur `/pricing`.
2. **Email post-sélection de paiement** : dynamique, avec le tier choisi et les instructions du provider choisi.

### Divergence code actuel vs SCP

Le SCP indique des lignes précises (L74 signup, L116 auth.ts, L80 subscriptions). Vérifier que les fichiers n'ont pas été modifiés entre le baseline et l'exécution. Les numéros de ligne sont donnés à titre indicatif.

### Architecture & patterns à suivre

- **Next.js 16 App Router** : `src/app/api/subscriptions/route.ts` reste une route API server-side.
- **Auth.js v5** : utiliser `auth()` depuis `src/lib/auth.ts` pour obtenir `session.user.id`.
- **Prisma 7** : importer `prisma` depuis `@/lib/prisma`. La création de subscription et de payment est déjà dans une transaction `prisma.$transaction` — conserver ce pattern et envoyer l'email **après** la transaction.
- **Email** : infrastructure nodemailer/SMTP Infomaniak dans `src/lib/email.ts` (PAS Resend). Réutiliser `sendWelcomeEmail`, `sendEmail`, `greeting`, `tierLabel`, `dashboardLine`.
- **Mobile money** : utiliser `MOBILE_MONEY_CONFIG` et `formatMobileMoneyReference` depuis `src/lib/mobile-money-config.ts`. Ne PAS hardcoder les numéros marchand dans `email.ts`.
- **Configuration** : les variables d'environnement `BANK_TRANSFER_IBAN`, `BANK_TRANSFER_BIC`, `BANK_TRANSFER_BANK_ADDRESS`, `ADHESION_CONTRACT_URL`, `APP_URL`, `NEXT_PUBLIC_WAVE_MERCHANT_NUMBER`, `NEXT_PUBLIC_ORANGE_MONEY_MERCHANT_NUMBER` existent déjà.
- **JSX guardrail** : cette story est backend-only, mais si un UI est touché, ne JAMAIS utiliser `&&` dans JSX — toujours des ternaires.

### Anti-patterns à éviter

1. **NE PAS** laisser `paymentProvider` défaut à `"BANK_TRANSFER"` dans `sendWelcomeEmail`. Le default doit être `null`.
2. **NE PAS** appeler `sendWelcomeEmail` à l'intérieur de la transaction Prisma dans `POST /api/subscriptions`. L'email est un effet secondaire : il doit être envoyé après succès de la transaction.
3. **NE PAS** rendre l'envoi de l'email bloquant pour la réponse 201. Utiliser un try/catch non-bloquant comme dans signup.
4. **NE PAS** envoyer l'email dynamique si la subscription est en échec. Si la transaction throw, le code atteint le catch et retourne 500 — l'email ne doit pas être envoyé.
5. **NE PAS** hardcoder des numéros marchand Wave/Orange Money dans `email.ts`. Utiliser `MOBILE_MONEY_CONFIG`.
6. **NE PAS** modifier le schéma Prisma — tous les champs et enums existent déjà.
7. **NE PAS** envoyer l'email de bienvenue post-inscription à nouveau lors du choix de paiement. L'appel dans `POST /api/subscriptions` est un nouvel email distinct avec un sujet et un corps différents.
8. **NE PAS** utiliser `&&` dans JSX (guardrail #31) si un composant UI est modifié.

### Choix techniques

- **Default `paymentProvider = null`** : un seul paramètre contrôle le comportement. `null`/`undefined` = post-inscription générique. `"BANK_TRANSFER"|"WAVE"|"ORANGE_MONEY"` = post-sélection dynamique.
- **Email post-inscription avec lien `/pricing`** : guide l'utilisateur vers le prochain pas. Le lien vers `/onboarding/complete-profile` peut être conservé ou remplacé par `/pricing` selon la décision produit ; le SCP exige explicitement le lien `/pricing` et le texte "Choisissez votre formule d'abonnement dans votre espace membre : {appUrl}/pricing".
- **Récupération du user dans `POST /api/subscriptions`** : la session fournit `userId` mais pas `email`/`name`. Récupérer `user.email`, `user.name` via `prisma.user.findUnique` (hors transaction ou dans la transaction si besoin). L'email peut être envoyé avec les seules données de session si on inclut `name`/`email` dans le JWT, mais le pattern actuel utilise `prisma.user.findUnique`.
- **Non-bloquant** : l'envoi d'email est une opération d'observabilité/métier asynchrone. Un échec SMTP ne doit jamais retourner une erreur au membre qui vient de créer son abonnement.

### File Structure

Fichiers à MODIFIER :
- `src/lib/email.ts` — changer la signature de `sendWelcomeEmail`, rendre `paymentProvider` nullable, ajuster le corps post-inscription (lien `/pricing`) et post-sélection (instructions dynamiques)
- `src/app/api/auth/signup/route.ts` — optionnel : s'assurer que l'appel `sendWelcomeEmail` n'a pas de `paymentProvider` (déjà le cas, mais vérifier le default)
- `src/lib/auth.ts` — optionnel : idem, s'assurer que l'appel Google OAuth n'a pas de `paymentProvider`
- `src/app/api/subscriptions/route.ts` — appeler `sendWelcomeEmail` après la transaction avec `paymentProvider`, `tier`, `providerPhone`, `userId`
- `src/lib/email.test.ts` — mettre à jour les tests existants et ajouter les cas `BANK_TRANSFER`, `null`, et vérifier le lien `/pricing`
- `src/app/api/auth/signup/route.test.ts` — mettre à jour les assertions
- `src/app/api/subscriptions/route.test.ts` — ajouter un mock `sendWelcomeEmail` et vérifier l'appel post-sélection

Fichiers à LIRE pour le contexte :
- `src/lib/mobile-money-config.ts` — configuration Wave/Orange Money
- `src/lib/tier-config.ts` — labels des tiers (utilisé par `tierLabel`)
- `src/app/api/subscriptions/route.test.ts` — patterns de mock transactionnel
- `_bmad-output/implementation-artifacts/11-1-email-accueil-post-inscription.md` — contexte de la story ayant créé `sendWelcomeEmail`
- `_bmad-output/implementation-artifacts/11-3-modele-paiement-mobile-money.md` — contexte mobile money backend
- `_bmad-output/implementation-artifacts/11-4-ui-selection-paiement-multi-provider.md` — contexte UI de sélection de provider

### References

- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-06-28.md#Story 16.3] — AC complets et technical notes
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-06-28.md#6. Impact sur le PRD] — FR-SYNC3, FR-SYNC4
- [Source: src/lib/email.ts] — implémentation actuelle de `sendWelcomeEmail`
- [Source: src/app/api/auth/signup/route.ts] — flow signup actuel
- [Source: src/lib/auth.ts] — flow Google OAuth actuel
- [Source: src/app/api/subscriptions/route.ts] — API création d'abonnement
- [Source: src/lib/mobile-money-config.ts] — config Wave/Orange Money
- [Source: src/lib/email.test.ts] — tests email existants
- [Source: _bmad-output/implementation-artifacts/16-1-sync-onboarding-to-user.md] — story précédente dans l'epic 16
- [Source: _bmad-output/implementation-artifacts/16-2-migration-retroactive-members.md] — story précédente dans l'epic 16
- [Source: _bmad-output/implementation-artifacts/11-1-email-accueil-post-inscription.md] — story ayant créé `sendWelcomeEmail`
- [Source: _bmad-output/implementation-artifacts/11-3-modele-paiement-mobile-money.md] — mobile money backend
- [Source: _bmad-output/implementation-artifacts/11-4-ui-selection-paiement-multi-provider.md] — UI sélection de paiement

## Dev Agent Record

### Agent Model Used

Kimi K2.7 Code (via Hermes delegate_task)

### Debug Log References

### Completion Notes List

- Updated `sendWelcomeEmail` in `src/lib/email.ts` : `paymentProvider` is now nullable with default `null`; post-signup emails include `/pricing` CTA and no payment instructions; post-subscription emails include dynamic payment instructions for the selected provider and tier.
- Confirmed `src/app/api/auth/signup/route.ts` and `src/lib/auth.ts` call `sendWelcomeEmail` without `paymentProvider`, keeping `tier: "AFFRANCHI"` and `userId`.
- Updated `src/app/api/subscriptions/route.ts` to call `sendWelcomeEmail` non-blockingly after successful transaction with `paymentProvider`, `tier`, `providerPhone`, and `userId`; transaction failure prevents the email.
- Updated/added unit tests in `src/lib/email.test.ts` (generic, BANK_TRANSFER, WAVE, ORANGE_MONEY, null cases), `src/app/api/auth/signup/route.test.ts`, and `src/app/api/subscriptions/route.test.ts`.
- All 985 tests pass, lint passes on modified files, and `npm run build` succeeds.

### File List

- Modified : `src/lib/email.ts`
- Modified : `src/app/api/subscriptions/route.ts`
- Modified : `src/lib/email.test.ts`
- Modified : `src/app/api/auth/signup/route.test.ts`
- Modified : `src/app/api/subscriptions/route.test.ts`
- Modified : `_bmad-output/implementation-artifacts/16-3-email-accueil-dynamique-paiement.md`
- Modified : `_bmad-output/implementation-artifacts/sprint-status.yaml`

