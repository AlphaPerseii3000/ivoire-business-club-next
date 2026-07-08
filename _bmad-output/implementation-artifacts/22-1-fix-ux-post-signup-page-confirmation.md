# Story 22.1: Fix UX post-signup — page de confirmation au lieu de redirection vers signin

baseline_commit: HEAD

Status: done

## Story

**En tant qu'** utilisateur qui vient de créer un compte email/mot de passe,
**je veux** voir une page de confirmation claire m'indiquant de vérifier ma boîte de réception,
**afin de** comprendre que mon inscription a réussi et qu'il reste une étape (vérification email) avant de pouvoir me connecter.

## Contexte — Problème identifié

Après investigation sur les 12 derniers membres inscrits sur ivoire-business-club.com:
- 7/12 (58%) n'ont jamais vérifié leur email
- 3/12 (25%) ont vérifié mais n'ont pas complété l'onboarding
- Seulement 2/12 (17%) ont complété tout le flow

Le flux actuel dans `src/app/auth/signup/page.tsx`:
1. User remplit le formulaire → `POST /api/auth/signup` (OK, 201)
2. Client tente `signIn("credentials", { redirect: false })`
3. Le callback `signIn` dans `auth.ts` retourne `/auth/signin?error=unverified` (au lieu de `true`) car `emailVerified === false`
4. NextAuth traite ça comme un échec de connexion → `result?.ok = false`
5. Client redirige vers `/auth/signin?error=unverified`
6. User se retrouve sur la page de connexion avec: "Vérifie ton email pour te connecter. Un lien de vérification t'a été envoyé."

**Problème UX**: L'utilisateur vient de créer son compte. Il se retrouve sur la page de connexion (page d'erreur) au lieu d'une page de confirmation. L'expérience est confuse — on dirait que l'inscription a échoué. Le `?verify-email=1` banner sur le dashboard (lignes 72-76 de `dashboard/page.tsx`) n'est JAMAIS affiché car l'auto-login échoue toujours pour les nouveaux utilisateurs.

La story 20-1 a corrigé le message d'erreur pour qu'il soit clair, mais n'a pas changé le flux fondamental — l'utilisateur est toujours renvoyé vers la page de connexion après signup.

## Acceptance Criteria

1. **Page de confirmation post-signup**
   - **Given** un nouvel utilisateur crée un compte avec email + mot de passe
   - **When** le POST `/api/auth/signup` réussit (201)
   - **Then** l'utilisateur est redirigé vers une page `/auth/signup-success` (ou `/auth/verify-email?pending=1`) qui affiche:
     - Un message de succès: "Ton compte a été créé !"
     - Une instruction claire: "Vérifie ta boîte de réception (et tes spams) pour confirmer ton adresse email."
     - Un bouton "Se connecter" vers `/auth/signin`
     - Un lien "Renvoyer l'email de vérification" qui appelle l'API de resend

2. **Pas d'auto-login post-signup**
   - **Given** un nouvel utilisateur vient de s'inscrire
   - **When** l'API signup réussit
   - **Then** le client ne tente plus `signIn("credentials")` — la redirection vers la page de confirmation est immédiate
   - **Note**: L'auto-login échoue toujours car `emailVerified=false`, c'est un appel réseau inutile

3. **Tracking PostHog conservé**
   - **Given** le signup réussit
   - **When** la redirection se fait
   - **Then** `posthog.capture("user_signed_up", { method: "credentials" })` est toujours appelé

4. **Page de confirmation pour Google OAuth aussi**
   - **Given** un utilisateur Google OAuth non vérifié
   - **When** il tente de se connecter via Google
   - **Then** le flux existant (redirect `/dashboard?resend=1`) reste intact — NE PAS modifier le flux Google OAuth

5. **Pas de régression sur les tests existants**
   - **Given** les tests existants de signup, signin, et auth
   - **When** on exécute la suite de tests
   - **Then** tous les tests passent (sauf ceux modifiés explicitement)

6. **Lien de renvoi d'email fonctionnel**
   - **Given** un utilisateur sur la page de confirmation
   - **When** il clique sur "Renvoyer l'email"
   - **Then** l'API renvoie un email de vérification (en respectant le rate-limit 24h existant)

## Tasks / Subtasks

