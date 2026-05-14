# Deferred Work

## Deferred from: code review of story 2-0-consolidation-post-retrospective-epic-1 (2026-05-14)

- avatarUrl vs image : mismatch colonne DB/schéma Prisma (pré-existant de Story 1.4) — Le schéma déclare `image String?` mais la migration initiale crée la colonne `avatarUrl`. Pas de `@map("avatarUrl")`. Bug pré-existant, hors scope de cette story. À corriger dans un story dédiée.
- Subscription.providerRef NOT NULL sans default — Risque pour les créations de subscription sans référence immédiate. Probablement OK pour le modèle virement bancaire, mais à vérifier lors de l'implémentation Epic 2.