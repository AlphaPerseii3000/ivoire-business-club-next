# Story 21.3 : Set-Password Flow pour Utilisateurs Créés via WhatsApp

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

**En tant qu'** utilisateur créé via WhatsApp par Sarah (sans mot de passe initial connu),
**Je veux** recevoir un email d'invitation me permettant de définir mon mot de passe,
**Afin de** pouvoir me connecter à la plateforme IBC de manière autonome et sécurisée.

## Acceptance Criteria

### AC1 — Invitation par l'Administrateur
- **Given** un utilisateur existant en base avec un `passwordHash` existant mais `emailVerified = false` (cas typique d'une création de compte par l'admin/WhatsApp)
- **When** l'administrateur clique sur le bouton « Inviter à définir le mot de passe » dans la page de gestion du membre `/admin/members/[id]`
- **Then** un token de type `SET_PASSWORD` est généré (expiration de 7 jours, NFR-S11) et un email d'invitation est envoyé à l'adresse de l'utilisateur avec un lien `/auth/reset-password?token=<rawToken>&type=set`
- **And** une entrée d'audit log avec l'action `USER_INVITATION_EMAIL_SEND` est créée

### AC2 — Formulaire de Définition de Mot de Passe
- **Given** un utilisateur clique sur le lien d'invitation reçu dans l'email
- **When** il arrive sur `/auth/reset-password?token=<xxx>&type=set` avec un token valide
- **Then** il voit un formulaire intitulé « Définir votre mot de passe »
- **And** l'indicateur de force de mot de passe en temps réel s'affiche (identique à la page de signup/reset)
- **And** aucun champ « Ancien mot de passe » n'est affiché

### AC3 — Soumission Réussie & Activation
- **Given** l'utilisateur sur la page de définition du mot de passe avec un token valide
- **When** il saisit un mot de passe fort (≥ 8 caractères) et sa confirmation identique, puis soumet
- **Then** le système :
  1. Hache le mot de passe avec `bcryptjs` (coût 12)
  2. Met à jour `passwordHash` en base de données
  3. Définit `emailVerified = true` (active le compte)
  4. Invalide le token (suppression)
  5. Redirige vers `/auth/signin` avec le message de succès : « Votre mot de passe a été défini. Vous pouvez vous connecter. »

### AC4 — Token Expiré ou Invalide
- **Given** un token d'invitation de type `SET_PASSWORD` expiré (> 7 jours) ou inexistant en base
- **When** l'utilisateur tente de charger la page ou de soumettre le formulaire
- **Then** un message d'erreur s'affiche : « Ce lien d'invitation a expiré. Contactez le support pour en recevoir un nouveau. »
- **And** le mot de passe n'est pas modifié

### AC5 — Non-Régression
- **Given** les modifications apportées au code
- **When** `npm run build` et `npx vitest run` sont exécutés
- **Then** le build passe sans erreur et tous les tests existants et nouveaux réussissent

## Tasks / Subtasks

- [ ] **Task 1 — Envoi de l'invitation (API & Audit Log) (AC1)**
  - [ ] 1.1 Créer la route API admin `POST /api/admin/users/[id]/invite/route.ts` protégée par rôle ADMIN
  - [ ] 1.2 Invalider les anciens tokens de type `SET_PASSWORD` pour cet utilisateur
  - [ ] 1.3 Générer un token sécurisé (32 bytes hex, stocké en hash SHA-256), expiration à `now + 7 jours`
  - [ ] 1.4 Enregistrer le token dans `VerificationToken` avec `tokenType = "SET_PASSWORD"` et le lier à l'utilisateur
  - [ ] 1.5 Créer un audit log avec l'action `USER_INVITATION_EMAIL_SEND` (ou une action générique d'invitation)
  - [ ] 1.6 Gérer la sanitisation des logs avec `sanitizeError`

- [ ] **Task 2 — Service d'emailing (AC1)**
  - [ ] 2.1 Ajouter la fonction `sendSetPasswordEmail({ to, name, token })` dans `src/lib/email.ts`
  - [ ] 2.2 Utiliser le transporter SMTP existant de nodemailer
  - [ ] 2.3 Inclure le lien d'invitation pointant vers `/auth/reset-password?token=<rawToken>&type=set`

