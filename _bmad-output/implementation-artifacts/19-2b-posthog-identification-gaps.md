---
story_id: 19.2b
story_key: 19-2b-posthog-identification-gaps
epic: 19 - Analytics Comportemental PostHog
status: review
baseline_commit: b385d10
created: 2026-06-28
updated: 2026-06-28T19:04+02:00
language: fr
---

# Story 19.2b : PostHog Identification Gaps

## Story

**En tant que** Product Owner,
**je veux** que chaque utilisateur connecté soit identifié côté client dans PostHog avec ses attributs `tier` et `role`, et que la sélection d’un tier déclenche un événement `tier_selected`,
**afin de** segmenter l’analytics par profil d’abonnement et construire des funnels d’acquisition fiables.

## Contexte

La Story 19-2 a été marquée `done` car le wizard PostHog (`@posthog/wizard`) a couvert ~70 % du scope initial : installation du SDK, `posthog.reset()` au logout, pageviews et 12 événements métier côté client + serveur. Cette Story 19-2b couvre les 3 gaps restants explicitement listés dans le rapport wizard `posthog-setup-report.md` (section *Verify before merging*, 5ème item).

## Acceptance Criteria

### AC1 — `posthog.identify()` côté client après login (tous chemins)

**Given** un utilisateur qui se connecte via credentials OU OAuth (Google)
**When** la session est établie côté client
**Then** `posthog.identify(userId, { email, name, tier, role })` est appelé avec les attributs de l’utilisateur

**Notes :**
- Aujourd’hui `identify` n’est appelé que dans `src/app/auth/signup/page.tsx` pour les inscriptions par credentials, et il ne contient pas `tier`/`role`.
- Les utilisateurs qui se connectent via OAuth ou qui reviennent avec une session existante restent anonymes dans PostHog jusqu’à ce qu’ils repassent par la page signup.
- L’identification doit être **idempotente** : si l’utilisateur est déjà identifié avec les mêmes propriétés, ne pas re-capturer inutilement (PostHog gère le distinct_id, mais éviter les appels redondants côté client est une bonne pratique).

### AC2 — Propriétés `tier` et `role` dans l’identification

**Given** un utilisateur identifié dans PostHog
**When** on consulte son profil dans le dashboard PostHog
**Then** les propriétés `tier` (`AFFRANCHI`, `GRAND_FRERE`, `BOSS`) et `role` (`MEMBER`, `ADMIN`) sont visibles

**Notes :**
- Le wizard envoie actuellement `{ email, name }` mais pas `tier`/`role`.
- Les valeurs `tier`/`role` doivent provenir de la session NextAuth (`session.user.tier` / `session.user.role`) injectées par `auth.config.ts` (JWT) et non d’un second appel DB inutile.
- Pour les utilisateurs OAuth nouvellement créés, le `tier` par défaut est `AFFRANCHI` et le `role` est `MEMBER` (sauf email admin configuré) — voir `src/lib/auth.config.ts`.

### AC3 — Event `tier_selected` sur la page de choix de tier

**Given** un utilisateur authentifié sur la page `/pricing`
**When** il sélectionne un tier d’abonnement (clic sur « Sélectionner » dans `PricingTierSelection`)
**Then** l’événement `posthog.capture('tier_selected', { tier, source: 'pricing_page' })` est envoyé

**Notes :**
- La sélection de tier a lieu dans le composant client `src/components/pricing-tier-selection.tsx` via `handleTierSelect`.
- Ne pas confondre avec `bank_transfer_instructions_viewed` déjà capturé côté serveur sur `/pricing/virement`.
- L’événement doit être capturé **avant** la redirection vers `/pricing/virement` pour ne pas être perdu en cas de navigation rapide.

## Tasks / Subtasks

- [x] **T1 — Comprendre l’état existant** (AC1, AC2, AC3)
  - [x] Vérifier que `posthog-js` est initialisé dans `src/components/providers/posthog-provider.tsx` avec `capture_pageview: false` et `person_profiles: 'identified_only'`.
  - [x] Vérifier que `AuthProvider` enveloppe `CSPostHogProvider` dans `src/app/layout.tsx` (session disponible pour les hooks enfants).
  - [x] Confirmer que `session.user` expose `id`, `email`, `name`, `tier`, `role` via `auth.config.ts`.

