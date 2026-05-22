---
Story: "6.4"
StoryKey: "6-4-audit-logs-et-conformite"
Title: "Audit Logs et Conformité"
Status: "ready-for-dev"
Priority: "P1"
Epic: "Epic 6 — Administration et Back-office"
FRs: ["FR39", "FR44"]
NFRs: ["NFR-S5", "NFR-S8", "NFR-S9", "NFR-P2", "NFR-A1", "NFR-A3"]
UXDRs: ["UX-DR17", "UX-DR18", "UX-DR19", "UX-DR20", "UX-DR24", "UX-DR25", "UX-DR26", "UX-DR34"]
Created: "2026-05-22"
---

# Story 6.4: Audit Logs et Conformité

Status: ready-for-dev

<!-- Note: Ultimate context engine analysis completed - comprehensive developer guide created. Brownfield/delta story: admin route group, admin layout/navigation, subscription/opportunity admin APIs, admin analytics/dashboard, document management, and sanitize-log utility already exist. This story creates the durable immutable audit trail and admin audit viewer; do not rebuild admin auth, kanban, analytics, subscriptions, or document systems. -->

## Story

En tant qu'administrateur IBC,
je veux consulter l'historique des actions critiques,
afin de respecter les obligations réglementaires (CENTIF-CI, APDP) et tracer les décisions.

## Acceptance Criteria

1. **Page admin audit protégée et accessible**
   - Given un utilisateur non authentifié visite `/admin/audit`,
   - When la page se charge,
   - Then il est redirigé vers `/auth/signin`.
   - Given un utilisateur authentifié non-admin visite `/admin/audit`,
   - When la page se charge,
   - Then il est redirigé vers `/dashboard` ou reçoit un accès refusé cohérent avec les pages admin existantes.
   - Given un admin authentifié visite `/admin/audit`,
   - When la page se charge,
   - Then il voit une page « Journal d'audit » dans le layout admin existant, sans gate premium membre.
   - And la navigation admin inclut un lien « Audit » vers `/admin/audit`.

2. **Modèle Prisma AuditLog durable**
   - Given `prisma/schema.prisma`,
   - When la story est implémentée,
   - Then un modèle `AuditLog` existe avec au minimum `id`, `actorId`, `action`, `entityType`, `entityId`, `metadata Json?`, `createdAt`, et une relation optionnelle vers `User` pour l'admin acteur.
   - And le modèle utilise les conventions du projet : champs camelCase, table mappée en snake_case via `@@map("audit_logs")`, indexes pour consultation (`createdAt`, `actorId`, `entityType`, `entityId`, `action`).
   - And une migration Prisma crée la table et les indexes sans toucher aux données métier existantes.

3. **Immutabilité garantie des audit logs**
   - Given une entrée `AuditLog` existe,
   - When un admin ou une API tente de modifier ou supprimer cette entrée,
   - Then l'opération est impossible par design : aucune route update/delete n'existe, aucun helper applicatif n'expose update/delete, et une protection équivalente DB est ajoutée dans la migration.
   - And comme Prisma ne supporte pas nativement `@@allow` dans ce projet sans ZenStack, l'équivalent attendu est une protection par migration SQL adaptée à SQLite dev (triggers `BEFORE UPDATE` et `BEFORE DELETE` avec `RAISE(ABORT, ...)`) et documentée comme à adapter en PostgreSQL production (triggers ou permissions DB) lors de Story 6.6.
   - And les tests vérifient explicitement qu'une tentative `prisma.auditLog.update` et `prisma.auditLog.delete` échoue.

