---
Story: "6.5"
StoryKey: "6-5-gestion-des-utilisateurs-et-emails-admin"
Title: "Gestion des Utilisateurs et Emails Admin"
Status: "review"
Priority: "P1"
Epic: "Epic 6 — Administration et Back-office"
FRs: ["FR7", "FR40", "FR39", "FR44"]
NFRs: ["NFR-S5", "NFR-S8", "NFR-S9", "NFR-P2", "NFR-I2", "NFR-A1", "NFR-A3"]
UXDRs: ["UX-DR13", "UX-DR16", "UX-DR17", "UX-DR18", "UX-DR19", "UX-DR20", "UX-DR24", "UX-DR25", "UX-DR26", "UX-DR34"]
Created: "2026-05-22"
---

# Story 6.5: Gestion des Utilisateurs et Emails Admin

Status: review

<!-- Note: Ultimate context engine analysis completed - comprehensive developer guide created. Brownfield/delta story: admin route group, `/admin/members` page, user tier/verification admin routes, Resend utilities, and Story 6.4 audit trail already exist. Extend existing code; do not rebuild admin auth, subscriptions, audit, dashboard, or email infrastructure. -->

## Story

En tant qu'administrateur IBC,
je veux gérer les comptes utilisateurs et envoyer des emails de confirmation,
afin d'assurer le support et la modération de la communauté.

## Acceptance Criteria

1. **Page `/admin/members` protégée et alignée avec le layout admin**
   - Given un utilisateur non authentifié visite `/admin/members`,
   - When la page se charge,
   - Then il est redirigé vers `/auth/signin`.
   - Given un utilisateur authentifié non-admin visite `/admin/members`,
   - When la page se charge,
   - Then il est redirigé vers `/dashboard` ou reçoit l'accès refusé cohérent avec les autres pages admin.
   - Given un admin authentifié visite `/admin/members`,
   - When la page se charge,
   - Then il voit la page « Membres » dans le layout admin existant, sans `getUserPremiumAccess()` ni gate premium membre.
   - And le lien « Membres » déjà présent dans `src/app/(admin)/admin/layout.tsx` continue de fonctionner.

2. **Liste complète des utilisateurs avec données requises**
   - Given l'admin consulte `/admin/members`,
   - When des utilisateurs existent,
   - Then une table responsive affiche pour chaque utilisateur : avatar, nom, email, tier, statut abonnement, statut compte, date d'inscription, et actions disponibles.
   - And le statut abonnement provient de l'abonnement le plus récent de l'utilisateur (`subscriptions` triées par `createdAt desc`) avec label français : `TRIAL`, `PENDING`, `ACTIVE`, `PAST_DUE`, `CANCELLED`, ou « Aucun abonnement ».
   - And les dates sont formatées en `fr-FR` et les textes UI restent en français.
   - And si aucun utilisateur n'existe ou si un filtre ne retourne rien, un état vide français s'affiche au lieu d'un écran blanc.

3. **Modèle de statut compte utilisateur distinct de la vérification**
   - Given `prisma/schema.prisma`,
   - When la story est implémentée,
   - Then le compte utilisateur possède un statut explicite `ACTIVE` / `SUSPENDED` distinct de `verificationStatus`.
   - And `verificationStatus` n'est pas réutilisé pour la suspension : il reste réservé à la vérification/KYC (`PENDING`, `EN_COURS`, `VERIFIED`, `REJECTED`).
   - And une migration Prisma ajoute le nouveau statut avec valeur par défaut `ACTIVE` sans modifier les données métier existantes.

4. **Suspension d'un utilisateur**
   - Given l'admin sur `/admin/members`,
   - When il clique « Suspendre » sur un compte actif,
   - Then le compte passe à `SUSPENDED`, un feedback succès est affiché, et la liste se rafraîchit.
   - And l'utilisateur suspendu ne peut plus se connecter via credentials ni Google OAuth.
   - And les sessions/requêtes protégées existantes de l'utilisateur suspendu sont rejetées dès la prochaine requête serveur protégée et redirigées vers `/auth/signin?error=AccountSuspended` ou un message français équivalent.
   - And l'admin ne peut pas se suspendre lui-même via l'UI/API, afin d'éviter un lockout admin accidentel.

