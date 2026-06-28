---
Story: "19.1"
StoryKey: "19-1-installation-posthog"
Title: "Installation et configuration PostHog"
Status: "done"
Priority: "P1"
Epic: "Epic 19: Analytics Comportemental PostHog"
FRs: ["FR64"]
NFRs: ["NFR-P1"]
baseline_commit: "0f1c39da0dd1f2df655d2614268f877d414f593d"
---

# Story 19.1: Installation et Initialisation de PostHog

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

En tant que administrateur technique,
Je veux installer le SDK PostHog et le configurer sur la plateforme,
Afin de démarrer le tracking comportemental.

## Acceptance Criteria

1. **AC1 — Installation des dépendances**
   - **Given** le projet IBC
   - **When** les packages `posthog-js` (client-side) et `posthog-node` (server-side) sont installés
   - **Then** l'application compile sans erreur (build de production et mode dev)

2. **AC2 — Composant PostHogProvider et pageview tracking**
   - **Given** le fichier `src/components/providers/posthog-provider.tsx`
   - **When** il est inséré dans le layout racine après le `AuthProvider`
   - **Then** l'initialisation de PostHog client (`posthog.init`) s'exécute uniquement côté client (gating `typeof window !== 'undefined'`)
   - **And** PostHog ne doit pas être initialisé en environnement de test ou si les variables d'environnement sont absentes
   - **And** un sous-composant `PostHogPageView` (ou similaire) écoute les changements de route via `usePathname` et `useSearchParams` et les capture via `posthog.capture("$pageview")`
   - **And** ce sous-composant est enveloppé dans un `<Suspense>` pour éviter de casser le rendu statique au build Next.js

3. **AC3 — Gating et SSR-safety**
   - **Given** le build de production (`npm run build`)
   - **When** il s'exécute
   - **Then** le build passe sans erreur et sans hydratation mismatch liée à PostHog (l'initialisation est client-only et SSR-safe)

4. **AC4 — Configuration des variables d'environnement**
   - **Given** le fichier `.env.example` et le fichier de configuration locale `.env`
   - **When** PostHog est configuré
   - **Then** les variables `NEXT_PUBLIC_POSTHOG_KEY` et `NEXT_PUBLIC_POSTHOG_HOST` sont présentes et documentées dans `.env.example`
   - **And** `NEXT_PUBLIC_POSTHOG_HOST` pointe par défaut vers la région EU `https://eu.i.posthog.com`

5. **AC5 — Tracking automatique des pages et clics (Autocapture)**
   - **Given** l'application lancée en développement (`npm run dev` ou `next dev`)
   - **When** un utilisateur navigue sur une page ou clique sur un bouton interactif
   - **Then** un événement `$pageview` et des événements d'autocapture de clics sont envoyés à PostHog (visibles dans la console PostHog ou l'onglet réseau)

