# Story 21.1 : Mot de Passe Oublié

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

**En tant que** visiteur ou membre inscrit avec un compte credentials,
**Je veux** demander la réinitialisation de mon mot de passe via mon adresse email,
**Afin de** pouvoir définir un nouveau mot de passe sécurisé et récupérer l'accès à mon espace membre.

## Contexte

Cette story est la première de l'**Epic 21 : Gestion des mots de passe**. Elle pose le pattern de token de réinitialisation + email + page de saisie d'un nouveau mot de passe. Les stories 21-2 (changement mot de passe profil) et 21-3 (set-password flow WhatsApp) réutiliseront ce pattern.

**Sources :** [sprint-change-proposal-2026-07-01-password-management.md](../planning-artifacts/sprint-change-proposal-2026-07-01-password-management.md), [epics.md](../planning-artifacts/epics.md), [prd.md](../planning-artifacts/prd.md), [architecture.md](../planning-artifacts/architecture.md), [ux-spec.md](../planning-artifacts/ux-spec.md).

## Acceptance Criteria

### AC1 — Lien depuis la page de connexion

**Given** un visiteur sur la page `/auth/signin`
**When** il clique sur le lien « Mot de passe oublié ? »
**Then** il est redirigé vers `/auth/forgot-password`

### AC2 — Demande de réinitialisation

**Given** un visiteur sur la page `/auth/forgot-password`
**When** il saisit une adresse email valide et soumet le formulaire
**Then** le système génère un token de réinitialisation unique (valable 1 heure, NFR-S11), stocke son hash SHA-256 en base et envoie un email contenant le lien `/auth/reset-password?token=<rawToken>`
**And** un message générique s'affiche : « Si un compte est associé à cet email, un lien de réinitialisation a été envoyé. »

### AC3 — Non-divulgation de l'existence du compte

**Given** un visiteur saisit une adresse email inexistante
**When** il soumet le formulaire
**Then** le même message générique s'affiche (pas de fuite d'information sur l'existence du compte)
**And** aucun email n'est envoyé

### AC4 — Rate limiting forgot-password

**Given** un visiteur tente de spammer l'endpoint `POST /api/auth/forgot-password`
**When** il effectue plus de 3 demandes en 1 minute depuis la même IP
**Then** la 4ème tentative est bloquée avec le statut 429 et le message : « Trop de tentatives. Réessayez dans une minute. » (NFR-S10)

### AC5 — Page reset-password avec token valide

**Given** un utilisateur clique sur le lien de reset dans l'email
**When** il arrive sur `/auth/reset-password?token=<xxx>` avec un token valide
**Then** il voit un formulaire avec : nouveau mot de passe + confirmation
**And** un indicateur de force du mot de passe s'affiche en temps réel (même logique que le signup)

### AC6 — Soumission d'un nouveau mot de passe

**Given** un utilisateur sur la page reset-password avec un token valide
**When** il saisit un nouveau mot de passe (≥ 8 caractères) et sa confirmation identique, puis soumet
**Then** le système : vérifie le token (non expiré, non déjà utilisé), hash le nouveau password avec bcryptjs (coût ≥ 10, NFR-S2), met à jour le `passwordHash` de l'utilisateur, invalide le token (suppression), et redirige vers `/auth/signin` avec un message de succès

### AC7 — Token expiré

**Given** un utilisateur clique sur un lien de reset avec un token expiré (> 1h)
**When** la page charge ou il tente de soumettre un nouveau mot de passe
**Then** un message d'erreur s'affiche : « Ce lien de réinitialisation a expiré. Veuillez en demander un nouveau. »
**And** aucun mot de passe n'est modifié

### AC8 — Token déjà utilisé

**Given** un utilisateur clique sur un lien de reset avec un token déjà utilisé
**When** il tente de soumettre un nouveau mot de passe
**Then** un message d'erreur s'affiche : « Ce lien a déjà été utilisé. »

### AC9 — Pas de régression build/tests

**Given** le code modifié
**When** `npm run build` et `npx vitest run` sont exécutés
**Then** le build passe sans erreur et les tests existants passent (pas de régression)

## Tasks / Subtasks

- [ ] **Task 1 — Modèle de données (AC2/AC6/AC7/AC8)**
  - [ ] 1.1 Décider en DS de l'option retenue (Option A recommandée : étendre `VerificationToken` avec un champ `tokenType`)
  - [ ] 1.2 Créer la migration Prisma et exécuter `npx prisma migrate dev --name add_password_reset_token`
  - [ ] 1.3 Regénérer le client Prisma (`npx prisma generate`)