4. **Helper d'audit centralisé et logs sans données sensibles**
   - Given une action admin critique est exécutée,
   - When le code appelle le helper d'audit,
   - Then une entrée est créée avec `actorId`, `action`, `entityType`, `entityId`, `metadata` JSON sanitizée, et `createdAt` automatique.
   - And le helper réside dans `src/lib/audit-log.ts` ou un nom équivalent sous `src/lib/`, utilise le singleton `prisma`, et réutilise/étend `src/lib/sanitize-log.ts` au lieu de créer une seconde logique de redaction.
   - And `metadata` ne contient jamais mot de passe, token, secret, authorization, cookie, URL signée R2, clé R2, payload complet, email complet si non nécessaire, ni contenu documentaire sensible.
   - And si l'écriture d'audit échoue après une mutation métier déjà réussie, l'erreur est loggée via `sanitizeError` avec IDs/action seulement; ne jamais exposer l'erreur brute ou bloquer l'UI si l'action métier a déjà été persistée, sauf pour une action dont la conformité exige une transaction atomique.

5. **Instrumentation des actions admin existantes**
   - Given les endpoints admin existants,
   - When un admin réalise une action critique,
   - Then un audit log est créé au minimum pour : validation/refus/suspension d'abonnement, changement de statut d'opportunité, double-vérification d'opportunité, édition d'opportunité, suppression d'opportunité, suppression document admin, changement tier utilisateur, vérification utilisateur.
   - And les actions d'abonnement incluent dans `metadata` : `previousStatus`, `nextStatus`, `tier`, `amount` si disponible, `providerRef`/référence virement si disponible, et `paymentStatus` si modifié.
   - And les actions d'opportunité incluent : `previousStatus`, `nextStatus`, `requiresDoubleVerification`, `approvalCount`, et uniquement des IDs/flags/champs modifiés, pas le texte complet de description, notes sensibles ou noms de fichiers.
   - And les actions idempotentes déjà détectées comme `currentStatus === nextStatus` ne créent pas de faux audit log de mutation; elles peuvent créer au plus un log `*_NOOP` seulement si explicitement utile et testé.

6. **API admin de consultation avec filtrage et pagination**
   - Given `GET /api/admin/audit` ou une route équivalente,
   - When la requête est non authentifiée,
   - Then elle retourne `401` JSON français.
   - When la requête vient d'un non-admin,
   - Then elle retourne `403` JSON français.
   - When un admin passe des query params (`page`, `pageSize`, `action`, `entityType`, `actorId`, `from`, `to`, `q`),
   - Then l'API retourne une réponse paginée triée par `createdAt desc` avec `{ data: { logs, page, pageSize, total, totalPages } }`.
   - And `pageSize` est borné (ex: 10–100, défaut 20) pour préserver NFR-P2.
   - And les filtres invalides retournent `400` avec message français sans erreur interne.

7. **Table audit logs avec filtres, pagination, états UX**
   - Given un admin sur `/admin/audit`,
   - When des logs existent,
   - Then une table paginée affiche timestamp, admin (nom/email masqué ou court selon donnée disponible), action, entité concernée, entityId, détails résumés, et bouton/section pour voir les métadonnées JSON sanitizées.
   - When aucun log ne correspond aux filtres,
   - Then un état vide français s'affiche : « Aucun événement d'audit trouvé. » avec action « Réinitialiser les filtres ».
   - And la page propose filtres par action, type d'entité, acteur, période, recherche texte/ID, avec query params partageables.
   - And la table est responsive : scroll horizontal contrôlé sur mobile, cibles tactiles ≥44px, focus visible, headings logiques, textes français non techniques.

8. **Tests et validation de non-régression**
   - Given cette story ajoute une piste de conformité,
   - When l'implémentation est terminée,
   - Then les tests couvrent : création d'audit via helper, sanitation de metadata, immutabilité update/delete, API auth 401/403, pagination/filtres, page admin auth gate, instrumentation abonnement, instrumentation opportunité update/delete/status, et absence de données sensibles dans metadata.
   - And `./node_modules/.bin/prisma validate`, migration/seed test si applicable, tests ciblés, `npx vitest run`, et `npm run build` passent ou les échecs préexistants hors scope sont documentés.
   - And tout nouveau JSX conditionnel utilise des ternaires, jamais `&&`, avec booléens composés pré-calculés avant le `return`.
   - And aucun fichier binaire DB (`dev.db`, `*.sqlite3`) n'est ajouté au commit.

## Tasks / Subtasks

