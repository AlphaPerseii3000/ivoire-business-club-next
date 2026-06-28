---
Story: "19.3"
StoryKey: "19-3-dashboards-funnels-posthog"
Title: "Configuration des Tableaux de Bord et Funnels PostHog"
Status: "done"
Priority: "P2"
Epic: "Epic 19: Analytics Comportemental PostHog"
FRs: ["FR64", "FR65", "FR66"]
NFRs: ["NFR-P1"]
baseline_commit: "dcc17ad"
---

# Story 19.3 : Configuration des Tableaux de Bord et Funnels PostHog

Status: done

<!-- Note: Ultimate context engine analysis completed - comprehensive developer guide created. Cette story consiste principalement en de la configuration d'insights, d'entonnoirs (funnels), de tableaux de bord et de Session Replays directement dans la console PostHog ou via les outils MCP PostHog, et à produire la documentation associée. Aucun changement majeur de code n'est attendu sauf ajustement mineur si un événement s'avère manquant. -->

## Story

En tant que Product Owner,  
Je veux configurer des Insights, des Funnels d'acquisition, et activer les Session Replays dans la console PostHog,  
Afin de analyser visuellement le trafic et détecter les points de friction.

## Acceptance Criteria

1. **AC1 — Entonnoir (Funnel) d'Acquisition & Activation**
   - **Given** les événements envoyés à PostHog (`$pageview`, `user_registered`/`user_signed_up`, `onboarding_profile_completed`, `tier_selected`, `bank_transfer_instructions_viewed`)
   - **When** j'accède à la console d'administration PostHog
   - **Then** un Funnel d'Acquisition est configuré avec les étapes suivantes dans l'ordre :
     1. Vue de la Landing Page (`$pageview` avec URL `/`)
     2. Inscription : événement `user_registered` (côté serveur) ou `user_signed_up` (côté client)
     3. Complétion Onboarding : événement `onboarding_profile_completed`
     4. Sélection de Tier : événement `tier_selected`
     5. Intention de Paiement : événement `bank_transfer_instructions_viewed` (visite des instructions de virement)

2. **AC2 — Entonnoir (Funnel) d'Engagement sur les Opportunités (Deals)**
   - **Given** les événements d'interaction avec le catalogue de deals
   - **When** j'accède à la console d'administration PostHog
   - **Then** un Funnel d'Engagement Deals est configuré avec les étapes suivantes dans l'ordre :
     1. Vue du Dashboard principal (`$pageview` sur `/dashboard`)
     2. Vue de la Liste des Opportunités (`$pageview` sur `/dashboard/opportunities`)
     3. Vue d'une Opportunité spécifique (`$pageview` sur `/dashboard/opportunities/*`)
     4. Manifestation d'Intérêt : événement `opportunity_interest_recorded` ou clic sur CTA WhatsApp `whatsapp_contact_clicked`

3. **AC3 — Entonnoir (Funnel) de Consommation de Contenu (Articles)**
   - **Given** les événements d'interaction avec le blog et les articles
   - **When** j'accède à la console d'administration PostHog
   - **Then** un Funnel de Contenu est configuré avec les étapes suivantes dans l'ordre :
     1. Vue du Catalogue d'Articles (`$pageview` sur `/articles`)
     2. Vue d'un Article spécifique (`$pageview` sur `/articles/*`)
     3. Réaction à un Article : événement `article_reaction_added`

4. **AC4 — Segmentation et Tableaux de Bord (Insights/Trends)**
   - **Given** les attributs utilisateurs synchronisés dans les profils de personnes (`tier` et `role`)
   - **When** je crée ou filtre un Insight de type "Trends" ou "Funnels" dans PostHog
   - **Then** je peux filtrer ou découper (Breakdown) l'analyse selon les propriétés de la personne `tier` (`AFFRANCHI`, `GRAND_FRERE`, `BOSS`) et `role` (`MEMBER`, `ADMIN`) pour comparer les comportements
   - **And** le tableau de bord principal nommé "Analytics basics (wizard)" ou "Ivoire Business Club - Cockpit" regroupe ces insights clés

