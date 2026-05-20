---
Story: "5.0"
StoryKey: "5-0-consolidation-post-retrospective-epic-4"
Title: "Consolidation post-rétrospective Epic 4 avant Epic 5"
Status: "review"
Priority: "P0"
Epic: "Epic 5 — Réputation, Reviews et Fiabilité"
FRs: []
NFRs: ["NFR-S5", "NFR-S8", "NFR-S9", "NFR-SC3"]
Created: "2026-05-20"
---

# Story 5.0: Consolidation post-rétrospective Epic 4 avant Epic 5

Status: review

<!-- Note: Story créée suite à la rétrospective Epic 4. Cette story traite les items de dette technique bloquants avant Epic 5 et ajoute deux guardrails architecture issus des CR Epic 4. -->

## Story

As a développeur IBC,
I want corriger la dette technique et documenter les guardrails identifiés par la rétrospective Epic 4,
so that l'Epic 5 démarre sans régression connue sur JSX, tags profil, migrations avatar, ni répétition des erreurs nested anchors / side effects idempotents.

## Acceptance Criteria

1. **Nettoyer les JSX `&&` résiduels dans les composants TSX ciblés**
   - Given les fichiers `avatar-upload.tsx`, `delete-account-dialog.tsx`, `subscription-status-tracker.tsx`, `opportunity-detail-sheet.tsx`, et `opportunity-kanban-board.tsx`,
   - When la story est implémentée,
   - Then tous les patterns JSX `condition && <JSX>` dans ces fichiers sont remplacés par `condition ? <JSX> : null`,
   - And tous les patterns conditionnels de classe de type `condition && "class-name"` dans des appels `cn()` sont remplacés par `condition ? "class-name" : ""`,
   - And les expressions booléennes composées restantes (`a && b`) sont pré-calculées avant le `return` JSX lorsqu'elles servent au rendu,
   - And `grep -rn '&&' src/ --include='*.tsx'` ne retourne aucune occurrence en position JSX ou `cn()` conditionnel dans les fichiers ciblés.

2. **Rendre `POST /api/user/profile` robuste aux payloads sans `tags`**
   - Given un utilisateur a déjà des `UserTag` persistés,
   - When un client API appelle `POST /api/user/profile` avec un payload valide qui omet complètement le champ `tags`,
   - Then les champs profil fournis sont mis à jour,
   - And les tags existants de l'utilisateur sont préservés,
   - And aucun `deleteMany` / `createMany` sur `userTag` n'est exécuté pour ce cas.
   - Given le même endpoint reçoit `tags: []`,
   - When la requête est valide,
   - Then les tags existants sont volontairement supprimés.
   - Given le même endpoint reçoit un tableau `tags` non vide,
   - When la requête est valide,
   - Then le comportement existant `dedupeTags` + remplacement atomique des tags est conservé.

3. **Traiter explicitement le risque data loss de la migration `20260514112346_init` sur `avatarUrl`**
   - Given `prisma/migrations/20260514112346_init/migration.sql` contient un `RedefineTables` sur `users`,
   - When le développeur inspecte la liste de colonnes de l'`INSERT INTO "new_users" ... SELECT ... FROM "users"`,
   - Then il confirme que `"avatarUrl"` est actuellement omis et documente ce constat dans les notes d'implémentation,
   - And il choisit une stratégie corrective sûre avant production :
     - soit modifier la migration existante **uniquement si elle n'a jamais été appliquée en production** pour inclure `"avatarUrl"` dans la liste INSERT/SELECT,
     - soit créer une migration corrective / script de restauration qui préserve ou restaure les avatars si une source fiable existe,
     - soit documenter explicitement que la DB dev n'est pas impactée mais que la migration est un risque production à traiter avant déploiement,
   - And aucune migration destructive supplémentaire n'est ajoutée sans plan de sauvegarde / rollback documenté.

4. **Documenter le guardrail architecture “Card Component Anti-Pattern: Nested Anchors”**
   - Given Story 4.2 a créé un blocker CR avec `TagChips` interactifs rendus dans un `DealCard` wrappé par `<Link>`,
   - When `_bmad-output/planning-artifacts/architecture.md` est mis à jour,
   - Then une section `### Card Component Anti-Pattern: Nested Anchors` est ajoutée dans les Implementation Patterns / guardrails,
   - And elle explique que les composants rendus dans une card cliquable ne doivent pas eux-mêmes rendre de `<a>`, `<Link>` ou bouton-href,
   - And elle fournit le pattern de fix : passer `interactive={false}` au sous-composant dans un contexte card, ou déplacer les éléments interactifs hors du wrapper `<Link>`.

