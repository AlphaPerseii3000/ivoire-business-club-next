# Deferred Work

## Deferred from: code review of story 2-0-consolidation-post-retrospective-epic-1 (2026-05-14)

- avatarUrl vs image : mismatch colonne DB/schéma Prisma (pré-existant de Story 1.4) — Le schéma déclare `image String?` mais la migration initiale crée la colonne `avatarUrl`. Pas de `@map("avatarUrl")`. Bug pré-existant, hors scope de cette story. À corriger dans un story dédiée. **Résolu dans Story 4.0** — `@map("avatarUrl")` ajouté.

- Subscription.providerRef NOT NULL sans default — Risque pour les créations de subscription sans référence immédiate. Probablement OK pour le modèle virement bancaire, mais à vérifier lors de l'implémentation Epic 2. **Résolu dans Story 4.0** — `providerRef String?` nullable vérifié.

## Deferred from: code review of story 4-0-consolidation-post-retrospective-epic-3 (2026-05-19)

- Migration `20260514112346_init` perd les données avatarUrl — L'INSERT de cette migration ne copie PAS la colonne `avatarUrl` de l'ancienne table users. Les URLs d'avatar existantes deviennent NULL. Impact minimal en dev (DB reseedée), critique en production. À corriger dans une story Epic 6 (data migration) : modifier la migration pour inclure `"avatarUrl"` dans l'INSERT, ou créer une migration data-seed restauratrice.

## Deferred from: code review of story 4-2-systeme-de-tags-profil-et-opportunites (2026-05-20)

- Project-wide pre-existing JSX `&&` patterns remain outside the Story 4.2 diff. Clean in a separate hardening pass if the Next.js 16 guardrail is enforced globally.
- `POST /api/user/profile` deletes and recreates tags even when the optional `tags` field is omitted. Current UI sends tags, but future/non-UI clients may unintentionally clear tags; consider preserving tags when `tags` is absent.

## Deferred from: code review of spec-coordonnees-bancaires-reelles.md (2026-06-10)

- Tests unitaires dégradés et assertions fragiles : Le remplacement de `userEvent` par `fireEvent` dans [bank-transfer-instructions.test.tsx](file:///d:/Fichiers%20Code/ivoire-business-club-next/src/components/bank-transfer-instructions.test.tsx) diminue le réalisme des tests et l'accessibilité globale. L'utilisation de regex complexes pour matcher des espaces insécables rend de plus les assertions de tests instables selon l'OS.