- [ ] **Task 1: Créer la page `/auth/signup-success`** (AC: 1)
  - [ ] 1.1 Créer `src/app/auth/signup-success/page.tsx` — page client simple avec un message de succès, instructions de vérification email, un bouton "Se connecter" et un lien "Renvoyer l'email"
  - [ ] 1.2 Design cohérent avec les pages existantes (`/auth/signin`, `/auth/signup`): même layout centré, carte avec border + shadow
  - [ ] 1.3 Icône de succès (checkmark emerald, comme la page verify-email success)
  - [ ] 1.4 Le lien "Renvoyer l'email" doit appeler `POST /api/auth/verify-email/resend` (ou utiliser la logique existante de `sendVerificationEmailToUser`). Vérifier si une route de resend existe déjà; sinon utiliser le bouton de la page signin qui appelle l'endpoint de resend.

- [ ] **Task 2: Modifier `src/app/auth/signup/page.tsx`** (AC: 2, 3)
  - [ ] 2.1 Supprimer l'appel `signIn("credentials", { redirect: false })` après signup réussi
  - [ ] 2.2 Remplacer la logique `if (result?.ok && !result?.error)` par: si `res.ok` (signup API a réussi), rediriger vers `/auth/signup-success`
  - [ ] 2.3 Conserver `posthog.capture("user_signed_up", { method: "credentials" })` avant la redirection
  - [ ] 2.4 Supprimer la branche `else { window.location.href = "/auth/signin?error=unverified" }` qui n'est plus nécessaire

- [ ] **Task 3: Bouton "Renvoyer l'email" sur la page signup-success** (AC: 6)
  - [ ] 3.1 La route `/api/auth/send-verification` existe déjà MAIS requiert une session (`session.user.id`). Après signup, l'utilisateur n'a PAS de session. Donc cette route ne peut pas être utilisée directement.
  - [ ] 3.2 Option A (recommandée): Ne pas offrir de bouton "Renvoyer" sur la page signup-success. L'email de vérification est déjà envoyé pendant le signup (`/api/auth/signup/route.ts` lignes 50-68). L'utilisateur peut utiliser le bouton "Se connecter" → la page signin a déjà le mécanisme de resend (le callback `signIn` appelle `sendVerificationEmailToUser` quand un user non vérifié tente de se connecter).
  - [ ] 3.3 Option B (si Jonathan veut un bouton resend direct): Créer une nouvelle route publique `/api/auth/send-verification/public` qui accepte un email en body, vérifie le rate-limit, et appelle `sendVerificationEmailToUser`. ATTENTION: cette route doit avoir un rate-limit strict (IP-based) pour éviter l'abus. Ne PAS exposer d'info sur l'existence du compte (réponse générique "Si un compte existe, un email a été envoyé").
  - [ ] 3.4 Par défaut, utiliser Option A (pas de bouton resend). Juste un message: "Tu n'as pas reçu l'email ? Vérifie tes spams ou essaie de te connecter pour renvoyer le lien."

- [ ] **Task 4: Mettre à jour les tests** (AC: 5)
  - [ ] 4.1 Adapter `src/app/auth/signup/page.test.tsx` (si existe) ou `src/lib/auth.test.ts` pour refléter la nouvelle redirection vers `/auth/signup-success`
  - [ ] 4.2 Supprimer les tests qui vérifient l'auto-login post-signup (qui n'existe plus)
  - [ ] 4.3 Ajouter un test que la page signup redirige vers `/auth/signup-success` après un 201 de l'API
  - [ ] 4.4 Vérifier que les tests Google OAuth ne sont pas affectés

- [ ] **Task 5: Tests end-to-end** (AC: 1-6)
  - [ ] 5.1 Test manuel: créer un compte → page de confirmation s'affiche
  - [ ] 5.2 Test manuel: cliquer "Se connecter" → page signin s'affiche
  - [ ] 5.3 Test manuel: le lien de renvoi d'email fonctionne
  - [ ] 5.4 Test manuel: Google OAuth n'est pas impacté

## Dev Notes

### Architecture Compliance

- **Auth.js split config (NON-NÉGOCIABLE)**:
  - `src/lib/auth.config.ts` reste READ-ONLY (Edge Runtime, pas de Prisma/bcrypt)
  - `src/lib/auth.ts` n'a PAS besoin de modification pour cette story — on ne touche pas au callback `signIn`
- **JWT session strategy** — inchangée. L'utilisateur n'est pas connecté après signup, il doit vérifier son email puis se connecter manuellement.
- **Route groups** — `/auth/signup-success` est une route publique (même groupe que `/auth/signin`, `/auth/signup`)
- **French UI (NFR-A3)** — Tous les messages en français non technique

### File Structure & What to Touch