- [x] **T2 — Créer le hook client `usePostHogIdentify`** (AC1, AC2)
  - [x] Créer `src/hooks/use-posthog-identify.ts` (ou équivalent dans `src/components/providers/`).
  - [x] Utiliser `useSession` de `next-auth/react` pour écouter les changements de session.
  - [x] Si `status === 'authenticated'` et `session.user.id` existe :
    - appeler `posthog.identify(session.user.id, { email, name, tier, role })`.
  - [x] Si `status === 'unauthenticated'` et qu’un utilisateur était précédemment identifié, ne pas appeler `reset` ici (déjà géré par `/auth/signout`).
  - [x] Garantir l’idempotence : ne pas rappeler `identify` si les propriétés n’ont pas changé (comparaison locale simple).

- [x] **T3 — Intégrer le hook dans le provider/layout** (AC1, AC2)
  - [x] Ajouter un composant client `<PostHogIdentitySync />` dans `src/components/providers/posthog-provider.tsx` (ou fichier dédié).
  - [x] Rendre ce composant dans `src/app/layout.tsx` à l’intérieur de `CSPostHogProvider` et `AuthProvider` afin que `useSession` fonctionne.
  - [x] Respecter le garde-fou JSX Next.js 16 : pas d’`&&` dans les expressions JSX, utiliser des ternaires pré-computées.

- [x] **T4 — Supprimer/aligner l’identify redondant sur signup** (AC1, AC2)
  - [x] Dans `src/app/auth/signup/page.tsx`, remplacer l’appel `posthog.identify(responseData.id, { email, name })` par le passage par le hook global (ou enrichir avec tier/role si le hook ne couvre pas le flux immédiat post-inscription avant le retour de session).
  - [x] Option recommandée : laisser le hook global gérer l’identify après le `signIn` credentials automatique ; s’assurer que `session.user` contient bien `tier`/`role` dès le premier render post-redirect.

- [x] **T5 — Capturer `tier_selected` sur `/pricing`** (AC3)
  - [x] Dans `src/components/pricing-tier-selection.tsx`, importer `posthog` depuis `posthog-js`.
  - [x] Dans `handleTierSelect`, avant/après `setSelectedTier`, appeler `posthog.capture('tier_selected', { tier, source: 'pricing_page' })`.
  - [x] S’assurer que le composant a `'use client'` en haut de fichier (déjà le cas).

- [x] **T6 — Vérifier le signout** (régression)
  - [x] Confirmer que `src/app/auth/signout/page.tsx` continue d’appeler `posthog.reset()` avant `signOut`.

- [x] **T7 — Tests et build**
  - [x] Mettre à jour ou ajouter des tests unitaires pour `usePostHogIdentify` / `PostHogIdentitySync` si possible (mocks de `posthog-js` et `next-auth/react`).
  - [x] Exécuter `npm run build` pour valider qu’aucune erreur de type ou de rendu SSR n’est introduite.
  - [x] Exécuter `npm test -- --run` pour vérifier les tests existants.

## Dev Notes

### Architecture et conventions

- **Next.js 16 strict JSX** : ne jamais utiliser `&&` dans une expression JSX. Pré-calculer les booléens composés en `const` avant le `return`, ou utiliser `condition ? <X /> : null`.
- **Client-only** : toute logique `posthog.identify` doit résider dans un composant/hook client (`"use client"`) car `posthog-js` s’initialise côté navigateur.
- **Session NextAuth** : le token JWT contient `id`, `email`, `name`, `tier`, `role`, `status`, `emailVerified`, `onboardingCompleted` (voir `src/lib/auth.config.ts` et `src/lib/auth.ts`).
- **Provider PostHog** : déjà créé par le wizard dans `src/components/providers/posthog-provider.tsx` ; il gère `isClient`, `isTestEnv`, les env vars et le `PageViewTracker`.

### Fichiers à modifier

| Fichier | Type | Changement |
|---------|------|------------|
| `src/components/providers/posthog-provider.tsx` | UPDATE | Ajouter `PostHogIdentitySync` (ou exporter depuis un fichier voisin) et le rendre dans le provider. |
| `src/hooks/use-posthog-identify.ts` | NEW | Hook qui appelle `posthog.identify` à partir de `useSession`. |
| `src/app/layout.tsx` | UPDATE | Insérer `<PostHogIdentitySync />` dans la hiérarchie (dans `AuthProvider` + `CSPostHogProvider`). |
| `src/app/auth/signup/page.tsx` | UPDATE | Retirer ou enrichir l’appel `posthog.identify` manuel ; laisser le hook global prendre le relais. |
| `src/app/auth/signin/page.tsx` | UPDATE (optionnel) | S’assurer qu’aucun `posthog.identify` manuel n’y est ajouté en doublon ; le hook global couvre déjà credentials + OAuth. |
| `src/components/pricing-tier-selection.tsx` | UPDATE | Ajouter `posthog.capture('tier_selected', ...)` dans `handleTierSelect`. |
| `src/components/providers/posthog-provider.test.tsx` | UPDATE | Ajouter un test de base pour `PostHogIdentitySync` si créé. |