- [ ] **Task 2 — Validations Zod (AC2/AC5/AC6)**
  - [ ] 2.1 Ajouter `forgotPasswordRequestSchema` dans `src/lib/validations.ts`
  - [ ] 2.2 Ajouter `passwordResetSchema` (password ≥ 8 + confirmation) dans `src/lib/validations.ts`
  - [ ] 2.3 Exporter les types TypeScript correspondants

- [ ] **Task 3 — Email reset password (AC2)**
  - [ ] 3.1 Ajouter `sendPasswordResetEmail({ to, name, token })` dans `src/lib/email.ts`
  - [ ] 3.2 Utiliser `APP_URL` pour construire le lien `/auth/reset-password?token=<token>`
  - [ ] 3.3 S'appuyeur sur le transporter nodemailer/SMTP existant (pas Resend — le projet utilise nodemailer)

- [ ] **Task 4 — API forgot-password (AC2/AC3/AC4)**
  - [ ] 4.1 Créer `src/app/api/auth/forgot-password/route.ts`
  - [ ] 4.2 Valider l'email avec `forgotPasswordRequestSchema`
  - [ ] 4.3 Appliquer `passwordResetRateLimiter` (3/min/IP, déjà défini dans `src/lib/api-rate-limit.ts`)
  - [ ] 4.4 Chercher l'utilisateur par email ; si trouvé et qu'il a un `passwordHash`, générer un token (32 bytes hex → hash SHA-256), expiration 1h, stocker en base
  - [ ] 4.5 Retourner systématiquement 200 avec le message générique, même si l'email n'existe pas
  - [ ] 4.6 Envoyer l'email de reset si l'utilisateur existe

- [ ] **Task 5 — API reset-password (AC5/AC6/AC7/AC8)**
  - [ ] 5.1 Créer `src/app/api/auth/reset-password/route.ts`
  - [ ] 5.2 Valider le body avec `passwordResetSchema`
  - [ ] 5.3 Hasher le token reçu en SHA-256 pour chercher en base
  - [ ] 5.4 Si absent → 400 « Ce lien est invalide. »
  - [ ] 5.5 Si expiré → supprimer le token, retourner 400 « Ce lien de réinitialisation a expiré... »
  - [ ] 5.6 Si valide → hasher le nouveau mot de passe avec bcryptjs (coût 12 pour cohérence avec signup), mettre à jour `passwordHash`, supprimer le token, retourner 200

- [ ] **Task 6 — Pages UI (AC1/AC2/AC5/AC6/AC7/AC8)**
  - [ ] 6.1 Créer `src/app/auth/forgot-password/page.tsx` (formulaire email + message générique + lien retour signin)
  - [ ] 6.2 Créer `src/app/auth/reset-password/page.tsx` (lecture du token en query param, formulaire password + confirmation, indicateur de force, gestion des états erreur/expiré/utilisé)
  - [ ] 6.3 Ajouter le lien « Mot de passe oublié ? » sous le champ password dans `src/app/auth/signin/page.tsx`
  - [ ] 6.4 Gérer le message de succès sur `/auth/signin?reset=success`

- [ ] **Task 7 — Tests (AC9)**
  - [ ] 7.1 Créer `src/app/api/auth/forgot-password/route.test.ts` (cas nominaux, email inexistant, rate limit, erreur email)
  - [ ] 7.2 Créer `src/app/api/auth/reset-password/route.test.ts` (token valide, expiré, déjà utilisé, password mismatch, validation Zod)
  - [ ] 7.3 Créer `src/app/auth/forgot-password/page.test.tsx` (render, soumission, message générique)
  - [ ] 7.4 Créer `src/app/auth/reset-password/page.test.tsx` (render, token invalide, succès)
  - [ ] 7.5 Exécuter `npm run build` et `npx vitest run` et corriger les régressions

## Dev Notes

### Architecture & patterns à suivre

