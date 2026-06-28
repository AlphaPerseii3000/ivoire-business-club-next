# Story 19-2b: PostHog Identification Gaps

**StoryKey:** "19-2b-posthog-identification-gaps"
**Epic:** 19 - Analytics & Instrumentation
**Status:** backlog
**Created:** 2026-06-28
**Context:** La story 19-2 a été marquée done car le wizard PostHog (@posthog/wizard) a couvert ~70% du scope initial (events métier, posthog.reset, posthog-node sur routes API). Cette story couvre les gaps restants identifiés dans le posthog-setup-report.md.

## Description

Le wizard PostHog a instrumenté 12 events métier et configuré l'identification server-side à l'inscription. Il reste 3 gaps à combler pour une identification utilisateur complète.

## Acceptance Criteria

### AC1: posthog.identify() côté client après login (tous chemins)

**Given** un utilisateur qui se connecte via credentials OU OAuth (Google/GitHub)
**When** la session est établie côté client
**Then** `posthog.identify(userId, { email, tier, role })` est appelé avec les attributs de l'utilisateur

**Note:** Actuellement identify n'est appelé que server-side dans la route signup. Les utilisateurs qui se connectent via OAuth ou en session existante ne sont pas identifiés — ils restent anonymes dans PostHog.

### AC2: Propriétés tier et role dans l'identification

**Given** un utilisateur identifié dans PostHog
**When** on consulte son profil dans le dashboard PostHog
**Then** les propriétés `tier` (AFFRANCHI, GRAND_FRERE, BOSS) et `role` (MEMBER, ADMIN) sont visibles

**Note:** Le wizard envoie email + name mais pas tier/role. Il faut enrichir l'appel identify avec ces données depuis la session/DB.

### AC3: Event tier_selected sur la page de choix de tier

**Given** un utilisateur sur la page de pricing/sélection de tier
**When** il sélectionne un tier d'abonnement
**Then** l'événement `tier_selected` est capturé avec `{ tier: "GRAND_FRERE", source: "pricing_page" }`

## Implémentation suggérée

1. **AC1 + AC2:** Créer un hook ou un component client qui écoute les changements de session (via `useSession` ou `auth()`) et appelle `posthog.identify()` avec les propriétés complètes. Placer dans le layout ou un provider wrapper.

2. **AC3:** Ajouter `posthog.capture('tier_selected', { tier, source })` dans le handler de sélection de tier sur la page pricing.

## Fichiers concernés

- `src/components/providers/posthog-provider.tsx` — ajouter un component/hook d'identification
- `src/app/auth/signin/page.tsx` — déjà instrumenté pour l'event, manque l'identify
- `src/app/(public)/pricing/` — page de sélection de tier
- `src/lib/auth.ts` ou `src/components/auth-provider.tsx` — source de vérité pour session/role/tier

## Références

- [PostHog setup report (wizard)](../../posthog-setup-report.md) — section "Verify before merging"
- [Epic 19 breakdown] — Story 19-2 originale dans `_bmad-output/planning-artifacts/epics.md` lignes 1688-1712