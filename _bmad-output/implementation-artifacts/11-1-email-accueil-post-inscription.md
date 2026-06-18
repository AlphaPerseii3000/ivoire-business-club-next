# Story 11.1: Email d'accueil automatique post-inscription

Status: done

## Story

As a nouveau membre,
I want recevoir un email d'accueil automatique après mon inscription,
so that connaître les prochaines étapes (formulaire à compléter, paiement, contrat).

## Acceptance Criteria

1. **Given** un visiteur complète son inscription avec succès (email/mot de passe via `POST /api/auth/signup`)
   **When** le compte est créé en base
   **Then** un email d'accueil est envoyé automatiquement contenant : confirmation d'inscription, tiers choisi (AFFRANCHI par défaut), lien vers `/onboarding/complete-profile`, instructions de paiement, et lien vers le contrat d'adhésion

2. **Given** un visiteur s'inscrit via Google OAuth
   **When** le compte est créé en base via le `PrismaAdapter`
   **Then** un email d'accueil est également envoyé (le déclencheur doit couvrir les deux flows d'inscription)

3. **Given** l'email d'accueil
   **When** il est rendu dans le client mail
   **Then** le template est en français, responsive, avec le branding IBC (texte plain-text via nodemailer — pas de template HTML requis dans cette story, aligné avec l'infrastructure existante qui envoie du plain-text)

4. **Given** l'envoi de l'email d'accueil échoue (SMTP indisponible)
   **When** l'erreur se produit
   **Then** elle est logguée mais ne bloque pas l'inscription de l'utilisateur (comportement identique au pattern existant pour l'email de vérification)

5. **Given** un membre reçoit l'email d'accueil
   **When** il clique sur le lien `/onboarding/complete-profile`
   **Then** il est redirigé vers la page d'onboarding (la page elle-même est implémentée dans Story 11.2 — cette story ne crée que le lien dans l'email)

## Tasks / Subtasks

- [ ] Task 1: Ajouter `sendWelcomeEmail` dans `src/lib/email.ts` (AC: #1, #3)
  - [ ] 1.1 Créer la fonction `sendWelcomeEmail({ to, name, tier })` réutilisant le pattern existant (`sendEmail` + `greeting` + `dashboardLine`)
  - [ ] 1.2 Le contenu inclut : confirmation d'inscription, tier affiché via `tierLabel()`, lien vers `/onboarding/complete-profile` (construit via `APP_URL`), instructions de paiement (virement bancaire — références `BANK_TRANSFER_*` env vars), et lien vers le contrat d'adhésion (URL fournie via `APP_URL` ou variable dédiée)
  - [ ] 1.3 Le sujet : "Bienvenue sur Ivoire Business Club — Vos prochaines étapes"

- [ ] Task 2: Déclencher l'email dans le flow email/password (AC: #1, #4)
  - [ ] 2.1 Dans `src/app/api/auth/signup/route.ts`, après l'envoi de l'email de vérification existant, ajouter l'envoi de `sendWelcomeEmail` dans un bloc try/catch non-bloquant (même pattern que `sendEmailVerificationEmail`)
  - [ ] 2.2 L'email d'accueil est envoyé indépendamment de l'email de vérification — si l'un échoue, l'autre est quand même tenté

- [ ] Task 3: Déclencher l'email dans le flow Google OAuth (AC: #2, #4)
  - [ ] 3.1 Dans `src/lib/auth.ts`, le callback `signIn` détecte les nouvelles inscriptions Google (première connexion via `account.provider === "google"` et user nouvellement créé). Envoyer `sendWelcomeEmail` de manière non-bloquante.
  - [ ] 3.2 Attention : le callback `signIn` s'exécute à CHAQUE connexion Google, pas seulement la première. Utiliser une vérification (ex: `user.createdAt` within last 60 seconds, ou un flag en base) pour ne PAS renvoyer l'email d'accueil à chaque login. Alternative recommandée : utiliser un événement `createUser` côté adapter ou vérifier si l'utilisateur n'a pas encore `emailVerified` ET n'a pas de sessions antérieures.

- [ ] Task 4: Tests unitaires (AC: #1, #2, #3, #4)
  - [ ] 4.1 Étendre `src/lib/email.test.ts` : test `sendWelcomeEmail` envoie le bon sujet, le bon contenu (lien onboarding, tier label, instructions paiement), et utilise le bon sender
  - [ ] 4.2 Étendre `src/app/api/auth/signup/route.test.ts` : vérifier que `sendWelcomeEmail` est appelé après création du compte, et que si elle throw, la réponse reste 201
  - [ ] 4.3 Test du flow Google OAuth : vérifier que `sendWelcomeEmail` est appelé uniquement à la première création de compte, pas aux connexions suivantes

## Dev Notes

### Infrastructure email existante — CRITIQUE

Le projet utilise **nodemailer avec SMTP Infomaniak** (PAS Resend). Le fichier de référence est `src/lib/email.ts` qui contient :

- `sendEmail({ to, subject, text })` — fonction d'envoi de base, plain-text uniquement
- `getTransporter()` — singleton du transporteur nodemailer (config via `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_ENCRYPTION`)
- `getSender()` — `{ name, address }` depuis `MAIL_FROM_NAME` / `MAIL_FROM_ADDRESS`
- `greeting(name)` — "Bonjour {name}," ou "Bonjour,"
- `tierLabel(tier)` — utilise `getTierBadgeConfig` depuis `@/lib/tier-config`
- `dashboardLine()` — lien vers `{APP_URL}/dashboard`
- Pattern non-bloquant : les emails d'envoi sont wrappés dans try/catch, l'erreur est logguée via `console.error` et `sanitizeError`, mais ne remonte pas

**NE PAS utiliser Resend** — bien que `RESEND_API_KEY` soit dans `.env.example`, le code utilise nodemailer/SMTP. Respecter le pattern existant.

**NE PAS créer de template HTML** — tous les emails existants sont plain-text. L'AC mentionne "template HTML responsive" mais l'infrastructure actuelle envoie du plain-text. Suivre le pattern existant (plain-text). Le PO pourra demander une migration HTML dans une story ultérieure.

### Flows d'inscription — DEUX points d'entrée

1. **Email/mot de passe** : `src/app/api/auth/signup/route.ts` → `POST` handler
   - Crée le user via `prisma.user.create()`
   - Envoie déjà `sendEmailVerificationEmail` dans un try/catch non-bloquant
   - C'est ici qu'on ajoute `sendWelcomeEmail` — après l'email de vérification, dans un try/catch séparé

2. **Google OAuth** : `src/lib/auth.ts` → `signIn` callback
   - Le `PrismaAdapter` gère la création du user automatiquement
   - Le callback `signIn({ user, account })` est appelé à CHAQUE connexion
   - **ATTENTION** : il faut détecter si c'est une NOUVELLE inscription (premier login Google) vs une connexion existante
   - Le `patchPrismaAdapter` wrapper modifie `createUser` — c'est le seul endroit qui sait qu'un user est en cours de création. Cependant, `createUser` ne peut pas envoyer d'email (pas d'accès à `sendWelcomeEmail` de manière propre)
   - **Recommandation** : Dans le callback `signIn`, quand `account?.provider === "google"`, vérifier si le user a été créé dans les dernières 60 secondes (`user.createdAt` est disponible via Prisma). Si oui → envoyer `sendWelcomeEmail`. Sinon → skip.
   - Alternative : ajouter un flag `welcomeEmailSent: Boolean @default(false)` au modèle User. Plus fiable mais nécessite une migration. La détection temporelle est suffisante pour cette story.

### Variables d'environnement requises

Déjà présentes dans `.env.example` :
- `APP_URL` — pour construire le lien `/onboarding/complete-profile` et `/dashboard`
- `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_ENCRYPTION` — SMTP Infomaniak
- `MAIL_FROM_NAME`, `MAIL_FROM_ADDRESS` — sender
- `BANK_TRANSFER_IBAN`, `BANK_TRANSFER_BIC`, `BANK_TRANSFER_BANK_ADDRESS` — infos virement (déjà utilisées dans `src/app/(public)/pricing/virement/page.tsx`)

### Contrat d'adhésion

Le SCP 2026-06-18 mentionne "lien vers le contrat d'adhésion". Le contrat est sur Google Drive (ID: `1Xrt4dA9dpw6WeOP0HMrZDs-LPAvmsqte`). Pour cette story, inclure un lien statique configurable via env var `ADHESION_CONTRACT_URL` (à ajouter dans `.env.example`). Si non configuré, omettre la ligne du contrat. Ne pas hardcoder l'URL Google Drive dans le code.

### Lien vers le formulaire de complétion

`/onboarding/complete-profile` — cette page n'existe pas encore (Story 11.2). L'email contient le lien, mais la page elle-même est hors scope de cette story. Le lien doit utiliser `APP_URL` + `/onboarding/complete-profile`.

### Architecture compliance

- **Runtime** : les fonctions email tournent en Node.js runtime (pas Edge). `src/lib/email.ts` importe `nodemailer` qui est Node-only. ✅ aligné avec la séparation `auth.config.ts` (Edge) / `auth.ts` (Node).
- **Prisma** : import depuis `@/lib/prisma` qui réexporte le client Prisma 7. Le User model a `id`, `email`, `name`, `tier`, `createdAt` — tous disponibles pour les checks.
- **Testing** : `src/lib/email.test.ts` mock `nodemailer` avec `vi.hoisted` + `vi.mock`. Suivre le même pattern pour les nouveaux tests.
- **Rate limiting** : l'envoi email est côté serveur, pas soumis au rate limiting (contrairement à l'API signup qui est limitée à 5/min/IP).

### Anti-patterns à éviter

1. **NE PAS** créer un nouveau transporteur email — réutiliser `getTransporter()` / `sendEmail()` de `src/lib/email.ts`
2. **NE PAS** créer une API route `/api/onboarding/welcome-email` — l'email est déclenché côté serveur après création du compte, pas par une requête client (explicitement spécifié dans le SCP : "L'envoi de l'email d'accueil est déclenché côté serveur après création du compte (pas d'API publique)")
3. **NE PAS** envoyer l'email d'accueil à chaque connexion Google — uniquement à la première inscription
4. **NE PAS** bloquer l'inscription si l'email d'accueil échoue — pattern non-bloquant (try/catch)
5. **NE PAS** utiliser Resend — le projet utilise nodemailer/SMTP Infomaniak
6. **NE PAS** créer de template HTML — suivre le pattern plain-text existant

### File Structure

Fichiers à MODIFIER (pas de nouveaux fichiers) :
- `src/lib/email.ts` — ajouter `sendWelcomeEmail`
- `src/app/api/auth/signup/route.ts` — déclencher `sendWelcomeEmail` après création
- `src/lib/auth.ts` — déclencher `sendWelcomeEmail` à la première connexion Google
- `src/lib/email.test.ts` — tests `sendWelcomeEmail`
- `src/app/api/auth/signup/route.test.ts` — test intégration signup
- `.env.example` — ajouter `ADHESION_CONTRACT_URL=` (optionnel)

Fichiers à LIRE pour le contexte :
- `src/lib/tier-config.ts` — pour `getTierBadgeConfig` utilisé par `tierLabel()`
- `src/lib/admin-authorization.ts` — `roleForEmail()` utilisé dans signup
- `src/app/(public)/pricing/virement/page.tsx` — référence pour les infos de virement (`BANK_TRANSFER_*`)

### References

- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-06-18.md#Story 11.1] — AC et contexte
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-06-18.md#4.1] — FR58
- [Source: src/lib/email.ts] — infrastructure email existante
- [Source: src/app/api/auth/signup/route.ts] — flow inscription email/password
- [Source: src/lib/auth.ts] — flow inscription Google OAuth + callback signIn
- [Source: src/lib/email.test.ts] — patterns de test email
- [Source: _bmad-output/implementation-artifacts/sprint-status.yaml] — status tracking

## Dev Agent Record

### Agent Model Used

Kimi K2.7 Code (via Hermes delegate_task)

### Debug Log References

- Aucun problème de bundling — l'implémentation réutilise `sendEmail()` existant sans nouvelle dépendance.

### Completion Notes List

- `sendWelcomeEmail({ to, name, tier })` ajouté dans `src/lib/email.ts` — plain-text, réutilise `greeting()`, `tierLabel()`, `dashboardLine()`.
- Contenu : confirmation inscription, tier label, lien `/onboarding/complete-profile`, instructions virement (si `BANK_TRANSFER_IBAN` set), lien contrat (si `ADHESION_CONTRACT_URL` set), lien dashboard.
- Sujet : "Bienvenue sur Ivoire Business Club — Vos prochaines étapes".
- Déclenchement dans `src/app/api/auth/signup/route.ts` : second try/catch non-bloquant après l'email de vérification, indépendant.
- Déclenchement dans `src/lib/auth.ts` : callback `signIn` Google, vérifie `createdAt` dans les 60 dernières secondes pour détecter nouvelle inscription.
- `ADHESION_CONTRACT_URL` ajouté dans `.env.example` sur sa propre ligne.
- Tests : 687 tests passent (104 fichiers), build Next.js 16.2.6/Turbopack réussit.
- `src/lib/auth.test.ts` mis à jour pour inclure `createdAt` dans le select.

### File List

- Modifié : `src/lib/email.ts` — ajout `sendWelcomeEmail`
- Modifié : `src/app/api/auth/signup/route.ts` — déclenchement welcome email non-bloquant
- Modifié : `src/lib/auth.ts` — déclenchement welcome email à la première inscription Google
- Modifié : `src/lib/auth.test.ts` — select mis à jour avec `createdAt`
- Modifié : `src/lib/email.test.ts` — tests `sendWelcomeEmail`
- Modifié : `src/app/api/auth/signup/route.test.ts` — tests intégration welcome email
- Modifié : `.env.example` — ajout `ADHESION_CONTRACT_URL`