- **Runtime API :** Route handlers Next.js App Router (`route.ts`) sous `src/app/api/auth/...`
- **Auth middleware :** `src/middleware.ts` utilise `NextAuth(authConfig)` Edge-compatible. Les pages `/auth/*` sont publiques (`auth.config.ts` → `publicRoutes`). Ne pas importer Prisma/bcrypt dans `auth.config.ts`.
- **Session :** JWT avec claims `id`, `role`, `tier`. Pour les routes API, utiliser `auth()` depuis `src/lib/auth.ts` (Node.js runtime) si besoin. forgot-password et reset-password sont publiques, donc pas de session requise.
- **Prisma client :** Toujours importer depuis `@/generated/prisma/client` (alias défini dans `tsconfig.json`).
- **Hashing :** Utiliser `bcryptjs` avec un coût de **12** pour rester cohérent avec `src/app/api/auth/signup/route.ts` (satisfait NFR-S2 ≥ 10).
- **Hashing de token :** Toujours stocker le hash SHA-256 du token, jamais le token en clair. Le token brut ne transite que dans l'email. Voir pattern existant dans `src/lib/verification-email.server.ts` et `src/app/api/auth/verify-email/route.ts`.
- **Rate limiting :** Réutiliser `passwordResetRateLimiter` existant dans `src/lib/api-rate-limit.ts` (3 requêtes/minute/IP). Ne pas créer un nouveau limiter.
- **Emails :** Le projet utilise **nodemailer/SMTP** (`src/lib/email.ts`), pas Resend. Ajouter une nouvelle fonction `sendPasswordResetEmail` dans `src/lib/email.ts` en suivant le pattern existant (`sendEmailVerificationEmail`, `sendWelcomeEmail`).
- **Formulaires :** React Hook Form + Zod, comme `signin/page.tsx` et `signup/page.tsx`. Préférer les composants shadcn/ui (`Input`, `Button`, `Label`) pour la cohérence UX.
- **Validation inline :** indicateur de force du mot de passe identique à celui de `src/app/auth/signup/page.tsx`.
- **Logs :** Toujours passer par `sanitizeError()` de `src/lib/sanitize-log.ts` avant de logger. Ne jamais logger de token ou de password en clair (NFR-S8).
- **Réponses API :** Format `{ data: T }` en succès, `{ error: string, code?: string, details?: ... }` en erreur. Voir `src/app/api/auth/signup/route.ts`.
- **JSX boolean guardrail (Next.js 16 strict) :** ne pas utiliser `&&` dans le JSX. Pré-calculer les booléens composés avant le return.

### Décision modèle de données

Le SCP propose deux options. À trancher en DS, mais **Option A recommandée** car elle réutilise le modèle et les helpers existants :

```prisma
model VerificationToken {
  identifier String   @id @default(cuid())
  token      String   @unique
  expires    DateTime
  userId     String?
  tokenType  String   @default("EMAIL_VERIFICATION") // EMAIL_VERIFICATION | PASSWORD_RESET | SET_PASSWORD
  createdAt  DateTime @default(now())

  user User? @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([identifier, token])
  @@map("verification_tokens")
}
```

Alternative Option B : créer un modèle `PasswordResetToken` dédié. Plus propre mais duplique la logique de token hashing/expiry. Le DS choisira. Quel que soit le choix, il faut pouvoir :
- Rechercher un token par hash SHA-256
- Vérifier son expiration
- Lier le token à un `userId`
- Supprimer le token après utilisation (single-use)

### Fichiers à créer / modifier

**Nouveaux fichiers :**
- `src/app/api/auth/forgot-password/route.ts`
- `src/app/api/auth/reset-password/route.ts`
- `src/app/auth/forgot-password/page.tsx`
- `src/app/auth/reset-password/page.tsx`
- `src/app/api/auth/forgot-password/route.test.ts`
- `src/app/api/auth/reset-password/route.test.ts`
- `src/app/auth/forgot-password/page.test.tsx`
- `src/app/auth/reset-password/page.test.tsx`

**Fichiers à modifier :**
- `prisma/schema.prisma` — ajouter `tokenType` (Option A) ou nouveau modèle (Option B)
- `src/lib/validations.ts` — ajouter les schémas forgot-password et password-reset
- `src/lib/email.ts` — ajouter `sendPasswordResetEmail`
- `src/app/auth/signin/page.tsx` — ajouter le lien « Mot de passe oublié ? »
- `src/app/auth/signin/page.test.tsx` — ajouter un test sur le lien forgot-password

### Tests / qualité

- Couvrir les cas limites : email inexistant, token expiré, token utilisé, rate limit, validation Zod, mismatch password/confirm.
- Ne pas mocker inutilement `bcryptjs` dans les tests de route si on peut injecter `passwordHash` attendu ; sinon mocker comme dans `src/app/api/auth/signup/route.test.ts`.
- Les tests de page utilisent `@testing-library/react` avec mocks `next-auth/react`, `next/navigation` comme dans `src/app/auth/signin/page.test.tsx`.
- Exécuter `npm run build` et `npx vitest run` avant de considérer la story terminée.

### Pitfalls à éviter