5. **Réactivation d'un utilisateur suspendu**
   - Given l'admin sur `/admin/members`,
   - When il clique « Réactiver » sur un compte suspendu,
   - Then le compte repasse à `ACTIVE`, un feedback succès est affiché, et l'utilisateur peut à nouveau se connecter.
   - And l'action est idempotente : réactiver un compte déjà actif ou suspendre un compte déjà suspendu ne spamme pas les emails/audit logs; l'API retourne un résultat stable ou un `409 INVALID_TRANSITION` français.

6. **Email admin de confirmation d'abonnement**
   - Given l'admin sur `/admin/members`,
   - When il clique « Envoyer email de confirmation » pour un membre disposant d'une adresse email,
   - Then un email est envoyé via Resend avec le sujet exact : `Votre abonnement IBC est confirmé`.
   - And l'email réutilise les patterns de `src/lib/email.ts` (`getResendClient`, `getSender`, greeting, lien dashboard) au lieu d'instancier une seconde logique Resend.
   - And si Resend échoue ou `RESEND_API_KEY` est absent, l'API retourne une erreur française structurée sans exposer la clé, le payload complet ou l'erreur brute.

7. **Audit logs pour toutes les actions admin de cette story**
   - Given Story 6.4 fournit `safeCreateAuditLog` dans `src/lib/audit-log.ts`,
   - When l'admin suspend, réactive ou envoie un email de confirmation,
   - Then un audit log durable est créé avec `actorId`, `action`, `entityType = "User"`, `entityId = userId`, `metadata` sanitizée, et `createdAt` automatique.
   - And les actions utilisent des constantes stables ajoutées à `AUDIT_ACTIONS`, par exemple `USER_SUSPEND`, `USER_REACTIVATE`, `USER_CONFIRMATION_EMAIL_SEND`.
   - And `metadata` inclut uniquement des IDs/flags utiles (`previousStatus`, `nextStatus`, `targetUserId`, `subscriptionId`, `subscriptionStatus`, `tier`, `emailSent: true`) et ne stocke pas email complet, token, cookie, secret, payload Resend brut, ni contenu sensible.
   - And le log de suspension/réactivation est créé immédiatement après la mutation DB réussie; l'échec non bloquant du helper d'audit est géré par `safeCreateAuditLog`.

8. **API admin robuste et sécurisée**
   - Given une route admin dédiée (ex: `PATCH /api/admin/users/[id]/status` ou `POST /api/admin/users/[id]/status`),
   - When une requête non authentifiée est envoyée,
   - Then elle retourne `401` JSON français.
   - When une requête non-admin est envoyée,
   - Then elle retourne `403` JSON français.
   - When une action invalide, un ID inexistant, un auto-suspend admin, ou une transition invalide est envoyé,
   - Then l'API retourne respectivement `400`, `404`, `400/409`, ou `409` avec message français et sans erreur interne.
   - And les handlers utilisent `auth()` depuis `@/lib/auth`, `prisma` depuis `@/lib/prisma`, validation Zod ou validation explicite typée, et le format de réponse du projet : succès `{ data: ... }`, erreur `{ error: string, code?: string, details?: ... }`.

9. **UX responsive, accessible et conforme Next.js 16**
   - Given l'admin utilise la page sur mobile,
   - When il consulte et déclenche des actions,
   - Then la table est dans un conteneur `overflow-x-auto` ou une présentation mobile équivalente, les boutons ont des cibles tactiles ≥ 44px, le focus est visible, et les actions destructives sont clairement identifiées.
   - And les actions destructives (« Suspendre ») demandent une confirmation explicite via `Dialog`/formulaire ou confirmation accessible avant mutation.
   - And tous les JSX conditionnels utilisent des ternaires, jamais `&&`; les booléens composés sont pré-calculés avant le `return`.