5. **AC5 — Replay de Session et Anonymisation**
   - **Given** les replays de sessions activés dans PostHog
   - **When** un utilisateur navigue sur la plateforme
   - **Then** la console PostHog enregistre la session de manière anonymisée (IP masquée par défaut, exclusion automatique des champs d'input sensibles comme les mots de passe)
   - **And** le replay est associable à l'identifiant de la personne après identification pour comprendre son parcours d'onboarding

## Tasks / Subtasks

- [x] **T1 — Analyse et Validation des Événements Reçus dans PostHog** (AC1, AC2, AC3, AC4)
  - [x] Utiliser l'outil MCP PostHog `insights-list` ou l'interface PostHog pour lister les événements récents reçus et valider que les événements personnalisés `tier_selected`, `opportunity_interest_recorded`, `user_registered`, `bank_transfer_instructions_viewed` et les attributs `tier` et `role` sont correctement ingérés.
  - [x] En cas de divergence ou d'absence d'événement, effectuer un rapide test en local en naviguant sur l'application avec les variables d'environnement PostHog configurées.

- [x] **T2 — Configuration du Funnel d'Acquisition** (AC1)
  - [x] Créer l'insight entonnoir "IBC - Acquisition & Activation Funnel" dans le projet PostHog.
  - [x] Configurer les étapes : Landing (`$pageview` sur `/`), Inscription (`user_registered` ou `user_signed_up`), Complétion de profil (`onboarding_profile_completed`), Sélection de Tier (`tier_selected`), et Instructions de virement (`bank_transfer_instructions_viewed`).

- [x] **T3 — Configuration du Funnel d'Engagement Deals** (AC2)
  - [x] Créer l'insight entonnoir "IBC - Deal Engagement Funnel" dans le projet PostHog.
  - [x] Configurer les étapes : Dashboard (`$pageview` sur `/dashboard`), Liste de Deals (`$pageview` sur `/dashboard/opportunities`), Détail du Deal (`$pageview` sur `/dashboard/opportunities/*`), Manifestation d'Intérêt (`opportunity_interest_recorded` ou clic WhatsApp `whatsapp_contact_clicked`).

- [x] **T4 — Configuration du Funnel Articles & Contenu** (AC3)
  - [x] Créer l'insight entonnoir "IBC - Content Engagement Funnel" dans le projet PostHog.
  - [x] Configurer les étapes : Liste d'Articles (`$pageview` sur `/articles`), Lecture Article (`$pageview` sur `/articles/*`), Réaction (`article_reaction_added`).

- [x] **T5 — Création et Assemblage du Dashboard Principal** (AC4)
  - [x] Créer ou mettre à jour le dashboard existant "Analytics basics (wizard)" (ID: 779317) pour y intégrer les nouveaux funnels d'Acquisition, Deals, et Contenu.
  - [x] Ajouter ou configurer des Insights de type "Trends" additionnels :
    - [x] Nombre d'utilisateurs actifs uniques découpés par `tier`
    - [x] Volume d'inscriptions quotidiennes (`user_registered`)
    - [x] Taux de conversion global du funnel d'acquisition

- [x] **T6 — Activation et Vérification du Session Replay** (AC5)
  - [x] Vérifier que le Session Recording est activé dans la configuration de PostHog (géré par défaut dans PostHog).
  - [x] S'assurer de l'anonymisation des inputs sensibles en vérifiant que le provider client n'enregistre pas de données de formulaires sensibles.

- [x] **T7 — Documentation et Rapport de Livraison**
  - [x] Créer un fichier de rapport `posthog-setup-report.md` (ou mettre à jour le fichier existant à la racine) avec les détails des insights configurés, les requêtes d'insights et les liens directs PostHog pour chaque élément de configuration.

## Dev Notes

### Contexte technique et métier

Jonathan (PO) a créé un compte PostHog pour suivre l'analytics comportemental (pages visitées, boutons cliqués, tunnels d'onboarding). Cette story tire parti des événements déjà instrumentés dans le code de la plateforme. La quasi-totalité du travail s'effectue dans l'interface de PostHog ou via des appels d'API PostHog automatiques.

### Événements de référence identifiés dans le code
Pour configurer les entonnoirs et insights, voici les événements exacts tels qu'ils sont implémentés dans la base de code d'IBC :
1. **Inscription credentials (server-side)** : `user_registered`
   - Source: `src/app/api/auth/signup/route.ts`
   - Propriétés: `{ email, name, role }`