- [ ] **AC2/AC3: Créer le modèle Prisma AuditLog + migration immuable**
  - [ ] Auditer `prisma/schema.prisma` avant modification; confirmer qu'aucun modèle `AuditLog` n'existe.
  - [ ] Ajouter `AuditLog` avec relation optionnelle `actor User?` et champ inverse `auditLogs AuditLog[]` sur `User` si nécessaire.
  - [ ] Utiliser `metadata Json?`; si SQLite/Prisma adapter présente une limitation JSON, conserver le type Prisma supporté par le projet ou documenter clairement le fallback `String` JSON sérialisé uniquement si nécessaire.
  - [ ] Ajouter `@@index([createdAt])`, `@@index([actorId, createdAt])`, `@@index([entityType, entityId])`, `@@index([action, createdAt])`, `@@map("audit_logs")`.
  - [ ] Générer une migration Prisma nommée explicitement (ex: `add_audit_logs`) et ajouter dans `migration.sql` les triggers SQLite `BEFORE UPDATE` / `BEFORE DELETE` qui abortent toute mutation d'une ligne audit.
  - [ ] Ne jamais ajouter `prisma/dev.db` ou autre DB binaire au commit.

- [ ] **AC4: Créer le helper d'audit centralisé**
  - [ ] Étendre `src/lib/sanitize-log.ts` pour couvrir aussi `r2Key`, `signedUrl`, `publicUrl`, `downloadUrl`, `previewUrl`, `email`, `fileName`, `originalName`, `description`, `note`, `adminNote`, `rejectionNote` si ces champs peuvent être sensibles en metadata.
  - [ ] Créer `src/lib/audit-log.ts` avec une fonction type `createAuditLog({ actorId, action, entityType, entityId, metadata })`.
  - [ ] Le helper doit appeler uniquement `prisma.auditLog.create`; ne pas exposer update/delete.
  - [ ] Ajouter des types/constantes d'actions pour éviter les strings divergentes (`SUBSCRIPTION_VALIDATE`, `OPPORTUNITY_STATUS_CHANGE`, etc.).
  - [ ] Ajouter tests unitaires du helper et de la sanitation.

- [ ] **AC5: Instrumenter les endpoints admin existants sans changer leur contrat**
  - [ ] Instrumenter `src/app/api/admin/subscriptions/[id]/route.ts` après mutation réussie pour `validate`, `reject`, `suspend`, avec status/tier/montant/référence virement.
  - [ ] Instrumenter `src/app/api/admin/opportunities/[id]/verify/route.ts` pour status changes et double-vérification; respecter `currentStatus !== nextStatus` pour éviter notifications/audits en double.
  - [ ] Instrumenter `src/app/api/admin/opportunities/[id]/route.ts` pour `PATCH` édition et `DELETE` suppression, sans logger description complète, noms/keys documents ou payload complet.
  - [ ] Instrumenter `src/app/api/admin/users/[id]/tier/route.ts` et `src/app/api/admin/users/[id]/verify/route.ts` si ces routes mutent tier/vérification.
  - [ ] Si la suppression document admin passe par `src/app/api/opportunities/[id]/documents/[documentId]/route.ts`, ajouter un audit uniquement quand l'acteur est admin et sans exposer `r2Key`/nom de fichier.
  - [ ] Préserver toutes les réponses JSON existantes (`{ data: ... }`, `{ error: ... }`) pour ne pas casser les tests/UI.

- [ ] **AC1/AC6/AC7: Créer la page `/admin/audit` et son API de lecture**
  - [ ] Ajouter `src/app/api/admin/audit/route.ts` avec `GET`, auth via `auth()` + vérification role `ADMIN` par Prisma, validation query params via Zod.
  - [ ] Ajouter `src/app/(admin)/admin/audit/page.tsx` comme Server Component avec auth/admin guard identique aux pages admin existantes; pas de premium gate membre.
  - [ ] Lire les query params et récupérer les logs côté serveur via Prisma ou appeler le même helper de query; éviter un client fetch inutile au premier rendu.
  - [ ] Joindre l'acteur via relation `actor` avec `select: { id, name, email }` seulement.
  - [ ] Ajouter UI filtres/pagination en français; utiliser composants shadcn existants (`Button`, `Input`, `Select`, `Card`, table HTML accessible) et query params.
  - [ ] Ajouter lien « Audit » dans `src/app/(admin)/admin/layout.tsx` sans casser les liens existants.