10. **Tests et validation de non-régression**
   - Given cette story touche auth, admin et email,
   - When l'implémentation est terminée,
   - Then les tests couvrent : page `/admin/members` auth/admin gate, affichage avatar/nom/email/tier/statut abonnement/statut compte/date/actions, API suspension/réactivation 401/403/404/invalid transition/self-suspend/success, blocage credentials pour `SUSPENDED`, blocage OAuth/sign-in callback pour `SUSPENDED`, envoi email confirmation via Resend mocké, audit logs des trois actions, absence de données sensibles dans metadata, et idempotence/no duplicate audit pour NOOP.
   - And `./node_modules/.bin/prisma validate`, migration test locale, tests ciblés, `npx vitest run`, et `npm run build` passent ou les échecs préexistants hors scope sont documentés.
   - And aucun fichier binaire DB (`dev.db`, `*.sqlite3`) n'est ajouté au commit.

## Tasks / Subtasks

- [x] **AC3: Ajouter un statut compte utilisateur distinct**
  - [x] Auditer `prisma/schema.prisma`; confirmer que `User` n'a actuellement que `verificationStatus` et aucun `status` compte.
  - [x] Ajouter un enum Prisma dédié, par exemple `UserStatus { ACTIVE SUSPENDED }`, et un champ `status UserStatus @default(ACTIVE)` sur `User`.
  - [x] Ajouter un index si utile pour filtrage admin, par exemple `@@index([status, createdAt])` si supporté sans perturber les maps existants.
  - [x] Générer une migration Prisma explicite (ex: `add_user_account_status`) avec default `ACTIVE` pour tous les comptes existants.
  - [x] Régénérer le client Prisma selon le workflow existant et ne jamais committer `dev.db` ou `*.sqlite3`.

- [x] **AC4/AC5/AC8: Créer la mutation admin suspension/réactivation**
  - [x] Ajouter une route dédiée sous `src/app/api/admin/users/[id]/status/route.ts` (recommandé) ou étendre proprement une route existante sans casser `tier`/`verify`.
  - [x] Authentifier via `auth()` puis vérifier `role === "ADMIN"` en DB, comme les routes admin existantes.
  - [x] Accepter uniquement `action: "suspend" | "reactivate"` via JSON validé; gérer JSON invalide en `400` français.
  - [x] Refuser l'auto-suspension de l'admin courant.
  - [x] Vérifier l'existence du target user avec `select` minimal (`id`, `status`, `role`, `email`, `name`, `tier`).
  - [x] Muter `User.status` en `SUSPENDED` ou `ACTIVE`; préserver `role`, `tier`, `verificationStatus`, abonnements, opportunités et reviews.
  - [x] Respecter idempotence : ne pas créer d'audit log si `previousStatus === nextStatus`; retourner `409 INVALID_TRANSITION` ou `{ data: { status, changed: false } }` de façon testée.
  - [x] Appeler `safeCreateAuditLog` immédiatement après mutation réussie avec action `USER_SUSPEND` ou `USER_REACTIVATE`.

- [x] **AC4/AC5: Bloquer login et prochaines requêtes des comptes suspendus**
  - [x] Credentials : dans `src/lib/auth.ts`, après chargement user et avant comparaison/return finale, refuser `status === "SUSPENDED"`.
  - [x] OAuth : ajouter/adapter un callback NextAuth côté Node config pour refuser la connexion si l'email correspond à un utilisateur `SUSPENDED`; préserver le single-object spread pattern Auth.js v5 (`NextAuth({ ...authConfig, ...overrides })`) et ne pas importer Prisma dans `auth.config.ts`.
  - [x] JWT/session : ajouter `status` aux claims si nécessaire pour l'UI, mais ne pas se fier à un vieux JWT pour autoriser un compte suspendu.
  - [x] Requêtes protégées existantes : ajouter un helper serveur réutilisable ou une vérification DB minimale dans les layouts/API sensibles pour rediriger/retourner `403 ACCOUNT_SUSPENDED` dès la prochaine requête. Ne pas importer Prisma dans middleware Edge.
  - [x] Documenter/implémenter le comportement de « logout » réaliste avec JWT strategy : l'utilisateur est rejeté à la prochaine requête serveur protégée et invité à se reconnecter; ne pas prétendre que supprimer `Session` suffit, car le projet utilise `session: { strategy: "jwt" }`.

