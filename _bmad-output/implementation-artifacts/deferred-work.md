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

## Deferred from: code review of 9-4-seo-navigation-et-integration-site.md (2026-06-14)

- Redondance et duplication de l'URL de base (siteUrl) [src/app/sitemap.ts:7] — URL codée en dur à plusieurs endroits (pré-existant).
- Utilisation d'une balise <a> standard pour la connexion [src/app/(public)/page.tsx:128] — Propose une navigation par rechargement complet de page plutôt qu'en mode SPA (pré-existant).
- Incohérence et doublons dans la structure des en-têtes de navigation [src/app/(public)/page.tsx:88] — Design ad-hoc et duplicate du header (pré-existant).
- Risque de plantage de la page d'accueil sur la récupération des opportunités [src/app/(public)/page.tsx:45] — Absence de chaînage optionnel sur `opportunity.author.location` (pré-existant).
- Mauvaise gestion des paramètres de requête multiples pour la catégorie [src/app/(public)/articles/page.tsx:35] — Risque d'erreur si `category` est fourni plusieurs fois en query string (pré-existant).

## Deferred from: code review of 9-7-systeme-de-commentaires-modele-migration-et-api.md (2026-06-17)

- Manque de fonctionnalités de modification/suppression des commentaires [src/app/api/articles/[id]/comments/route.ts:1-128]
- Risque d'inondation de commentaires (Spam/Flood) [src/app/api/articles/[id]/comments/route.ts:54-128]
- Duplication des schémas Prisma (PostgreSQL vs SQLite) [prisma/schema.prisma:1-398]

## Deferred from: code review of 9-2-interface-admin-crud-articles.md (2026-06-17)

- Duplication de la requête Prisma de récupération des opportunités vérifiées [src/app/(admin)/admin/articles/new/page.tsx, src/app/(admin)/admin/articles/[id]/edit/page.tsx]
- Cast de type non sécurisé `as any` sur la référence de la Textarea [src/components/features/admin/article-form.tsx:836]
- Absence de pagination pour la liste des articles admin [src/app/(admin)/admin/articles/page.tsx]

## Deferred from: code review of 13-2-page-publique-liste-experts.md (2026-06-22)

- Boilerplate Navigation Header Duplication [src/app/(public)/...:1] — duplicate layout header and links across multiple public pages (pre-existing smell).
- Hardcoded Navigation Active States [src/app/(public)/...:1] — hardcoded active tab highlights in duplicated headers (pre-existing smell).
- Denormalized Database Design Smell [prisma/schema.prisma:1] — specialties stored as comma-separated strings rather than a dedicated relational table or array type (pre-existing database architecture smell).

## Deferred from: code review of 13-3-modele-company-crud-admin.md (2026-06-22)

- Absence of list pagination [src/app/api/companies/route.ts:12] — Neither the public GET API nor the admin list page implements pagination or limits (pre-existing).
- Boilerplate layout duplication [src/app/(public)/:1] — Duplication of navigation and footers inside public page components instead of centering in Next.js layouts (pre-existing).

## Deferred from: code review of 13-4-page-publique-liste-entreprises.md (2026-06-22)

- Lien d'ancre brisé pour "Tarifs" dans la navigation mobile sur les pages secondaires [src/components/landing/mobile-nav.tsx:7] — Le lien "Tarifs" utilise `#pricing`. Sur les pages `/partners` ou `/partners/[slug]`, cliquer dessus cherche l'ancre sur la page courante au lieu de rediriger vers la page d'accueil (`/#pricing`) (pré-existant).

## Deferred from: code review of story-15-2 (2026-06-26)

- `CRON_SECRET` comparison is not timing-safe (`token !== expected`) and `getBearerToken` rejects headers with extra spaces between "Bearer" and the token [src/app/api/cron/remind-incomplete-users/route.ts:8-18]. Hard to exploit in practice because `CRON_SECRET` is high-entropy and network timing dominates, but consider switching to a constant-time `crypto.timingSafeEqual` comparison and allowing a single extra space in the bearer extraction. Low priority unless security hardening is mandated.
- `docs/cron-setup.md` and `.env.example` do not warn that the cron endpoint remains unprotected against replay if `CRON_SECRET` is intercepted. The current model relies entirely on secret-in-transit over HTTPS; consider documenting mTLS or IP allow-listing as future hardening. Low priority / documentation.
- `reminderCount` is currently a global counter on `User` rather than a per-type counter; if future stories require per-sequence analytics, a migration to a `ReminderLog` table may be needed. Acceptable for current scope.

## Deferred from: code review of 19-1-installation-posthog.md (2026-06-28)

- Stale Server-Side Singleton during Active Development [src/lib/posthog-server.ts] — The `posthogServer` instance is cached on `globalThis` in development. If configuration keys or env vars are updated during a dev session, they won't take effect until a full Node server restart is performed.
- Missing server shutdown flush/close handler [src/lib/posthog-server.ts] — The integration does not handle Node server shutdown lifecycle events (like process exit signals) to cleanly flush/close the PostHog connection, which could lead to in-memory events being lost when server instances terminate.