- [ ] **AC7: UX/accessibilité admin audit**
  - [ ] Format timestamp en `fr-FR` avec date + heure; conserver ISO dans attribut `dateTime` si `<time>` est utilisé.
  - [ ] Afficher les métadonnées comme résumé lisible; masquer/plier le JSON complet si trop long.
  - [ ] Prévoir état loading si des composants client sont ajoutés, et état erreur français pour filtre invalide.
  - [ ] Mobile : table dans conteneur `overflow-x-auto`, boutons `min-h-11`, labels visibles, pas de dépendance à la couleur seule.
  - [ ] Respecter la règle Next.js 16 : pas de `&&` dans JSX; booléens composés pré-calculés.

- [ ] **AC8: Tests et validations**
  - [ ] Ajouter tests API `src/app/api/admin/audit/route.test.ts` pour 401/403, pagination, filtres, bornes `pageSize`, dates invalides.
  - [ ] Ajouter tests helper `src/lib/audit-log.test.ts` et/ou `src/lib/sanitize-log.test.ts` pour redaction.
  - [ ] Ajouter tests d'instrumentation aux tests existants des routes subscriptions/opportunities/users/documents.
  - [ ] Ajouter test d'immutabilité DB (`update`/`delete` doivent échouer) après migration appliquée.
  - [ ] Ajouter/mettre à jour test de page admin audit si les patterns existants le permettent.
  - [ ] Exécuter `./node_modules/.bin/prisma validate`.
  - [ ] Exécuter les tests ciblés ajoutés/modifiés.
  - [ ] Exécuter `npx vitest run`.
  - [ ] Exécuter `npm run build`.
  - [ ] Avant commit dev-story, utiliser `git add -A -- . ':!dev.db' ':!*.sqlite3'` ou ajouter explicitement les fichiers, jamais `git add -A` seul.

## Dev Notes

### Delta scope — ce qui existe déjà et ne doit pas être réinventé

État actuel vérifié dans le codebase :

- `src/app/(admin)/admin/layout.tsx` existe avec navigation admin vers `/admin/dashboard`, `/admin/members`, `/admin/subscriptions`, `/admin/opportunities`; ajouter seulement le lien `/admin/audit`.
- `src/app/(admin)/admin/page.tsx` redirige vers `/admin/dashboard`; préserver ce comportement.
- Les pages admin existantes (`dashboard`, `subscriptions`, `opportunities`, `members`) font leurs propres checks `auth()` + `prisma.user.findUnique(... role ...)` et redirigent non-admin vers `/dashboard`; suivre ce pattern pour `/admin/audit`.
- `src/app/api/admin/subscriptions/[id]/route.ts` gère validation/refus/suspension avec `requireAdmin`, transitions, emails Resend, logs console sobres. Ajouter audit durable après mutation, sans changer les réponses.
- `src/app/api/admin/opportunities/[id]/verify/route.ts` gère transitions, double-vérification, emails et notifications; il a déjà une garde d'idempotence `currentStatus === nextStatus`. Ajouter audit sans casser cette logique.
- `src/app/api/admin/opportunities/[id]/route.ts` gère édition/suppression opportunité depuis Story 6.3; ajouter audit durable pour `PATCH` et `DELETE`.
- `src/app/api/admin/users/[id]/tier/route.ts` et `verify/route.ts` existent; auditer et instrumenter si elles modifient tier/vérification.
- `src/lib/sanitize-log.ts` existe avec `sanitizeError` et `sanitizeForLog`; l'étendre plutôt que créer une logique parallèle.
- Aucun `AuditLog` n'existe actuellement dans `prisma/schema.prisma`; cette story le crée.
- Aucune route `/admin/audit` n'existe actuellement; cette story la crée.