- [x] **AC2/AC9: Remplacer/compléter la page `/admin/members` existante**
  - [x] Lire complètement `src/app/(admin)/admin/members/page.tsx` avant modification; préserver auth/admin guard et route `/admin/members`.
  - [x] Charger les utilisateurs avec `image`, `name`, `email`, `tier`, `status`, `createdAt`, et `subscriptions: { orderBy: { createdAt: "desc" }, take: 1, select: { id, status, tier, providerRef, createdAt } }`.
  - [x] Afficher avatar (image si disponible, initiales fallback), nom, email, tier, statut abonnement, statut compte, date d'inscription, actions.
  - [x] Ajouter des labels français pour tiers, account status et subscription status.
  - [x] Ajouter des actions accessibles : « Suspendre » si actif, « Réactiver » si suspendu, « Envoyer email de confirmation ».
  - [x] Pour « Suspendre », utiliser confirmation accessible (`Dialog` shadcn ou formulaire client clair) avant action destructive.
  - [x] Ajouter feedback success/error via toast si client component, ou message query param si server forms; garder les boutons `min-h-11`.
  - [x] Optionnel mais utile : recherche simple par nom/email et filtre statut compte via query params; ne pas dépasser le scope si temps limité.

- [x] **AC6: Ajouter l'email admin de confirmation**
  - [x] Étendre `src/lib/email.ts` avec une fonction dédiée, par exemple `sendAdminSubscriptionConfirmationEmail({ to, name, tier })`.
  - [x] Réutiliser `getResendClient()`, `getSender()`, `greeting()`, `tierLabel()` et `dashboardLine()` existants; ne pas créer un second client Resend ailleurs.
  - [x] Sujet exact obligatoire : `Votre abonnement IBC est confirmé`.
  - [x] Texte recommandé : confirmer que l'abonnement IBC est bien confirmé, rappeler le tier si connu, inviter à consulter `/dashboard` via `APP_URL` si configuré.
  - [x] Ajouter route dédiée `POST /api/admin/users/[id]/confirmation-email` ou équivalent, admin-only, qui récupère target user + dernier abonnement pertinent.
  - [x] Retourner `EMAIL_FAILED` en cas d'échec Resend sans exposer erreur brute; logger via `sanitizeError` uniquement.
  - [x] Créer l'audit log `USER_CONFIRMATION_EMAIL_SEND` après succès Resend avec metadata sanitizée (`subscriptionId`, `subscriptionStatus`, `tier`, `emailSent: true`).

- [x] **AC7: Étendre l'audit Story 6.4 sans le réinventer**
  - [x] Lire `src/lib/audit-log.ts`; ajouter seulement les nouvelles constantes `USER_SUSPEND`, `USER_REACTIVATE`, `USER_CONFIRMATION_EMAIL_SEND` à `AUDIT_ACTIONS`.
  - [x] Utiliser `safeCreateAuditLog` depuis `@/lib/audit-log`. Le brief mentionne `src/lib/audit.ts`, mais le codebase actuel expose le helper dans `src/lib/audit-log.ts`; ne pas créer de helper parallèle.
  - [x] Ne jamais stocker email complet, payload Resend, cookies, tokens, secrets, ou erreurs brutes dans metadata.
  - [x] Ajouter/mettre à jour tests `src/lib/audit-log.test.ts` ou tests de route pour vérifier action/entity/metadata.

- [x] **AC8/AC10: Tests ciblés et validation**
  - [x] Ajouter tests API pour `src/app/api/admin/users/[id]/status/route.ts`: 401, 403, invalid JSON/body, user missing, self-suspend, suspend success, reactivate success, idempotence/no duplicate audit.
  - [x] Ajouter tests API pour `confirmation-email`: 401, 403, user missing/no email if applicable, Resend success, Resend failure, audit success metadata.
  - [x] Mettre à jour tests Auth (`src/lib/auth.test.ts` ou nouveau test) pour credentials `SUSPENDED` refusé et OAuth/signIn callback refusé.
  - [x] Ajouter/mettre à jour test page `/admin/members` si le projet a déjà un pattern React Testing Library pour pages admin; sinon tester les composants client extraits.
  - [x] Vérifier que les tests n'utilisent pas de secrets Resend réels; mocker `resend` comme dans `src/lib/email.test.ts`.
  - [x] Exécuter `./node_modules/.bin/prisma validate`.
  - [x] Exécuter tests ciblés des fichiers modifiés.
  - [x] Exécuter `npx vitest run`.
  - [x] Exécuter `npm run build`.
  - [x] Avant commit dev-story, utiliser `git add -A -- . ':!dev.db' ':!*.sqlite3'` ou ajouter explicitement les fichiers, jamais `git add -A` seul.

