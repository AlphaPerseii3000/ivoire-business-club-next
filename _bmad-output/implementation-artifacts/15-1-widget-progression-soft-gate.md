---
Story: "15.1"
StoryKey: "15-1-widget-progression-soft-gate"
Title: "Widget de progression + soft-gate sur features premium"
Status: "done"
Priority: "P1"
Epic: "Epic 15 — Onboarding Enforcement & Relances Automatiques"
FRs: ["FR-ONB1", "FR-ONB2", "FR-ONB3"]
NFRs: ["NFR-S5", "NFR-S7", "NFR-A1", "NFR-A3", "NFR-P2"]
UXDRs: ["UX-DR13", "UX-DR19", "UX-DR20", "UX-DR21", "UX-DR23", "UX-DR24", "UX-DR25", "UX-DR26"]
Created: "2026-06-26"
baseline_commit: "dd85fa8afbec93ae0227ce1d7d048ca8919f2b0d"
---

# Story 15.1 : Widget de progression + soft-gate sur features premium

Status: done

<!-- Note: Ultimate context engine analysis completed - comprehensive developer guide created. Brownfield/delta story: email verification, verification page, resend button, complete-profile page/form/API, and welcome email already exist. Only build the missing enforcement layer: JWT claims, middleware soft-gate, dashboard widget, and auto-resend at sign-in. -->

## Story

**En tant que** membre connecté avec onboarding incomplet,  
**Je veux** voir un widget de progression et être guidé vers la complétion,  
**Afin que** je puisse finaliser mon inscription et accéder aux features du club.

## Acceptance Criteria

1. **AC1 — Widget de progression sur le dashboard**
   - **Given** un membre connecté sur `/dashboard`
   - **When** la page se charge
   - **Then** un widget `OnboardingProgressWidget` remplace la banner ambre existante (`src/app/(dashboard)/dashboard/page.tsx` L54-74)
   - **And** il affiche 2 étapes : "Vérifier mon email" et "Compléter mon profil"
   - **And** chaque étape a un statut visuel (✗ en rouge / ✓ en vert)
   - **And** un pourcentage de progression s'affiche (0 %, 50 %, 100 %)
   - **And** chaque étape incomplète a un CTA cliquable ("Vérifier maintenant" / "Compléter mon profil")
   - **And** si les 2 étapes sont complètes, le widget disparaît

2. **AC2 — Soft-gate sur les routes premium**
   - **Given** un membre avec `emailVerified === false` OU `onboardingCompletedAt === null`
   - **When** il tente d'accéder à `/dashboard/opportunities`, `/members`, `/dashboard/matching`, ou `/articles`
   - **Then** il est redirigé vers `/dashboard?incomplete=1`
   - **And** le widget de progression s'affiche en mode prioritaire (bordure rouge, animation subtile)

3. **AC3 — Auto-resend email de vérification à la connexion**
   - **Given** un membre avec `emailVerified === false`
   - **When** il se connecte (credentials ou Google OAuth)
   - **Then** le système renvoie automatiquement l'email de vérification si le dernier envoi date de plus de 24 h
   - **And** un toast s'affiche : "Un email de vérification vient de vous être envoyé"
   - **And** si le dernier envoi date de moins de 24 h, aucun renvoi

4. **AC4 — Routes autorisées pour les membres incomplets**
   - **Given** un membre avec onboarding incomplet
   - **When** il navigue
   - **Then** les routes suivantes restent accessibles : `/dashboard`, `/profile`, `/settings`, `/pricing`, `/onboarding/complete-profile`, `/auth/verify-email`
   - **And** les routes bloquées renvoient vers `/dashboard?incomplete=1`

5. **AC5 — JWT claims pour le middleware**
   - **Given** le callback `jwt` dans `auth.ts`
   - **When** un token JWT est créé/mis à jour
   - **Then** le token embarque `emailVerified` (boolean) et `onboardingCompleted` (boolean, dérivé de `onboardingCompletedAt !== null`)
   - **And** le middleware peut lire ces claims sans accès à Prisma (Edge Runtime compatible)

## Tasks / Subtasks

