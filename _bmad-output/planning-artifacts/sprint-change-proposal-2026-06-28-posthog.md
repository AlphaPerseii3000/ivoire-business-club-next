---
stepsCompleted:
  - step-01-init
  - step-02-analysis
  - step-03-proposals
  - step-04-proposal
  - step-05-handoff
date: '2026-06-28'
author: Hermes (CC workflow)
project: ibc
---

# Sprint Change Proposal — Epic 19 : Analytics Comportemental PostHog

## Section 1 : Issue Summary

**Déclencheur :** Jonathan (PO) a créé un compte PostHog et souhaite installer l'analytics comportemental sur la plateforme IBC pour tracker toutes les actions des utilisateurs.

**Contexte :** La plateforme IBC dispose actuellement de métriques business calculées côté serveur (`admin-analytics.ts` : MRR, churn, conversion, membres actifs) mais n'a aucun tracking comportemental — on ne sait pas quelles pages sont visitées, quels boutons cliqués, quels funnels parcourus, où les utilisateurs abandonnent. PostHog comblera ce gap avec autocapture + événements personnalisés + session replay + funnels.

**Evidence :**
- Aucune dépendance PostHog dans `package.json`
- Aucune variable d'env PostHog dans `.env.example`
- Aucun provider analytics dans `layout.tsx`
- `admin-analytics.ts` ne tracke que des agrégats DB, pas le comportement individu

## Section 2 : Impact Analysis

### Epic Impact
- **Nouvelle epic additive** : Epic 19 (PostHog Analytics). Aucune epic existante n'est invalidée ou modifiée.
- Les stories 19-x seront en `backlog` puis `ready-for-dev` dans `sprint-status.yaml`.
- Aucun rollback nécessaire.

### Artifact Impact

| Artifact | Impact |
|----------|--------|
| PRD | Ajout FR64-FR66 (analytics comportemental) |
| Architecture | Ajout section "Analytics & Observability" — PostHog client SDK + serveur SDK, Provider pattern, env vars |
| Epics | Ajout Epic 19 dans le catalogue |
| sprint-status.yaml | Ajout epic-19 + 3 stories en backlog |
| `.env.example` | Ajout `NEXT_PUBLIC_POSTHOG_KEY` et `NEXT_PUBLIC_POSTHOG_HOST` |
| `layout.tsx` | Ajout `PostHogProvider` dans la hiérarchie des providers |
| `package.json` | Ajout `posthog-js` et `posthog-node` |

### Technical Impact
- **PostHog wizard** (`npx -y @posthog/wizard@latest --region eu`) installe `posthog-js`, crée un `PostHogProvider` component, et modifie `layout.tsx` automatiquement.
- Le SDK client (`posthog-js`) tourne côté navigateur — compatible SSR avec gating.
- Le SDK serveur (`posthog-node`) pour tracker les événements API routes (signup, payment validation, etc.).
- Variables d'env publiques : `NEXT_PUBLIC_POSTHOG_KEY` (clé project publique PostHog), `NEXT_PUBLIC_POSTHOG_HOST` (https://eu.i.posthog.com pour region EU).
- **RGPD** : PostHog collecte des données utilisateur — le cookie banner / consentement doit être considéré. Pour le MVP, PostHog anonymise les IP par défaut et les données restent en EU.

## Section 3 : Recommended Approach

**Option 1 : Direct Adjustment (recommandé)** — Créer une nouvelle epic additive avec 3 stories. Aucun rollback, aucune replanification. Effort : Medium. Risque : Low.

**Option 2 : Rollback** — Non applicable (rien à revenir en arrière).