2. **Inscription (client-side)** : `user_signed_up`
   - Source: `src/app/auth/signup/page.tsx`
   - Propriétés: `{ method: "credentials" }`
3. **Connexion** : `user_signed_in`
   - Source: `src/app/auth/signin/page.tsx`
   - Propriétés: `{ method: "credentials" }`
4. **Complétion Onboarding** : `onboarding_profile_completed`
   - Source: `src/components/features/onboarding/complete-profile-form.tsx`
5. **Sélection de Tier** : `tier_selected`
   - Source: `src/components/pricing-tier-selection.tsx`
   - Propriétés: `{ tier, source: "pricing_page" }`
6. **Affichage des instructions de virement** : `bank_transfer_instructions_viewed`
   - Source: `src/app/(public)/pricing/virement/page.tsx`
   - Propriétés: `{ tier, amount }`
7. **Création d'une opportunité (deal)** : `opportunity_submitted`
   - Source: `src/app/(dashboard)/dashboard/opportunities/new/page.tsx`
8. **Manifestation d'intérêt sur un deal** : `opportunity_interest_recorded`
   - Source: `src/app/api/opportunities/[id]/interest/route.ts`
   - Propriétés: `{ opportunity_id, opportunity_title, user_tier, required_tier }`
9. **Clic WhatsApp sur un deal/profil** : `whatsapp_contact_clicked`
   - Source: `src/components/features/deals/whatsapp-cta.tsx`
   - Propriétés: `{ label }`
10. **Ajout de réaction sur un article** : `article_reaction_added`
    - Source: `src/app/api/articles/[id]/reactions/route.ts`
    - Propriétés: `{ article_id, reaction_type, action }`

### Intégration avec les outils MCP PostHog
Le développeur peut utiliser les outils du MCP PostHog pour inspecter le projet en cours d'exécution :
- `projects-get` : Récupère les métadonnées et identifiants du projet (actuellement ID projet : `211541`).
- `dashboards-get-all` : Liste tous les dashboards (dashboard ID `779317` correspond à "Analytics basics (wizard)").
- `insights-list` : Liste les insights et graphiques configurés.
- `insight-create` : Permet d'injecter ou de créer directement des insights de type Trends ou Funnels par script.
- `dashboard-update` / `dashboard-tile-copy` : Associe les insights au tableau de bord.