- [x] **AC5 — Étendre les claims JWT pour l'onboarding**
  - [x] Modifier `src/lib/auth.config.ts` : ajouter `emailVerified` et `onboardingCompleted` dans le callback `jwt` quand `user` est présent, et les propager dans `session`.
  - [x] Modifier `src/lib/auth.ts` : enrichir le token avec les champs Prisma `emailVerified` et `onboardingCompletedAt` dans le callback `jwt` (runtime Node.js) ; dériver `onboardingCompleted = !!onboardingCompletedAt`.
  - [x] S'assurer que le callback `session` expose `emailVerified` et `onboardingCompleted` dans `session.user`.
  - [x] Vérifier que le middleware Edge lit les claims via `auth().user` sans appel Prisma.

- [x] **AC1 — Créer le composant `OnboardingProgressWidget`**
  - [x] Créer `src/components/features/onboarding/onboarding-progress-widget.tsx`.
  - [x] Props : `emailVerified: boolean`, `onboardingCompleted: boolean`, `priority?: boolean`.
  - [x] Calculer le pourcentage : 0 % si rien, 50 % si un seul des deux, 100 % si les deux.
  - [x] Afficher les 2 étapes avec icônes ✓/✗ colorées, le pourcentage, et les CTAs.
  - [x] CTA "Vérifier maintenant" → lien `/auth/verify-email` (ou déclenche `ResendVerificationButton` server action côté dashboard).
  - [x] CTA "Compléter mon profil" → lien `/onboarding/complete-profile`.
  - [x] Mode prioritaire : bordure rouge (`border-destructive` ou `border-red-500`) + animation subtile (pulse ou ring) activé quand `priority={true}`.
  - [x] Disparaît quand les 2 étapes sont complètes (ne pas rendre le composant du tout).
  - [x] Utiliser des ternaires pour tous les rendus conditionnels JSX, jamais `&&`.