5. **Documenter le guardrail architecture “Idempotent State-Transition Side Effects”**
   - Given Story 4.3 a dupliqué des notifications lors d'un re-verify admin,
   - When `_bmad-output/planning-artifacts/architecture.md` est mis à jour,
   - Then une section explicite indique que tout side effect déclenché par transition de statut (notifications, emails, webhooks, audit enrichi) doit vérifier `currentStatus !== targetStatus` avant exécution,
   - And l'exemple de référence est `if (newStatus === "VERIFIED" && currentStatus !== "VERIFIED") { ... }`,
   - And les endpoints admin doivent rester idempotents sans spammer les notifications/emails.

6. **Build, tests et validation ciblée passent**
   - Given toutes les modifications ci-dessus,
   - When `./node_modules/.bin/prisma validate`, `npx vitest run`, et `npm run build` sont exécutés,
   - Then les trois commandes passent sans erreur,
   - And des tests ciblés couvrent le cas `POST /api/user/profile` avec `tags === undefined`, `tags: []`, et `tags` non vide,
   - And la story documente les commandes de validation dans le Dev Agent Record.

## Tasks / Subtasks

- [x] **AC1 : Nettoyer les JSX `&&` résiduels**
  - [x] Remplacer dans `src/components/features/auth/avatar-upload.tsx` : `{imageSrc && <AvatarImage ... />}` → `{imageSrc ? <AvatarImage ... /> : null}`.
  - [x] Remplacer dans `src/components/features/auth/delete-account-dialog.tsx` : `{error && <p ...>}` → `{error ? <p ...> : null}`.
  - [x] Inspecter `src/components/subscription-status-tracker.tsx` et pré-calculer les booléens composés si nécessaire; convertir tout rendu JSX `&&` restant en ternaires.
  - [x] Inspecter `src/components/features/admin/opportunity-detail-sheet.tsx`; pré-calculer `isWaitingForSecondAdmin`, `cannotVerifyAgain`, et tout booléen composé hors JSX; remplacer les rendus conditionnels `&&` restants.
  - [x] Inspecter `src/components/features/admin/opportunity-kanban-board.tsx`; extraire les ternaires trop complexes (`optimisticStatus`, `optimisticApprovalCount`) en helpers/consts lisibles si utile; remplacer les rendus conditionnels `&&` restants.
  - [x] Exécuter `grep -rn '&&' src/ --include='*.tsx'` et distinguer les occurrences acceptables hors JSX (`if`, logique pure, tests) des occurrences à corriger; corriger toutes celles en JSX ou `cn()` conditionnel dans le scope.

- [x] **AC2 : Durcir `POST /api/user/profile` pour `tags === undefined`**
  - [x] Modifier `src/app/api/user/profile/route.ts` pour préserver le comportement existant quand `tags` est fourni.
  - [x] Utiliser un guard explicite basé sur la présence du champ dans le body brut, par exemple `const shouldUpdateTags = Object.prototype.hasOwnProperty.call(body, "tags")`, afin de distinguer `tags` absent de `tags: []`.
  - [x] Calculer `const tags = shouldUpdateTags ? dedupeTags(data.tags) : null` ou équivalent; ne jamais appeler `dedupeTags(data.tags)` comme signal implicite si cela rend `undefined` indistinguable de `[]`.
  - [x] Dans la transaction, exécuter `deleteMany` puis `createMany` uniquement si `shouldUpdateTags === true`.
  - [x] Préserver `profileSelect.tags` dans la réponse afin que les clients UI existants continuent de recevoir les tags triés.

- [x] **AC2 : Ajouter les tests profil tags absents**
  - [x] Identifier l'emplacement de test existant le plus proche (`src/lib/validations.test.ts`, tests API route existants, ou nouveau test co-localisé pour `src/app/api/user/profile/route.ts`).
  - [x] Ajouter un test qui simule un payload sans propriété `tags` et vérifie que `tx.userTag.deleteMany` n'est pas appelé.
  - [x] Ajouter un test qui simule `tags: []` et vérifie que `deleteMany` est appelé et que `createMany` ne l'est pas.
  - [x] Ajouter un test qui simule un tableau avec doublons et vérifie que `dedupeTags` + `createMany` conservent le comportement attendu.

