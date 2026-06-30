# Story 20.1: Fix connexion comptes non vérifiés

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

**En tant qu'** utilisateur inscrit avec email + mot de passe,
**je veux** recevoir un message clair quand mon email n'est pas encore vérifié,
**afin de** comprendre pourquoi je ne peux pas me connecter et savoir que je dois consulter ma boîte de réception.

## Acceptance Criteria

1. **Message explicite pour les comptes non vérifiés**
   - **Given** un utilisateur avec `emailVerified = false`
   - **When** il soumet ses identifiants valides sur `/auth/signin`
   - **Then** il voit le message « Vérifie ton email pour te connecter. Un lien de vérification t'a été envoyé. » au lieu de « Email ou mot de passe incorrect. »

2. **Pas de session pour les comptes non vérifiés**
   - **Given** un utilisateur avec `emailVerified = false`
   - **When** il tente de se connecter
   - **Then** aucun cookie de session JWT n'est créé et l'utilisateur n'accède pas au `/dashboard`

3. **Renvoi automatique de l'email de vérification**
   - **Given** un utilisateur avec `emailVerified = false`
   - **When** il tente de se connecter
   - **Then** le système appelle `sendVerificationEmailToUser(userId)` à chaque tentative

4. **Connexion normale pour les comptes vérifiés**
   - **Given** un utilisateur avec `emailVerified = true` et des identifiants valides
   - **When** il se connecte
   - **Then** la session JWT est créée et il est redirigé vers `/dashboard`

5. **Google OAuth non impacté**
   - **Given** un utilisateur Google OAuth non vérifié
   - **When** il se connecte via Google
   - **Then** il est toujours redirigé vers `/dashboard?resend=1` et un email de vérification est renvoyé ; le flux existant reste intact

6. **Redirection post-signup avec contexte**
   - **Given** un nouveau membre vient de créer un compte email
   - **When** le sign-in automatique post-signup échoue car l'email n'est pas vérifié
   - **Then** la page signup redirige vers `/auth/signin?error=unverified` avec le message clair affiché

## Tasks / Subtasks

- [ ] **Task 1: Corriger le callback `signIn` dans `src/lib/auth.ts` pour credentials** (AC: 2, 3, 4)
  - [ ] 1.1 Identifier le bloc `account?.provider === "credentials"` (lignes ~131-142)
  - [ ] 1.2 Conserver l'appel à `sendVerificationEmailToUser(user.id)` pour les utilisateurs non vérifiés
  - [ ] 1.3 Remplacer le `return "<APP_URL>/dashboard?resend=1"` par `return false` (échec de connexion sans session) ET rediriger explicitement vers `/auth/signin?error=unverified`
  - [ ] 1.4 Laisser intacts les lignes 88-129 pour le flux Google OAuth (redirect `/dashboard?resend=1`)

- [ ] **Task 2: Ajouter le mapping d'erreur `unverified` sur la page `/auth/signin`** (AC: 1, 6)
  - [ ] 2.1 Étendre `getOAuthErrorMessage` ou créer un mapper générique dans `src/lib/auth-errors.ts` incluant le cas `unverified`
  - [ ] 2.2 Utiliser ce mapper dans `src/app/auth/signin/page.tsx` pour afficher le message explicite
  - [ ] 2.3 Conserver le test `data-testid="auth-error"` existant

- [ ] **Task 3: Mettre à jour `src/app/auth/signup/page.tsx`** (AC: 6)
  - [ ] 3.1 Après l'appel `signIn("credentials", { redirect: false })`, détecter que l'auto-login a échoué à cause de l'email non vérifié
  - [ ] 3.2 Rediriger vers `/auth/signin?error=unverified` au lieu de `/auth/signin` sans contexte
  - [ ] 3.3 Conserver le tracking PostHog `user_signed_up` lorsque le signup réussit

- [ ] **Task 4: Adapter les tests existants `src/lib/auth.test.ts`** (AC: 2, 3, 4)
  - [ ] 4.1 Mettre à jour le test « auto-resends verification email for unverified credentials users » pour vérifier `false` (ou URL `/auth/signin?error=unverified`) au lieu de `/dashboard?resend=1`
  - [ ] 4.2 S'assurer que `mockSendVerificationEmailToUser` est toujours appelé
  - [ ] 4.3 Ajouter un test vérifiant qu'un utilisateur vérifié obtient `true`
  - [ ] 4.4 S'assurer que les tests Google OAuth non vérifiés restent sur `/dashboard?resend=1`