- [x] **AC1 — Remplacer la banner ambre sur `/dashboard`**
  - [x] Modifier `src/app/(dashboard)/dashboard/page.tsx`.
  - [x] Supprimer le bloc amber L54-74 (la banner statique + `ResendVerificationButton` inline).
  - [x] Importer `OnboardingProgressWidget` et l'insérer en haut de page.
  - [x] Passer les flags `emailVerified` et `onboardingCompleted` (dérivés de l'objet `user` Prisma).
  - [x] Activer `priority={true}` quand `searchParams.incomplete === "1"`.
  - [x] Préserver les autres sections (nom, abonnement, tuiles d'accès rapide).

- [x] **AC2/AC4 — Implémenter le soft-gate dans `src/middleware.ts`**
  - [x] Lire `auth.user.emailVerified` et `auth.user.onboardingCompleted` dans le middleware Edge.
  - [x] Lister les routes premium bloquées : `/dashboard/opportunities`, `/members`, `/dashboard/matching`, `/articles`.
  - [x] Si l'utilisateur est connecté ET (`!emailVerified || !onboardingCompleted`) ET la route est premium → `Response.redirect(new URL("/dashboard?incomplete=1", nextUrl))`.
  - [x] Conserver les routes autorisées : `/dashboard`, `/profile`, `/settings`, `/pricing`, `/onboarding/complete-profile`, `/auth/verify-email` et toutes les routes publiques/auth existantes.
  - [x] Ne pas appliquer le soft-gate aux routes `/admin/*` (déjà gérées), `/api/*`, ou aux assets statiques.
  - [x] S'assurer que la logique admin existante (L41-47 de `auth.config.ts`) reste intacte.

- [x] **AC3 — Auto-resend de l'email de vérification à la connexion**
  - [x] Modifier `src/lib/auth.ts` callback `signIn`.
  - [x] Pour credentials et Google OAuth, après authentification réussie, si `emailVerified === false` :
    - [x] Récupérer le dernier `VerificationToken.createdAt` pour cet utilisateur (`prisma.verificationToken.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } })`).
    - [x] Si aucun token dans les 24 dernières heures (ou pas de token du tout), créer un nouveau token et appeler `sendEmailVerificationEmail({ to, name, token })`.
    - [x] Stocker un flag dans un cookie court terme ou retourner un paramètre de redirection `?resend=1` pour afficher le toast côté client (préférer un cookie flash `ibc_verify_resend=1` lu par un ClientToast ou par le dashboard).
  - [x] Réutiliser la logique de `src/app/api/auth/send-verification/route.ts` (génération token SHA-256, expiration 24 h, suppression des anciens tokens) — extraire dans `src/lib/verification-email.server.ts` si nécessaire pour éviter la duplication.
  - [x] Respecter la limite 1 envoi / 24 h maximum ; logger les erreurs avec `sanitizeError`.

- [x] **AC3 — Afficher le toast de confirmation**
  - [x] Dans `src/app/(dashboard)/dashboard/page.tsx`, lire le cookie flash `ibc_verify_resend` (ou paramètre `resend=1`) et afficher un toast via `sonner` côté client.
  - [x] Créer un petit composant client `src/components/features/auth/verify-resend-toast.tsx` si nécessaire, qui consomme le cookie et le supprime.

- [x] **Tests et validation de non-régression**
  - [x] Tests unitaires/Vitest pour `OnboardingProgressWidget` :
    - [x] 0 %, 50 %, 100 % selon les props.
    - [x] Disparition quand 100 %.
    - [x] Mode prioritaire affiche la bordure/animation.
    - [x] CTAs pointent vers les bonnes routes.
  - [x] Tests middleware (via handler isolé ou integration) :
    - [x] Route premium bloquée si `emailVerified=false`.
    - [x] Route premium bloquée si `onboardingCompleted=false`.
    - [x] Routes autorisées accessibles.
    - [x] Redirection vers `/dashboard?incomplete=1`.
  - [x] Tests `auth.ts` / `auth.config.ts` :
    - [x] JWT claims contiennent `emailVerified` et `onboardingCompleted`.
    - [x] Auto-resend appelé une seule fois par fenêtre 24 h.
    - [x] Pas de resend si déjà vérifié.
  - [x] `npm run build` passe sans erreur.
  - [x] Aucun `&&` dans le JSX de la story.

## Dev Notes

### Contexte brownfield / delta

Tous les briques de base existent déjà ; cette story ne consiste qu'à ajouter l'enforcement manquant :

| Élément | État | Fichier(s) |
|---------|------|-----------|
| Envoi email de vérification | ✅ | `src/lib/email.ts` (`sendEmailVerificationEmail`), `src/app/api/auth/signup/route.ts` L63, `src/app/api/auth/send-verification/route.ts` |
| Page `/auth/verify-email` | ✅ | `src/app/auth/verify-email/page.tsx` |
| Banner ambre dashboard | ✅ (à remplacer) | `src/app/(dashboard)/dashboard/page.tsx` L54-74 |
| Page `/onboarding/complete-profile` | ✅ | `src/app/onboarding/complete-profile/page.tsx` |
| Formulaire complétion profil | ✅ | `src/components/features/onboarding/complete-profile-form.tsx` |
| API complétion profil | ✅ | `src/app/api/user/onboarding/route.ts` |
| Welcome email avec lien profil | ✅ | `src/lib/email.ts` L270 (`sendWelcomeEmail`) |
| Bouton resend email | ✅ | `src/components/features/auth/resend-verification-button.tsx` → `POST /api/auth/send-verification` |
| Middleware Auth.js | ✅ (à étendre) | `src/middleware.ts`, `src/lib/auth.config.ts` |

**Ce qui est manquant (delta à implémenter) :**
- `OnboardingProgressWidget` (nouveau composant).
- Soft-gate middleware sur routes premium.
- Auto-resend email de vérification au `signIn` callback.
- JWT claims `emailVerified` + `onboardingCompleted`.

### Contraintes techniques critiques

- **Middleware Edge Runtime — PAS de Prisma.** Tous les flags d'onboarding doivent transiter via le JWT. C'est pourquoi AC5 est un prérequis à AC2.
- **JWT créé côté Node.js (`src/lib/auth.ts`), lu côté Edge (`src/lib/auth.config.ts` / `src/middleware.ts`).** C'est le pattern existant (`tier`, `role`, `id`).
- **Auth.js v5 split config :**
  - `src/lib/auth.config.ts` — Edge-compatible, pas de Prisma/bcrypt.
  - `src/lib/auth.ts` — Node.js, avec PrismaAdapter, providers, callbacks étendus.
- **Next.js 16 / React 19 strict guardrail :** utiliser des **ternaires** (`condition ? <JSX> : null`) dans le JSX, **jamais `&&`**.
- **Rate limiting existant :** `src/lib/rate-limit.ts` définit `verificationSendRateLimiter` (3/60 s). Pour l'auto-resend à la connexion, la fenêtre doit être de 24 h, pas 1 min ; ne pas réutiliser directement ce rate-limiter. Utiliser plutôt la date du dernier `VerificationToken.createdAt`.
- **Pas de migration Prisma nécessaire.** Les champs `User.emailVerified` (Boolean, default false) et `User.onboardingCompletedAt` (DateTime?) existent déjà (schema L88, L92).

### Files to create / modify

**NEW files :**
- `src/components/features/onboarding/onboarding-progress-widget.tsx`
- `src/components/features/onboarding/onboarding-progress-widget.test.tsx`
- `src/components/features/auth/verify-resend-toast.tsx` (optionnel, selon technique retenue pour le toast)
- `src/lib/verification-email.server.ts` (optionnel, pour factoriser la logique de génération + envoi de token)

**UPDATE files :**
- `src/lib/auth.config.ts` — ajouter `emailVerified` / `onboardingCompleted` dans `jwt` + `session` claims.
- `src/lib/auth.ts` — charger les champs Prisma dans `jwt`, implémenter l'auto-resend dans `signIn`.
- `src/middleware.ts` — ajouter la logique de soft-gate sur les routes premium.
- `src/app/(dashboard)/dashboard/page.tsx` — remplacer la banner ambre par `OnboardingProgressWidget`.
- `src/app/(dashboard)/layout.tsx` — considérer l'intégration du widget en haut du `main` si applicable (le SCP mentionne un wrapper, mais le Story Acceptance Criteria place le widget sur `/dashboard` uniquement ; ne pas ajouter de layout-wide gate sauf si explicitement demandé).

### Architecture compliance

- **Auth pattern :** suivre exactement le split config Edge/Node existant.
- **Route protection :** la route admin `/admin/*` est déjà protégée dans `auth.config.ts` L32-47 ; ne pas la casser.
- **Server actions / Route Handlers :** utiliser des Route Handlers pour tout appel réseau (pas de Server Actions dans ce projet).
- **Emails :** utiliser `sendEmailVerificationEmail` de `src/lib/email.ts`.
- **UI components :** réutiliser `Button`, `Card`, `Progress` (ou équivalent shadcn/ui) si disponibles ; sinon, Tailwind natif avec tokens CSS.
- **Tests :** Vitest + React Testing Library pour les composants client ; tests d'intégration pour le middleware via `NextRequest`/`NextResponse`.

### Library / framework requirements

- `next-auth` v5 beta.31 (`auth.config.ts` Edge + `auth.ts` Node).
- `jose` n'est pas nécessaire car le token est lu par `NextAuth(authConfig)`.
- Pas de nouvelle dépendance NPM attendue.

### Testing requirements

- Couvrir le widget pour les 3 états de complétion et le mode prioritaire.
- Couvrir le middleware pour les routes bloquées et autorisées.
- Couvrir `signIn` auto-resend : envoi une fois, pas d'envoi si < 24 h, pas d'envoi si déjà vérifié.
- Couvrir les JWT claims.
- Valider `npm run build`.

### UX / accessibility

- Textes en français, non-techniques.
- Cibles tactiles ≥ 44 px.
- Focus visible sur les CTAs.
- Animation subtile respectant `prefers-reduced-motion`.
- Couleurs accessibles (vert succès, rouge alerte, contraste 4.5:1).

## Previous Story Intelligence

- Story 6.5 a établi le pattern admin `role === "ADMIN"` vérifié en DB côté server, et l'utilisation systématique de ternaires dans JSX.
- Story 11.2 a créé le formulaire `CompleteProfileForm` et l'API `PUT /api/user/onboarding` ; ne pas recréer, juste rediriger vers la page existante.

## Project Context Reference

- Projet : Ivoire Business Club (IBC).
- Stack : Next.js 16.2.6, React 19.2.4, Prisma 7.8.0, Auth.js v5 beta.31, TailwindCSS 4.x, shadcn/ui.
- Build : `output: 'standalone'` ; déployé sur VPS Infomaniak (Ubuntu 24.04) via PM2 + Nginx.
- Langue des artefacts : Français (contrairement à `config.yaml` qui indique "English" — tous les BMAD artifacts IBC sont en français).

## References

- SCP — Story 15.1 : `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-26.md`, section "### Story 15.1 : Widget de progression + soft-gate sur features premium".
- Architecture : `_bmad-output/planning-artifacts/architecture.md`, sections "Authentication & Security" (JWT split config), "Technical Constraints".
- PRD : `_bmad-output/planning-artifacts/prd.md`, FR-ONB1/FR-ONB2/FR-ONB3 ajoutés via le SCP.
- Code existant :
  - `src/lib/auth.ts`
  - `src/lib/auth.config.ts`
  - `src/middleware.ts`
  - `src/app/(dashboard)/dashboard/page.tsx`
  - `src/app/(dashboard)/layout.tsx`
  - `src/components/features/auth/resend-verification-button.tsx`
  - `src/app/api/auth/send-verification/route.ts`
  - `src/lib/email.ts`
  - `src/app/onboarding/complete-profile/page.tsx`
  - `prisma/schema.prisma` (L88, L92)

## Dev Agent Record

### Agent Model Used

kimi-k2.7-code (via Hermes delegate_task)

### Debug Log References

### Completion Notes List

- AC5: JWT claims `emailVerified` et `onboardingCompleted` ajoutés dans `src/lib/auth.ts` (callback jwt + session) et `src/lib/auth.config.ts` (Edge config jwt + session).
- AC1: `OnboardingProgressWidget` créé avec 2 étapes, pourcentage, CTAs, mode prioritaire (bordure destructive + animate-pulse), disparition quand 100%.
- AC1: Banner ambre remplacée sur `/dashboard` par le widget, avec `priority={true}` quand `?incomplete=1`.
- AC2/AC4: Soft-gate middleware implémenté dans `src/middleware.ts` sur `/dashboard/opportunities`, `/members`, `/dashboard/matching`, `/articles` redirigeant vers `/dashboard?incomplete=1`.
- AC3: Auto-resend email de vérification à la connexion (credentials + Google OAuth) via `src/lib/verification-email.server.ts`, respectant la limite 1 envoi / 24h.
- AC3: Toast de confirmation affiché via `src/components/features/auth/verify-resend-toast.tsx` quand `?resend=1`.
- Tests ajoutés : widget (12), middleware (13), auto-resend (6) ; `auth.test.ts` mis à jour.
- Vérifications : `npm run build` OK, `npx vitest run` OK (926 tests passés).
- **CR follow-up (2026-06-26)** : corrections des 7 findings (P0 + 3 P1 + 3 P2) :
  - P0 : persistance des claims JWT (`emailVerified`, `onboardingCompleted`) lors du refresh token dans `src/lib/auth.config.ts`.
  - P1-1 : uniformisation du resend Google OAuth vers `/dashboard?resend=1` dans `src/lib/auth.ts`.
  - P1-2 : tests ajoutés pour auto-resend credentials, claims JWT, session et refresh token.
  - P1-3 : CTA "Vérifier mon email" explicite avec lien vers `/auth/verify-email` dans le widget.
  - P2-1 : test middleware avec claims `undefined` traités comme incomplets.
  - P2-2 : borne 24h corrigée en `<=` dans `src/lib/verification-email.server.ts`.
  - P2-3 : `data-testid` distincts (`pending`/`done`) dans le widget.
- Vérifications post-CR : `npm run build` OK, `npx vitest run` OK (935 tests passés).

### Change Log

- 2026-06-26 : corrections CR story 15-1 — 7 findings résolus (JWT claims refresh, resend Google OAuth, tests manquants, CTA widget, test undefined claims, borne 24h, data-testid distincts).

### File List

- src/lib/auth.ts
- src/lib/auth.config.ts
- src/middleware.ts
- src/app/(dashboard)/dashboard/page.tsx
- src/components/features/onboarding/onboarding-progress-widget.tsx
- src/components/features/auth/verify-resend-toast.tsx
- src/lib/verification-email.server.ts
- src/components/features/onboarding/onboarding-progress-widget.test.tsx
- src/middleware.test.ts
- src/lib/verification-email.server.test.ts
- src/lib/auth.test.ts
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/15-1-widget-progression-soft-gate.md

### Implementation Plan

Story implémentée en delta sur le code existant, sans migration Prisma, en respectant le split Auth.js v5 Edge/Node et le guardrail JSX (ternaires uniquement).