- [x] **AC3 : Traiter le risque migration `avatarUrl`**
  - [x] Inspecter `prisma/migrations/20260514112346_init/migration.sql` et confirmer que la ligne `INSERT INTO "new_users"` omet `"avatarUrl"`.
  - [x] Vérifier l'historique de migrations postérieur (`20260519155100_add_avatar_url_map` notamment) pour comprendre l'état local actuel.
  - [x] Décider et documenter la stratégie : correction de migration non appliquée prod, migration corrective, ou note explicite de risque prod si aucun data source ne permet de restaurer les avatars.
  - [x] Si une migration corrective est créée, la nommer clairement (ex: `preserve_avatar_url_data`) et éviter tout `DROP` destructif sans copie préalable.
  - [x] Documenter dans les Completion Notes le risque exact et la décision prise.

- [x] **AC4 : Ajouter le guardrail nested anchors dans `architecture.md`**
  - [x] Ajouter une section `### Card Component Anti-Pattern: Nested Anchors` près de `### JSX Boolean Guardrail` / `### Upload Security Patterns`.
  - [x] Inclure les exemples interdit et autorisé : `DealCard` wrappé dans `<Link>` + `TagChips interactive` interdit; `TagChips interactive={false}` ou tags hors lien autorisé.
  - [x] Mentionner la source : Epic 4 rétro, Story 4.2 CR blocker.

- [x] **AC5 : Ajouter le guardrail side effects idempotents dans `architecture.md`**
  - [x] Ajouter une section `### Idempotent State-Transition Side Effects`.
  - [x] Préciser que la validation de transition (`isAllowedTransition`) ne suffit pas : les side effects doivent vérifier ancien statut vs nouveau statut.
  - [x] Inclure les exemples : notifications matching sur passage à `VERIFIED`, emails, webhooks, audit enrichi.
  - [x] Mentionner la source : Epic 4 rétro, Story 4.3 CR major.

- [x] **AC6 : Validation complète**
  - [x] Exécuter `./node_modules/.bin/prisma validate`.
  - [x] Exécuter `npx vitest run`.
  - [x] Exécuter `npm run build`.
  - [x] Exécuter `grep -rn '&&' src/ --include='*.tsx'` et documenter les résultats résiduels; aucun résidu JSX dans les fichiers ciblés n'est acceptable.
  - [x] Ne pas utiliser `git add -A` sans exclusions; ajouter explicitement les fichiers modifiés.

## Dev Notes

### Contexte critique — pourquoi cette story existe

La rétrospective Epic 4 conclut que l'Epic est fonctionnellement terminé mais que trois dettes techniques doivent être traitées avant ou pendant l'entrée en Epic 5 : JSX `&&` résiduels, endpoint profil non robuste aux tags absents, et risque data-loss `avatarUrl` dans la migration `20260514112346_init`. Cette story reprend le même pattern que Story 4.0 : consolidation P0 avant l'epic suivant, sans livrer de fonctionnalité produit nouvelle. [Source: `_bmad-output/implementation-artifacts/epic-4-retro-2026-05-20.md#Action-Items`]

### Scope et non-scope

**In scope :** corriger/durcir la dette explicitement listée dans les Action Items #1, #2, #3, #5, #6 de la rétro Epic 4.

**Out of scope :** implémenter les fonctionnalités métier Epic 5 (modèle `Review`, UI reviews, score de fiabilité, badge Platinum). Ces éléments restent pour Story 5.1+ sauf si un test minimal de non-régression nécessite un type existant. [Source: `_bmad-output/planning-artifacts/epics.md#Epic-5-Reviews-Réputation-et-Confiance`]

### État actuel des fichiers à modifier