## Dev Notes

### Delta scope — ce qui existe déjà et ne doit pas être réinventé

État actuel vérifié dans le codebase :

- `src/app/(admin)/admin/layout.tsx` existe avec navigation vers `/admin/dashboard`, `/admin/members`, `/admin/subscriptions`, `/admin/opportunities`, `/admin/audit`. Ne pas reconstruire le layout; conserver le lien « Membres ».
- `src/app/(admin)/admin/members/page.tsx` existe déjà mais est minimal : il affiche nom, email, tier, rôle, `verificationStatus`, date et action « Vérifier ». Cette story doit l'étendre/remplacer proprement pour afficher avatar, statut abonnement, statut compte et nouvelles actions.
- `src/app/api/admin/users/[id]/tier/route.ts` et `src/app/api/admin/users/[id]/verify/route.ts` existent et utilisent déjà `safeCreateAuditLog`; ne pas casser ces routes.
- `src/lib/email.ts` existe avec Resend, sender, greeting, helpers subscription/opportunity. Étendre ce fichier; ne pas créer de second wrapper Resend.
- `src/lib/audit-log.ts` existe depuis Story 6.4 avec `AUDIT_ACTIONS`, `createAuditLog`, `safeCreateAuditLog`, `queryAuditLogs`. Utiliser ce helper pour toutes les actions admin de cette story.
- `prisma/schema.prisma` contient déjà `AuditLog`, `Subscription`, `Payment`, `User`, `Session`. `User` n'a actuellement aucun statut `ACTIVE/SUSPENDED`; ajouter un statut dédié.
- Le projet utilise Auth.js v5 avec JWT strategy (`session: { strategy: "jwt" }`). Les lignes de session DB ne sont pas la source de vérité pour déconnecter un utilisateur; il faut bloquer le compte au niveau Auth/serveur.

### Story foundation from Epic 6 / PRD

Story 6.5 couvre FR7 et FR40 : l'admin doit lister/suspendre/réactiver les comptes utilisateurs et envoyer un email de confirmation de virement/abonnement. Le PRD rattache aussi cette zone à FR39/NFR-S9 : les actions admin critiques doivent être tracées. Toutes les interfaces destinées aux admins restent en français et non premium-gated.

### Architecture / security guardrails

- Stack réelle vérifiée : Next.js `16.2.6`, React `19.2.4`, Prisma `^7.8.0`, Auth.js `^5.0.0-beta.31`, Resend `^6.12.3`, TailwindCSS 4, Vitest `^4.1.6`.
- Prisma 7 : importer les types depuis `@/generated/prisma/client` si nécessaire et utiliser le singleton `prisma` depuis `src/lib/prisma.ts`; ne pas instancier un nouveau PrismaClient.
- Auth.js v5 : conserver le single-object spread pattern `NextAuth({ ...authConfig, ... })`; ne jamais importer Prisma/bcrypt dans `src/lib/auth.config.ts` ou `src/middleware.ts` Edge.
- Admin pages/API : rôle `ADMIN`, pas de `getUserPremiumAccess()` ni `PremiumAccessBlockedPanel`; ces gates premium concernent les pages membre sous `(dashboard)`.
- API response pattern : succès `{ data: T }`; erreur `{ error: string, code?: string, details?: ... }` avec status 400/401/403/404/409/500.
- NFR-S8 : ne jamais logger ni stocker email complet inutile, mot de passe, tokens, cookies, secrets, payload Resend brut, URLs signées, ou erreurs brutes.
- NFR-P2 : les API protégées doivent rester rapides; utiliser `select` minimal et éviter de charger toutes les relations profondes des utilisateurs.
- Next.js 16 strict JSX : ne jamais utiliser `&&` en JSX; utiliser ternaires et booléens composés pré-calculés.
- Aucun binaire DB en git : ne pas ajouter `dev.db` ou `*.sqlite3`.

