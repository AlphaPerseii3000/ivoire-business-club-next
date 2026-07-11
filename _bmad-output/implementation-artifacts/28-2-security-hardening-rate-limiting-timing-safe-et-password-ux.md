---
baseline_commit: "2b0388bd75a72112a633976d0b88978200bf7d90"
---

# Story 28.2: Security Hardening — Rate Limiting, Timing-Safe Comparison & Password UX

Status: review

## Story

As a security administrator,
I want sensitive endpoints to be rate-limited and secret comparisons to be timing-safe,
so that the platform is protected against brute-force and timing attacks.

## Acceptance Criteria

```gherkin
Given la route PUT /api/user/password
When plus de 5 tentatives par minute depuis la même IP
Then la 6ème retourne 429 avec Retry-After

Given la route POST /api/auth/set-password
When plus de 3 tentatives par minute depuis la même IP
Then la 4ème retourne 429 avec Retry-After

Given l'endpoint cron /api/cron/remind-incomplete-users
When le header Authorization Bearer est comparé au CRON_SECRET
Then la comparaison utilise crypto.timingSafeEqual (constant-time)
And les headers avec espaces supplémentaires entre "Bearer" et le token sont acceptés

Given un utilisateur authentifié via Google OAuth (pas de mot de passe local)
When il accède à son profil et clique sur "Définir un mot de passe"
Then un formulaire lui permet de créer un mot de passe local (sans exiger l'ancien)

Given un changement de mot de passe réussi
When l'API répond 200
Then un log d'audit est créé (AUDIT_ACTIONS.PASSWORD_CHANGED)
And un email de notification est envoyé à l'utilisateur

Given le bouton d'envoi d'invitation dans le profil admin
When l'admin clique sur "Envoyer l'invitation"
Then le bouton est désactivé pendant 30s avec un countdown visible

Given la page de reset password avec un token
When la page se charge
Then le token est validé côté serveur et un message s'affiche s'il est expiré/invalide avant la soumission

Given le projet après implémentation
When npm run build est exécuté
Then le build passe sans erreur

Given les tests existants
When npx vitest run est exécuté
Then ils passent sans régression
```

## Tasks / Subtasks

