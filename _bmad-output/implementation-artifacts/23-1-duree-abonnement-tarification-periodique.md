---
story_key: "23-1"
epic: "23"
title: "Durée d'abonnement et tarification périodique"
status: "ready-for-dev"
created: "2026-07-03"
assigned_to: "DS"
---

# Story 23-1: Durée d'abonnement et tarification périodique

## Contexte

La durée d'abonnement n'est pas implémentée dans l'UI. Le champ `period` est hardcodé à `MONTHLY` partout. L'utilisateur n'a aucun choix de durée. Le champ `endDate` n'est jamais calculé ni stocké. La tarification est fixe par tier sans variation selon la durée.

## Critères d'acceptation

### AC1 — Nouvelle structure tarifaire (bank-transfer-config.ts)
- `BANK_TRANSFER_CONFIG.amounts` remplacé par une structure `tier × period` retournant le bon montant
- `getAmountForTier(tier, period)` retourne le montant selon la combinaison tier+period
- Nouvelle grille tarifaire:
  | Tier | Mensuel | Semestriel (6 mois) | Annuel (12 mois) |
  |------|---------|---------------------|------------------|
  | AFFRANCHI | 29 € | 160 € | 290 € |
  | GRAND_FRERE | 59 € | 299 € | 590 € |
  | BOSS | 129 € | 690 € | 1290 € |
- `XOF_ROUNDED_AMOUNTS` couvre tous les nouveaux montants: 29, 59, 129, 160, 299, 690, 290, 590, 1290
- Tous les appelants de `getAmountForTier` sont mis à jour pour passer `period` en argument

### AC2 — Schéma de validation (validations.ts)
- `subscriptionCreateSchema` : `period: z.enum(["MONTHLY", "ANNUAL"])` → `period: z.enum(["MONTHLY", "SEMESTERIAL", "ANNUAL"])`

### AC3 — Sélecteur de durée côté user (pricing-tier-selection.tsx)
- Un sélecteur de durée (Mensuel / Semestriel / Annuel) est ajouté dans l'UI, après le choix du tier et avant le choix du moyen de paiement
- Le montant affiché se met à jour selon la durée sélectionnée
- Le fetch POST /api/subscriptions envoie `period: selectedPeriod` au lieu de `period: "MONTHLY"`
- `getAmountForTier(selectedTier)` → `getAmountForTier(selectedTier, selectedPeriod)` aux lignes 153-155

### AC4 — Instructions de virement (bank-transfer-instructions.tsx)
- Le fetch POST /api/subscriptions utilise la période sélectionnée (passée en prop) au lieu de `period: "MONTHLY"`
- Le montant affiché dans les instructions reflète la durée choisie

### AC5 — Page virement (pricing/virement/page.tsx)
- `period` lu depuis les searchParams (en plus du tier)
- `getAmountForTier(tier)` → `getAmountForTier(tier, period)`
- `period` passé au composant BankTransferInstructions

### AC6 — Route API POST /api/subscriptions (route.ts)
- `getAmountForTier(tier)` → `getAmountForTier(tier, period)`
- `endDate` calculé selon la période: MONTHLY = now + 1 mois, SEMESTERIAL = now + 6 mois, ANNUAL = now + 12 mois
- `endDate` stocké dans la transaction Prisma

### AC7 — Tableau admin (admin/subscriptions/page.tsx)
- `AdminSubscription` type étendu avec `period`, `startDate`, `endDate`
- Les requêtes `findMany` incluent `period: true, startDate: true, endDate: true`
- Colonne "Durée" : MONTHLY → "Mensuel", SEMESTERIAL → "6 mois", ANNUAL → "Annuel"
- Colonne "Échéance" : endDate formaté dd/MM/yyyy si présent, sinon "—"

### AC8 — Validation admin (api/admin/subscriptions/[id]/route.ts)
- L'action validate calcule `endDate` si manquant (si l'admin valide un abonnement PENDING sans endDate, le calculer selon period)

### AC9 — Analytics (admin-analytics.ts)
- `getAmountForTier(subscription.tier)` → `getAmountForTier(subscription.tier, subscription.period)`

### AC10 — Tier config (tier-config.ts)
- `getTierPriceLabel` et `getXofPriceLabel` affichent la tarification mensuelle par défaut (backward compat pour la landing/pricing publique)
- `BANK_TRANSFER_CONFIG.amounts[tier]` remplacé par la nouvelle structure (access via `getAmountForTier(tier, "MONTHLY")` ou équivalent)

### AC11 — Tests Vitest
- Tests existants mis à jour pour passer `period` aux appels `getAmountForTier`
- Tests couvrent SEMESTERIAL comme valeur valide
- Build et tous les tests passent

## Contraintes techniques

- Next.js 16 App Router, Turbopack, TypeScript strict
- Pas de `&&` dans le JSX (Next.js 16 strict) — utiliser des ternaires
- Composants shadcn/ui existants pour les badges/boutons/selectors
- Prisma: pas de migration nécessaire (period et endDate existent déjà)
- Ne PAS modifier le schéma Prisma
- Ne PAS modifier les emails transactionnels (sauf si le montant y est référencé — il ne l'est pas dans les emails actuels)
- Ne PAS modifier le flux d'inscription (signup)

## Fichiers à modifier

**Source (11 fichiers)**:
1. `src/lib/bank-transfer-config.ts`
2. `src/lib/tier-config.ts`
3. `src/lib/validations.ts`
4. `src/app/api/subscriptions/route.ts`
5. `src/components/pricing-tier-selection.tsx`
6. `src/components/bank-transfer-instructions.tsx`
7. `src/app/(public)/pricing/virement/page.tsx`
8. `src/app/(admin)/admin/subscriptions/page.tsx`
9. `src/app/api/admin/subscriptions/[id]/route.ts`
10. `src/lib/admin-analytics.ts`
11. `src/lib/email.ts` (vérifier si montant mentionné — ne l'est pas, pas de modif nécessaire)

**Tests (à mettre à jour)**:
1. `src/app/api/subscriptions/route.test.ts`
2. `src/app/api/admin/subscriptions/[id]/route.test.ts`
3. `src/lib/validations.test.ts` (si existe)
4. `src/components/pricing-tier-selection.test.tsx` (si existe)

## Dev Agent Record

_Status: ready-for-dev_