### Current code file notes for likely UPDATE files

- `prisma/schema.prisma`: ajouter enum `UserStatus` et champ `User.status`; préserver `verificationStatus` et toutes les relations existantes (`auditLogs`, `subscriptions`, etc.).
- `src/lib/auth.ts`: credentials authorize charge actuellement `user` par email, vérifie `passwordHash`, compare bcrypt puis retourne id/email/name/tier/role. Ajouter le check `status !== SUSPENDED`; ajouter/adapter callback OAuth côté Node sans contaminer `auth.config.ts`.
- `src/lib/auth.config.ts`: Edge-compatible, callbacks JWT/session/authorized actuels sans Prisma. Ne pas ajouter de DB lookup ici. Si un claim `status` est ajouté, il doit rester purement token/session.
- `src/app/(admin)/admin/members/page.tsx`: page serveur admin existante. Elle doit charger image + abonnement récent + statut compte, afficher des actions, et probablement déléguer les boutons interactifs à un composant client dédié sous `src/components/` ou `src/components/features/admin/`.
- `src/lib/email.ts`: fonctions privées `getResendClient`, `getSender`, `greeting`, `tierLabel`, `dashboardLine`. Ajouter la nouvelle fonction ici pour pouvoir la tester avec les mocks existants.
- `src/lib/audit-log.ts`: ajouter constantes d'action seulement; garder `safeCreateAuditLog` non bloquant.
- `src/app/api/admin/users/[id]/tier/route.ts` et `verify/route.ts`: routes existantes au style POST/formData, audit déjà présent. Ne pas les détourner pour le statut compte sauf si le contrat reste clair et testé.

### Recommended API shapes

Status route example:

```ts
PATCH /api/admin/users/[id]/status
body: { "action": "suspend" } | { "action": "reactivate" }

200 { data: { id: string, status: "ACTIVE" | "SUSPENDED", changed: true } }
409 { error: "Transition invalide ...", code: "INVALID_TRANSITION" }
```

Confirmation email route example:

```ts
POST /api/admin/users/[id]/confirmation-email

200 { data: { ok: true, emailSent: true } }
500 { error: "L'email de confirmation n'a pas pu être envoyé.", code: "EMAIL_FAILED" }
```

### Account suspension and JWT reality check

Because this project uses JWT sessions, a suspension mutation cannot truly delete all existing sessions by deleting rows from `Session`; existing JWT cookies can still exist until checked. The implementation must therefore:

1. Prevent new credentials sign-ins by checking `User.status` in `Credentials.authorize`.
2. Prevent new OAuth sign-ins by checking existing `User.status` in a Node-side Auth callback.
3. Reject suspended accounts on server-rendered protected pages/API routes through a DB-backed guard/helper or layout check.
4. Redirect suspended members to sign-in or an account suspended message on the next protected request.

Do not import Prisma into middleware Edge to solve this. If a middleware-level solution is desired, it must remain Edge-safe and be justified/tested, but a server-side guard is the safer MVP approach.

### Audit action naming guidance

Add stable uppercase action strings:

- `USER_SUSPEND`
- `USER_REACTIVATE`
- `USER_CONFIRMATION_EMAIL_SEND`

Use `entityType = "User"` and `entityId = target user id`. Keep metadata minimal and sanitized:

```ts
{
  previousStatus: "ACTIVE",
  nextStatus: "SUSPENDED",
  targetUserId: user.id,
  tier: user.tier,
}
```

For email success:

```ts
{
  targetUserId: user.id,
  subscriptionId: latestSubscription?.id,
  subscriptionStatus: latestSubscription?.status,
  tier: latestSubscription?.tier ?? user.tier,
  emailSent: true,
}
```

### Previous Story Intelligence

From Story 6.4:

- Durable audit logs now exist and are immutable. This story must use `safeCreateAuditLog` rather than console-only logs or duplicate helpers.
- Audit logs must be created immediately after successful critical DB mutations; later side-effect failures must not erase compliance traces.
- Metadata must be sanitized and minimal; Story 6.4 review specifically fixed cases where side-effect failures skipped audit logging.
- Admin pages are server components with `auth()` + Prisma role check; no premium gate.
- `npm run lint` may still show pre-existing unrelated issues; distinguish new issues from existing ones.

