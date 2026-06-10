---
title: 'Coordonnées Bancaires Réelles (XOF & EUR)'
type: 'feature'
created: '2026-06-10'
status: 'done'
route: 'one-shot'
---

# Coordonnées Bancaires Réelles (XOF & EUR)

## Intent

**Problem:** Le site IBC ne disposait pas des coordonnées bancaires réelles de KS Investment sur sa version en ligne, ce qui bloquait les paiements par virement des membres.

**Approach:** Ajouter les coordonnées Versus Bank (XOF local) et Société Générale Paris (EUR international) dans le fichier de configuration et concevoir une interface à onglets (Tabs) sur la page des instructions de virement pour guider élégamment les membres selon leur devise.

## Suggested Review Order

**Configuration**

- Centralisation des coordonnées bancaires réelles XOF et EUR et support de fallbacks d'environnement
  [`bank-transfer-config.ts:34`](../../src/lib/bank-transfer-config.ts#L34)

**Page de virement**

- Passage des détails bancaires spécifiques XOF et EUR au composant UI
  [`page.tsx:56`](../../src/app/(public)/pricing/virement/page.tsx#L56)

**Composant d'instructions de virement (UI)**

- Intégration de l'interface à onglets (Tabs), calcul des parités XOF et actions de copie adaptées
  [`bank-transfer-instructions.tsx:30`](../../src/components/bank-transfer-instructions.tsx#L30)

**Tests**

- Couverture de la logique d'onglets, des formats d'affichage et de copie pour chaque devise
  [`bank-transfer-instructions.test.tsx:41`](../../src/components/bank-transfer-instructions.test.tsx#L41)

## Review Findings

### decision-needed findings

### patch findings
- [x] [Review][Patch] Absence d'IBAN complet formaté SEPA pour le compte de transit EUR [src/components/bank-transfer-instructions.tsx:408]
- [x] [Review][Patch] Inversion d'IBAN et bug de routage critique dans l'onglet EUR [src/components/bank-transfer-instructions.tsx:226]
- [x] [Review][Patch] Valeurs d'arrondi de conversion EUR/XOF codées en dur [src/components/bank-transfer-instructions.tsx:182]
- [x] [Review][Patch] Conflit de variables d'environnement sur le SWIFT de transit EUR [src/lib/bank-transfer-config.ts:629]
- [x] [Review][Patch] Risque de crash de réhydratation React (Hydration Mismatch) sur `.toLocaleString()` [src/components/bank-transfer-instructions.tsx:266]
- [x] [Review][Patch] Onglet de paiement par défaut bloqué sur EUR [src/components/bank-transfer-instructions.tsx:168]
- [x] [Review][Patch] Mélange d'adresse Versus Bank et Société Générale dans l'onglet XOF [src/components/bank-transfer-instructions.tsx:206]
- [x] [Review][Patch] Crash potentiel sur le presse-papiers (navigator.clipboard indéfini) [src/components/bank-transfer-instructions.tsx:278]

### defer findings
- [x] [Review][Defer] Tests unitaires dégradés et assertions fragiles [src/components/bank-transfer-instructions.test.tsx:44] — deferred, pre-existing

