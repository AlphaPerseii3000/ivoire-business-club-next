# Story 11.4 : UI sélection paiement — Page tier avec choix multi-provider

Status: ready-for-dev

## Story

As a membre,
I want choisir mon moyen de paiement (virement, Wave, ou Orange Money),
so that payer avec le moyen le plus pratique pour moi.

## Acceptance Criteria

1. **Given** un membre sur la page de sélection de tier
   **When** il sélectionne un tier
   **Then** trois options de paiement s'affichent : Virement bancaire (par défaut), Wave, Orange Money

2. **Given** le membre choisit Virement bancaire
   **When** il valide
   **Then** les instructions de virement s'affichent (RIB KS Investment, montant, référence) — comportement existant inchangé

3. **Given** le membre choisit Wave
   **When** il saisit son numéro de téléphone et valide
   **Then** les instructions Wave s'affichent (numéro à appeler, montant, référence) et l'abonnement est créé en statut TRIAL avec `provider = WAVE`

4. **Given** le membre choisit Orange Money
   **When** il saisit son numéro de téléphone et valide
   **Then** les instructions Orange Money s'affichent (code USSD ou numéro, montant, référence) et l'abonnement est créé en statut TRIAL avec `provider = ORANGE_MONEY`

## Tasks / Subtasks