From Story 6.3 / earlier admin work:

- Admin route group and dashboard patterns already exist; use `/admin/dashboard` and existing sidebar.
- Invalid JSON in admin APIs should be caught explicitly and returned as `400` with French text.
- Avoid broad refactors of opportunities/subscriptions/documents while implementing members management.
- Do not include `dev.db` in commits; prior review had to guard against DB binaries.

### Git Intelligence Summary

Recent commits before story creation:

- `49c563a chore(bmad): mark story 6-4 review — CR patches applied`
- `586b88c fix(admin): CR patch — audit log before email side effects + test assertions`
- `80d4a55 feat(admin): implement audit logs compliance trail`
- `625cf43 docs(bmad): create story 6-4 audit logs`
- `4577c80 fix(review): sync admin document counter`

Pattern to follow: story context commit first, implementation commit later, review/status commit after validation. Keep BMAD artifacts and code changes scoped.

### Latest Tech Information

Verified locally via `npm view` on 2026-05-22:

- `next` latest is `16.2.6`, matching project.
- `prisma` latest is `7.8.0`, matching project range.
- `resend` latest is `6.12.3`, matching project range.
- `next-auth` has `beta` dist-tag `5.0.0-beta.31` used by this project; npm `latest` is v4, but the architecture deliberately uses Auth.js v5 beta split config. Do not downgrade or upgrade auth dependencies in this story.

### Project Structure Notes

Files likely to touch:

- `prisma/schema.prisma` — add account status enum/field/index.
- `prisma/migrations/<timestamp>_add_user_account_status/migration.sql` — migration for user status.
- `src/lib/auth.ts` — deny suspended users for credentials and OAuth sign-in; keep Auth.js v5 single-object spread pattern.
- `src/lib/email.ts` and `src/lib/email.test.ts` — add/test admin confirmation email function.
- `src/lib/audit-log.ts` and related tests — add action constants / assert metadata.
- `src/app/(admin)/admin/members/page.tsx` — extend members table.
- Optional client component for member actions, e.g. `src/components/features/admin/member-actions.tsx` or `src/components/admin-member-actions.tsx`.
- New APIs: `src/app/api/admin/users/[id]/status/route.ts` and `src/app/api/admin/users/[id]/confirmation-email/route.ts` plus tests.
- Potential shared guard helper for suspended users, under `src/lib/` if repeated across dashboard/admin/API code.

Files to avoid unless strictly necessary:

- `src/middleware.ts` and `src/lib/auth.config.ts` — Edge runtime; no Prisma/bcrypt.
- `src/app/api/admin/subscriptions/[id]/route.ts` — email confirmation here already concerns subscription validation; do not refactor it unless reusing types only.
- Opportunity/document admin routes — not part of this story.
- Admin analytics/dashboard components — not part of member management.

### Testing Requirements

Minimum validation expected before dev-story completion:

- `./node_modules/.bin/prisma validate`
- Migration apply/check in the local test DB flow used by the project.
- Targeted tests for new admin user status and confirmation email routes.
- Targeted tests for `src/lib/email.ts` new function.
- Auth tests proving suspended users cannot sign in via credentials and OAuth callback.
- Page/component tests for `/admin/members` display and action button states if feasible.
- Audit tests/assertions for `USER_SUSPEND`, `USER_REACTIVATE`, `USER_CONFIRMATION_EMAIL_SEND`.
- `npx vitest run`
- `npm run build`

If `npm run lint` is run, document pre-existing unrelated lint warnings separately and fix any lint introduced by this story.

### References