- [x] **Task 1 : Configurer et intégrer les Rate Limiters** (AC: PUT /api/user/password, POST /api/auth/set-password)
  - [x] Dans [src/lib/rate-limit.ts](file:///d:/Code/ivoire-business-club-next/src/lib/rate-limit.ts), définir et exporter :
    - `userPasswordUpdateRateLimiter` avec une limite de 5 requêtes par 60 secondes.
    - `setPasswordRateLimiter` avec une limite de 3 requêtes par 60 secondes.
  - [x] Appliquer `userPasswordUpdateRateLimiter` dans [src/app/api/user/password/route.ts](file:///d:/Code/ivoire-business-club-next/src/app/api/user/password/route.ts). En cas d'excès, renvoyer une erreur 429 avec le header `Retry-After`.
  - [x] Appliquer `setPasswordRateLimiter` dans le nouvel endpoint [src/app/api/auth/set-password/route.ts](file:///d:/Code/ivoire-business-club-next/src/app/api/auth/set-password/route.ts). En cas d'excès, renvoyer une erreur 429 avec le header `Retry-After`.

- [x] **Task 2 : Sécuriser la comparaison Bearer et tolérer les espaces multiples** (AC: l'endpoint cron)
  - [x] Dans [src/app/api/cron/remind-incomplete-users/route.ts](file:///d:/Code/ivoire-business-club-next/src/app/api/cron/remind-incomplete-users/route.ts), modifier la fonction `getBearerToken` pour utiliser un regex tolérant un ou plusieurs espaces entre "Bearer" et le token (ex: `/^Bearer\s+(.+)$/`).
  - [x] Implémenter une comparaison en temps constant (timing-safe) en utilisant `crypto.timingSafeEqual` pour comparer le token extrait au secret `process.env.CRON_SECRET`. Veiller à gérer de façon sécurisée le cas où les longueurs des chaînes diffèrent pour éviter que `timingSafeEqual` ne lève d'erreur de taille de buffer tout en préservant le temps constant (par ex. en comparant les empreintes SHA-256 des chaînes).

- [x] **Task 3 : Permettre la définition d'un premier mot de passe pour les utilisateurs Google OAuth** (AC: utilisateur Google OAuth)
  - [x] Dans [src/lib/validations.ts](file:///d:/Code/ivoire-business-club-next/src/lib/validations.ts), déclarer et exporter un schéma `passwordSetSchema` (champs `password` et `confirmPassword` avec les mêmes exigences de complexité et de longueur de 8 à 72 caractères que pour le changement classique).
  - [x] Créer la route API [src/app/api/auth/set-password/route.ts](file:///d:/Code/ivoire-business-club-next/src/app/api/auth/set-password/route.ts) :
    - Doit être authentifiée (session active via `auth()`).
    - Valider la requête avec `passwordSetSchema`.
    - Vérifier que l'utilisateur n'a pas déjà de `passwordHash` défini (sinon renvoyer une erreur 400).
    - Hacher le nouveau mot de passe avec `bcryptjs` (cost = 12) et mettre à jour le compte utilisateur.
  - [x] Dans [src/app/(dashboard)/profile/page.tsx](file:///d:/Code/ivoire-business-club-next/src/app/(dashboard)/profile/page.tsx), modifier la sélection Prisma de l'utilisateur pour inclure `passwordHash` afin de pouvoir passer `hasPassword: !!user.passwordHash` à `ProfileEditForm`.
  - [x] Dans [src/components/features/auth/profile-edit-form.tsx](file:///d:/Code/ivoire-business-club-next/src/components/features/auth/profile-edit-form.tsx) :
    - Lorsque `user.hasPassword` est faux, remplacer le message statique Google par une vue affichant le bouton "Définir un mot de passe local".
    - Ce bouton doit ouvrir un formulaire permettant de saisir le mot de passe et sa confirmation (sans demander le mot de passe actuel).
    - Soumettre ce formulaire en `POST` à `/api/auth/set-password`. En cas de succès, afficher un toast et passer le composant en état "hasPassword: true" pour afficher le formulaire de changement classique.

- [x] **Task 4 : Journalisation d'audit et notifications par email** (AC: changement de mot de passe réussi)
  - [x] Dans [src/lib/audit-log.ts](file:///d:/Code/ivoire-business-club-next/src/lib/audit-log.ts), ajouter `"PASSWORD_CHANGED"` à l'objet `AUDIT_ACTIONS`.
  - [x] Dans [src/lib/email.ts](file:///d:/Code/ivoire-business-club-next/src/lib/email.ts), implémenter et exporter une fonction `sendPasswordChangedEmail({ to, name })` utilisant Resend pour informer l'utilisateur de la modification.
  - [x] Intégrer l'appel à `safeCreateAuditLog` et `sendPasswordChangedEmail` dans les deux endpoints de modification de mot de passe lors d'une réussite (200) :
    - [src/app/api/user/password/route.ts](file:///d:/Code/ivoire-business-club-next/src/app/api/user/password/route.ts) (supporter également la méthode `PUT` pour répondre strictement aux critères Gherkin, tout en gardant `POST` ou en redirigeant `POST` sur la même logique pour ne pas casser les appels existants).
    - [src/app/api/auth/set-password/route.ts](file:///d:/Code/ivoire-business-club-next/src/app/api/auth/set-password/route.ts).

- [x] **Task 5 : Cooldown de 30s sur l'envoi d'invitations dans le profil admin** (AC: bouton d'envoi d'invitation)
  - [x] Dans [src/components/features/admin/admin-member-invite-button.tsx](file:///d:/Code/ivoire-business-club-next/src/components/features/admin/admin-member-invite-button.tsx) :
    - Implémenter un état de cooldown local initié à 30 secondes après un clic réussi d'envoi d'invitation.
    - Utiliser un `useEffect` avec un intervalle/timeout de 1s pour décrémenter le cooldown.
    - Désactiver le bouton pendant le cooldown et afficher un libellé dynamique avec le temps restant (ex: "Renvoyer l'invitation dans 30s" ou "Envoyer l'invitation (30s)").

- [x] **Task 6 : Validation côté serveur du token de réinitialisation au chargement** (AC: page de reset password avec token)
  - [x] Dans [src/app/api/auth/reset-password/route.ts](file:///d:/Code/ivoire-business-club-next/src/app/api/auth/reset-password/route.ts), implémenter un handler `GET` qui prend le `token` en paramètre d'URL.
    - Hacher le token en SHA-256 et rechercher s'il existe en base de données avec le type `PASSWORD_RESET` ou `SET_PASSWORD`.
    - Valider que le token n'a pas expiré.
    - Renvoyer `{ valid: true }` ou une erreur `{ error: "Ce lien est invalide ou expiré." }` avec un status 400.
  - [x] Dans [src/app/auth/reset-password/page.tsx](file:///d:/Code/ivoire-business-club-next/src/app/auth/reset-password/page.tsx) :
    - Appeler cette API de validation via `fetch` au chargement de la page (dans un `useEffect` initial).
    - Si le token est invalide ou expiré, stocker le message d'erreur dans l'état `serverError` et masquer le formulaire avant toute soumission.

- [x] **Task 7 : Tests de non-régression et build final** (AC: build et tests)
  - [x] Mettre à jour et ajouter des tests unitaires/d'intégration dans :
    - [src/app/api/user/password/route.test.ts](file:///d:/Code/ivoire-business-club-next/src/app/api/user/password/route.test.ts) (tester la méthode `PUT`, le rate-limiting, la journalisation et l'email).
    - [src/app/api/auth/reset-password/route.test.ts](file:///d:/Code/ivoire-business-club-next/src/app/api/auth/reset-password/route.test.ts) (tester la route `GET` de validation du token).
    - [src/app/api/cron/remind-incomplete-users/route.test.ts](file:///d:/Code/ivoire-business-club-next/src/app/api/cron/remind-incomplete-users/route.test.ts) (tester les espaces multiples et la robustesse timingSafeEqual).
    - [src/app/auth/reset-password/page.test.tsx](file:///d:/Code/ivoire-business-club-next/src/app/auth/reset-password/page.test.tsx) (tester le comportement au chargement avec token valide/invalide en mockant le fetch d'initialisation).
    - Créer le fichier de test pour le nouvel endpoint : `src/app/api/auth/set-password/route.test.ts`.
  - [x] Lancer les tests unitaires via `npx vitest run` et s'assurer qu'aucun test ne régresse.
  - [x] Lancer `npm run build` et vérifier le succès complet du build standalone.

## Dev Notes

- **Conformité Upstash Redis :** Utiliser les instances `createRateLimiter` partagées. S'assurer que le header `Retry-After` est bien positionné en cas de dépassement.
- **Timing-Safe Comparison :** `crypto.timingSafeEqual` ne doit pas crasher si les buffers ont des tailles différentes. Toujours dériver une empreinte fixe (SHA-256) pour les buffers à comparer si les longueurs d'entrée divergent, puis appliquer la comparaison.
- **Next.js & React 19 rules :** Toutes les routes d'API s'exécutent sur Node.js et peuvent importer `bcryptjs` et `prisma`. Le middleware, quant à lui, est exécuté sur l'Edge Runtime (mais nous ne modifions pas le middleware ici).

### Project Structure Notes

- Respecter le kebab-case pour tous les nouveaux fichiers (ex. `set-password/route.ts`).
- Ne jamais instancier directement `new PrismaClient()`, utiliser l'import partagé `prisma` depuis `@/lib/prisma`.

### References

- API de modification de mot de passe existante : [src/app/api/user/password/route.ts](file:///d:/Code/ivoire-business-club-next/src/app/api/user/password/route.ts)
- Page de modification de profil : [src/components/features/auth/profile-edit-form.tsx](file:///d:/Code/ivoire-business-club-next/src/components/features/auth/profile-edit-form.tsx)
- Fichier d'envoi d'emails : [src/lib/email.ts](file:///d:/Code/ivoire-business-club-next/src/lib/email.ts)
- Spécifications des stories de l'épopée 28 : [epics.md](file:///d:/Code/ivoire-business-club-next/_bmad-output/planning-artifacts/epics.md#L2913-L2961)

## Dev Agent Record

### Agent Model Used

Gemini 3.5 Flash (High) (using Antigravity coding agent)

### Debug Log References

- N/A

### Completion Notes List

- Configured two new rate limiters: `userPasswordUpdateRateLimiter` (5 req/min) and `setPasswordRateLimiter` (3 req/min).
- Applied rate limits, audit logs, and email notifications to user password update route (/api/user/password) and set password route (/api/auth/set-password).
- Added support for PUT method in `/api/user/password`.
- Implemented space-insensitive, timing-safe Bearer token check in remind-incomplete-users cron task using SHA-256 derivation before `crypto.timingSafeEqual`.
- Created schema-validated, session-guaranteed local password setter (/api/auth/set-password) for OAuth users.
- Updated user profile edit form to show password definition modal instead of static message for OAuth users, and transition smoothly.
- Implemented 30-second countdown cooldown on resending invite button in admin member profile page.
- Created GET route validation check for reset/invite tokens in /api/auth/reset-password.
- Updated reset-password page to fetch validation state on mount and render loading/error states.
- Created and updated unit tests for set-password API endpoint, reset-password API endpoint and page, cron task, and password update.
- Successfully built project in production mode.

### File List

- [src/lib/rate-limit.ts](file:///d:/Code/ivoire-business-club-next/src/lib/rate-limit.ts)
- [src/app/api/user/password/route.ts](file:///d:/Code/ivoire-business-club-next/src/app/api/user/password/route.ts)
- [src/app/api/cron/remind-incomplete-users/route.ts](file:///d:/Code/ivoire-business-club-next/src/app/api/cron/remind-incomplete-users/route.ts)
- [src/lib/validations.ts](file:///d:/Code/ivoire-business-club-next/src/lib/validations.ts)
- [src/app/api/auth/set-password/route.ts](file:///d:/Code/ivoire-business-club-next/src/app/api/auth/set-password/route.ts)
- [src/app/(dashboard)/profile/page.tsx](file:///d:/Code/ivoire-business-club-next/src/app/(dashboard)/profile/page.tsx)
- [src/components/features/auth/profile-edit-form.tsx](file:///d:/Code/ivoire-business-club-next/src/components/features/auth/profile-edit-form.tsx)
- [src/lib/audit-log.ts](file:///d:/Code/ivoire-business-club-next/src/lib/audit-log.ts)
- [src/lib/email.ts](file:///d:/Code/ivoire-business-club-next/src/lib/email.ts)
- [src/components/features/admin/admin-member-invite-button.tsx](file:///d:/Code/ivoire-business-club-next/src/components/features/admin/admin-member-invite-button.tsx)
- [src/app/api/auth/reset-password/route.ts](file:///d:/Code/ivoire-business-club-next/src/app/api/auth/reset-password/route.ts)
- [src/app/auth/reset-password/page.tsx](file:///d:/Code/ivoire-business-club-next/src/app/auth/reset-password/page.tsx)
- [src/app/api/user/password/route.test.ts](file:///d:/Code/ivoire-business-club-next/src/app/api/user/password/route.test.ts)
- [src/app/api/auth/reset-password/route.test.ts](file:///d:/Code/ivoire-business-club-next/src/app/api/auth/reset-password/route.test.ts)
- [src/app/api/cron/remind-incomplete-users/route.test.ts](file:///d:/Code/ivoire-business-club-next/src/app/api/cron/remind-incomplete-users/route.test.ts)
- [src/app/auth/reset-password/page.test.tsx](file:///d:/Code/ivoire-business-club-next/src/app/auth/reset-password/page.test.tsx)
- [src/app/api/auth/set-password/route.test.ts](file:///d:/Code/ivoire-business-club-next/src/app/api/auth/set-password/route.test.ts)