6. **AC6 — Initialisation PostHog serveur (posthog-node)**
   - **Given** le fichier `src/lib/posthog-server.ts`
   - **When** le serveur a besoin de tracker des actions (ex: routes API)
   - **Then** une instance de `PostHog` de `posthog-node` est exportée, initialisée avec `NEXT_PUBLIC_POSTHOG_KEY` (ou variable d'env serveur) et `NEXT_PUBLIC_POSTHOG_HOST`
   - **And** elle a `flushAt: 1` et `flushInterval: 0` pour forcer l'envoi immédiat sans batching en dev/serverless

7. **AC7 — Tests unitaires et d'intégration**
   - **Given** la suite de tests Vitest
   - **When** elle s'exécute via `npm run test`
   - **Then** un test unitaire vérifie que `PostHogProvider` s'affiche correctement sans planter en environnement de test
   - **And** que l'initialisation client de PostHog est désactivée ou mockée durant les tests pour éviter les appels réseau

## Tasks / Subtasks

- [x] Task 1: Installer les dépendances PostHog (AC: #1)
  - [x] 1.1 Installer `posthog-js` et `posthog-node` (ou exécuter `npx -y @posthog/wizard@latest --region eu`)
  - [x] 1.2 Valider la présence des packages dans `package.json`
- [x] Task 2: Configurer les variables d'environnement (AC: #4)
  - [x] 2.1 Ajouter `NEXT_PUBLIC_POSTHOG_KEY` et `NEXT_PUBLIC_POSTHOG_HOST` dans `.env.example`
  - [x] 2.2 Ajouter les clés correspondantes dans `.env` locales pour les tests de dev (ex: placeholders)
- [x] Task 3: Créer le fournisseur PostHog Client (AC: #2, #3, #5)
  - [x] 3.1 Créer `src/components/providers/posthog-provider.tsx` avec `"use client"`
  - [x] 3.2 Importer `posthog` depuis `posthog-js` et initialiser avec gating `typeof window !== 'undefined'` et en évitant l'environnement de test (e.g. `process.env.NODE_ENV === 'test'`)
  - [x] 3.3 Créer `PostHogPageView` dans le même fichier ou un sous-fichier (utilisant `usePathname` et `useSearchParams`)
  - [x] 3.4 Configurer `capture_pageview: false` dans `posthog.init` pour déléguer le tracking des pages à `PostHogPageView`
- [x] Task 4: Intégrer le Provider dans le Layout Racine (AC: #2)
  - [x] 4.1 Importer `PostHogProvider` dans `src/app/layout.tsx`
  - [x] 4.2 Insérer `CSPostHogProvider` dans la hiérarchie des providers juste après `AuthProvider`
  - [x] 4.3 Insérer `<Suspense fallback={null}><PostHogPageView /></Suspense>` dans les composants enfants du provider pour éviter les avertissements de statisation lors du build
- [x] Task 5: Créer le Client Serveur PostHog (AC: #6)
  - [x] 5.1 Créer `src/lib/posthog-server.ts`
  - [x] 5.2 Initialiser `PostHog` de `posthog-node` avec les variables d'env
  - [x] 5.3 Configurer `flushAt: 1` et `flushInterval: 0` et exporter le singleton client
- [x] Task 6: Mettre en place les tests unitaires (AC: #7)
  - [x] 6.1 Créer `src/components/providers/posthog-provider.test.tsx`
  - [x] 6.2 Ajouter des tests unitaires mockant `posthog-js` pour vérifier que le provider rend ses enfants sans appels réseau réels
- [x] Task 7: Validation finale (AC: #3)
  - [x] 7.1 Lancer `npm run lint` et corriger les avertissements
  - [x] 7.2 Lancer `npm run test` pour s'assurer que les tests passent
  - [x] 7.3 Exécuter `npm run build` pour garantir qu'aucune erreur SSR n'est introduite

## Dev Notes

### Contexte métier critique

Jonathan (PO) a créé un compte PostHog pour tracker l'analytics comportemental (pages visitées, boutons cliqués, tunnels, abandon onboarding/payment). PostHog comblera ce besoin d'analytics à l'aide d'autocapture et d'événements personnalisés. Pour cette première story, l'objectif est d'installer et d'initialiser correctement PostHog sans casser l'application Next.js (SSR, builds, Edge runtime).

### Architecture & patterns à suivre

- **Next.js 16 App Router** : `layout.tsx` reste un Server Component. Le provider `posthog-provider.tsx` doit porter la directive `"use client"`.
- **Gating SSR** : Toujours entourer l'initialisation du SDK client par un garde-fou `typeof window !== 'undefined'` pour éviter que Node.js ne tente de manipuler des APIs du navigateur au build ou au rendu serveur.
- **JSX Guardrail (CRITICAL)** : Ne JAMAIS utiliser `&&` dans les expressions JSX (ex: `{condition && <Component />}`). Utilisez toujours l'opérateur ternaire `{condition ? <Component /> : null}` pour éviter les problèmes de rendu React 19.
- **Suspense Boundary** : Next.js exige que tout composant utilisant `useSearchParams` soit enveloppé dans une zone `<Suspense>` pour éviter de forcer l'ensemble du layout racine à être rendu dynamiquement côté client.
- **PostHog Node.js SDK** : L'initialisation serveur se fait via `posthog-node` et doit être isolée dans `src/lib/posthog-server.ts` pour ne pas polluer l'Edge runtime ou le bundle client.
- **Environnement de test** : PostHog ne doit pas s'initialiser ou envoyer des requêtes lors de l'exécution des tests unitaires (Vitest).

### Anti-patterns à éviter

1. **NE PAS** initialiser `posthog-js` côté serveur (sans vérification `typeof window !== 'undefined'`).
2. **NE PAS** omettre la zone `<Suspense>` autour de `PostHogPageView` dans le layout, ce qui casserait la génération statique.
3. **NE PAS** importer de dépendance PostHog client dans les fichiers d'Edge runtime.
4. **NE PAS** utiliser `&&` dans les expressions JSX.
5. **NE PAS** oublier de configurer `NEXT_PUBLIC_POSTHOG_HOST` sur `https://eu.i.posthog.com` par défaut.

### Choix techniques

- **Génération statique préservée** : En isolant le tracking de pageview dans un composant `<PostHogPageView />` enveloppé de `<Suspense>`, on s'assure que Next.js compile statiquement la landing page et les autres pages publiques.
- **Séparation Client/Serveur** : Ségrégation stricte entre `posthog-js` (via provider client) et `posthog-node` (via `src/lib/posthog-server.ts`) pour éviter les fuites de dépendances.

### File Structure

Fichiers à CRÉER :
- `src/components/providers/posthog-provider.tsx` — Fournisseur client de PostHog + Tracker de pages client.
- `src/components/providers/posthog-provider.test.tsx` — Tests unitaires du fournisseur PostHog.
- `src/lib/posthog-server.ts` — Client serveur de PostHog pour le tracking backend.

Fichiers à MODIFIER :
- `src/app/layout.tsx` — Intégration du PostHogProvider dans la hiérarchie des providers.
- `.env.example` — Ajout des variables d'environnement PostHog.
- `package.json` — Ajout des packages posthog-js et posthog-node.

Fichiers à LIRE pour le contexte :
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-28-posthog.md` — Spécifications de la proposition de changement sprint.
- `src/components/auth-provider.tsx` — Structure type d'un fournisseur client-only.
- `src/lib/prisma.ts` — Pattern d'initialisation de client/singleton.

### References

- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-06-28-posthog.md#Story 19-1] — AC détaillées et notes techniques.
- [Source: _bmad-output/planning-artifacts/architecture.md#Analytics & Observability (PostHog Integration)] — Décisions d'architecture concernant PostHog.
- [Source: src/app/layout.tsx] — Hiérarchie actuelle des fournisseurs globaux.
- [Source: package.json] — Dépendances actuelles du projet.

## Dev Agent Record

### Agent Model Used

Gemini 3.5 Flash (High) (via Antigravity-ide)

### Debug Log References

- Turbopack junction point issue resolved on Windows by configuring Webpack for Next.js builds.

### Completion Notes List

- Installed `posthog-js` and `posthog-node` as required.
- Created `src/components/providers/posthog-provider.tsx` for client-side analytics with SSR safety.
- Created `src/lib/posthog-server.ts` for server-side analytics.
- Integrated `CSPostHogProvider` and `PostHogPageView` (wrapped in `Suspense`) in `src/app/layout.tsx`.
- Configured Environment Variables in `.env.example` and local `.env`.
- Wrote and verified unit tests in `src/components/providers/posthog-provider.test.tsx` (all passed).
- Successfully completed production build via `npm run build` forcing Webpack to bypass Turbopack's Windows junction point issue.

### File List

- [NEW] [posthog-provider.tsx](file:///d:/Code/ivoire-business-club-next/src/components/providers/posthog-provider.tsx)
- [NEW] [posthog-provider.test.tsx](file:///d:/Code/ivoire-business-club-next/src/components/providers/posthog-provider.test.tsx)
- [NEW] [posthog-server.ts](file:///d:/Code/ivoire-business-club-next/src/lib/posthog-server.ts)
- [MODIFY] [layout.tsx](file:///d:/Code/ivoire-business-club-next/src/app/layout.tsx)
- [MODIFY] [.env.example](file:///d:/Code/ivoire-business-club-next/.env.example)
- [MODIFY] [.env](file:///d:/Code/ivoire-business-club-next/.env)
- [MODIFY] [package.json](file:///d:/Code/ivoire-business-club-next/package.json)

### Review Findings

- [x] [Review][Patch] Hydration Mismatch due to Conditional Provider rendering [src/components/providers/posthog-provider.tsx:51-57]
- [x] [Review][Patch] Missing client-side fallback for NEXT_PUBLIC_POSTHOG_HOST [src/components/providers/posthog-provider.tsx:11]
- [x] [Review][Patch] Dummy server class lacks proper method signatures and official Type conformity [src/lib/posthog-server.ts:11-18]
- [x] [Review][Patch] Null value from usePathname can corrupt captured URL [src/components/providers/posthog-provider.tsx:30]
- [x] [Review][Patch] Shallow unit test coverage of the React Provider wrapper [src/components/providers/posthog-provider.test.tsx]
- [x] [Review][Defer] Stale Server-Side Singleton during Active Development [src/lib/posthog-server.ts] — deferred, pre-existing
- [x] [Review][Defer] Missing server shutdown flush/close handler [src/lib/posthog-server.ts] — deferred, pre-existing