- `_bmad-output/planning-artifacts/epics.md` lines 1013-1016: Epic 6 objective.
- `_bmad-output/planning-artifacts/epics.md` lines 1123-1145: Story 6.5 source AC.
- `_bmad-output/planning-artifacts/epics.md` lines 83-90 and 222-255: FR35-FR40 admin coverage, including FR7 and FR40.
- `_bmad-output/planning-artifacts/prd.md` lines 257-268: FR7 user suspension/reactivation.
- `_bmad-output/planning-artifacts/prd.md` lines 308-315: FR39/FR40 admin audit/email requirements.
- `_bmad-output/planning-artifacts/prd.md` lines 336-347 and 369-373: security/audit and Resend integration NFRs.
- `_bmad-output/planning-artifacts/architecture.md` lines 71-87: brownfield stack and Auth.js/Prisma constraints.
- `_bmad-output/planning-artifacts/architecture.md` lines 171-190: auth/security and audit trail requirement.
- `_bmad-output/planning-artifacts/architecture.md` lines 192-216: API response/error patterns.
- `_bmad-output/planning-artifacts/architecture.md` lines 369-390: JSX guardrail and idempotent side effects.
- `_bmad-output/planning-artifacts/architecture.md` lines 520-537: Prisma-only data boundary and integration patterns.
- `_bmad-output/implementation-artifacts/6-4-audit-logs-et-conformite.md`: audit helper/actions, review learnings, and admin patterns.
- `src/app/(admin)/admin/members/page.tsx`: existing page to update.
- `src/lib/email.ts`: existing Resend utility to extend.
- `src/lib/audit-log.ts`: existing `safeCreateAuditLog` helper to reuse.

## Dev Agent Record

### Agent Model Used

GPT-5.5 Codex (Hermes Agent)

### Debug Log References

- 2026-05-22: Loaded BMAD dev-story skill, story context, architecture, and sprint status.
- 2026-05-22: Updated sprint status to in-progress before implementation.
- 2026-05-22: Ran `./node_modules/.bin/prisma validate` and `./node_modules/.bin/prisma generate`.
- 2026-05-22: Ran targeted Vitest suite for new/changed auth, email, API, account-status, and admin members page tests: PASS (30).
- 2026-05-22: Ran local migration deploy against a temporary SQLite database: all migrations applied successfully.
- 2026-05-22: Ran full `npx vitest run`: PASS (442).
- 2026-05-22: Ran `npm run build`: PASS.
- 2026-05-22: Ran `npm run lint`: fails only on pre-existing unrelated lint issues in dashboard/opportunity/signup/profile/document/middleware files; introduced lint issue was fixed.

### Completion Notes List

- Added dedicated `UserStatus` account status (`ACTIVE`/`SUSPENDED`) with migration and admin-friendly index, keeping `verificationStatus` reserved for KYC/verification.
- Added admin status mutation API with validated JSON, 401/403/404/400/409 responses, self-suspension guard, idempotence guard, and immediate sanitized audit logs for suspend/reactivate.
- Blocked suspended accounts for credentials sign-in, Google OAuth sign-in, and next protected dashboard server request via a reusable account-status guard.
- Reworked `/admin/members` to show avatar/name/email/tier/latest subscription/account status/registration/actions in a responsive French table without premium gating.
- Added accessible destructive confirmation UI for suspension and admin action feedback/refresh behavior.
- Added Resend-backed admin confirmation email helper with the exact required subject and an admin-only API route with sanitized error handling and audit metadata.
- Added/updated tests for admin APIs, auth suspension paths, email helper, protected request guard, and admin members page display/empty/auth cases.

### File List

- prisma/schema.prisma
- prisma/migrations/20260522093000_add_user_account_status/migration.sql
- src/app/(admin)/admin/members/page.tsx
- src/app/(admin)/admin/members/page.test.tsx
- src/app/(dashboard)/layout.tsx
- src/app/api/admin/users/[id]/status/route.ts
- src/app/api/admin/users/[id]/status/route.test.ts
- src/app/api/admin/users/[id]/confirmation-email/route.ts
- src/app/api/admin/users/[id]/confirmation-email/route.test.ts
- src/components/features/admin/admin-member-actions.tsx
- src/lib/account-status.ts
- src/lib/account-status.test.ts
- src/lib/audit-log.ts
- src/lib/auth.ts
- src/lib/auth.test.ts
- src/lib/email.ts
- src/lib/email.test.ts
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/6-5-gestion-des-utilisateurs-et-emails-admin.md

### Change Log

- 2026-05-22: Story context created and marked ready-for-dev.
- 2026-05-22: Implemented admin member account status management, confirmation email action, suspension blocking, audit logs, tests, validation, and marked story ready for review.