- [ ] **Task 3 — Interface d'administration (AC1)**
  - [ ] 3.1 Créer le composant client `AdminMemberInviteButton` dans `src/components/features/admin/admin-member-invite-button.tsx`
  - [ ] 3.2 Modifier `src/app/(admin)/admin/members/[id]/page.tsx` pour inclure `passwordHash` dans les données sélectionnées
  - [ ] 3.3 Afficher le bouton d'invitation si `emailVerified` est faux et que le membre n'a pas été suspendu

- [ ] **Task 4 — Traitement de la route API de réinitialisation (AC3/AC4)**
  - [ ] 4.1 Modifier `src/app/api/auth/reset-password/route.ts` pour supporter `SET_PASSWORD`
  - [ ] 4.2 Si le token est de type `SET_PASSWORD` et expiré, renvoyer l'erreur d'invitation expirée : « Ce lien d'invitation a expiré. Contactez le support pour en recevoir un nouveau. »
  - [ ] 4.3 Lors de la validation réussie, si le token est de type `SET_PASSWORD`, mettre à jour `passwordHash` et définir `emailVerified: true`
  - [ ] 4.4 Retourner un message de succès adapté

- [ ] **Task 5 — Interface utilisateur (AC2/AC3/AC4)**
  - [ ] 5.1 Modifier `src/app/auth/reset-password/page.tsx` pour détecter le paramètre de requête `type === "set"`
  - [ ] 5.2 Si `type === "set"`, afficher le titre « Définir votre mot de passe », la description correspondante, et le bouton « Définir le mot de passe »
  - [ ] 5.3 Mettre à jour les messages de succès et d'erreur affichés à l'utilisateur selon les retours d'API spécifiques au flux d'invitation

- [ ] **Task 6 — Tests de route et d'UI (AC5)**
  - [ ] 6.1 Créer `src/app/api/admin/users/[id]/invite/route.test.ts`
  - [ ] 6.2 Mettre à jour `src/app/api/auth/reset-password/route.test.ts` pour couvrir le token `SET_PASSWORD` (succès, activation d'email, expiration 7 jours)
  - [ ] 6.3 Mettre à jour `src/app/auth/reset-password/page.test.tsx` pour le paramètre `type=set`
  - [ ] 6.4 Exécuter le build et les tests (`npm run build` et `npx vitest run`)

## Dev Notes

- **Conventions d'API :** Les routes d'administration doivent vérifier la session de l'admin et valider que l'admin n'est pas suspendu.
- **Sécurité et Hachage :** Utiliser `bcryptjs` avec un coût de 12 pour crypter le nouveau mot de passe.
- **Stockage de jeton (Token Hashing) :** Ne jamais stocker de jetons en clair en base. Stocker `sha256(rawToken)`.
- **Zod & Validation :** Réutiliser `passwordResetSchema` de `src/lib/validations.ts`.
- **Logs :** Utiliser `sanitizeError` de `src/lib/sanitize-log.ts` pour éviter de faire fuiter des informations.
- **JSX boolean guardrail :** Ne pas utiliser `&&` dans le JSX (Next.js 16 strict). Utiliser des expressions ternaires ou des variables booléennes pré-calculées.

### Project Structure Notes

- Respecte l'arborescence Next.js App Router existante : pages dans `src/app/...`, composants dans `src/components/features/...`, API dans `src/app/api/...`.

### References

- [PRD §8.1 / FR79, §9.2 / NFR-S11](../planning-artifacts/prd.md)
- [Sprint Change Proposal — Gestion des Mots de Passe](../planning-artifacts/sprint-change-proposal-2026-07-01-password-management.md)
- [Story 21-1 : Mot de passe oublié (Patterns de token, bcryptjs et tests)](./21-1-mot-de-passe-oublie.md)
- [VerificationToken model dans schema.prisma](../../prisma/schema.prisma#L161)

## Dev Agent Record

### Agent Model Used

Gemini 3.5 Flash (High)

### Debug Log References

### Completion Notes List

### File List