| File | Action | Why |
|------|--------|-----|
| `src/app/auth/signup-success/page.tsx` | **CREATE** | Nouvelle page de confirmation post-signup |
| `src/app/auth/signup/page.tsx` | **UPDATE** | Supprimer auto-login, rediriger vers signup-success |
| `src/app/auth/signup/page.test.tsx` | **UPDATE** (si existe) | Adapter tests pour nouvelle redirection |
| `src/lib/auth.test.ts` | **UPDATE** | Supprimer/adapter les tests d'auto-login post-signup |

### What NOT to Touch

- `src/lib/auth.ts` — le callback `signIn` reste tel quel (story 20-1 l'a déjà corrigé)
- `src/lib/auth.config.ts` — Edge runtime, non modifiable
- `src/middleware.ts` — pas de changement de routing middleware
- `/api/auth/signup/route.ts` — l'API signup reste inchangée (elle crée déjà l'utilisateur, envoie l'email de vérification et le welcome email)
- Le flux Google OAuth (lignes 88-129 de `auth.ts`) — reste intact

### Technical Requirements

- **Libraries**: `next-auth` v5.0.0-beta.31, `react-hook-form` v7.75.0, `zod` v4.4.3 — inchangées
- **La page signup-success** est un composant client (`"use client"`) car elle a besoin de `posthog` (optionnel) et du bouton de resend
- **Pas de nouvelle API route nécessaire** si on réutilise le pattern de resend existant. Vérifier le composant `VerifyResendToast` sur le dashboard pour le pattern.

### Resend Email Pattern

Le composant `VerifyResendToast` (`src/components/features/auth/verify-resend-toast.tsx`) existe déjà sur le dashboard pour le cas `?resend=1`. Examiner comment il gère le renvoi d'email et réutiliser le même pattern.

L'API de resend可能的existe via le flux `sendVerificationEmailToUser`. Vérifier:
1. Si une route `/api/auth/verify-email/resend` existe
2. Sinon, le composant `VerifyResendToast` appelle quoi ?
3. Adapter pour la page signup-success

### Potential Pitfalls

- **NE PAS** modifier le callback `signIn` dans `auth.ts` — il fonctionne correctement pour les connexions (signin page). Le problème est uniquement dans le flux post-signup.
- **NE PAS** supprimer l'envoi de l'email de vérification dans `/api/auth/signup/route.ts` — il est déjà envoyé correctement.
- **NE PAS** casser les tests Google OAuth.
- **ATTENTION**: Le `posthog.capture("user_signed_up")` doit rester dans le code client (page signup) avant la redirection, car PostHog n'est pas disponible sur le serveur.
- **PostHog key vide sur le VPS** — le tracking ne marche pas en production, mais le code doit rester pour quand la key sera configurée.

### Environment Variables

Aucune nouvelle variable requise. Variables existantes utilisées:
- `APP_URL` — pour les liens dans l'email de vérification (déjà configuré: `https://ivoire-business-club.com`)

### References

- [Source: `src/app/auth/signup/page.tsx` — page signup actuelle avec auto-login]
- [Source: `src/app/auth/verify-email/page.tsx` — page de vérification (success/error states)]
- [Source: `src/app/(dashboard)/dashboard/page.tsx` — banner `?verify-email=1` (jamais affiché actuellement)]
- [Source: `src/lib/auth.ts` — callback `signIn` (déjà corrigé par story 20-1)]
- [Source: `src/components/features/auth/verify-resend-toast.tsx` — pattern de resend]
- [Source: `src/lib/verification-email.server.ts` — `sendVerificationEmailToUser` avec rate-limit 24h]
- [Source: Story 20-1 — fix du message d'erreur unverified]

### Previous Story Intelligence

**From Story 20-1 (Fix connexion comptes non vérifiés):**
- Le callback `signIn` retourne `/auth/signin?error=unverified` pour les credentials non vérifiés
- Le message "Vérifie ton email pour te connecter" est affiché sur la page signin
- L'auto-login post-signup échoue toujours silencieusement

**From Story 1-2 (Inscription avec email et mot de passe):**
- La page signup appelle `signIn("credentials", { redirect: false })` après création de compte
- L'auto-login était attendu car l'email n'est pas vérifié immédiatement

### Git Intelligence

- Pattern de commit recommandé: `fix(auth): Story 22.1 — page de confirmation post-signup au lieu de redirection vers signin`
- DS agents : ne pas faire `git add -A` ; exclure `dev.db`, `*.sqlite3`