- [ ] **Task 5: Vérification end-to-end** (AC: 1-6)
  - [ ] 5.1 Test manuel avec un compte test `emailVerified=false` (info@velo49.ch ou hello@digitalcat.ch en prod) : message explicite affiché
  - [ ] 5.2 Test manuel : l'utilisateur non vérifié ne peut pas accéder à `/dashboard` (ni directement, ni via `callbackUrl`)
  - [ ] 5.3 Test manuel : un utilisateur vérifié se connecte normalement vers `/dashboard`
  - [ ] 5.4 Test manuel : Google OAuth non vérifié redirige toujours vers `/dashboard?resend=1`
  - [ ] 5.5 Test manuel : après signup, redirection vers `/auth/signin?error=unverified`

## Dev Notes

### Cause racine confirmée

Dans `src/lib/auth.ts`, le callback `signIn` pour le provider `credentials` retourne actuellement une URL (`${process.env.APP_URL ?? ""}/dashboard?resend=1`) quand `emailVerified === false`. NextAuth considère qu'un `signIn` retournant une `string` est un échec, ce qui provoque le message générique « Email ou mot de passe incorrect. » sur la page client. De plus, l'utilisateur n'a pas de session, mais l'expérience ne le reflète pas clairement.

### Solution retenue : Fix 2 — Garder le blocage, afficher un message clair

- La connexion doit être bloquée (`return false` ou équivalent) pour les comptes non vérifiés.
- L'email de vérification doit être renvoyé à chaque tentative (comportement existant, à conserver).
- Le client `/auth/signin` doit afficher un message explicite grâce au paramètre d'erreur `unverified`.
- La page `/auth/signup` doit rediriger vers `/auth/signin?error=unverified` quand l'auto-login post-signup échoue pour cette raison.

### Architecture Compliance

- **Auth.js split config (NON-NÉGOCIABLE) :**
  - `src/lib/auth.config.ts` reste **READ-ONLY** : il est exécuté en Edge Runtime et ne doit pas importer Prisma/bcrypt. Aucune modification n'est nécessaire pour cette story.
  - `src/lib/auth.ts` est le seul fichier auth à modifier (Node.js runtime, callbacks `signIn`).
- **JWT session strategy** — Les callbacks `jwt` et `session` ne changent pas. Un utilisateur non vérifié ne doit jamais atteindre ces callbacks car `signIn` retourne `false`.
- **Route groups** — `/auth/signin` et `/auth/signup` sont publics ; `/dashboard` est protégé par le middleware existant.
- **API response format** — Ne pas modifier `/api/auth/signin/route.ts` ; le rate limiting et la logique credentials y restent inchangés. Cette route retourne toujours 200 si les credentials sont valides ; c'est le callback `signIn` d'Auth.js qui bloque ensuite.
- **Form handling** — La page client reste en React Hook Form + Zod ; aucun changement de schema.
- **French UI (NFR-A3)** — Tous les messages affichés doivent être en français non technique.

### File Structure & What to Touch

| File | Action | Why |
|------|--------|-----|
| `src/lib/auth.ts` | **UPDATE** | Modifier le callback `signIn` credentials pour bloquer sans session et rediriger avec `?error=unverified` |
| `src/lib/oauth-errors.ts` | **UPDATE** ou **RENAME/EXTEND** | Ajouter le mapping `unverified` ; optionnellement créer `src/lib/auth-errors.ts` avec un mapper générique |
| `src/app/auth/signin/page.tsx` | **UPDATE** | Utiliser le mapper d'erreur incluant `unverified` au lieu de `getOAuthErrorMessage` seul |
| `src/app/auth/signup/page.tsx` | **UPDATE** | Rediriger vers `/auth/signin?error=unverified` quand l'auto-login post-signup échoue |
| `src/lib/auth.test.ts` | **UPDATE** | Adapter le test d'auto-resend credentials pour le nouveau comportement ; ajouter test vérifié |

### Current State of Files Being Modified