- [ ] Task 1 : Audit du code existant et delta-scoping (AC: #1, #2)
  - [ ] 1.1 Lire `src/app/(public)/pricing/page.tsx` — page publique de sélection de tier
  - [ ] 1.2 Lire `src/app/(public)/pricing/virement/page.tsx` — page d'instructions de virement existante
  - [ ] 1.3 Lire `src/components/pricing-tier-selection.tsx` — composant de sélection de tier
  - [ ] 1.4 Lire `src/components/bank-transfer-instructions.tsx` — instructions de virement existantes
  - [ ] 1.5 Lire `src/lib/bank-transfer-config.ts` — configuration RIB KS Investment
  - [ ] 1.6 Lire `src/app/api/subscriptions/route.ts` — API de création d'abonnement (vérifier support provider/providerPhone déjà ajouté par Story 11-3)
  - [ ] 1.7 Lire `src/lib/validations.ts` — `subscriptionCreateSchema` (vérifier champs provider/providerPhone déjà ajoutés par Story 11-3)
  - [ ] 1.8 Lire `prisma/schema.prisma` — confirmer `PaymentProvider` enum inclut WAVE et ORANGE_MONEY, `Subscription.providerPhone` existe

- [ ] Task 2 : Créer le composant sélecteur de moyen de paiement (AC: #1)
  - [ ] 2.1 Créer `src/components/payment-method-selector.tsx` — composant client avec 3 options : Virement bancaire (défaut), Wave, Orange Money
  - [ ] 2.2 Utiliser des icônes/badges distinctifs par provider (Wave = bleu, Orange Money = orange)
  - [ ] 2.3 Afficher le sélecteur après sélection du tier dans le flux de souscription
  - [ ] 2.4 Virement bancaire est sélectionné par défaut

- [ ] Task 3 : Champ numéro de téléphone mobile money conditionnel (AC: #3, #4)
  - [ ] 3.1 Ajouter un champ `providerPhone` qui s'affiche uniquement quand Wave ou Orange Money est sélectionné
  - [ ] 3.2 Validation : format numéro de téléphone international (ex: +225XXXXXXXXXX, +221XXXXXXXXXX)
  - [ ] 3.3 Le champ est requis uniquement si provider ≠ BANK_TRANSFER
  - [ ] 3.4 Message d'aide indiquant les pays supportés (Côte d'Ivoire, Sénégal, etc.)

- [ ] Task 4 : Instructions Wave (AC: #3)
  - [ ] 4.1 Créer `src/components/wave-instructions.tsx` — instructions de paiement Wave
  - [ ] 4.2 Afficher : numéro à appeler, montant de l'abonnement, référence de l'abonnement
  - [ ] 4.3 Créer `src/lib/mobile-money-config.ts` — configuration des numéros Wave/Orange Money (numéro marchand, codes USSD)

- [ ] Task 5 : Instructions Orange Money (AC: #4)
  - [ ] 5.1 Créer `src/components/orange-money-instructions.tsx` — instructions de paiement Orange Money
  - [ ] 5.2 Afficher : code USSD ou numéro à appeler, montant, référence
  - [ ] 5.3 Réutiliser la configuration de `src/lib/mobile-money-config.ts`

- [ ] Task 6 : Intégration dans le flux de souscription (AC: #1, #2, #3, #4)
  - [ ] 6.1 Modifier `src/app/(public)/pricing/page.tsx` ou `src/components/pricing-tier-selection.tsx` pour intégrer le `PaymentMethodSelector` après sélection du tier
  - [ ] 6.2 Si Virement bancaire → rediriger vers `/pricing/virement` (comportement existant inchangé, AC #2)
  - [ ] 6.3 Si Wave ou Orange Money → appeler `POST /api/subscriptions` avec `provider` et `providerPhone`, puis afficher les instructions correspondantes
  - [ ] 6.4 L'API crée l'abonnement en statut TRIAL avec le bon provider (déjà implémenté par Story 11-3)

- [ ] Task 7 : Tests unitaires (AC: #1, #2, #3, #4)
  - [ ] 7.1 Test : `PaymentMethodSelector` affiche 3 options par défaut
  - [ ] 7.2 Test : Virement bancaire sélectionné par défaut
  - [ ] 7.3 Test : champ téléphone apparaît quand Wave sélectionné
  - [ ] 7.4 Test : champ téléphone apparaît quand Orange Money sélectionné
  - [ ] 7.5 Test : champ téléphone masqué quand Virement sélectionné
  - [ ] 7.6 Test : validation format numéro de téléphone (valides et invalides)
  - [ ] 7.7 Test : soumission Wave crée abonnement avec provider=WAVE et providerPhone
  - [ ] 7.8 Test : soumission Orange Money crée abonnement avec provider=ORANGE_MONEY et providerPhone
  - [ ] 7.9 Test : soumission Virement garde le comportement existant (pas de providerPhone)

## Dev Notes

### Contexte critique / Already completed (Story 11-3)

Story 11-3 a déjà implémenté :
- **Schéma Prisma** : `PaymentProvider` enum étendu avec `WAVE` et `ORANGE_MONEY`
- **Schéma Prisma** : champ `providerPhone String?` ajouté au modèle `Subscription`
- **Validation Zod** : `subscriptionCreateSchema` étendu avec `provider` et `providerPhone` optionnels
- **API route** : `POST /api/subscriptions` accepte `provider` et `providerPhone`, crée l'abonnement en TRIAL avec le bon provider
- **Migration** : migration additive appliquée

Story 11-4 est une story **UI-only** : le delta est l'interface de sélection du moyen de paiement dans le flux de souscription existant. Aucune modification de schéma, migration, ou logique API backend n'est nécessaire — sauf si l'audit révèle que l'API ne gère pas correctement les cas Wave/Orange Money.

### Divergence SCP vs code réel

Le SCP mentionne `/dashboard/subscribe` comme "page de sélection de tier", mais le code réel utilise `/pricing` (page publique) puis `/pricing/virement` (instructions de virement). Ne pas créer de nouvelle route `/dashboard/subscribe` — étendre la page `/pricing` existante avec le sélecteur multi-provider.

### Architecture patterns

- **Composant client** : `PaymentMethodSelector` doit être un composant client (`'use client'`) car il gère l'état de sélection
- **Composants shadcn/ui disponibles** : `Select`, `RadioGroup`, `Input`, `Label`, `Button`, `Card`, `Tabs` — utiliser `RadioGroup` ou `Tabs` pour le sélecteur de provider
- **Guards d'accès** : La page `/pricing` est publique (pas de `getUserPremiumAccess` nécessaire). Cependant, la soumission de l'abonnement nécessite une session authentifiée — vérifier que l'API route `POST /api/subscriptions` valide la session.
- **Next.js 16 guardrail** : Toujours utiliser des ternaires `condition ? <Component /> : null` au lieu de `condition && <Component />` en JSX. Précalculer les expressions booléennes composées en `const` avant le return JSX.

### Configuration mobile money

Créer `src/lib/mobile-money-config.ts` avec :
- Numéro marchand Wave (à confirmer avec KS Investment / IBC)
- Numéro/code USSD Orange Money (à confirmer)
- Pays supportés pour la validation du numéro de téléphone

### Testing standards

- Tests Vitest co-localisés (`.test.tsx` à côté du composant)
- Tests d'API : mocker `auth()`, `prisma`, et les helpers de session
- Tests de validation : `subscriptionCreateSchema` avec provider/providerPhone

### References

- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-06-18.md#Story11.4] — ACs
- [Source: _bmad-output/implementation-artifacts/story-11-3-modele-paiement-mobile-money.md] — prérequis backend
- [Source: src/app/(public)/pricing/page.tsx] — page de pricing existante
- [Source: src/app/(public)/pricing/virement/page.tsx] — page virement existante
- [Source: src/components/pricing-tier-selection.tsx] — composant sélection tier
- [Source: src/components/bank-transfer-instructions.tsx] — instructions virement
- [Source: src/app/api/subscriptions/route.ts] — API création abonnement
- [Source: src/lib/validations.ts] — validation schemas

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