### Story foundation from Epic 6 / PRD

Story 6.4 couvre FR39 et NFR-S9 : toutes les actions admin et transactions d'abonnement/mises en relation doivent être traçables. Les AC source demandent une table paginée avec timestamp, admin, action, entité, détails; création automatique de logs pour actions admin; détails spécifiques pour abonnements; immutabilité des logs côté DB ou stockage externe.

Contexte conformité PRD : IBC est un intermédiaire informationnel non-financier; CENTIF-CI impose une piste d'audit pour transactions d'abonnement, APDP impose protection des données personnelles. L'audit doit donc être utile pour tracer la décision sans devenir une fuite de données sensibles.

### Architecture / security guardrails

- Stack réelle : Next.js `16.2.6`, React `19.2.4`, Prisma `^7.8.0`, Auth.js `^5.0.0-beta.31`, TailwindCSS 4, shadcn/ui, Vitest `^4.1.6`.
- Prisma 7 : utiliser uniquement `src/lib/prisma.ts`; ne pas instancier un nouveau PrismaClient. Client import généré depuis `@/generated/prisma/client` uniquement dans la lib Prisma existante.
- Auth.js v5 : utiliser `auth()` depuis `@/lib/auth` côté serveur/API. Ne jamais importer Prisma/bcrypt dans `auth.config.ts` ou middleware Edge.
- Admin pages : rôle `ADMIN`, pas de `getUserPremiumAccess()` ni `PremiumAccessBlockedPanel`; ces gates premium concernent les pages membre sous `(dashboard)`.
- API response pattern : succès `{ data: T }`; erreur `{ error: string, code?: string, details?: ... }` avec status 400/401/403/404/429/500.
- NFR-S8 : ne jamais logger ni stocker dans audit metadata des secrets, tokens, cookies, emails complets non nécessaires, URLs signées, clés R2, noms de fichiers sensibles, descriptions ou notes longues.
- NFR-P2 : API protégées p95 < 500ms; paginer systématiquement `/api/admin/audit`, borner `pageSize`, indexer les colonnes filtrées.
- Next.js 16 strict JSX : ne jamais utiliser `&&` en position JSX; utiliser ternaires et booléens composés pré-calculés.
- Aucun binaire DB en git : ne pas ajouter `dev.db` ou `*.sqlite3`.

### Data model notes

Schéma actuel pertinent :

- `User`: `id`, `email`, `name`, `tier`, `role`, `verificationStatus`, relations `subscriptions`, `payments`, `opportunities`, `verifiedBy`, `uploadedDocuments`, `verificationApprovals`, etc.
- `Subscription`: `id`, `userId`, `tier`, `period`, `provider`, `providerRef`, `status`, timestamps.
- `Payment`: `id`, `userId`, `amount`, `currency`, `provider`, `providerRef`, `status`, `createdAt`.
- `Opportunity`: `id`, `authorId`, `title`, `description`, `category`, `amount`, `requiredTier`, `requiresDoubleVerification`, `verificationStatus`, `verifiedAt`, `verifiedById`, notes, timestamps.
- `Document`: `id`, `opportunityId`, `uploadedById`, `fileName`, `originalName`, `mimeType`, `size`, `r2Key`, `publicUrl`, timestamps.

Recommended `AuditLog` shape:

```prisma
model AuditLog {
  id         String   @id @default(cuid())
  actorId    String?
  action     String
  entityType String
  entityId   String
  metadata   Json?
  createdAt  DateTime @default(now())

  actor User? @relation("AuditLogActor", fields: [actorId], references: [id], onDelete: SetNull)

  @@index([createdAt])
  @@index([actorId, createdAt])
  @@index([entityType, entityId])
  @@index([action, createdAt])
  @@map("audit_logs")
}
```

If adding the inverse relation, use a named relation on `User`, for example `auditLogs AuditLog[] @relation("AuditLogActor")`, to avoid ambiguity.

### Audit action naming guidance

Use stable uppercase action strings so filters remain useful:

