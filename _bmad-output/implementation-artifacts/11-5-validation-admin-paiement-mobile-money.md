# Story 11.5 : Validation admin des paiements mobile money

Status: done
_baseline_commit: 7c597726e44df30b58bab1c7bb679fda60a6a269

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a admin,
I want valider manuellement un paiement Wave ou Orange Money,
so that activer l'abonnement du membre après confirmation de réception.

## Acceptance Criteria

1. **Given** un abonnement en TRIAL avec `provider = WAVE` ou `ORANGE_MONEY`
   **When** l'admin consulte le tableau de bord des abonnements
   **Then** le provider de paiement est affiché avec une icône distinctive (Wave = bleu, Orange Money = orange)

2. **Given** l'admin valide le paiement
   **When** il clique sur "Valider"
   **Then** l'abonnement passe de TRIAL → ACTIVE (même workflow que le virement bancaire existant)

## Tasks / Subtasks

[x] Task 1 : Audit du code existant et delta-scoping (AC: #1, #2)
[x] 1.1 Lire `src/app/(admin)/admin/subscriptions/page.tsx` — tableau de bord admin actuel (sections "Virements en attente" / "Abonnements actifs")
[x] 1.2 Lire `src/components/admin-subscription-actions.tsx` — boutons Valider/Refuser/Suspendre existants
[x] 1.3 Lire `src/app/api/admin/subscriptions/[id]/route.ts` — logique de transition PENDING/ACTIVE et audit log existante
[x] 1.4 Lire `src/app/api/admin/subscriptions/[id]/route.test.ts` — patterns de tests et mocks attendus pour audit log
[x] 1.5 Lire `src/components/payment-method-selector.tsx` et `src/lib/mobile-money-config.ts` — icônes/couleurs Wave/Orange Money déjà utilisées
[x] 1.6 Lire `src/app/api/subscriptions/route.ts` et `src/lib/validations.ts` — confirmer que WAVE/ORANGE_MONEY créent un abonnement en `TRIAL` avec `providerPhone`
[x] 1.7 Identifier la divergence de statut : virement bancaire = `PENDING`, mobile money = `TRIAL` (état dans lequel l'admin valide)

[x] Task 2 : Adapter l'API admin pour accepter la transition TRIAL → ACTIVE (AC: #2)
[x] 2.1 Modifier `src/app/api/admin/subscriptions/[id]/route.ts` pour autoriser `validate` depuis `PENDING` **OU** `TRIAL` (les deux providers sont validables manuellement)
[x] 2.2 Conserver le rejet/refus depuis `PENDING` ou `TRIAL` vers `CANCELLED` (même workflow que virement)
[x] 2.3 Conserver `suspend` uniquement depuis `ACTIVE`
[x] 2.4 Conserver la transaction Prisma : `subscription.status` + `payment.status` mis à jour ensemble
[x] 2.5 L'audit log doit être créé AVANT l'envoi d'email (ordre actuel déjà correct, le garder)
[x] 2.6 Inclure `provider` (BANK_TRANSFER/WAVE/ORANGE_MONEY) dans les métadonnées de l'audit log

[x] Task 3 : Afficher le provider et l'icône distinctive dans le tableau admin (AC: #1)
[x] 3.1 Modifier `src/app/(admin)/admin/subscriptions/page.tsx` pour afficher une colonne "Moyen de paiement" avec le label et l'icône
[x] 3.2 Utiliser `getProviderColorClasses` de `src/lib/mobile-money-config.ts` pour les couleurs Wave (bleu) / Orange Money (orange)
[x] 3.3 Pour `BANK_TRANSFER`, afficher une icône `Landmark` et un badge neutre (comportement existant conservé)
[x] 3.4 Afficher `providerPhone` sous la référence pour les abonnements WAVE/ORANGE_MONEY (aide à la validation)
[x] 3.5 Adapter les libellés des sections si nécessaire : "Abonnements à valider" au lieu de "Virements en attente" (optionnel, rester cohérent)

[x] Task 4 : Créer un composant réutilisable `PaymentProviderBadge` (AC: #1)
[x] 4.1 Créer `src/components/payment-provider-badge.tsx`
[x] 4.2 Props : `provider: PaymentProvider`, `providerPhone?: string | null`, `showPhone?: boolean`
[x] 4.3 Retourner un badge coloré avec icône + label pour chaque provider
[x] 4.4 Utiliser les couleurs : Wave = bleu, Orange Money = orange, Bank Transfer = gris/slate
[x] 4.5 Utiliser `Waves` et `Smartphone` de `lucide-react`, et `Landmark` pour virement
[x] 4.6 Exporter `PaymentProvider` type depuis ce composant ou réutiliser celui de `mobile-money-config.ts`

[x] Task 5 : Adapter `AdminSubscriptionActions` si nécessaire (AC: #2)
[x] 5.1 Vérifier que le composant envoie bien `{ action: "validate" }` et gère `TRIAL` comme état actionnable
[x] 5.2 Si l'API retourne une erreur de transition, afficher le message dans le toaster
[x] 5.3 Aucun changement visuel majeur requis ; les labels Valider/Refuser/Suspendre restent identiques

[x] Task 6 : Tests unitaires et d'intégration (AC: #1, #2)
[x] 6.1 Mettre à jour `src/app/api/admin/subscriptions/[id]/route.test.ts` :
[x]   - test : validation depuis `TRIAL` (provider = WAVE) → `ACTIVE` + payment `succeeded` + email envoyé + audit log créé avec `provider: "WAVE"`
[x]   - test : validation depuis `TRIAL` (provider = ORANGE_MONEY) → `ACTIVE` + audit log avec `provider: "ORANGE_MONEY"`
[x]   - test : rejet depuis `TRIAL` (provider = WAVE) → `CANCELLED` + payment `failed` + email de refus + audit log créé
[x]   - test : `validate` depuis `ACTIVE` reste interdit (409)
[x]   - test : `suspend` depuis `TRIAL` reste interdit (409)
[x]   - test : mock `safeCreateAuditLog` est appelé avec `action`, `entityType: "Subscription"`, `entityId: "sub-1"`, et métadonnées incluant `provider`
[x] 6.2 Mettre à jour `src/app/(admin)/admin/subscriptions/page.test.tsx` :
[x]   - test : un abonnement TRIAL WAVE affiche le badge bleu et le numéro mobile money
[x]   - test : un abonnement TRIAL ORANGE_MONEY affiche le badge orange
[x]   - test : un abonnement PENDING BANK_TRANSFER affiche l'icône virement
[x] 6.3 Créer `src/components/payment-provider-badge.test.tsx` :
[x]   - test : WAVE rend un élément avec texte "Wave" et couleur bleue
[x]   - test : ORANGE_MONEY rend "Orange Money" et couleur orange
[x]   - test : BANK_TRANSFER rend "Virement bancaire"
[x]   - test : `providerPhone` affiché quand `showPhone=true`
[x] 6.4 Mettre à jour `src/components/admin-subscription-actions.test.tsx` si un nouveau guard est ajouté

[x] Task 7 : Vérifications finales
[x] 7.1 Lancer `npm run test` (Vitest) : tous les tests passent
[x] 7.2 Lancer `npm run build` : build Next.js passe sans erreur TypeScript
[x] 7.3 Vérifier qu'aucun `&&` n'est utilisé en expression JSX (ternaires obligatoires)
[x] 7.4 Vérifier que les routes admin ont bien les guards `role === ADMIN` ET `status !== SUSPENDED` (via `AdminLayout` déjà existant)

## Dev Notes

### Contexte critique / Already completed

Story 11.3 et 11.4 ont déjà préparé le terrain :
- **Schéma Prisma** : `PaymentProvider` inclut `WAVE` et `ORANGE_MONEY`, `Subscription.providerPhone` existe.
- **API création** : `POST /api/subscriptions` crée un abonnement en `TRIAL` pour WAVE/ORANGE_MONEY (pas `PENDING` comme le virement).
- **UI sélection** : le membre choisit Wave/Orange Money, saisit son numéro, reçoit les instructions.

Story 2.4 a déjà construit la validation admin pour virement bancaire :
- Page `/admin/subscriptions` affiche `PENDING` et `ACTIVE`.
- `PATCH /api/admin/subscriptions/[id]` accepte `{ action: "validate" | "reject" | "suspend", reason? }`.
- L'audit log est créé avant l'envoi d'email.
- Les emails d'activation/refus sont envoyés via `src/lib/email.ts`.

Story 11.5 est un **delta** sur cette infrastructure : étendre la validation admin pour inclure les abonnements mobile money `TRIAL` et afficher leur provider dans le tableau.

### Divergence SCP vs code réel

Le SCP mentionne "un abonnement en TRIAL" pour mobile money (Story 11.4). Le code actuel de Story 2.4 attend `PENDING` pour le virement. **Les deux sont corrects** : virement = `PENDING`, Wave/Orange Money = `TRIAL`. L'API de validation doit donc accepter `PENDING` et `TRIAL` pour `validate`/`reject`.

### Architecture patterns

- **Next.js 16 guardrail** : toujours utiliser des ternaires `condition ? <Component /> : null` au lieu de `condition && <Component />` en JSX. Précalculer les expressions booléennes composées en `const` avant le return JSX.
- **Route admin** : réutiliser `auth()` + `prisma.user.findUnique` pour vérifier `role === ADMIN`. Le layout `(admin)` ajoute déjà le guard `status === "SUSPENDED"` via `ACCOUNT_SUSPENDED_REDIRECT` — ne pas dupliquer, juste s'assurer que la page passe par ce layout.
- **Audit log** : `safeCreateAuditLog` doit être appelé immédiatement après la mutation DB, avant les emails. Déjà le cas dans le code actuel ; ne pas inverser.
- **Tests** : Vitest co-localisés, mocker `auth()`, `prisma`, `safeCreateAuditLog`, `sendSubscriptionActivatedEmail`, `sendSubscriptionRejectedEmail`.
- **Couleurs** : réutiliser `getProviderColorClasses` de `src/lib/mobile-money-config.ts` ; ne pas hardcoder de classes Tailwind ailleurs.

### Anti-patterns à éviter

1. **NE PAS** créer une nouvelle route API dédiée aux mobile money. La route existante `PATCH /api/admin/subscriptions/[id]` suffit.
2. **NE PAS** changer le statut de création de WAVE/ORANGE_MONEY (doit rester `TRIAL`).
3. **NE PAS** afficher les abonnements `TRIAL` virement comme actionnables — seuls `PENDING` et `TRIAL` avec provider mobile money doivent être validables.
4. **NE PAS** oublier d'inclure `provider` dans l'audit log metadata.
5. **NE PAS** utiliser `&&` en expression JSX.
6. **NE PAS** ignorer le `status === SUSPENDED` guard sur les routes admin — il est déjà dans `(admin)/layout.tsx`.

### File Structure

Fichiers à MODIFIER :
- `src/app/api/admin/subscriptions/[id]/route.ts` — autoriser `TRIAL` comme état source valide pour validate/reject
- `src/app/(admin)/admin/subscriptions/page.tsx` — ajouter colonne provider + icône + providerPhone
- `src/app/api/admin/subscriptions/[id]/route.test.ts` — tests pour TRIAL WAVE/ORANGE_MONEY
- `src/app/(admin)/admin/subscriptions/page.test.tsx` — tests pour l'affichage des badges
- `src/components/admin-subscription-actions.test.tsx` — si un nouveau guard requiert un test

Fichiers à CRÉER :
- `src/components/payment-provider-badge.tsx` — composant réutilisable de badge provider
- `src/components/payment-provider-badge.test.tsx` — tests du badge

Fichiers à LIRE pour le contexte (NE PAS modifier sauf indication) :
- `src/app/api/subscriptions/route.ts`
- `src/lib/mobile-money-config.ts`
- `src/components/payment-method-selector.tsx`
- `src/lib/audit-log.ts`
- `src/lib/email.ts`
- `prisma/schema.prisma`
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-18.md` §Story 11.5
- `_bmad-output/planning-artifacts/architecture.md` §API Patterns, §Authentication & Security
- `_bmad-output/implementation-artifacts/story-11-3-modele-paiement-mobile-money.md`
- `_bmad-output/implementation-artifacts/story-11-4-ui-selection-paiement-multi-provider.md`
- `_bmad-output/implementation-artifacts/2-4-validation-manuelle-des-abonnements-par-ladmin.md`

### References

- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-06-18.md#Story 11.5] — ACs
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-06-18.md#4.3] — extension module Paiement
- [Source: _bmad-output/planning-artifacts/architecture.md#API--Communication-Patterns] — route handlers
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication--Security] — guards admin
- [Source: _bmad-output/implementation-artifacts/story-11-3-modele-paiement-mobile-money.md] — Prisma + API backend
- [Source: _bmad-output/implementation-artifacts/story-11-4-ui-selection-paiement-multi-provider.md] — UI multi-provider
- [Source: _bmad-output/implementation-artifacts/2-4-validation-manuelle-des-abonnements-par-ladmin.md] — validation virement existante
- [Source: src/app/(admin)/admin/subscriptions/page.tsx] — page admin
- [Source: src/app/api/admin/subscriptions/[id]/route.ts] — API validation
- [Source: src/components/admin-subscription-actions.tsx] — actions UI
- [Source: src/lib/mobile-money-config.ts] — couleurs/icônes providers
- [Source: src/lib/audit-log.ts] — helpers audit log
- [Source: src/lib/email.ts] — helpers email

## Dev Agent Record

### Agent Model Used

kimi-k2.7-code (ollama-cloud)

### Debug Log References

- Tests existants admin subscriptions : `npx vitest run src/app/api/admin/subscriptions/[id]/route.test.ts` (baseline à vérifier).
- Build Next.js actuel : baseline OK après Story 11.4.

### Completion Notes List

- 2026-06-18 : Implémentation story 11-5 terminée : API admin validation/refus depuis PENDING et TRIAL, badge provider réutilisable, tableau admin avec colonne moyen de paiement, tests passants. Build OK.

### File List

- Created: `_bmad-output/implementation-artifacts/story-11-5-validation-admin-paiement-mobile-money.md`
- Modified: `src/app/api/admin/subscriptions/[id]/route.ts`
- Modified: `src/app/(admin)/admin/subscriptions/page.tsx`
- Modified: `src/app/api/admin/subscriptions/[id]/route.test.ts`
- Modified: `src/app/(admin)/admin/subscriptions/page.test.tsx`
- Modified: `src/components/admin-subscription-actions.tsx`
- Modified: `src/components/admin-subscription-actions.test.tsx`
- Created: `src/components/payment-provider-badge.tsx`
- Created: `src/components/payment-provider-badge.test.tsx`

### Change Log

- 2026-06-18 : Story context créé et marqué ready-for-dev.
- 2026-06-18 : Implémentation story 11-5 : validation admin mobile money, badge provider, tests et build OK.