**`src/lib/auth.ts` (today) — bloc credentials signIn :**
```typescript
if (account?.provider === "credentials" && user.id) {
  try {
    const { sendVerificationEmailToUser } = await import("@/lib/verification-email.server");
    const emailVerified = (user as unknown as { emailVerified?: boolean | null }).emailVerified;
    if (emailVerified === false) {
      await sendVerificationEmailToUser(user.id as string);
      return `${process.env.APP_URL ?? ""}/dashboard?resend=1`;
    }
  } catch (verificationError) {
    console.error("Failed to auto-resend verification email on credentials sign-in:", sanitizeError(verificationError));
  }
}
```
**What changes:** Conserver `sendVerificationEmailToUser`, mais remplacer le `return` URL par un échec clair avec redirection vers `/auth/signin?error=unverified`.

**`src/lib/oauth-errors.ts` (today) :**
```typescript
export function getOAuthErrorMessage(error: string): string {
  switch (error) { case "OAuthCallback": ... default: "Une erreur est survenue..."; }
}
```
**What changes:** Ajouter `case "unverified":` OU créer `src/lib/auth-errors.ts` avec `getAuthErrorMessage(error)` qui inclut OAuth + `unverified`. Mettre à jour les imports dans `signin/page.tsx` et `signup/page.tsx`.

**`src/app/auth/signin/page.tsx` (today) :**
```typescript
const displayError = serverError || (urlError ? getOAuthErrorMessage(urlError) : "");
```
**What changes:** Remplacer `getOAuthErrorMessage` par une fonction supportant aussi `unverified`, ou wrapper conditionnel.

**`src/app/auth/signup/page.tsx` (today) :**
```typescript
if (result?.ok) {
  posthog.capture("user_signed_up", { method: "credentials" });
  window.location.href = "/dashboard?verify-email=1";
} else {
  window.location.href = "/auth/signin";
}
```
**What changes:** Le `else` doit devenir `window.location.href = "/auth/signin?error=unverified"`. Optionnellement, si `result.error` expose un code, l'utiliser ; sinon forcer `unverified` car après signup l'utilisateur est toujours non vérifié.

### Technical Requirements

- **Library versions (déjà installées) :**
  - `next-auth` v5.0.0-beta.31 — behavior of `signIn` callback returning `false` vs `string`
  - `react-hook-form` v7.75.0 + `zod` v4.4.3 — forms unchanged
- **Behavior required in `src/lib/auth.ts` :**
  - Quand `account?.provider === "credentials"` et `user.emailVerified === false` :
    - Appeler `sendVerificationEmailToUser(user.id)`
    - Retourner une valeur qui bloque la création de session ET redirige vers `/auth/signin?error=unverified`
  - Selon Auth.js v5 beta, `signIn` peut retourner `true`, `false` ou une `string` (redirect URL). Pour bloquer la session tout en redirigeant vers une URL d'erreur, le pattern stable est de retourner `false` et de laisser le client gérer la redirection. Alternativement, si le client signIn a `redirect: false`, le résultat `result.error` sera `"CredentialsSignin"` ; il faut donc que le signup page redirige explicitement vers `/auth/signin?error=unverified`. La page signin affichera le message via le paramètre URL.
- **Mapping erreur :**
  - `unverified` → « Vérifie ton email pour te connecter. Un lien de vérification t'a été envoyé. »
- **Google OAuth :**
  - Laisser le bloc lignes 88-129 intact. Il gère spécifiquement `/dashboard?resend=1` pour les comptes Google non vérifiés.

### Testing Requirements

- **Unit tests `src/lib/auth.test.ts` :**
  - Mettre à jour : `expect(result).toBe(false)` ou vérifier la redirection `/auth/signin?error=unverified`
  - Conserver : `expect(mockSendVerificationEmailToUser).toHaveBeenCalledWith("member-1")`
  - Ajouter : vérifié → `true`, suspendu → `false` (déjà couvert)
  - Conserver : Google non vérifié → `/dashboard?resend=1`
- **Component tests (optionnel mais recommandé) :**
  - `src/app/auth/signin/page.test.tsx` : si le query param `?error=unverified` est présent, le message explicite s'affiche.
  - `src/app/auth/signup/page.test.tsx` : après signup, l'auto-login échoué redirige vers `/auth/signin?error=unverified`.

### Potential Pitfalls & Regression Prevention