### Points de vigilance

1. **OAuth flow** : après `signIn("google", { callbackUrl: "/dashboard" })`, NextAuth rafraîchit la session côté client. `useSession` déclenchera une transition de `loading` → `authenticated`, ce qui activera le hook d’identification.
2. **Credentials flow** : `src/app/auth/signin/page.tsx` utilise `signIn(..., { redirect: false })` puis `router.push("/dashboard")`. Le hook global capturera l’identification dès que `useSession` retournera la session.
3. **Hydratation** : le hook ne doit rien exécuter pendant le `status === "loading"` initial pour éviter les appels avant que la session ne soit résolue.
4. **Tests** : les tests de `posthog-provider.test.tsx` mockent déjà `posthog-js` ; réutiliser ce mock pour les nouveaux tests.
5. **RGPD / consentement** : PostHog anonymise les IP par défaut et les données restent en UE (`eu.i.posthog.com`). Ne pas ajouter de cookie banner dans cette story.

### Anti-patterns à éviter

- Ne pas appeler `posthog.identify` dans un Server Component ou dans `src/lib/auth.ts` (runtime serveur).
- Ne pas déclencher `posthog.reset` dans le hook d’identification en cas de session absente (la déconnexion explicite gère déjà ce cas).
- Ne pas ajouter un second provider PostHog ; réutiliser `CSPostHogProvider` existant.

## References

- [Source: `posthog-setup-report.md`], section *Verify before merging* — gap d’identify sur les chemins OAuth / returning visitor.
- [Source: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-28-posthog.md`], Story 19-2 — AC originaux pour `identify` + `tier`/`role`.
- [Source: `_bmad-output/planning-artifacts/epics.md`], Epic 19 — objectifs et portée globale.
- [Source: `_bmad-output/planning-artifacts/architecture.md`], sections *Analytics & Observability*, *JSX Boolean Guardrail*, *Frontend Architecture*.
- [Source: `src/lib/auth.config.ts`] — JWT/session expose `id`, `tier`, `role`.
- [Source: `src/components/providers/posthog-provider.tsx`] — provider et pageview tracker existants.
- [Source: `src/components/pricing-tier-selection.tsx`] — handler de sélection de tier.

## Dev Agent Record

### Agent Model Used

Hermes / kimi-k2.7-code

### Debug Log References

N/A — story de formalisation, pas d’implémentation.

### Completion Notes List

- Story formalisée à partir du draft existant `19-2b-posthog-identification-gaps.md`.
- Les 3 ACs du draft ont été conservées sans redéfinition de scope.
- Ajout des dev notes détaillées : fichiers à modifier, anti-patterns, points de vigilance OAuth/credentials/hydratation.
- **Implémentation 19.2b :**
  - Création du hook `usePostHogIdentify` et du composant `PostHogIdentitySync` dans le provider PostHog.
  - `posthog.identify()` est appelé automatiquement pour toute session authentifiée (credentials + OAuth), avec `email`, `name`, `tier`, `role`.
  - Intégration dans `src/app/layout.tsx` à l’intérieur de `AuthProvider` + `CSPostHogProvider`.
  - Suppression de l’`identify` manuel redondant dans `src/app/auth/signup/page.tsx`.
  - Ajout de `posthog.capture('tier_selected', { tier, source: 'pricing_page' })` dans `handleTierSelect`.
  - Mise à jour des tests unitaires `posthog-provider.test.tsx` et `accessibility.test.tsx`.
  - `npm run build` et `npx vitest run` passent (997 tests).

### File List

- `_bmad-output/implementation-artifacts/19-2b-posthog-identification-gaps.md` (story formalisée)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (status mis à jour `backlog` → `ready-for-dev` → `in-progress` → `review`)
- `src/hooks/use-posthog-identify.ts` (hook identité — créé)
- `src/components/providers/posthog-provider.tsx` (`PostHogIdentitySync` — modifié)
- `src/app/layout.tsx` (rendu `PostHogIdentitySync` — modifié)
- `src/app/auth/signup/page.tsx` (suppression `identify` manuel — modifié)
- `src/components/pricing-tier-selection.tsx` (event `tier_selected` — modifié)
- `src/components/providers/posthog-provider.test.tsx` (tests `PostHogIdentitySync` — modifié)
- `src/app/accessibility.test.tsx` (mock `PostHogIdentitySync` — modifié)