**Option 3 : MVP Review** — Non applicable (le MVP n'est pas affecté, PostHog est additif).

**Approche sélectionnée :** Option 1 — Direct Adjustment. Epic 19 additive, 3 stories, implémentation séquentielle.

## Section 4 : Detailed Change Proposals

### PRD — Nouvelles Exigences Fonctionnelles

```
FR64 : Le système tracke automatiquement les vues de pages et clics utilisateurs (autocapture PostHog)
FR65 : Le système identifie les utilisateurs connectés (userId, tier, role) dans PostHog pour segmenter l'analytics
FR66 : Le système tracke les événements métier clés : inscription, sélection tier, soumission opportunité, upload document, manifestation intérêt, lecture article
```

### Architecture — Nouvelle section

```
### Analytics & Observability

SDK : PostHog (posthog-js client + posthog-node serveur)
Région : EU (https://eu.i.posthog.com)
Provider : PostHogProvider dans layout.tsx, après AuthProvider
Env vars : NEXT_PUBLIC_POSTHOG_KEY (public), NEXT_PUBLIC_POSTHOG_HOST (public)
Autocapture : activé par défaut (toutes les pages et clics)
Identification : posthog.identify(userId, { tier, role, email }) après login
Server-side : posthog-node pour événements API (signup, payment, admin actions)
Cookie consent : PostHog anonymise IP par défaut, données stockées en EU
```

### Epic 19 : Analytics Comportemental PostHog

**Objectif :** Installer PostHog sur la plateforme IBC pour tracker le comportement utilisateur (pages vues, clics, funnels, événements métier) et fournir des dashboards actionable.

**FRs couverts :** FR64, FR65, FR66
**NFRs couverts :** NFR-P1 (performance — script PostHog chargé async, non bloquant)

#### Story 19-1 : Installation et configuration PostHog

**En tant que** administrateur technique,
**Je veux** installer le SDK PostHog et le configurer sur la plateforme,
**Afin de** démarrer le tracking comportemental.

**Acceptance Criteria :**

Given le projet IBC sur `/home/alphaperseii/projects/ibc`
When j'exécute `npx -y @posthog/wizard@latest --region eu`
Then `posthog-js` est installé dans `package.json` et un `PostHogProvider` component est créé

Given le fichier `.env.example`
When le wizard termine
Then les variables `NEXT_PUBLIC_POSTHOG_KEY` et `NEXT_PUBLIC_POSTHOG_HOST` sont présentes

Given le fichier `layout.tsx`
When le wizard termine
Then `PostHogProvider` est intégré dans la hiérarchie des providers (après AuthProvider)

Given l'application en dev (`next dev`)
When un utilisateur visite une page
Then l'événement `$pageview` est capturé dans PostHog (autocapture activé)

Given le build de production
When `npm run build` s'exécute
Then le build passe sans erreur (PostHog est SSR-safe avec isClient gating)

**Notes techniques :**
- Le wizard PostHog peut modifier `layout.tsx` et créer `src/components/posthog-provider.tsx` (ou similaire)
- Vérifier que le provider ne casse pas le pattern Edge/Node split (PostHogProvider est client-only)
- Ajouter isClient gating si le wizard ne le fait pas (pitfall 22.10 — ReactBits/GSAP pattern applies)
- `posthog-node` pour le tracking serveur sera ajouté manuellement (le wizard ne l'installe pas)

#### Story 19-2 : Identification utilisateur et événements métier

**En tant que** product owner,
**Je veux** identifier les utilisateurs connectés et tracker les événements métier clés,
**Afin de** segmenter l'analytics par tier/role et mesurer les funnels.

**Acceptance Criteria :**

Given un utilisateur connecté avec `role = MEMBER` et `tier = AFFRANCHI`
When il navigue sur le dashboard
Then PostHog reçoit `posthog.identify(userId, { email, tier: "AFFRANCHI", role: "MEMBER" })`

Given un utilisateur non connecté
When il visite la landing page
Then PostHog le tracke de manière anonyme (distinct_id auto-généré)

Given les événements métier clés
When ils se produisent
Then les événements suivants sont capturés :
- `user_signed_up` (provider : google | credentials)
- `user_signed_in`
- `tier_selected` (tier : AFFRANCHI | GRAND_FRERE | BOSS)
- `opportunity_submitted`
- `document_uploaded`
- `interest_expressed` (opportunityId)
- `article_read` (articleId, slug)
- `subscription_activated` (tier)

Given un utilisateur se déconnecte
When le logout s'exécute
Then `posthog.reset()` est appelé

Given les API routes serveur (signup, admin validate subscription)
When elles s'exécutent
Then `posthog-node` capture l'événement côté serveur avec le userId

#### Story 19-3 : Dashboards et funnels PostHog

**En tant que** product owner,
**Je veux** configurer des dashboards et funnels dans PostHog,
**Afin de** visualiser le parcours utilisateur et identifier les points d'abandon.

**Acceptance Criteria :**

Given le projet PostHog configuré
When j'accède au dashboard PostHog
Then les funnels suivants sont configurés :
- Funnel Acquisition : Landing visit → Signup → Onboarding → Tier selection → Subscription
- Funnel Engagement : Dashboard → Opportunity list → Opportunity detail → Interest expressed
- Funnel Content : Article list → Article read → Reaction

Given les événements personnalisés
When je crée un insight "Trends"
Then je peux filtrer par `tier` et `role` pour comparer le comportement des segments

Given le session replay
When je consulte une session utilisateur
Then je peux voir les replay des sessions (activé par défaut dans PostHog)

**Notes :** Cette story est principalement de la configuration dans l'interface PostHog, pas du code. Le livrable est la documentation des dashboards créés.

## Section 5 : Implementation Handoff

**Scope : Moderate** — 3 stories, nouvelle epic, dépend du wizard PostHog.

**Handoff :**
1. **Story 19-1** : DS subagent — exécuter le wizard, vérifier l'intégration, ajouter isClient gating si nécessaire, ajouter `posthog-node`, compléter `.env.example`.
2. **Story 19-2** : DS subagent — implémenter `posthog.identify()` dans le flow post-login, ajouter les événements métier dans les API routes et composants client, `posthog.reset()` au logout.
3. **Story 19-3** : Configuration PostHog UI — Jonathan ou Hermes (pas de code, config dashboard).

**Séquence :** 19-1 → 19-2 → 19-3 (séquentiel, 19-2 dépend de 19-1).

**Critères de succès :**
- `npm run build` passe avec PostHog intégré
- Autocapture fonctionne en dev (événements visibles dans PostHog)
- `posthog.identify()` appelé après login
- Événements métier capturés
- `.env.example` à jour

### sprint-status.yaml — Entrées à ajouter

```yaml
  epic-19: in-progress
  19-1-installation-posthog: backlog
  19-2-identification-evenements-metier: backlog
  19-3-dashboards-funnels-posthog: backlog
```