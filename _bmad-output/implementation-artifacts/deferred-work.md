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

## Deferred from: code review of 7-3-responsive-mobilefirst-et-accessibilite-finale.md (2026-06-11)

- CSS parsing in unit test is fragile: In [accessibility.test.tsx](file:///d:/Code/ivoire-business-club-next/src/app/accessibility.test.tsx#L115), reading `globals.css` from the disk using `fs.readFileSync` to verify animation overrides is environment-dependent and fragile.
- Lack of try-catch on top-level import in next.config.ts: In [next.config.ts](file:///d:/Code/ivoire-business-club-next/next.config.ts#L6), importing `./patch-readlink.js` at the top-level has no safety check, which could block the webpack compiler if the file is missing.
- Sticky CTA Button on Mobile: In layout / page files, the spec requires a principal sticky CTA button at the bottom of the screen on mobile, which is deferred because: Reporter car cette fonctionnalité dépend de pages de détails non modifiées dans cette story.

## Deferred from: code review of 9-1-modele-article-migration-et-api-routes.md (2026-06-13)

- Typage faible de la session (session.user as any) dans `src/app/api/articles/route.ts:39` — pre-existing
- Absence de pagination sur GET /api/articles dans `src/app/api/articles/route.ts:28` — pre-existing
- Absence de validation réelle de l'intégrité de la base de données dans les tests (convention de mocking existante) dans `src/app/api/articles/route.test.ts` — pre-existing

## Deferred from: code review of 9-2-interface-admin-crud-articles.md (2026-06-14)

- Redondance de `promoteConfiguredAdminUser` sur chaque page d'administration (`src/app/(admin)/admin/articles/page.tsx`, etc.) — pre-existing pattern
- Absence de pagination dans la liste des articles (`src/app/(admin)/admin/articles/page.tsx`) — hors scope de la story
- Contournement de la sécurité des types TypeScript (`session.user as any`) dans les endpoints d'articles — pre-existing pattern
- Duplication et dérive potentielle de l'énumération `ArticleVisibility` dans `src/lib/validations.ts` — duplication pour compatibilité client/serveur