- **NE PAS** modifier `src/lib/auth.config.ts` — Edge runtime, pas de Prisma/bcrypt. Les modifications de session/middleware ne sont pas requises.
- **NE PAS** changer le flux Google OAuth (lignes 88-129 de `src/lib/auth.ts`). Le redirect `/dashboard?resend=1` pour comptes Google non vérifiés doit rester intact.
- **NE PAS** supprimer l'envoi de l'email de vérification dans le callback `signIn` credentials — c'est un critère d'acceptation.
- **NE PAS** casser la page `/auth/signin` pour les erreurs OAuth existantes (`OAuthCallback`, `OAuthAccountNotLinked`, etc.).
- **ATTENTION** au type de retour du callback `signIn` : Auth.js attend `boolean | string`. Si on retourne `false`, le client avec `redirect: false` reçoit `ok: false` et `error: "CredentialsSignin"`. C'est acceptable car le signup page redirige explicitement avec `?error=unverified`. La page signin affichera le message via l'URL.
- **ATTENTION** : le `/api/auth/signin` custom (Story 1.3) retourne 200 pour credentials valides même si `emailVerified=false`. C'est normal : le blocage final se fait dans le callback `signIn` d'Auth.js. Ne pas ajouter de vérification `emailVerified` dans l'API route.
- **Next.js 16 cache** : après modification, si le dev serveur plante, exécuter `rm -rf .next` et redémarrer.

### Scope Boundaries (What NOT to do)

- **Do NOT** modifier `src/lib/auth.config.ts` — pas nécessaire.
- **Do NOT** modifier `src/middleware.ts` — la protection dashboard est déjà en place.
- **Do NOT** modifier `/api/auth/signin/route.ts` — le rate limiting et la validation credentials y restent.
- **Do NOT** implémenter un nouveau système d'envoi d'email — `sendVerificationEmailToUser` existe déjà.
- **Do NOT** changer le schéma Prisma ou le modèle `User`.
- **Do NOT** retirer le rate limiting existant.

### Environment Variables

Aucune nouvelle variable requise. Variables existantes utilisées :
- `APP_URL` — utilisé actuellement pour le redirect Google/non-vérifié ; ne plus l'utiliser pour le cas credentials.
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL` — inchangées.

### Previous Story Intelligence

**From Story 1.1 (Inscription via Google OAuth) :**
- `src/lib/oauth-errors.ts` a été créé pour mapper les erreurs OAuth en français.
- Pattern `useSearchParams` pour lire `?error=...` dans les pages client.

**From Story 1.2 (Inscription avec Email et Mot de Passe) :**
- La page signup appelle `signIn("credentials", { redirect: false })` après création de compte.
- L'auto-login est attendu car l'email n'est pas vérifié immédiatement.

**From Story 1.3 (Connexion, Session et Rôles) :**
- La page signin affiche déjà les erreurs OAuth via `getOAuthErrorMessage(urlError)`.
- Le flux credentials passe par le `/api/auth/signin` custom, puis par le callback `signIn` d'Auth.js.
- Le test pattern `vi.hoisted()` est utilisé pour mocker `next-auth` et les dépendances.

### Git Intelligence

- Dernier commit : `chore(bmad): add epic-20 story 20-1 fix connexion comptes non vérifiés` — sprint-status mis à jour avec `epic-20: in-progress` et `20-1-fix-connexion-comptes-non-verifies: ready-for-dev`.
- Pattern de commit recommandé : `fix(auth): Story 20.1 — message clair pour connexion comptes non vérifiés`.
- DS agents : ne pas faire `git add -A` ; exclure `dev.db`, `*.sqlite3`.

### References

- [Source: `_bmad-output/planning-artifacts/architecture.md` — Auth.js Split Config, JWT Sessions, Middleware, Route Groups, French UI]
- [Source: `_bmad-output/planning-artifacts/prd.md` — FR2, FR3, NFR-S5, NFR-A3]
- [Source: `_bmad-output/implementation-artifacts/1-1-inscription-via-google-oauth.md` — `src/lib/oauth-errors.ts` pattern]
- [Source: `_bmad-output/implementation-artifacts/1-2-inscription-avec-email-et-mot-de-passe.md` — auto-login post-signup]
- [Source: `_bmad-output/implementation-artifacts/1-3-connexion-session-et-roles.md` — page signin, `/api/auth/signin`, tests]
- [Source: `src/lib/auth.ts` — callback `signIn` credentials et Google OAuth]
- [Source: `src/lib/oauth-errors.ts` — mapping erreurs OAuth]
- [Source: `src/app/auth/signin/page.tsx` — affichage erreurs signin]
- [Source: `src/app/auth/signup/page.tsx` — auto-login post-signup]
- [Source: `src/lib/auth.test.ts` — tests existants à adapter]

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