- **Réinventer le rate limiting :** `passwordResetRateLimiter` existe déjà dans `src/lib/api-rate-limit.ts`.
- **Utiliser Resend :** Le projet utilise nodemailer/SMTP (`src/lib/email.ts`). Ne pas ajouter de dépendance Resend.
- **Stocker le token en clair :** Toujours stocker `sha256(rawToken)`.
- **Divulguer l'existence du compte :** Retourner le même message pour email existant/inexistant.
- **Single-use token :** Supprimer le token après un reset réussi (AC8).
- **Expirer correctement :** Expiration 1h = `Date.now() + 60 * 60 * 1000`.
- **Edge runtime :** `src/middleware.ts` et `src/lib/auth.config.ts` ne doivent pas importer Prisma/bcrypt.
- **Briser la page signin :** Le lien forgot-password ne doit pas perturber le layout/UX existant ni les tests existants.

## Project Structure Notes

- Routes API publiques : `src/app/api/auth/*`
- Pages publiques auth : `src/app/auth/*`
- Composants UI partagés : `src/components/ui/*`
- Helpers email : `src/lib/email.ts`
- Validations : `src/lib/validations.ts`
- Rate limiters : `src/lib/rate-limit.ts` (factory) + `src/lib/api-rate-limit.ts` (instances)
- Modèle Prisma : `prisma/schema.prisma`

## References

- [PRD §8.1 / FR77, §9.2 / NFR-S10-S12](../planning-artifacts/prd.md)
- [Epic 21 & acceptance criteria](../planning-artifacts/epics.md)
- [SCP — Gestion des Mots de Passe](../planning-artifacts/sprint-change-proposal-2026-07-01-password-management.md)
- [Architecture — Auth split config, API patterns, project structure](../planning-artifacts/architecture.md)
- [UX Spec — Auth pages layout, form patterns, feedback patterns](../planning-artifacts/ux-spec.md)
- Code existant : `src/app/auth/signin/page.tsx`, `src/app/auth/signup/page.tsx`, `src/app/api/auth/verify-email/route.ts`, `src/lib/verification-email.server.ts`, `src/lib/email.ts`, `src/lib/validations.ts`, `src/lib/api-rate-limit.ts`, `prisma/schema.prisma`

## Previous Story Intelligence

- Story 20-1 (fix connexion comptes non vérifiés) est terminée et pushée. Elle a renforcé le flux credentials + vérification email dans `src/lib/auth.ts`.
- Les derniers commits montrent un travail récent sur l'auth, le dashboard, le chat beta et PostHog. Les patterns Auth.js v5 et Prisma 7 sont stables.
- Les tests existants pour `signin`, `signup`, `verify-email`, `send-verification` montrent la convention de mock Prisma/auth/rate-limit à suivre pour les nouvelles route tests.

## Git Intelligence Summary

Derniers commits pertinents :
- `fc492a7` — chore(bmad): epic-21 in-progress, story 21-1 ready-for-dev
- `9e2e777` — chore(bmad): Sprint Change Proposal — Epic 21 password management (FR77-79, NFR-S10-S12)
- `d0987c2` — feat: implement user dashboard page
- `d9861f2` — feat: implement dashboard subscription view and admin API
- `169a1e2` — feat: implement dashboard sidebar and mobile navigation

**Patterns observés :** les stories récentes ajoutent des routes API + pages + tests co-localisés. Les fichiers de configuration BMAD (sprint-status.yaml) sont mis à jour via des commits dédiés.

## Latest Technical Information

- Stack confirmée : Next.js 16.2.6, React 19.2.4, Prisma 7.8.0, Auth.js 5.0.0-beta.31, TailwindCSS 4, bcryptjs 3.0.3, Zod 4.4.3, React Hook Form 7.75.0, nodemailer 7.0.13.
- `@upstash/ratelimit` 2.0.8 et `@upstash/redis` 1.38.0 sont installés ; rate limiting prêt à l'emploi.
- Aucune dépendance Resend dans `package.json` : utiliser nodemailer.
- `output: 'standalone'` est déjà configuré dans `next.config.ts`.

## Dev Agent Record

### Agent Model Used

kimi-k2.7-code (DS + DS fix), kimi-k2.7-code (CR)

### Debug Log References

### Completion Notes List

### File List

- À créer : `src/app/api/auth/forgot-password/route.ts`, `src/app/api/auth/reset-password/route.ts`, `src/app/auth/forgot-password/page.tsx`, `src/app/auth/reset-password/page.tsx`, `src/app/api/auth/forgot-password/route.test.ts`, `src/app/api/auth/reset-password/route.test.ts`, `src/app/auth/forgot-password/page.test.tsx`, `src/app/auth/reset-password/page.test.tsx`
- À modifier : `prisma/schema.prisma`, `src/lib/validations.ts`, `src/lib/email.ts`, `src/app/auth/signin/page.tsx`, `src/app/auth/signin/page.test.tsx`

## Story Completion Status

- Status: **done**
- Note: Ultimate context engine analysis completed — comprehensive developer guide created.