- `src/components/features/auth/avatar-upload.tsx` : composant client d'upload avatar. Validation type/size côté client, POST `/api/user/avatar`, toast `sonner`, puis rendu `Avatar`. Occurrence JSX à corriger : `{imageSrc && <AvatarImage src={imageSrc} alt={userName} />}`. Préserver : upload, reset input, overlay loading, `AvatarFallback`.
- `src/components/features/auth/delete-account-dialog.tsx` : dialog RGPD avec confirmation `SUPPRIMER`, DELETE `/api/user/account`, `signOut({ redirectTo: "/" })`. Occurrence JSX à corriger : `{error && <p ...>}`. Préserver : reset state à la fermeture, erreurs 400 vs génériques.
- `src/components/subscription-status-tracker.tsx` : stepper abonnement `TRIAL` → `PENDING` → `ACTIVE` avec invalid states `CANCELLED` / `PAST_DUE`, timestamps FR, `motion-reduce`. Occurrences `&&` actuelles sont surtout logique pure (`activeIndex >= 0 && ...`) et peuvent rester si hors JSX; si elles alimentent le JSX, pré-calculer des consts lisibles.
- `src/components/features/admin/opportunity-detail-sheet.tsx` : Sheet admin détail opportunité, documents, preview, actions verify/reject/start_review. Occurrences critiques : `requiresDoubleVerification && approvalCount...`, `currentAdminApproved && ...`, et rendus conditionnels déjà majoritairement en ternaires. Préserver : double vérification, désactivation second-admin, notes internes, previews sécurisés.
- `src/components/features/admin/opportunity-kanban-board.tsx` : Kanban admin client avec optimisme local. Occurrences critiques dans `optimisticStatus` / `optimisticApprovalCount`; elles ne sont pas du JSX mais peuvent être simplifiées. Préserver impérativement le patch Story 4.0 / 3.5 : `currentAdminApproved` doit rester `true` après action `verify` optimiste.
- `src/app/api/user/profile/route.ts` : GET/POST profil. `profileSelect` inclut `tags` triés. POST parse `profileUpdateSchema`, fait `dedupeTags(data.tags)`, puis transaction `deleteMany` + `createMany` + `user.update`. Bug actuel : si `tags` est absent du payload, le schéma rend `data.tags` vide/undefined et la transaction supprime les tags existants.
- `_bmad-output/planning-artifacts/architecture.md` : contient déjà `### JSX Boolean Guardrail (Next.js 16 Strict)`, `### Upload Security Patterns`, et `### Dev Agent Git Safety`. Ajouter les deux nouveaux guardrails près de ces sections.
- `prisma/migrations/20260514112346_init/migration.sql` : `INSERT INTO "new_users" (...) SELECT ... FROM "users"` omet `"avatarUrl"`, alors que le commentaire de migration annonce la perte de cette colonne. C'est le risque à traiter/documenter.

### Architecture guardrails existants à respecter

- Prisma 7 : importer le client depuis `@/generated/prisma/client` via `src/lib/prisma.ts`; ne pas créer un second PrismaClient ad hoc. [Source: `_bmad-output/planning-artifacts/architecture.md#Technical-Constraints-Dependencies`]
- API routes : utiliser `NextResponse.json({ data })` en succès et `{ error, code?, details? }` en erreur; messages utilisateur en français. [Source: `_bmad-output/planning-artifacts/architecture.md#API-Communication-Patterns`]
- Auth.js v5 : les routes API utilisent `auth()` depuis `@/lib/auth`; ne jamais importer Prisma/bcrypt dans `auth.config.ts` ou middleware Edge. [Source: `_bmad-output/planning-artifacts/architecture.md#Authentication-Security`]
- JSX Boolean Guardrail : pas de `&&` en JSX; préférer `condition ? <Comp /> : null` et pré-calculer les booléens composés avant le `return`. [Source: `_bmad-output/planning-artifacts/architecture.md#JSX-Boolean-Guardrail-Nextjs-16-Strict`]
- Git safety : ne pas utiliser `git add -A` qui risque d'ajouter `dev.db`; ajouter explicitement les fichiers ou utiliser exclusions `':!dev.db' ':!*.sqlite3'`. [Source: `_bmad-output/planning-artifacts/architecture.md#Dev-Agent-Git-Safety`]

### Testing guidance

- Tests unitaires / composants existants : Vitest est la suite de référence; la rétro Epic 4 indique 301 tests passing avant cette story. [Source: `_bmad-output/implementation-artifacts/epic-4-retro-2026-05-20.md#Delivery-Metrics`]
- Pour `POST /api/user/profile`, préférer un test ciblé qui mock `auth`, `prisma.$transaction`, `tx.userTag.deleteMany`, `tx.userTag.createMany`, et `tx.user.update`. Le point critique est l'absence d'appel `deleteMany` quand la clé `tags` est absente.
- Ne pas se contenter de tester `profileUpdateSchema`: le bug est dans la sémantique route handler “champ absent” vs “tableau vide”, pas seulement dans la validation Zod.
- Après les corrections JSX, le grep global peut encore retourner des `&&` dans des `if` ou logique pure. L'AC exige zéro occurrence JSX/cn conditionnelle dans les fichiers ciblés, pas une interdiction absolue de `&&` dans tout TypeScript.

### Migration `avatarUrl` — décision attendue

Le CR Story 4.0 a identifié un defer P1 : `20260514112346_init` omet `avatarUrl` dans la copie `new_users`, donc toute donnée avatar existante est perdue à l'application de cette migration. Story 4.0 a ajouté `User.image @map("avatarUrl")` et une migration ultérieure, mais cela ne restaure pas les données déjà perdues. La story 5.0 doit rendre ce risque explicite et non ambigu avant le déploiement production. [Source: `_bmad-output/implementation-artifacts/4-0-consolidation-post-retrospective-epic-3.md#Review-Findings`]

### Previous story intelligence