- `SUBSCRIPTION_VALIDATE`, `SUBSCRIPTION_REJECT`, `SUBSCRIPTION_SUSPEND`
- `OPPORTUNITY_STATUS_CHANGE`, `OPPORTUNITY_DOUBLE_VERIFICATION_APPROVE`, `OPPORTUNITY_UPDATE`, `OPPORTUNITY_DELETE`
- `DOCUMENT_DELETE`
- `USER_TIER_UPDATE`, `USER_VERIFY`

Use `entityType` values consistently: `Subscription`, `Opportunity`, `Document`, `User`, `Payment` if needed. `entityId` should be the primary entity ID being acted on.

### Immutability implementation guidance

Prisma itself does not implement model-level `@@allow` in this stack. Do not introduce ZenStack or another policy framework for this story. The equivalent guard is:

1. Application-level: only export `createAuditLog` and read/query helpers; no update/delete helper; no update/delete API route.
2. Database-level dev SQLite: migration triggers:
   - `CREATE TRIGGER audit_logs_no_update BEFORE UPDATE ON audit_logs BEGIN SELECT RAISE(ABORT, 'audit logs are immutable'); END;`
   - `CREATE TRIGGER audit_logs_no_delete BEFORE DELETE ON audit_logs BEGIN SELECT RAISE(ABORT, 'audit logs are immutable'); END;`
3. Production PostgreSQL note for Story 6.6: equivalent `BEFORE UPDATE OR DELETE` trigger raising exception or DB role permissions denying update/delete.

### Existing API and UI contracts to preserve

- `PATCH /api/admin/subscriptions/[id]` currently returns `{ data: updatedSubscription }` and can return `EMAIL_FAILED`; preserve shape.
- `PATCH /api/admin/opportunities/[id]/verify` returns `{ data: updated, pendingSecondVerification }`; preserve shape.
- `PATCH /api/admin/opportunities/[id]` returns `{ data: AdminOpportunity }`; `DELETE` returns `{ data: { ok: true } }`; preserve shape.
- Document endpoints return signed URL JSON for preview/download and must not expose R2 keys in responses beyond already-authorized internal flows.
- Admin UI text is French; keep `/admin/dashboard`, `/admin/subscriptions`, `/admin/opportunities` links working.

### Previous Story Intelligence

From Story 6.3:

- Story 6.3 intentionally deferred durable audit logs to Story 6.4. It added admin update/delete routes and document management; instrument those instead of rebuilding them.
- Admin pages do not use premium access gates; use `auth()` + Prisma role check.
- Document metadata/R2 security is sensitive: do not log `r2Key`, signed URLs, filenames, or document metadata in audit metadata.
- New admin endpoints must parse invalid JSON in a dedicated `try/catch` and return `400`.
- `VerificationStatus` uses `EN_COURS`, not `IN_REVIEW`.
- Double-verification and notification side effects must be idempotent (`current !== next`).
- Validation commands that passed in Story 6.3: `prisma validate`, targeted tests, full `npx vitest run`, and `npm run build`.

From Story 6.2:

- Admin dashboard now uses `/admin/dashboard`; `/admin` is an alias/redirect.
- Admin metrics should not be refactored for this story. Use the existing admin layout and route pattern.
- `npm run lint` may have unrelated pre-existing issues; if run, distinguish new issues from existing ones.

From Stories 3.2/3.3:

- Avoid reintroducing document metadata exposure and client-trusted R2 key issues.
- Admin status routes already had review findings around invalid JSON and unknown actions; mirror robust parsing in the new audit API.
- Do not include `dev.db` in commits; prior review had to revert it.

### Git Intelligence Summary

Recent commits before story creation:

- `4577c80 fix(review): sync admin document counter`
- `af64b85 feat(admin): implement story 6-3 opportunity document management`
- `8a44727 docs(bmad): create story 6-3 document management and opportunity editing`
- `6d1c98b chore: complete review for story 6.2`
- `2ecac03 chore(bmad): mark story 6-2 ready for review`

Pattern to follow: story context commit first, implementation commit later, review/status commit after validation. Keep BMAD artifacts and code changes scoped; avoid broad refactors.