### Anti-patterns à éviter
1. **NE PAS** coder de nouvelles captures d'événements dans les fichiers Next.js sauf si un écart technique critique empêche un critère d'acceptation (vérifier d'abord les logs ou les captures réelles).
2. **NE PAS** mélanger les événements d'inscription `user_registered` (serveur) et `user_signed_up` (client) dans la même étape du funnel sans utiliser une condition OU (match any) si disponible, ou privilégier l'événement serveur `user_registered` plus fiable pour les calculs de conversion.
3. **NE PAS** exposer d'informations sensibles dans les captures (mots de passe, tokens) ; l'anonymisation doit être maintenue à 100 %.

### File Structure Notes
- Toute documentation de configuration sera centralisée dans le fichier à la racine : `posthog-setup-report.md` (ou similaire).
- Aucun composant ou layout existant ne devrait être impacté structurellement par cette story.

### References
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-06-28-posthog.md#Story 19-3] — Proposition initiale et structure attendue pour les dashboards.
- [Source: src/components/providers/posthog-provider.tsx] — Implémentation du provider client.
- [Source: src/lib/posthog-server.ts] — Implémentation du client serveur.
- [Source: posthog-setup-report.md] — Rapport d'initialisation et variables d'environnement.

## Dev Agent Record

### Agent Model Used

Gemini 3.5 Flash (High) (via Antigravity-ide)

### Debug Log References

- Verified client and server event captures in codebase (`src/components/pricing-tier-selection.tsx`, `src/app/api/auth/signup/route.ts`, etc.).
- Created Funnel Insights via PostHog MCP `insight-create`:
  - IBC - Acquisition & Activation Funnel (short_id: `9RXc39fs`)
  - IBC - Deal Engagement Funnel (short_id: `30K1ORHR`)
  - IBC - Content Engagement Funnel (short_id: `vtitETQ5`)
- Created Trends Insights via PostHog MCP `insight-create`:
  - IBC - Active Users by Tier (short_id: `jjm19kft`)
  - IBC - Acquisition Funnel Conversion Rate Trend (short_id: `gPNcghVR`)
- Updated name of "New Registrations (wizard)" to "IBC - Daily Registrations" (short_id: `5sANSPCh`) via `insight-update`.
- Updated name of Dashboard `779317` to "Ivoire Business Club - Cockpit" and removed redundant wizard funnel and payment intent tiles via `dashboard-update` and `dashboard-delete-tile`.
- Verified project configuration settings (`anonymize_ips: true`, `session_recording_opt_in: true`) via `project-get`.

### Completion Notes List

- Verified that all custom conversion events are instrumented in Next.js pages/APIs.
- Configured 3 bespoke Funnel Insights (`Acquisition`, `Deals`, `Content`) matching exact route paths and custom events.
- Created dynamic cohort breakdowns (breakdown by person property `tier`).
- Configured Trend and Funnel Conversion Rate Trend insights.
- Cleaned up, renamed, and verified the Cockpit Dashboard.
- Checked Session Recording and IP anonymization compliance.
- Documented everything in `posthog-setup-report.md`.

### File List

- [posthog-setup-report.md](file:///d:/Code/ivoire-business-club-next/posthog-setup-report.md)

### Review Findings

- [x] [Review][Decision] Active Users Trend Breakdown by Role — Resolved: Option 1 (Added second breakdown by `role` property in PostHog).
- [x] [Review][Patch] Document Session Replay & Anonymization [posthog-setup-report.md:28]
- [x] [Review][Patch] Include `tier_selected` Event in Instrumented Events Table [posthog-setup-report.md:26]
- [x] [Review][Patch] Next.js Route Syntax in Path Documentation [posthog-setup-report.md:34]
- [x] [Review][Patch] LaTeX Notation in Standard Markdown [posthog-setup-report.md:34]
- [x] [Review][Patch] Inconsistent Link Naming Pattern [posthog-setup-report.md:30]
- [x] [Review][Patch] Redundant Label and Link Text [posthog-setup-report.md:43]
- [x] [Review][Patch] Grammatical Inconsistency in Descriptions [posthog-setup-report.md:43]
- [x] [Review][Patch] Timeframe Parameter Consistency [posthog-setup-report.md:34]
- [x] [Review][Patch] Ambiguous Step Event Logic in Funnels [posthog-setup-report.md:34]
- [x] [Review][Patch] Undocumented Event Property Context [posthog-setup-report.md:43]
- [x] [Review][Patch] Inconsistent Paragraph Header Structure [posthog-setup-report.md:28]
- [x] [Review][Patch] Orphaned Verify Section Header [posthog-setup-report.md:56]
- [x] [Review][Defer] Unhandled PostHog capture errors during server rendering [src/app/(public)/pricing/virement/page.tsx:43-47] — deferred, pre-existing
- [x] [Review][Defer] Duplicate events on page refresh/multiple visits [src/app/(public)/pricing/virement/page.tsx:43-47] — deferred, pre-existing
- [x] [Review][Defer] Unhandled PostHog capture errors after DB transaction commits [src/app/api/opportunities/[id]/interest/route.ts:107-116] — deferred, pre-existing
- [x] [Review][Defer] Unhandled PostHog capture errors in reviews API [src/app/api/opportunities/[id]/reviews/route.ts:120-128] — deferred, pre-existing
- [x] [Review][Defer] Unhandled PostHog capture errors in document access request API [src/app/api/opportunities/[id]/documents/[documentId]/request-access/route.ts:103-107] — deferred, pre-existing
- [x] [Review][Defer] Unhandled PostHog capture errors in reactions API [src/app/api/articles/[id]/reactions/route.ts:172-176] — deferred, pre-existing
- [x] [Review][Defer] Unhandled PostHog capture errors in signup API [src/app/api/auth/signup/route.ts:90-94] — deferred, pre-existing
- [x] [Review][Defer] Unhandled PostHog capture errors in lead-magnet API [src/app/api/lead-magnet/route.ts:67-71] — deferred, pre-existing
- [x] [Review][Defer] Google OAuth sign-in not tracked [src/app/auth/signin/page.tsx:59-63] — deferred, pre-existing