- Story 4.0 prouve que la consolidation post-rétro fonctionne : elle a corrigé `avatarUrl @map`, vérifié `providerRef`, documenté JSX/upload/git guardrails, puis passé `prisma validate`, `npx vitest run`, `npm run build`.
- Attention : Story 4.0 a aussi laissé le risque data-loss `avatarUrl` en defer. Ne pas confondre mapping Prisma (`@map`) et préservation de données pendant `RedefineTables`.
- Story 4.4 a encore nécessité un patch CR pour retirer un `dev.db` suivi; respecter strictement la règle de staging explicite.

### Références

- `_bmad-output/implementation-artifacts/epic-4-retro-2026-05-20.md` — source des Action Items #1, #2, #3, #5, #6.
- `_bmad-output/implementation-artifacts/4-0-consolidation-post-retrospective-epic-3.md` — pattern de consolidation et defer `avatarUrl` data-loss.
- `_bmad-output/planning-artifacts/architecture.md` — architecture, API patterns, JSX guardrail, upload security, git safety.
- `_bmad-output/planning-artifacts/epics.md#Epic-5-Reviews-Réputation-et-Confiance` — contexte Epic 5, à ne pas implémenter dans cette consolidation hors scope.
- `src/app/api/user/profile/route.ts` — bug tags absents.
- `prisma/migrations/20260514112346_init/migration.sql` — migration `avatarUrl` à inspecter.

## Dev Agent Record

### Agent Model Used

gpt-5.5 (openai-codex)

### Debug Log References

- 2026-05-20: Added failing API route assertion for payloads without `tags`; confirmed red with `npx vitest run src/app/api/user/profile/route.test.ts` before implementation.
- 2026-05-20: Validation commands run: `./node_modules/.bin/prisma validate`, `npx vitest run`, `npm run build`, `npm run lint -- --format stylish`, and `grep -rn '&&' src/ --include='*.tsx'`.

### Completion Notes List

- Cleaned JSX conditional rendering in the targeted TSX files and removed additional `condition && <JSX>` render patterns found by the global grep. Residual `&&` occurrences are pure logic/test expressions; targeted files have no residual `&&` occurrences.
- Hardened `POST /api/user/profile` with an explicit `hasOwnProperty` guard for `tags`, preserving existing tag associations when the field is omitted while keeping `tags: []` as intentional deletion and non-empty tags as deduped replacement.
- Added route tests covering omitted `tags`, empty `tags`, and deduped non-empty `tags` transaction behavior.
- Inspected `prisma/migrations/20260514112346_init/migration.sql` and confirmed `avatarUrl` was omitted from the users RedefineTables copy. Corrected the migration to copy legacy `avatarUrl` into the interim `image` column before the later `20260519155100_add_avatar_url_map` migration renames `image` back to `avatarUrl`.
- Production deployment risk: if `20260514112346_init` has already been applied to a production database, editing this historical migration will not restore already-lost avatar data. Before production deployment, verify migration history and restore avatars from backup/object-storage metadata if the destructive migration was ever applied. Local/dev impact is ephemeral.
- Added architecture guardrails for nested anchors in clickable cards and idempotent state-transition side effects.
- Validation passed: Prisma schema valid; Vitest `302` tests passed; Next build completed successfully. ESLint completed with warnings only (`react-hooks/incompatible-library` and existing unused-arg style warnings), no errors.

### File List

- `_bmad-output/implementation-artifacts/5-0-consolidation-post-retrospective-epic-4.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/planning-artifacts/architecture.md`
- `prisma/migrations/20260514112346_init/migration.sql`
- `src/app/(admin)/admin/members/page.tsx`
- `src/app/(dashboard)/settings/page.tsx`
- `src/app/api/user/profile/route.test.ts`
- `src/app/api/user/profile/route.ts`
- `src/app/auth/signin/page.tsx`
- `src/app/auth/signup/page.tsx`
- `src/app/not-found.tsx`
- `src/components/features/admin/opportunity-detail-sheet.tsx`
- `src/components/features/admin/opportunity-kanban-board.tsx`
- `src/components/features/auth/avatar-upload.tsx`
- `src/components/features/auth/delete-account-dialog.tsx`
- `src/components/features/auth/profile-edit-form.test.tsx`
- `src/components/features/auth/profile-edit-form.tsx`
- `src/components/pricing-tier-selection.tsx`
- `src/components/subscription-activation-notice.tsx`
- `src/components/subscription-status-tracker.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/sheet.tsx`

### Change Log

- 2026-05-20: Story context created from Epic 4 retrospective action items; status set to ready-for-dev.
- 2026-05-20: Implemented story 5.0 consolidation fixes, architecture guardrails, validation, and status moved to review.