### Latest Tech Information

Current `package.json` verified on 2026-05-22: Next `16.2.6`, React `19.2.4`, Prisma `^7.8.0`, next-auth `^5.0.0-beta.31`, TailwindCSS `^4`, Vitest `^4.1.6`. Do not upgrade dependencies in this story.

### Project Structure Notes

Files likely to touch:

- `prisma/schema.prisma` — add `AuditLog` and relation.
- `prisma/migrations/<timestamp>_add_audit_logs/migration.sql` — table/indexes/triggers.
- `src/lib/sanitize-log.ts` — extend redaction for audit metadata.
- `src/lib/audit-log.ts` — new create/query helper and action constants.
- `src/app/api/admin/audit/route.ts` — new paginated read API.
- `src/app/(admin)/admin/audit/page.tsx` — new admin audit page.
- `src/app/(admin)/admin/layout.tsx` — add navigation link.
- Existing mutation endpoints to instrument: `src/app/api/admin/subscriptions/[id]/route.ts`, `src/app/api/admin/opportunities/[id]/verify/route.ts`, `src/app/api/admin/opportunities/[id]/route.ts`, `src/app/api/admin/users/[id]/tier/route.ts`, `src/app/api/admin/users/[id]/verify/route.ts`, and document delete route if admin deletion should be audited.
- Tests near touched files: `src/app/api/admin/audit/route.test.ts`, `src/lib/audit-log.test.ts`, `src/lib/sanitize-log.test.ts`, existing route tests for subscriptions/opportunities/users/documents.

Files to avoid unless strictly necessary:

- `src/middleware.ts`, `src/lib/auth.config.ts`, `src/lib/auth.ts` — no auth architecture change needed.
- `src/app/(dashboard)/**` member pages — audit viewer is admin-only.
- Admin dashboard analytics components — not part of audit UI.
- R2 upload internals except for audit-safe document delete instrumentation.

### Testing Requirements

Minimum validation expected before dev-story completion:

- `./node_modules/.bin/prisma validate`
- Migration apply/check in the local test DB flow used by the project.
- Targeted tests for `src/lib/audit-log.ts` and `src/lib/sanitize-log.ts`.
- Targeted API tests for `/api/admin/audit`.
- Existing admin mutation route tests updated to assert audit creation.
- Immutability test for DB trigger failure on update/delete.
- `npx vitest run`
- `npm run build`

If `npm run lint` is run, document pre-existing unrelated lint warnings separately and fix any lint introduced by this story.

### References

- `_bmad-output/planning-artifacts/epics.md` lines 1013-1120: Epic 6 objective and Story 6.4 AC.
- `_bmad-output/planning-artifacts/prd.md` lines 174-195: trust/compliance context CENTIF-CI/APDP and audit need.
- `_bmad-output/planning-artifacts/prd.md` lines 308-315: FR39 admin actions audit logs.
- `_bmad-output/planning-artifacts/prd.md` lines 336-347: NFR-S8/NFR-S9 security/audit requirements.
- `_bmad-output/planning-artifacts/architecture.md` lines 71-87: brownfield stack and Auth.js/Prisma/Next.js constraints.
- `_bmad-output/planning-artifacts/architecture.md` lines 171-190: auth/security and audit trail requirement.
- `_bmad-output/planning-artifacts/architecture.md` lines 192-216: API response/error patterns.
- `_bmad-output/planning-artifacts/architecture.md` lines 369-390: JSX guardrail and idempotent side effects.
- `_bmad-output/planning-artifacts/architecture.md` lines 520-537: Prisma-only data boundary and integration patterns.
- `_bmad-output/implementation-artifacts/6-3-gestion-des-documents-et-edition-des-opportunites.md`: latest admin API/UI patterns and Story 6.3 learnings.
- `prisma/schema.prisma`: current schema verified; no `AuditLog` model exists.
- `src/lib/sanitize-log.ts`: existing sanitation utility to extend.
- `src/app/(admin)/admin/layout.tsx`: admin navigation to extend.

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
