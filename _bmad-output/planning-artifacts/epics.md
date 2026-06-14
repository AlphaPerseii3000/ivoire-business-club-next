---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
inputDocuments:
  - product-brief.md
  - prd.md
  - ux-spec.md
  - architecture.md
  - technical-feasibility-ibc-2026-05-12.md
  - domain-research-2026-05-12-ibc-deep-dive.md
---

# IBC — Epic Breakdown & User Stories

**Projet :** Ivoire Business Club (IBC)  
**Auteur :** Alphaperseii  
**Date :** 2026-05-13  
**Version :** 1.0  
**Statut :** Prêt pour implémentation  
**Langue :** Français

---

## Overview

Ce document décompose les exigences du PRD, de l'Architecture et de la UX Spec en epics et user stories actionnables pour l'équipe de développement IBC. Chaque story est dimensionnée pour être réalisée par un agent de développement unique, avec des critères d'acceptation testables au format Given/When/Then.

Le produit IBC est un club business digital à trois niveaux pour la diaspora ivoirienne en Europe, construit sur Next.js 16, Prisma 7, Auth.js v5 et TailwindCSS 4. Le modèle de paiement est le virement bancaire sur le compte KS Investment avec validation manuelle admin.

---

## Requirements Inventory

### Functional Requirements (FR)

**Authentification & Gestion des Utilisateurs**
- **FR1** : Un visiteur peut s'inscrire via Google OAuth en un clic
- **FR2** : Un visiteur peut s'inscrire avec email + mot de passe (bcryptjs)
- **FR3** : Un utilisateur connecté peut consulter et modifier son profil (nom, bio, téléphone, localisation, pays)
- **FR4** : Un utilisateur connecté peut supprimer son compte (RGPD)
- **FR5** : Le système distingue les rôles MEMBER et ADMIN
- **FR6** : Le système attribue un tier par défaut (AFFRANCHI) à l'inscription
- **FR7** : L'admin peut lister, suspendre ou réactiver un compte utilisateur

**Tiers & Abonnements**
- **FR8** : Un membre peut visualiser les trois tiers (Affranchis, Grands Frères, Boss) et leurs avantages
- **FR9** : Un membre peut sélectionner un tier et recevoir les instructions de virement bancaire (RIB KS Investment, montant, référence)
- **FR10** : Le système crée un abonnement en statut TRIAL à la soumission du virement
- **FR11** : L'admin peut valider manuellement un abonnement après confirmation de réception du virement (passage TRIAL → ACTIVE)
- **FR12** : L'admin peut refuser ou suspendre un abonnement avec justification
- **FR13** : Le membre reçoit un email de confirmation une fois son abonnement activé
- **FR14** : Le système bloque l'accès aux contenus premium si l'abonnement est CANCELLED ou PAST_DUE

**Marketplace d'Opportunités**
- **FR15** : Un porteur de projet (membre ou admin) peut soumettre une opportunité (titre, description, catégorie, montant, documents)
- **FR16** : Le système attribue un statut de vérification PENDING par défaut à chaque nouvelle opportunité
- **FR17** : L'admin peut modifier le statut d'une opportunité (PENDING → VERIFIED → REJECTED) via un workflow kanban
- **FR18** : Une opportunité REJECTED est visible uniquement par son auteur et les admins
- **FR19** : Une opportunité VERIFIED est visible par les membres selon leur tier (filtrage par visibilité)
- **FR20** : Les opportunités teaser (titre + localisation) sont publiquement visibles sans connexion
- **FR21** : Le système affiche le niveau de confiance IBC (bronze/argent/or) sur chaque deal
- **FR22** : Le système exige une double-vérification admin pour les deals > 50 000 €
- **FR23** : Un membre peut consulter le dossier juridique attaché à une opportunité (titre foncier, KYC promoteur)

**Networking & Matching**
- **FR24** : Chaque profil membre affiche un bouton « Discuter sur WhatsApp » (deep link wa.me)
- **FR25** : Chaque opportunité affiche un bouton « Contacter le porteur sur WhatsApp »
- **FR26** : Les membres peuvent ajouter des tags à leur profil (secteur, montant recherché, localisation)
- **FR27** : Les opportunités peuvent être taguées (secteur, montant, localisation)
- **FR28** : Le système propose un matching basique entre profils et opportunités basé sur les tags communs
- **FR29** : Un membre peut marquer son intérêt (soft commitment) sur un deal
- **FR30** : Le système notifie l'auteur d'une opportunité lorsqu'un membre manifeste son intérêt

**Reviews & Réputation**
- **FR31** : Après une mise en relation conclue, l'investisseur et le porteur de projet peuvent se laisser mutuellement une review (note + commentaire)
- **FR32** : Le système calcule un score de fiabilité IBC par membre et par porteur de projet
- **FR33** : Le système attribue automatiquement le badge « Membre Platinum » après 3+ deals validés et reviews moyennes ≥ 4,5/5
- **FR34** : Les reviews sont visibles sur le profil public du membre

**Administration & Back-office**
- **FR35** : L'admin visualise un tableau de bord kanban des opportunités à vérifier (à faire / en cours / validé / refusé)
- **FR36** : L'admin consulte les métriques clés : MRR, nombre de membres actifs, taux de conversion onboarding, taux de churn
- **FR37** : L'admin peut uploader ou consulter les documents juridiques attachés à une opportunité
- **FR38** : L'admin peut éditer ou supprimer une opportunité publiée
- **FR39** : Le système logue toutes les actions d'admin (piste d'audit pour compliance)
- **FR40** : L'admin peut envoyer un email de confirmation de virement à un membre

**Landing & Contenu**
- **FR41** : La landing page affiche les deals teaser publics sans connexion
- **FR42** : La landing page présente les trois tiers avec leurs avantages et prix
- **FR43** : La landing page affiche le mur des succès (testimonials, deals closés)
- **FR44** : Le site est entièrement en français
- **FR45** : Le site est responsive et mobile-first

### Non-Functional Requirements (NFR)

**Performance**
- **NFR-P1** : Temps de chargement initial de la landing page < 2 s sur connexion 3G
- **NFR-P2** : Temps de réponse des API protégées < 500 ms (p95)
- **NFR-P3** : Temps de réponse Auth.js (signin/session) < 300 ms
- **NFR-P4** : Le build Next.js standalone doit être < 100 Mo

**Sécurité**
- **NFR-S1** : Toutes les communications sont en HTTPS avec HSTS
- **NFR-S2** : Les mots de passe sont hashés avec bcryptjs (coût ≥ 10)
- **NFR-S3** : Rate limiting sur `/api/auth/signup` : 5 inscriptions/minute/IP
- **NFR-S4** : Rate limiting sur `/api/auth/signin` : 10 tentatives/minute/IP
- **NFR-S5** : Middleware Auth.js actif sur toutes les routes protégées (`/dashboard`, `/admin`, `/api/*` sensibles)
- **NFR-S6** : Protection CSRF native sur toutes les routes Auth.js
- **NFR-S7** : Headers de sécurité : Content-Security-Policy, X-Frame-Options, X-Content-Type-Options
- **NFR-S8** : Pas de données sensibles en clair dans les logs
- **NFR-S9** : Piste d'audit sur toutes les transactions d'abonnement et mises en relation

**Scalabilité**
- **NFR-SC1** : Support de 500 membres actifs simultanés en Phase 1
- **NFR-SC2** : Architecture prévue pour 2 000 membres sans refonte majeure
- **NFR-SC3** : DB PostgreSQL en production (remplace SQLite avant déploiement)

**Accessibilité**
- **NFR-A1** : Conformité WCAG 2.1 niveau AA pour les parcours critiques (onboarding, paiement, consultation deal)
- **NFR-A2** : Support du mode sombre via TailwindCSS
- **NFR-A3** : Textes en français adaptés à un public non technique

**Déploiement & Fiabilité**
- **NFR-D1** : Configuration `output: 'standalone'` dans next.config.ts
- **NFR-D2** : Déploiement sur VPS Infomaniak (Ubuntu 24.04) avec PM2 cluster
- **NFR-D3** : Nginx reverse proxy avec cache des assets statiques (1 an)
- **NFR-D4** : SSL Let's Encrypt avec renouvellement automatique (Certbot)
- **NFR-D5** : Scripts de déploiement automatisés (`prepare-deploy.sh`, `ecosystem.config.js`)
- **NFR-D6** : Logs PM2 rotatifs et centralisés

**Intégration & Compatibilité**
- **NFR-I1** : Deep links WhatsApp fonctionnels sur mobile et desktop (`https://wa.me/<numéro>`)
- **NFR-I2** : Emails transactionnels envoyés via Resend ou SendGrid
- **NFR-I3** : Stockage des documents juridiques sur Cloudflare R2 (pas de frais de sortie)

### Additional Requirements (Architecture)

- Brownfield — étendre la structure existante (Next.js 16 + Prisma 7 + Auth.js v5 + Tailwind 4 + shadcn/ui)
- Auth.js split config : `auth.config.ts` (Edge Runtime, pas de Prisma/bcrypt) + `auth.ts` (Node.js, full config)
- `src/middleware.ts` existe déjà et instancie `NextAuth(authConfig)`
- Prisma 7 : importer le client depuis `@/generated/prisma/client`
- Session JWT avec claims `tier`, `role`, `id` embarqués
- Supprimer intégralement Stripe et CinetPay du codebase (fichiers et dépendances)
- API RESTful via Route Handlers (`app/api/**/route.ts`)
- Formulaires : React Hook Form + Zod (`src/lib/validations.ts`)
- Emails transactionnels via Resend
- Stockage fichiers : Cloudflare R2 via SDK S3-compatible
- Rate limiting : `@upstash/ratelimit` + `@upstash/redis`
- Base de données : migrer SQLite → PostgreSQL en production
- Route groups : `(public)`, `(dashboard)`, `(admin)`
- Build output : `output: 'standalone'` pour PM2 + Nginx
- P0 Blockers à résoudre :
  1. `output: 'standalone'` dans `next.config.ts`
  2. Installer `@upstash/ratelimit` et protéger `/api/auth/signup` et `/api/auth/signin`
  3. Retirer Stripe + CinetPay du codebase
  4. Créer le workflow de virement bancaire (RIB KS Investment, page instructions, validation admin)
  5. Migrer le schéma Prisma (retirer `STRIPE`/`CINETPAY` de `PaymentProvider`, adapter `Subscription`)
  6. Créer `prisma.config.ts` pour Prisma v7

### UX Design Requirements (UX-DR)

**Design System & Tokens**
- **UX-DR1** : Implémenter le système de design tokens dans `globals.css` (variables CSS pour couleurs, espacement, typographie)
- **UX-DR2** : Thème shadcn/ui avec palette IBC (teal primary `#0F766E`, amber secondary `#F59E0B`, WhatsApp green `#25D366`)

**Composants Personnalisés IBC**
- **UX-DR3** : Composant `TrustBadge` (niveaux bronze/argent/or, tailles sm/md, tooltip explicatif)
- **UX-DR4** : Composant `DealCard` (image 16:9, titre, localisation, montant, badge confiance, compteur documents, CTA WhatsApp)
- **UX-DR5** : Composant `WhatsAppCTA` (numéro, message pré-rempli, tailles sm/md/lg, aria-label)
- **UX-DR6** : Composant `TierCard` (sélection tier, état selected, liste des avantages, bouton action)
- **UX-DR7** : Composant `VerificationTimeline` (stepper horizontal : documents uploadés → vérifié IBC → reviews communautaires)
- **UX-DR8** : Composant `DocumentRow` (icône fichier, nom, taille, téléchargement, vignette preview)
- **UX-DR9** : Composant `StatusPill` (indicateur universel avec animation de transition)
- **UX-DR10** : Composant `EmptyState` (icône + titre + description + CTA optionnel)
- **UX-DR11** : Composant `SubscriptionStatusTracker` (stepper vertical TRIAL → PENDING → ACTIVE)

**Patterns UX**
- **UX-DR12** : Hiérarchie boutons (primary teal, secondary outline, tertiary ghost, destructive red, WhatsApp green)
- **UX-DR13** : Patterns de feedback (toast success/error/warning/info avec bordure colorée et icône)
- **UX-DR14** : Patterns de formulaire (label au-dessus, placeholder muted, validation inline, état loading)
- **UX-DR15** : Navigation mobile (bottom tab bar 3–4 onglets) et desktop (sidebar admin, top bar member)
- **UX-DR16** : Modales desktop (Dialog centrée) et mobile (Sheet bottom avec handle bar)
- **UX-DR17** : États vides sur toutes les listes (jamais d'écran blanc)
- **UX-DR18** : Recherche et filtrage (search debounced 300ms, filter chips horizontaux scrollables, tri dropdown)
- **UX-DR19** : États de chargement (skeleton shimmer pour contenu, spinner pour actions)
- **UX-DR20** : États d'erreur (network, auth, data) avec message clair et action de récupération
- **UX-DR21** : États de succès (toast, page-level célébration, inline checkmark)
- **UX-DR22** : États d'attente (tracker abonnement, deal en vérification)
- **UX-DR23** : États hover/focus/active (focus ring `ring-2 ring-primary`, active scale 0.98)

**Responsive & Accessibilité**
- **UX-DR24** : Approche mobile-first (base 320px, breakpoints sm/md/lg/xl)
- **UX-DR25** : Cibles tactiles ≥ 44×44px, espacement ≥ 8px entre éléments interactifs
- **UX-DR26** : Conformité WCAG 2.1 AA (contraste 4.5:1, focus visible, aria-labels, headings logiques)
- **UX-DR27** : Support `prefers-reduced-motion` (désactiver animations)
- **UX-DR28** : Langue `lang="fr"` sur `<html>`, diacritiques corrects

**Layouts**
- **UX-DR29** : Landing page (hero, mur des succès, teaser deals, comparaison tiers, trust signals)
- **UX-DR30** : Deal feed mobile (filter chips, cartes verticales, bottom tab bar floating)
- **UX-DR31** : Deal detail (header sticky, hero image, timeline vérification, documents scrollables, CTA sticky bottom)
- **UX-DR32** : Onboarding / Sélection tier (stepper 3 étapes, cartes tier verticales, page instructions virement)
- **UX-DR33** : Profil (header card avatar+tier, statut abonnement, tags chips, reviews, settings)
- **UX-DR34** : Admin kanban (metrics top, colonnes 4 statuts, carte détail slide-in)

---

## FR Coverage Map

| FR | Epic | Story | Description |
|----|------|-------|-------------|
| FR1 | Epic 1 | 1.1 | Inscription Google OAuth |
| FR2 | Epic 1 | 1.2 | Inscription email + mot de passe |
| FR3 | Epic 1 | 1.4 | Consultation et modification du profil |
| FR4 | Epic 1 | 1.5 | Suppression de compte RGPD |
| FR5 | Epic 1 | 1.3 | Distinction des rôles MEMBER/ADMIN dans JWT |
| FR6 | Epic 1 | 1.3 | Attribution tier AFFRANCHI par défaut |
| FR7 | Epic 6 | 6.5 | Admin lister/suspendre/réactiver comptes |
| FR8 | Epic 2 | 2.2 | Visualisation des trois tiers |
| FR9 | Epic 2 | 2.3 | Sélection tier + instructions virement |
| FR10 | Epic 2 | 2.3 | Création abonnement TRIAL |
| FR11 | Epic 2 | 2.4 | Validation manuelle admin abonnement |
| FR12 | Epic 2 | 2.4 | Refus/suspension abonnement avec justification |
| FR13 | Epic 2 | 2.5 | Email confirmation abonnement activé |
| FR14 | Epic 2 | 2.5 | Blocage contenus premium si abonnement invalide |
| FR15 | Epic 3 | 3.1 | Soumission opportunité avec documents |
| FR16 | Epic 3 | 3.1 | Statut PENDING par défaut |
| FR17 | Epic 3 | 3.3 | Workflow kanban admin vérification |
| FR18 | Epic 3 | 3.3 | Visibilité REJECTED restreinte |
| FR19 | Epic 3 | 3.4 | Visibilité VERIFIED par tier |
| FR20 | Epic 3 | 3.4 | Deals teaser publics sans connexion |
| FR21 | Epic 3 | 3.5 | Niveau de confiance bronze/argent/or |
| FR22 | Epic 3 | 3.5 | Double-vérification deals > 50k€ |
| FR23 | Epic 3 | 3.5 | Consultation dossier juridique attaché |
| FR24 | Epic 4 | 4.1 | Deep link WhatsApp sur profils |
| FR25 | Epic 4 | 4.1 | Deep link WhatsApp sur opportunités |
| FR26 | Epic 4 | 4.2 | Tags profil (secteur, montant, localisation) |
| FR27 | Epic 4 | 4.2 | Tags opportunités |
| FR28 | Epic 4 | 4.3 | Matching basique par tags |
| FR29 | Epic 4 | 4.4 | Soft commitment (marquer intérêt) |
| FR30 | Epic 4 | 4.4 | Notification auteur lorsqu'intérêt manifesté |
| FR31 | Epic 5 | 5.1 | Reviews mutuelles post-deal |
| FR32 | Epic 5 | 5.2 | Score de fiabilité IBC |
| FR33 | Epic 5 | 5.2 | Badge Membre Platinum automatique |
| FR34 | Epic 5 | 5.3 | Reviews visibles sur profil public |
| FR35 | Epic 6 | 6.1 | Tableau de bord kanban opportunités |
| FR36 | Epic 6 | 6.2 | Métriques clés (MRR, actifs, conversion, churn) |
| FR37 | Epic 6 | 6.3 | Upload/consultation documents juridiques admin |
| FR38 | Epic 6 | 6.3 | Édition/suppression opportunité publiée |
| FR39 | Epic 6 | 6.4 | Audit logs actions admin |
| FR40 | Epic 6 | 6.5 | Envoi email confirmation virement par admin |
| FR41 | Epic 7 | 7.1 | Landing page deals teaser publics |
| FR42 | Epic 7 | 7.2 | Présentation trois tiers et mur des succès |
| FR43 | Epic 7 | 7.2 | Mur des succès testimonials |
| FR44 | *Transverse* | Toutes | Site entièrement en français |
| FR45 | *Transverse* | Toutes | Responsive mobile-first |
| FR46 | Epic 9 | 9.2 | Création/édition/publication articles |
| FR47 | Epic 9 | 9.2 | Sélection visibilité articles par tier |
| FR48 | Epic 9 | 9.3 | Consultation articles publics par visiteur |
| FR49 | Epic 9 | 9.3 | Consultation articles par tier membre |
| FR50 | Epic 9 | 9.3 | Affichage CTA upgrade articles premium |
| FR51 | Epic 9 | 9.4 | Accès articles via /articles et SEO |
| FR52 | Epic 9 | 9.5 | Réagir aux articles (LIKE, CLAP, INSIGHTFUL) |
| FR53 | Epic 9 | 9.5 | Décompte et affichage des réactions |

---

## Epic List

### Epic 1: Authentification, Profils et Sécurité
Les utilisateurs peuvent s'inscrire, se connecter, gérer leur profil et bénéficier d'un système d'authentification sécurisé avec rate limiting. Cet epic pose les fondations de confiance de la plateforme.

**FRs couverts :** FR1, FR2, FR3, FR4, FR5, FR6
**NFRs couverts :** NFR-S1, NFR-S2, NFR-S3, NFR-S4, NFR-S5, NFR-S6, NFR-S7, NFR-S8, NFR-SC3
**UX-DRs couverts :** UX-DR14 (formulaires), UX-DR19 (états chargement), UX-DR20 (états erreur auth), UX-DR23 (focus rings), UX-DR26 (accessibilité formulaires)

### Epic 2: Tiers et Paiement par Virement Bancaire
Les membres peuvent choisir un tier d'abonnement, recevoir les instructions de virement bancaire KS Investment, et être activés après validation manuelle admin. Ce epic élimine la dépendance aux providers de paiement tiers.

**FRs couverts :** FR8, FR9, FR10, FR11, FR12, FR13, FR14
**NFRs couverts :** NFR-I2, NFR-S9 (audit abonnements)
**UX-DRs couverts :** UX-DR6 (TierCard), UX-DR11 (SubscriptionStatusTracker), UX-DR13 (feedback toast), UX-DR32 (onboarding tier)
**P0 couverts :** Retrait Stripe/CinetPay, workflow virement bancaire

### Epic 3: Marketplace d'Opportunités et Vérification
Les porteurs de projet peuvent soumettre des opportunités avec documents juridiques. Les admins vérifient via un workflow kanban. Les membres consultent les deals selon leur tier avec niveaux de confiance visibles.

**FRs couverts :** FR15, FR16, FR17, FR18, FR19, FR20, FR21, FR22, FR23
**NFRs couverts :** NFR-I3 (Cloudflare R2), NFR-S9 (audit deals)
**UX-DRs couverts :** UX-DR3 (TrustBadge), UX-DR4 (DealCard), UX-DR7 (VerificationTimeline), UX-DR8 (DocumentRow), UX-DR9 (StatusPill), UX-DR10 (EmptyState), UX-DR30 (deal feed), UX-DR31 (deal detail)

### Epic 4: Networking, Matching et WhatsApp
Les membres peuvent se contacter via WhatsApp directement depuis les profils et les deals. Le matching par tags connecte investisseurs et porteurs de projet selon leurs critères.

**FRs couverts :** FR24, FR25, FR26, FR27, FR28, FR29, FR30
**NFRs couverts :** NFR-I1 (deep links WhatsApp)
**UX-DRs couverts :** UX-DR5 (WhatsAppCTA), UX-DR15 (navigation), UX-DR18 (filtres tags)

### Epic 5: Reviews, Réputation et Confiance
Après une mise en relation, les parties peuvent se laisser des reviews mutuelles. Le système calcule un score de fiabilité et attribue automatiquement le badge Membre Platinum aux membres distingués.

**FRs couverts :** FR31, FR32, FR33, FR34
**NFRs couverts :** NFR-S9 (audit reviews)
**UX-DRs couverts :** UX-DR13 (feedback succès), UX-DR21 (états célébration)

### Epic 6: Administration et Back-office
Les admins disposent d'un tableau de bord kanban pour vérifier les opportunités et les abonnements, consultent les métriques clés, et gèrent la conformité via des audit logs. Cet epic inclut la préparation du déploiement production.

**FRs couverts :** FR7, FR35, FR36, FR37, FR38, FR39, FR40
**NFRs couverts :** NFR-D1, NFR-D2, NFR-D3, NFR-D4, NFR-D5, NFR-D6
**UX-DRs couverts :** UX-DR34 (admin kanban), UX-DR16 (modales admin), UX-DR17 (états vides admin)
**P0 couverts :** standalone output, scripts déploiement

### Epic 7: Landing Page et Découverte Publique
Le public peut découvrir les deals teaser, le mur des succès et les tiers IBC sans connexion. La landing page est optimisée pour le SEO et la conversion, avec une expérience entièrement responsive.

**FRs couverts :** FR41, FR42, FR43, FR44, FR45
**NFRs couverts :** NFR-P1, NFR-A1, NFR-A2, NFR-A3
**UX-DRs couverts :** UX-DR29 (landing layout), UX-DR24 (responsive), UX-DR25 (touch targets), UX-DR26 (accessibilité), UX-DR27 (reduced motion)

### Epic 9: Contenu Éditorial & Ressources Membres
Ajouter un système d'articles éditoriaux avec visibilité par tier, offrant aux visiteurs et membres du contenu gratuit et aux abonnés un accès progressif selon leur tier.

**FRs couverts :** FR46, FR47, FR48, FR49, FR50, FR51, FR52, FR53
**NFRs couverts :** NFR-P1, NFR-A1, NFR-A3
**UX-DRs couverts :** UX-DR14 (formulaires), UX-DR19 (états chargement), UX-DR20 (états erreur)

---

## Epic 1: Authentification, Profils et Sécurité

**Objectif :** Offrir aux utilisateurs une inscription et une connexion fluides via Google OAuth ou email/mot de passe, avec gestion complète du profil, rôles et tiers. Sécuriser l'ensemble avec rate limiting, headers de sécurité et audit.

---

### Story 1.1: Inscription via Google OAuth

**En tant que** visiteur,  
**Je veux** m'inscrire en un clic avec mon compte Google,  
**Afin de** rejoindre IBC sans créer un nouveau mot de passe.

**Acceptance Criteria :**

**Given** un visiteur non authentifié sur la page `/auth/signup`  
**When** il clique sur « S'inscrire avec Google » et autorise l'application  
**Then** un compte utilisateur est créé avec `role = MEMBER`, `tier = AFFRANCHI`, et `email` provenant du profil Google  
**And** le visiteur est redirigé vers `/dashboard` avec une session JWT active contenant `id`, `role`, `tier`

**Given** un visiteur dont l'email Google existe déjà dans la base  
**When** il tente de s'inscrire via Google OAuth  
**Then** le système lie le compte OAuth existant et connecte l'utilisateur sans créer de doublon

**Given** un visiteur sur mobile (connexion 3G)  
**When** il clique sur le bouton Google OAuth  
**Then** le flux d'autorisation Google s'ouvre en moins de 2 secondes (NFR-P1)

---

### Story 1.2: Inscription avec Email et Mot de Passe

**En tant que** visiteur,  
**Je veux** m'inscrire avec mon email et un mot de passe sécurisé,  
**Afin de** créer un compte IBC indépendamment de Google.

**Acceptance Criteria :**

**Given** un visiteur non authentifié sur la page `/auth/signup`  
**When** il saisit un email valide, un mot de passe d'au moins 8 caractères, et soumet le formulaire  
**Then** le système crée un utilisateur avec `role = MEMBER`, `tier = AFFRANCHI`, mot de passe hashé avec bcryptjs (coût ≥ 10, NFR-S2), et redirige vers `/dashboard`

**Given** un visiteur saisit un email déjà utilisé  
**When** il soumet le formulaire  
**Then** un message d'erreur clair s'affiche : « Cet email est déjà associé à un compte. »

**Given** un visiteur tente de s'inscrire depuis la même IP  
**When** il effectue plus de 5 tentatives d'inscription en 1 minute  
**Then** la 6ème tentative est bloquée avec un statut 429 et le message : « Trop de tentatives. Réessayez dans une minute. » (NFR-S3)

**Given** un visiteur saisit un mot de passe faible (< 8 caractères)  
**When** le champ perd le focus  
**Then** un indicateur de force du mot de passe s'affiche en dessous du champ (inline validation, UX-DR14)

---

### Story 1.3: Connexion, Session et Rôles

**En tant que** membre inscrit,  
**Je veux** me connecter avec Google ou email/mot de passe,  
**Afin d'** accéder à mon espace personnel avec une session sécurisée.

**Acceptance Criteria :**

**Given** un utilisateur inscrit sur la page `/auth/signin`  
**When** il saisit ses identifiants valides et soumet  
**Then** le système établit une session JWT contenant `id`, `email`, `role`, `tier`, et redirige vers `/dashboard` en moins de 300 ms (NFR-P3)

**Given** un utilisateur avec `role = ADMIN`  
**When** il est authentifié  
**Then** le JWT contient `role = ADMIN` et le middleware autorise l'accès aux routes `/admin/*`

**Given** un utilisateur avec `role = MEMBER`  
**When** il tente d'accéder à `/admin`  
**Then** le middleware le redirige vers `/dashboard` ou `/`

**Given** un utilisateur non authentifié  
**When** il tente d'accéder à `/dashboard` ou `/api/*` protégé  
**Then** le middleware le redirige vers `/auth/signin` (NFR-S5)

**Given** un utilisateur tente de se connecter depuis la même IP  
**When** il effectue plus de 10 tentatives en 1 minute  
**Then** la tentative est bloquée avec statut 429 (NFR-S4)

---

### Story 1.4: Gestion du Profil Utilisateur

**En tant que** membre connecté,  
**Je veux** consulter et modifier mon profil (nom, bio, téléphone, localisation, pays),  
**Afin de** personnaliser ma présence sur IBC et améliorer mon matching.

**Acceptance Criteria :**

**Given** un membre connecté sur `/profile`  
**When** il consulte sa page de profil  
**Then** il voit ses informations actuelles : nom, email, bio, téléphone, localisation, pays, tier, date d'inscription

**Given** un membre connecté sur `/profile/edit`  
**When** il modifie son nom, sa bio, son téléphone, sa localisation ou son pays et sauvegarde  
**Then** les changements sont persistés en base et un toast de confirmation s'affiche : « Profil mis à jour avec succès. »

**Given** un membre modifiant son profil  
**When** il saisit un numéro de téléphone invalide  
**Then** la validation Zod affiche une erreur inline : « Veuillez saisir un numéro de téléphone valide. »

**Given** un membre connecté  
**When** il met à jour ses informations  
**Then** le champ `country` est prêt pour l'expansion UEMOA (valeurs : CI, SN, CM, GA, etc.)

---

### Story 1.5: Suppression de Compte (RGPD)

**En tant que** membre connecté,  
**Je veux** supprimer définitivement mon compte,  
**Afin d'** exercer mon droit à l'effacement conformément au RGPD.

**Acceptance Criteria :**

**Given** un membre connecté sur `/profile/settings`  
**When** il clique sur « Supprimer mon compte »  
**Then** une modale de confirmation s'affiche avec l'avertissement : « Cette action est irréversible. Toutes vos données seront supprimées. »

**Given** un membre dans la modale de suppression  
**When** il confirme la suppression  
**Then** son compte utilisateur, ses sessions, ses abonnements, ses opportunités et ses reviews sont anonymisés ou supprimés selon la politique de rétention  
**And** il est déconnecté et redirigé vers `/`

**Given** un membre supprimé  
**When** ses opportunités existaient  
**Then** les opportunités publiées sont supprimées ou réattribuées à un compte système selon la décision produit

---

### Story 1.6: Renforcement de la Sécurité — Rate Limiting et Headers

**En tant que** administrateur technique,  
**Je veux** que les routes sensibles soient protégées contre les abus et que les headers de sécurité soient actifs,  
**Afin de** garantir la résilience et la conformité du système.

**Acceptance Criteria :**

**Given** la route `/api/auth/signup`  
**When** un client effectue une requête POST  
**Then** le rate limiter Upstash autorise maximum 5 requêtes par minute par IP (NFR-S3)

**Given** la route `/api/auth/signin`  
**When** un client effectue une requête POST  
**Then** le rate limiter autorise maximum 10 requêtes par minute par IP (NFR-S4)

**Given** toute réponse HTTP de l'application  
**When** elle est servie via Nginx (production)  
**Then** les headers suivants sont présents : `Strict-Transport-Security`, `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` (NFR-S7)

**Given** une erreur serveur inattendue  
**When** elle se produit  
**Then** aucune donnée sensible (email, mot de passe, token) n'apparaît dans les logs PM2 (NFR-S8)

**Given** la configuration Prisma 7  
**When** le projet démarre  
**Then** le fichier `prisma.config.ts` est présent et configure correctement la datasource URL (P0 blocker #6)

---

### Story 1.7: Configuration Déploiement — Standalone et PM2

**En tant que** administrateur technique,  
**Je veux** que l'application soit configurée pour le déploiement standalone sur VPS,  
**Afin de** garantir un déploiement fiable sur Infomaniak.

**Acceptance Criteria :**

**Given** le fichier `next.config.ts`  
**When** le build de production est exécuté (`npm run build`)  
**Then** la sortie génère `.next/standalone/server.js` grâce à `output: 'standalone'` (NFR-D1, P0 blocker #1)

**Given** le fichier `ecosystem.config.js` à la racine  
**When** PM2 démarre l'application (`pm2 start ecosystem.config.js`)  
**Then** l'application tourne en mode cluster avec auto-restart et logs rotatifs (NFR-D2, NFR-D6)

**Given** le script `prepare-deploy.sh`  
**When** il est exécuté après un build réussi  
**Then** il assemble le dossier `deploy-dist/` avec standalone, static assets, public, et ecosystem.config.js (NFR-D5)

---

## Epic 2: Tiers et Paiement par Virement Bancaire

**Objectif :** Permettre aux membres de choisir un tier d'abonnement, recevoir les instructions de virement bancaire sur le compte KS Investment, et être activés après validation manuelle admin. Retirer totalement Stripe et CinetPay du codebase.

---

### Story 2.1: Retrait des Providers de Paiement Tiers et Préparation Virement

**En tant que** développeur,  
**Je veux** retirer Stripe et CinetPay du codebase et préparer le modèle de données pour le virement bancaire,  
**Afin de** stabiliser la stack sur le modèle de paiement unique par virement.

**Acceptance Criteria :**

**Given** le codebase IBC  
**When** la story est terminée  
**Then** les fichiers `src/lib/stripe.ts`, `src/lib/cinetpay.ts`, `src/app/api/stripe/**`, `src/app/api/cinetpay/**` sont supprimés (P0 blocker #3)

**Given** `package.json`  
**When** la story est terminée  
**Then** les dépendances `stripe`, `@stripe/stripe-js`, et modules CinetPay sont retirées

**Given** le schéma Prisma  
**When** la migration est appliquée  
**Then** l'enum `PaymentProvider` ne contient plus `STRIPE` ni `CINETPAY` ; le modèle `Subscription` est adapté pour `provider = BANK_TRANSFER` (P0 blocker #5)

**Given** la base de données  
**When** la migration s'exécute  
**Then** les données existantes des paiements Stripe/CinetPay sont préservées ou archivées selon la stratégie de rétention

---

### Story 2.2: Affichage et Comparaison des Tiers

**En tant que** visiteur ou membre,  
**Je veux** voir les trois tiers (Affranchis, Grands Frères, Boss) avec leurs avantages et prix,  
**Afin de** choisir l'offre adaptée à mes besoins.

**Acceptance Criteria :**

**Given** un visiteur sur `/pricing` ou la landing page  
**When** il consulte la section des tiers  
**Then** trois cartes `TierCard` s'affichent verticalement (mobile) ou horizontalement (desktop) :
- Affranchis : €29/mois, accès deals vérifiés
- Grands Frères : €49/mois, deals prioritaires + events
- Boss : €99/mois, deals exclusifs + mentorat 1-1

**Given** un membre connecté  
**When** il consulte sa page de profil  
**Then** son tier actuel est affiché sous forme de badge coloré (teal/amber/violet) avec la date d'adhésion

**Given** un membre sur mobile  
**When** il interagit avec les cartes de tier  
**Then** les cibles tactiles sont ≥ 44×44px, les textes sont en français sans jargon (NFR-A3), et le contraste respecte WCAG 2.1 AA (NFR-A1)

---

### Story 2.3: Sélection du Tier et Instructions de Virement

**En tant que** membre connecté,  
**Je veux** sélectionner un tier et recevoir les instructions de virement bancaire,  
**Afin de** payer mon abonnement par virement sur le compte KS Investment.

**Acceptance Criteria :**

**Given** un membre connecté sur `/pricing`  
**When** il clique sur « Sélectionner » pour un tier  
**Then** la carte passe en état selected (bordure épaisse, checkmark) et un bouton « Continuer » apparaît

**Given** un membre ayant sélectionné un tier  
**When** il clique sur « Continuer »  
**Then** une page d'instructions de virement s'affiche avec :
- Bénéficiaire : KS Investment
- IBAN/RIB avec bouton « Copier »
- Montant auto-rempli selon le tier
- Référence auto-générée : `IBC-{userId}-{tier}`
- Bouton « Copier tout »
- FAQ : « Combien de temps pour la validation ? » → « Sous 24h ouvrées »

**Given** un membre ayant effectué le virement  
**When** il clique sur « J'ai effectué le virement »  
**Then** un abonnement est créé en statut `TRIAL` avec `provider = BANK_TRANSFER` (FR10)  
**And** un toast s'affiche : « Merci ! Nous validons sous 24h. »  
**And** le `SubscriptionStatusTracker` affiche TRIAL → PENDING (en cours, pulsing amber)

---

### Story 2.4: Validation Manuelle des Abonnements par l'Admin

**En tant que** administrateur IBC,  
**Je veux** valider ou refuser les abonnements après confirmation de réception du virement bancaire,  
**Afin de** contrôler l'accès au club.

**Acceptance Criteria :**

**Given** l'admin sur `/admin/subscriptions`  
**When** il consulte la liste des abonnements en attente  
**Then** il voit les abonnements `PENDING` avec : nom membre, tier, montant, date de soumission, référence virement

**Given** un abonnement en statut `PENDING`  
**When** l'admin clique sur « Valider » après vérification bancaire  
**Then** le statut passe à `ACTIVE`, un email de confirmation est envoyé au membre via Resend (FR11, FR13, NFR-I2), et le membre accède aux contenus premium

**Given** un abonnement en statut `PENDING`  
**When** l'admin clique sur « Refuser »  
**Then** un champ de justification apparaît, le statut passe à `CANCELLED`, et le membre reçoit un email de refus avec la justification (FR12)

**Given** un membre avec abonnement `ACTIVE`  
**When** l'admin suspend l'abonnement  
**Then** le statut passe à `CANCELLED` ou `PAST_DUE`, et l'accès aux contenus premium est bloqué (FR14)

---

### Story 2.5: Suivi des Statuts d'Abonnement et Notifications

**En tant que** membre,  
**Je veux** suivre l'état de mon abonnement et recevoir des notifications,  
**Afin de** savoir quand je pourrai accéder aux contenus premium.

**Acceptance Criteria :**

**Given** un membre avec abonnement `TRIAL` ou `PENDING`  
**When** il consulte son profil  
**Then** le `SubscriptionStatusTracker` affiche le stepper vertical : TRIAL (complété) → PENDING (en cours, pulsing) → ACTIVE (pending) avec timestamps

**Given** un membre en attente depuis plus de 24h  
**When** il consulte son profil  
**Then** un CTA « Contacter le support » (deep link WhatsApp) s'affiche en dessous du tracker

**Given** un membre dont l'abonnement passe à `ACTIVE`  
**When** l'admin valide le virement  
**Then** le membre reçoit un email : « Votre abonnement IBC [Tier] est activé. Bienvenue dans le club ! »  
**And** une notification in-app s'affiche avec une célébration visuelle (badge tier animé)

**Given** un membre avec abonnement invalide  
**When** il tente d'accéder à un deal premium  
**Then** un overlay ou une modale l'informe : « Votre abonnement est inactif. Renouvelez pour accéder aux deals. » avec CTA vers `/pricing`

---

## Epic 3: Marketplace d'Opportunités et Vérification

**Objectif :** Permettre aux porteurs de projet de soumettre des opportunités avec documents juridiques, aux admins de vérifier via un workflow kanban, et aux membres de consulter les deals avec niveaux de confiance et visibilité par tier.

---

### Story 3.1: Création et Soumission d'Opportunité

**En tant que** porteur de projet (membre),  
**Je veux** créer et soumettre une opportunité avec ses informations de base,  
**Afin de** la proposer à la communauté IBC.

**Acceptance Criteria :**

**Given** un membre connecté sur `/dashboard/opportunities/new`  
**When** il remplit le formulaire (titre, description, catégorie : Immobilier/Business/Investissement/Partenariat, montant) et soumet  
**Then** une opportunité est créée en base avec `verificationStatus = PENDING` (FR16) et `authorId` lié au membre

**Given** un membre soumettant une opportunité  
**When** le montant dépasse 50 000 €  
**Then** un flag `requiresDoubleVerification = true` est positionné automatiquement (FR22)

**Given** un membre sur mobile  
**When** il remplit le formulaire  
**Then** le formulaire est single-column, les champs ont des labels clairs en français, la validation Zod affiche les erreurs inline (UX-DR14, NFR-A3)

**Given** une opportunité créée  
**When** elle est soumise avec succès  
**Then** un toast s'affiche : « Deal soumis avec succès. Notre équipe le vérifie sous 48h. »  
**And** le membre est redirigé vers `/dashboard/opportunities`

---

### Story 3.2: Upload et Attachement de Documents Juridiques

**En tant que** porteur de projet,  
**Je veux** uploader des documents juridiques (titre foncier, KYC, registre du commerce) sur mon deal,  
**Afin de** renforcer la crédibilité de mon opportunité.

**Acceptance Criteria :**

**Given** un membre sur la page de son deal (édition ou création)  
**When** il clique sur « Ajouter un document » et sélectionne un fichier PDF ou image (< 10 Mo)  
**Then** le fichier est uploadé vers Cloudflare R2 via une URL signée (NFR-I3)  
**And** un `DocumentRow` s'affiche avec : icône fichier, nom, taille, bouton preview

**Given** un document en cours d'upload  
**When** le fichier est volumineux  
**Then** une barre de progression s'affiche et le membre peut continuer à éditer d'autres champs

**Given** un membre consultant son deal  
**When** des documents sont attachés  
**Then** ils apparaissent dans une section « Documents juridiques » avec un compteur visuel (icône paperclip + nombre)

**Given** un admin ou l'auteur du deal  
**When** il clique sur un document  
**Then** il peut le prévisualiser inline (viewer PDF/thumbnail image) ou le télécharger

---

### Story 3.3: Workflow Kanban de Vérification Admin

**En tant que** administrateur IBC,  
**Je veux** gérer les opportunités en attente via un tableau kanban,  
**Afin de** vérifier ou rejeter les deals efficacement.

**Acceptance Criteria :**

**Given** l'admin sur `/admin/opportunities`  
**When** il consulte le tableau kanban  
**Then** quatre colonnes s'affichent : PENDING | EN COURS | VERIFIED | REJECTED (FR35)

**Given** l'admin sur desktop (≥ 1024px)  
**When** il interagit avec le kanban  
**Then** il voit un layout grid 4 colonnes avec drag-and-drop ou clic-pour-déplacer entre colonnes

**Given** l'admin sur mobile  
**When** il consulte le kanban  
**Then** il voit une liste empilée avec des chips de filtre par statut (UX-DR34)

**Given** une carte deal dans la colonne PENDING  
**When** l'admin clique sur la carte  
**Then** un panneau de détail slide-in (desktop) ou page plein écran (mobile) s'ouvre avec :
- Titre, description, catégorie, montant
- Auteur (avatar + nom)
- Documents juridiques avec preview inline
- Boutons « Vérifier » (vert) et « Rejeter » (rouge) avec champ de note

**Given** l'admin clique sur « Vérifier »  
**When** le deal est validé  
**Then** la carte passe en VERIFIED, le promoteur est notifié, et le deal apparaît dans les feeds membres

**Given** l'admin clique sur « Rejeter » avec une note  
**When** le deal est rejeté  
**Then** la carte passe en REJECTED, le promoteur voit la note privativement, et le deal est invisible aux autres membres (FR18)

---

### Story 3.4: Visibilité des Opportunités — Tier et Teaser Publics

**En tant que** membre ou visiteur,  
**Je veux** consulter les opportunités selon mes droits d'accès,  
**Afin de** découvrir les deals adaptés à mon tier ou les teasers publics.

**Acceptance Criteria :**

**Given** un visiteur non connecté sur `/` ou `/opportunities`  
**When** il consulte les deals  
**Then** seuls les teasers sont visibles : titre + localisation uniquement (FR20), avec un overlay « Devenez membre pour voir les détails »

**Given** un membre Affranchis connecté  
**When** il consulte le feed de deals  
**Then** il voit les deals `VERIFIED` accessibles au tier Affranchis, filtrés par catégorie avec des chips horizontaux scrollables (UX-DR18)

**Given** un membre Boss connecté  
**When** il consulte le feed  
**Then** il voit les deals exclusifs Boss + ceux des tiers inférieurs

**Given** un membre sur mobile  
**When** il consulte le feed  
**Then** les `DealCard` s'affichent en liste verticale avec : thumbnail 16:9, titre, localisation + montant, `TrustBadge`, compteur documents, `WhatsAppCTA` (FR19, UX-DR4)

**Given** le feed de deals  
**When** aucun deal ne correspond aux critères  
**Then** le composant `EmptyState` s'affiche : « Aucun deal ne correspond à vos critères » + bouton « Réinitialiser les filtres »

---

### Story 3.5: Niveaux de Confiance IBC et Double-Vérification

**En tant que** membre consultant un deal,  
**Je veux** voir le niveau de confiance IBC et consulter le dossier juridique attaché,  
**Afin de** évaluer la fiabilité de l'opportunité avant de contacter le porteur.

**Acceptance Criteria :**

**Given** un deal avec documents uploadés par le promoteur  
**When** il est consulté par un membre  
**Then** le `TrustBadge` affiche « Bronze » (couleur amber-700, fond `#FFFBEB`) signifiant : documents uploadés (FR21)

**Given** un deal vérifié par un admin  
**When** il est consulté par un membre  
**Then** le `TrustBadge` affiche « Argent » (couleur slate-500) signifiant : admin IBC a validé l'authenticité

**Given** un deal avec 3+ deals validés et reviews moyennes ≥ 4,5  
**When** il est consulté  
**Then** le `TrustBadge` affiche « Or » (couleur amber-600, fond `#FEF3C7`) avec animation pulse au premier affichage

**Given** un deal avec montant > 50 000 €  
**When** il est soumis  
**Then** le système exige une double-vérification : deux admins distincts doivent valider avant passage à VERIFIED (FR22)

**Given** un membre sur la page détail d'un deal  
**When** il consulte la section documents  
**Then** il voit les `DocumentRow` avec preview inline, et peut télécharger chaque document (FR23)

**Given** un membre sur mobile  
**When** il consulte la timeline de vérification  
**Then** le `VerificationTimeline` affiche les étapes : Documents uploadés → Vérifié par IBC → Reviews communautaires, avec les étapes complétées en vert

---

## Epic 4: Networking, Matching et WhatsApp

**Objectif :** Connecter les membres entre eux et avec les porteurs de projet via des deep links WhatsApp natifs, et proposer un matching basique par tags (secteur, montant, localisation).

---

### Story 4.1: Deep Links WhatsApp sur Profils et Deals

**En tant que** membre,  
**Je veux** contacter directement un autre membre ou le porteur d'un deal via WhatsApp en un clic,  
**Afin de** lancer la conversation sans copier-coller de numéros.

**Acceptance Criteria :**

**Given** un membre connecté consulte un profil public  
**When** le profil affiche un numéro de téléphone  
**Then** un bouton `WhatsAppCTA` vert `#25D366` s'affiche avec le label « Discuter sur WhatsApp » (FR24, NFR-I1)

**Given** un membre connecté consulte un deal  
**When** le deal a un auteur avec numéro de téléphone  
**Then** un bouton `WhatsAppCTA` s'affiche avec le label « Contacter le porteur sur WhatsApp » (FR25)

**Given** un membre clique sur le `WhatsAppCTA`  
**When** il est sur mobile  
**Then** l'application WhatsApp native s'ouvre avec un message pré-rempli : « Bonjour, je suis intéressé(e) par votre deal [Titre] sur IBC. »

**Given** un membre clique sur le `WhatsAppCTA`  
**When** il est sur desktop  
**Then** WhatsApp Web s'ouvre dans un nouvel onglet avec le même message pré-rempli (NFR-I1)

**Given** un deal ou profil sans numéro de téléphone  
**When** le membre consulte la page  
**Then** le `WhatsAppCTA` est désactivé avec un tooltip : « Le numéro WhatsApp n'est pas renseigné. »

---

### Story 4.2: Système de Tags Profil et Opportunités

**En tant que** membre,  
**Je veux** ajouter des tags à mon profil et voir les tags des opportunités,  
**Afin de** améliorer la pertinence de ma découverte.

**Acceptance Criteria :**

**Given** un membre sur `/profile/edit`  
**When** il consulte la section Tags  
**Then** il peut ajouter des chips pour :
- Secteur (Immobilier, Business, Investissement, Partenariat, Agriculture, Tech)
- Montant recherché (tranches : 10k-50k€, 50k-100k€, 100k€+)
- Localisation (Abidjan, Cocody, Marcory, etc.)

**Given** un membre ajoutant un tag  
**When** il clique sur « + Ajouter un tag »  
**Then** une bottom sheet (mobile) ou un Select (desktop) s'ouvre avec les options disponibles

**Given** un porteur de projet créant un deal  
**When** il remplit le formulaire  
**Then** il peut taguer l'opportunité avec les mêmes catégories (secteur, montant, localisation) (FR27)

**Given** un membre ou un deal avec des tags  
**When** ils sont affichés  
**Then** les tags apparaissent sous forme de chips horizontaux scrollables, cliquables pour filtrer

---

### Story 4.3: Matching Basique par Tags

**En tant que** membre,  
**Je veux** recevoir des suggestions d'opportunités correspondant à mes tags,  
**Afin de** découvrir rapidement les deals pertinents pour mon profil.

**Acceptance Criteria :**

**Given** un membre avec des tags sur son profil  
**When** il consulte le feed « Matching » ou « Opportunités »  
**Then** le système affiche en priorité les deals ayant au moins un tag en commun, triés par nombre de tags communs (FR28)

**Given** un membre sur le feed matching  
**When** un nouveau deal correspondant à ses tags est publié  
**Then** une notification in-app ou email (selon préférences) s'affiche : « Nouvelle opportunité matchée : [Titre] »

**Given** un membre sur mobile  
**When** il consulte le feed matching  
**Then** les deals matchés affichent un badge subtil « 95% match » ou « 2 tags communs »

**Given** aucun deal ne correspond aux tags du membre  
**When** il consulte le feed  
**Then** le composant `EmptyState` s'affiche : « Aucun deal ne correspond à vos critères actuels » + CTA « Modifier mes tags »

---

### Story 4.4: Soft Commitment et Notifications d'Intérêt

**En tant que** membre intéressé par un deal,  
**Je veux** marquer mon intérêt sans engagement financier,  
**Afin de** signaler au porteur de projet que je suis potentiellement intéressé.

**Acceptance Criteria :**

**Given** un membre connecté sur la page détail d'un deal  
**When** il clique sur « Intéressé(e) » (bouton ghost secondaire)  
**Then** un soft commitment est enregistré en base avec `userId`, `opportunityId`, `createdAt` (FR29)  
**And** le bouton passe à « Intérêt enregistré » avec checkmark, en état disabled

**Given** un membre ayant marqué son intérêt  
**When** l'auteur du deal consulte ses notifications  
**Then** il voit une notification : « [Nom du membre] est intéressé(e) par votre deal [Titre] » (FR30)

**Given** l'auteur du deal reçoit une notification d'intérêt  
**When** il clique sur la notification  
**Then** il est redirigé vers le détail du deal avec un indicateur du nombre d'intérêts enregistrés

**Given** un membre non connecté  
**When** il tente de cliquer sur « Intéressé(e) »  
**Then** une modale l'invite à s'inscrire ou se connecter

---

## Epic 5: Reviews, Réputation et Confiance

**Objectif :** Permettre aux investisseurs et porteurs de projet de se laisser des reviews mutuelles après une mise en relation, calculer un score de fiabilité IBC, et attribuer automatiquement le badge Membre Platinum.

---

### Story 5.1: Reviews Mutuelles Post-Deal

**En tant que** investisseur ou porteur de projet ayant conclu une mise en relation,  
**Je veux** laisser une review (note + commentaire) à mon interlocuteur,  
**Afin de** renforcer la transparence et la confiance au sein du club.

**Acceptance Criteria :**

**Given** un membre connecté sur la page d'un deal  
**When** il a marqué son intérêt et au moins 7 jours se sont écoulés  
**Then** une section « Laisser un avis » apparaît avec :
- 5 étoiles cliquables pour la note
- Champ texte pour le commentaire (max 500 caractères)
- Bouton « Soumettre mon avis »

**Given** un membre soumettant une review  
**When** la note et le commentaire sont valides  
**Then** la review est enregistrée en base avec `reviewerId`, `revieweeId`, `dealId`, `rating`, `comment`, `createdAt` (FR31)

**Given** un membre ayant reçu une review  
**When** il consulte son profil  
**Then** la review s'affiche dans une section « Avis reçus » avec la note en étoiles, le commentaire, le nom du reviewer, et la date

**Given** un membre tentant de reviewer le même deal deux fois  
**When** il soumet une seconde review  
**Then** le système refuse avec le message : « Vous avez déjà laissé un avis pour ce deal. »

---

### Story 5.2: Score de Fiabilité et Badge Membre Platinum

**En tant que** membre,  
**Je veux** voir mon score de fiabilité IBC et obtenir le badge Platinum si je suis distingué,  
**Afin de** renforcer ma crédibilité auprès des autres membres.

**Acceptance Criteria :**

**Given** un membre avec des reviews  
**When** le système calcule son score  
**Then** la moyenne pondérée des notes reçues est affichée sur son profil sous forme d'étoiles et de valeur numérique (ex: 4.7/5) (FR32)

**Given** un membre avec au moins 3 deals validés et une moyenne de reviews ≥ 4,5/5  
**When** la condition est atteinte  
**Then** le badge « Membre Platinum » est automatiquement attribué (FR33)  
**And** une animation de déverrouillage s'affiche sur le profil (confetti subtil)

**Given** un membre avec badge Platinum  
**When** sa moyenne de reviews tombe en dessous de 4,5  
**Then** le badge reste visible mais avec un indicateur « À maintenir » jusqu'à la prochaine évaluation

**Given** un porteur de projet avec des reviews  
**When** il est consulté  
**Then** son score de fiabilité IBC s'affiche sur son profil public et sur ses deals

---

### Story 5.3: Affichage Public des Reviews sur Profil

**En tant que** membre consultant un profil,  
**Je veux** voir les reviews publiques laissées à ce membre,  
**Afin de** évaluer sa réputation avant de l'contacter.

**Acceptance Criteria :**

**Given** un profil public consulté par un membre ou un admin  
**When** des reviews existent  
**Then** une section « Avis et Réputation » affiche :
- Note moyenne globale
- Nombre total de reviews
- Liste des 5 dernières reviews (avatar reviewer, note, commentaire tronqué, date)
- Bouton « Voir tous les avis » si > 5 (FR34)

**Given** un profil sans review  
**When** il est consulté  
**Then** le composant `EmptyState` affiche : « Pas encore d'avis. Soyez le premier à collaborer avec ce membre. »

**Given** un profil avec badge Platinum  
**When** il est consulté  
**Then** le badge s'affiche à côté du nom avec tooltip : « Membre distingué : 3+ deals validés et excellentes reviews »

---

## Epic 6: Administration et Back-office

**Objectif :** Offrir aux administrateurs IBC un tableau de bord complet pour vérifier les opportunités et les abonnements, consulter les métriques clés, gérer les documents et utilisateurs, et assurer la conformité via des audit logs. Préparer le déploiement production.

---

### Story 6.1: Tableau de Bord Kanban des Opportunités

**En tant que** administrateur IBC,  
**Je veux** visualiser toutes les opportunités dans un tableau kanban par statut,  
**Afin de** prioriser et traiter les vérifications efficacement.

**Acceptance Criteria :**

**Given** l'admin sur `/admin/opportunities`  
**When** il consulte le tableau de bord  
**Then** quatre colonnes kanban s'affichent : PENDING, EN COURS, VERIFIED, REJECTED (FR35)

**Given** une carte dans la colonne PENDING  
**When** l'admin la déplace vers EN COURS  
**Then** le statut de l'opportunité passe à `IN_REVIEW` en base, et l'admin voit un toast de confirmation

**Given** l'admin sur mobile  
**When** il consulte le kanban  
**Then** il voit une liste empilée avec des chips de filtre par statut (UX-DR34)

**Given** le kanban  
**When** il y a plus de 20 deals dans une colonne  
**Then** un scroll vertical est disponible, avec un compteur en haut de chaque colonne

---

### Story 6.2: Métriques Clés et Analytics Admin

**En tant que** administrateur IBC,  
**Je veux** consulter les indicateurs clés de la plateforme,  
**Afin de** prendre des décisions éclairées sur la croissance et la qualité.

**Acceptance Criteria :**

**Given** l'admin sur `/admin/dashboard`  
**When** il consulte la page  
**Then** une rangée de 4 cartes métriques s'affiche en haut (FR36) :
- MRR (Monthly Recurring Revenue) calculé depuis les abonnements ACTIVE
- Nombre de membres actifs (7 derniers jours)
- Taux de conversion onboarding → signup (%)
- Taux de churn mensuel (%)

**Given** l'admin sur la page métriques  
**When** il consulte les détails  
**Then** chaque métrique affiche la valeur actuelle, la variation vs période précédente, et une mini-tendance visuelle

**Given** les données de la plateforme  
**When** un abonnement est activé ou résilié  
**Then** le MRR et le nombre de membres actifs se mettent à jour en temps réel (ou revalidation toutes les 5 minutes)

---

### Story 6.3: Gestion des Documents et Édition des Opportunités

**En tant que** administrateur IBC,  
**Je veux** gérer les documents juridiques et éditer/supprimer les opportunités publiées,  
**Afin de** maintenir la qualité et la conformité du catalogue.

**Acceptance Criteria :**

**Given** l'admin sur le panneau détail d'un deal  
**When** il consulte la section documents  
**Then** il peut uploader des documents supplémentaires (preuves de vérification) ou supprimer des documents incorrects (FR37)

**Given** l'admin sur le panneau détail d'un deal publié  
**When** il clique sur « Éditer »  
**Then** un formulaire en ligne s'ouvre permettant de modifier le titre, la description, le montant, la catégorie (FR38)

**Given** l'admin éditant un deal  
**When** il modifie le montant pour > 50 000 €  
**Then** le flag `requiresDoubleVerification` est automatiquement positionné

**Given** l'admin sur le panneau détail  
**When** il clique sur « Supprimer »  
**Then** une modale de confirmation s'affiche, et après validation le deal est supprimé ou anonymisé (selon politique)

---

### Story 6.4: Audit Logs et Conformité

**En tant que** administrateur IBC,  
**Je veux** consulter l'historique des actions critiques,  
**Afin de** respecter les obligations réglementaires (CENTIF-CI, APDP) et tracer les décisions.

**Acceptance Criteria :**

**Given** l'admin sur `/admin/audit`  
**When** il consulte les logs  
**Then** une table paginée affiche les entrées avec : timestamp, admin (nom/email), action, entité concernée, détails

**Given** toute action admin (validation deal, refus abonnement, édition utilisateur)  
**When** elle est exécutée  
**Then** un log est automatiquement créé avec : `actorId`, `action`, `entityType`, `entityId`, `metadata` JSON, `createdAt` (FR39, NFR-S9)

**Given** le système de logs  
**When** une action d'abonnement est effectuée  
**Then** le log inclut : changement de statut, montant, tier, référence virement

**Given** les logs d'audit  
**When** ils sont consultés  
**Then** ils ne peuvent pas être modifiés ou supprimés par les admins (immutabilité garantie côté DB ou stockage externe)

---

### Story 6.5: Gestion des Utilisateurs et Emails Admin

**En tant que** administrateur IBC,  
**Je veux** gérer les comptes utilisateurs et envoyer des emails de confirmation,  
**Afin de** assurer le support et la modération de la communauté.

**Acceptance Criteria :**

**Given** l'admin sur `/admin/members`  
**When** il consulte la liste  
**Then** il voit tous les utilisateurs avec : avatar, nom, email, tier, statut abonnement, date d'inscription, et actions disponibles

**Given** l'admin sur la liste des membres  
**When** il clique sur « Suspendre »  
**Then** le compte passe à `SUSPENDED`, le membre est déconnecté, et il ne peut plus se connecter (FR7)

**Given** l'admin sur la liste des membres  
**When** il clique sur « Réactiver » sur un compte suspendu  
**Then** le compte repasse à `ACTIVE`, et le membre peut à nouveau se connecter

**Given** l'admin sur le détail d'un membre  
**When** il clique sur « Envoyer email de confirmation »  
**Then** un email est envoyé via Resend avec le sujet « Votre abonnement IBC est confirmé » (FR40, NFR-I2)

---

### Story 6.6: Préparation Déploiement Production

**En tant que** administrateur technique,  
**Je veux** préparer l'application pour le déploiement sur VPS Infomaniak,  
**Afin de** garantir la stabilité et la scalabilité en production.

**Acceptance Criteria :**

**Given** le projet Next.js  
**When** `npm run build` est exécuté  
**Then** le build génère `.next/standalone/server.js` avec `output: 'standalone'` (NFR-D1)

**Given** le fichier `ecosystem.config.js`  
**When** il est configuré  
**Then** il définit : name `ibc-app`, script `server.js`, mode `cluster`, `instances: "max"`, auto-restart, max memory 500M (NFR-D2)

**Given** le script `prepare-deploy.sh`  
**When** il est exécuté  
**Then** il copie `.next/standalone/`, `.next/static/`, `public/`, et `ecosystem.config.js` dans `deploy-dist/` (NFR-D5)

**Given** le serveur Nginx  
**When** il est configuré  
**Then** il sert les assets statiques depuis `.next/static/` avec cache 365j, et proxy tout le reste vers `127.0.0.1:3000` (NFR-D3)

**Given** Certbot  
**When** il est installé  
**Then** le SSL Let's Encrypt est actif avec renouvellement automatique pour le domaine IBC (NFR-D4)

**Given** la base de données  
**When** l'application démarre en production  
**Then** elle utilise PostgreSQL via `DATABASE_URL`, et SQLite n'est plus utilisé (NFR-SC3)

---

## Epic 7: Landing Page et Découverte Publique

**Objectif :** Permettre au public de découvrir IBC, consulter les deals teaser, le mur des succès et la comparaison des tiers sans connexion, avec une expérience SEO-friendly, responsive et accessible.

---

### Story 7.1: Landing Page avec Deals Teaser et SEO

**En tant que** visiteur non connecté,  
**Je veux** découvrir les opportunités IBC et comprendre la valeur du club,  
**Afin de** être incité à m'inscrire.

**Acceptance Criteria :**

**Given** un visiteur sur `/` (landing page)  
**When** la page charge  
**Then** le LCP (Largest Contentful Paint) est < 2 secondes sur connexion 3G simulée (NFR-P1)

**Given** la landing page  
**When** elle s'affiche  
**Then** elle contient :
- Section hero : titre « Investissez en Côte d'Ivoire en toute confiance », sous-titre, CTA « Découvrir les deals »
- Mur des succès : scroll horizontal de testimonials avec photos, noms, deals closés (FR43)
- Feed teaser : 3–5 `DealCard` avec titre + localisation uniquement (FR41)
- Overlay sur chaque teaser : « Devenez membre pour voir les détails »
- Section tiers : comparaison des trois offres
- Trust signals : note d'intermédiaire non-financier, logos partenaires si disponibles
- Footer : CGV, contact WhatsApp, newsletter

**Given** un moteur de recherche  
**When** il crawl la page  
**Then** les balises meta (title, description, OG tags) sont en français, les deals teaser sont rendus côté serveur (SSG), et le contenu est indexable

**Given** un visiteur sur mobile  
**When** il consulte la landing  
**Then** le hero occupe 100vh, les deals sont en liste verticale, le CTA est sticky en bas (UX-DR29)

---

### Story 7.2: Mur des Succès et Présentation des Tiers

**En tant que** visiteur,  
**Je veux** voir les témoignages de membres et comparer les offres d'abonnement,  
**Afin de** juger de la crédibilité et du rapport qualité-prix d'IBC.

**Acceptance Criteria :**

**Given** la section « Mur des succès »  
**When** elle s'affiche  
**Then** elle contient :
- Photos des membres (ou avatars)
- Noms et localisations
- Deals closés avec montants
- Courtes citations en français
- Compteur total de deals vérifiés et de membres actifs

**Given** la section « Nos offres »  
**When** elle s'affiche  
**Then** trois `TierCard` verticales présentent (FR42) :
- Affranchis : €29/mois — accès deals vérifiés
- Grands Frères : €49/mois — deals prioritaires + events
- Boss : €99/mois — deals exclusifs + mentorat 1-1
- Chaque carte a un bouton « Choisir » qui redirige vers `/auth/signup` puis `/pricing`

**Given** un visiteur sur desktop  
**When** il consulte la section tiers  
**Then** les cartes deviennent un tableau comparatif horizontal avec sticky header et checkmarks pour chaque feature

---

### Story 7.3: Responsive Mobile-First et Accessibilité Finale

**En tant que** utilisateur (membre, admin, visiteur),  
**Je veux** que l'application fonctionne parfaitement sur mobile et soit accessible,  
**Afin de** utiliser IBC quelle que soit ma situation technologique.

**Acceptance Criteria :**

**Given** un utilisateur sur un appareil mobile (320px–767px)  
**When** il navigue sur n'importe quelle page  
**Then** le layout est single-column, les boutons occupent 100% de la largeur, la navigation est bottom tab bar, et les modales sont bottom sheets (FR45, UX-DR24)

**Given** un utilisateur avec un lecteur d'écran  
**When** il navigue sur les parcours critiques (onboarding, deal discovery, contact)  
**Then** tous les éléments interactifs ont des `aria-label`, les headings respectent la hiérarchie h1→h2→h3, les images ont des `alt` descriptifs, et les notifications utilisent `aria-live="polite"` (NFR-A1, UX-DR26)

**Given** un utilisateur avec `prefers-reduced-motion: reduce`  
**When** il consulte l'application  
**Then** les animations (pulse badge, transitions, toast slide-up) sont désactivées (UX-DR27)

**Given** un utilisateur sur tablette (768px–1023px)  
**When** il consulte le feed de deals  
**Then** les cartes s'affichent en grille 2 colonnes, et la navigation admin apparaît en sidebar collapsible

**Given** un utilisateur sur desktop (≥ 1024px)  
**When** il consulte le deal detail  
**Then** le layout passe en 2 colonnes : 60% contenu deal, 40% profil promoteur + CTA sticky

**Given** l'application en mode sombre  
**When** l'utilisateur active le dark mode  
**Then** les tokens CSS s'adaptent : fond `#0F172A`, texte `#F8FAFC`, cards `#1E293B` (NFR-A2)

**Given** toute page de l'application  
**When** elle est auditée avec Lighthouse  
**Then** le score accessibilité est ≥ 90 sur les parcours critiques (NFR-A1)

---

## Epic 9 : Contenu Éditorial & Ressources Membres

**Objectif** : Ajouter un système d'articles éditoriaux avec visibilité par tier, offrant aux visiteurs et membres du contenu gratuit (levier de conversion) et aux abonnés un accès progressif selon leur tier.

**Business Value** : Entonnoir de conversion intermédiaire — les articles gratuits attirent le trafic SEO, les articles premium (visibilité tier) donnent un aperçu de la valeur réservée aux abonnés, augmentant le taux de conversion onboarding.

**FR couverts** : FR46, FR47, FR48, FR49, FR50, FR51

---

### Story 9.1: Modèle Article, Migration et API Routes

**En tant que** développeur,  
**Je veux** un modèle Article persisté avec API routes complètes,  
**Afin de** fournir les fondations données pour toutes les features éditoriales.

**Acceptance Criteria :**

**Given** le schéma Prisma mis à jour avec l'enum `ArticleVisibility` et le modèle `Article`  
**When** `npx prisma migrate dev` est exécuté  
**Then** la migration crée la table `articles` et l'enum sans erreur, et `npx prisma generate` fonctionne

**Given** un admin authentifié  
**When** il envoie `POST /api/articles` avec titre, excerpt, content, category, visibility  
**Then** l'article est créé en base avec `published: false`, slug auto-généré du titre, et 201 retourné

**Given** un admin authentifié  
**When** il envoie `PUT /api/articles/[id]` avec des champs mis à jour  
**Then** l'article est modifié, `updatedAt` est rafraîchi, et 200 retourné

**Given** un admin authentifié  
**When** il envoie `DELETE /api/articles/[id]`  
**Then** l'article est supprimé (cascade) et 200 retourné

**Given** un utilisateur (visiteur, membre, admin)  
**When** il envoie `GET /api/articles`  
**Then** seuls les articles publiés dont la visibilité est ≤ son tier (ou PUBLIC si non connecté) sont retournés, triés par `publishedAt` desc

**Given** un utilisateur (visiteur, membre, admin)  
**When** il envoie `GET /api/articles/[id]`  
**Then** l'article est retourné si publié et visibilité ≤ tier utilisateur, sinon 404

**Given** des données de seed  
**When** `npx prisma db seed` est exécuté  
**Then** 4 articles de démo sont créés (1 PUBLIC, 1 AFFRANCHI, 1 GRAND_FRERE, 1 BOSS) avec des contenus réalistes

---

### Story 9.2: Interface Admin CRUD Articles

**En tant qu'** admin IBC,  
**Je veux** une interface de gestion des articles avec sélecteur de visibilité par tier,  
**Afin de** publier et organiser le contenu éditorial selon la stratégie de conversion.

**Acceptance Criteria :**

**Given** un admin sur `/admin/articles`  
**When** la page se charge  
**Then** un tableau affiche tous les articles (titre, catégorie, visibilité badge, statut published, date) avec actions modifier/supprimer/publier

**Given** un admin sur `/admin/articles/new`  
**When** il remplit le formulaire (titre, excerpt, contenu markdown, catégorie, visibilité) et soumet  
**Then** l'article est créé en base avec `published: false`, slug auto-généré, et redirection vers la liste admin

**Given** un admin sur `/admin/articles/[id]/edit`  
**When** il modifie les champs et soumet  
**Then** l'article est mis à jour en base et redirection vers la liste admin

**Given** un admin sur la liste articles  
**When** il clique "Publier" sur un article draft  
**Then** l'article passe `published: true`, `publishedAt` est setté, et un audit log est créé

**Given** un admin sur la liste articles  
**When** il clique "Supprimer" et confirme  
**Then** l'article est supprimé en base et un audit log est créé

**Given** le sélecteur de visibilité dans le formulaire  
**When** l'admin sélectionne une visibilité  
**Then** le badge de visibilité affiche la valeur choisie (PUBLIC, Affranchi, Grands Frères, Boss) avec un indicateur visuel distinct par tier

---

### Story 9.3: Catalogue Public et Pages Détail avec Gate Premium

**En tant que** visiteur ou membre IBC,  
**Je veux** parcourir et lire des articles selon mon niveau d'accès,  
**Afin de** bénéficier de contenu éditorial gratuit et découvrir la valeur premium.

**Acceptance Criteria :**

**Given** un visiteur non connecté sur `/articles`  
**When** la page se charge  
**Then** seuls les articles `PUBLIC` publiés sont affichés, triés par date récente

**Given** un membre avec tier AFFRANCHI et abonnement actif sur `/articles`  
**When** la page se charge  
**Then** les articles `PUBLIC` et `AFFRANCHI` sont affichés intégralement

**Given** un membre sans abonnement actif sur `/articles`  
**When** la page se charge  
**Then** les articles `PUBLIC` sont affichés intégralement, les articles premium (AFFRANCHI+) affichent titre + excerpt + CTA "Abonnez-vous pour lire"

**Given** un visiteur sur `/articles/comment-investir-abidjan`  
**When** l'article est `PUBLIC` et publié  
**Then** le contenu complet est affiché avec meta tags SEO

**Given** un membre sans abonnement actif sur `/articles/guide-premium`  
**When** l'article est `AFFRANCHI`  
**Then** l'excerpt est affiché avec un CTA "Abonnez-vous pour lire l'article complet" et lien vers /pricing

**Given** un utilisateur sur `/articles`  
**When** il filtre par catégorie (conseil, guide, témoignage, actu)  
**Then** seuls les articles de la catégorie sélectionnée et accessibles à son tier sont affichés

**Given** un article inexistant ou non publié sur `/articles/[slug]`  
**When** l'utilisateur accède à la page  
**Then** une page 404 est affichée

---

### Story 9.4: SEO, Navigation et Intégration Site

**En tant que** fondateur IBC,  
**Je veux** que les articles soient optimisés pour le SEO et intégrés dans la navigation du site,  
**Afin de** maximiser le trafic organique et la découverte du contenu.

**Acceptance Criteria :**

**Given** un article publié sur `/articles/[slug]`  
**When** la page est rendue  
**Then** les meta tags dynamiques (title, description, og:title, og:description, og:image) sont présents et corrects

**Given** le sitemap XML du site  
**When** il est généré  
**Then** les articles publiés `PUBLIC` sont inclus avec leur URL, lastmod et priority

**Given** la navigation principale du site  
**When** l'utilisateur consulte le header/navbar  
**Then** un lien "Articles" ou "Ressources" pointe vers `/articles`

**Given** la landing page `/`  
**When** un visiteur y accède  
**Then** une section "Derniers articles" affiche les 3 derniers articles `PUBLIC` publiés (titre, excerpt, lien)

**Given** un article publié  
**When** la page est rendue  
**Then** un structured data JSON-LD (schema.org/Article) est présent avec title, description, datePublished, author

**Given** les tests E2E Playwright  
**When** ils sont exécutés  
**Then** les scénarios navigation articles, gate premium (visiteur vs membre), et SEO meta tags passent

---

### Story 9.5: Réactions et Engagement sur les Articles

**En tant que** membre connecté,  
**Je veux** réagir à un article en choisissant un type de réaction,  
**Afin de** exprimer mon appréciation de manière interactive.

**Acceptance Criteria :**

**Given** un membre connecté sur `/articles/[slug]`  
**When** il consulte un article auquel il a accès  
**Then** un composant de réactions s'affiche avec 3 types de réactions : LIKE (J'aime), CLAP (Applaudissements) et INSIGHTFUL (Inspirant), affichant le nombre total de réactions pour chacune

**Given** un membre connecté n'ayant pas encore réagi à l'article  
**When** il clique sur l'une des réactions (ex: LIKE)  
**Then** la réaction est enregistrée en base et le décompte visuel de cette réaction s'incrémente de 1

**Given** un membre connecté ayant déjà réagi (ex: LIKE)  
**When** il clique à nouveau sur la même réaction (LIKE)  
**Then** la réaction est supprimée en base (toggle) et le décompte visuel se décrémente de 1

**Given** un membre connecté ayant déjà réagi (ex: LIKE)  
**When** il clique sur une réaction différente (ex: CLAP)  
**Then** sa réaction de type LIKE est remplacée par CLAP en base et les décomptes visuels s'ajustent en conséquence

**Given** un visiteur anonyme ou non connecté  
**When** il consulte la page détail d'un article  
**Then** les boutons de réactions sont désactivés ou le redirigent vers la page de connexion, et il voit uniquement le décompte statique des réactions existantes

---

*Fin du document Epic Breakdown — IBC v1.2. Epic 9 complété avec la Story 9.5 via Sprint Change Proposal 2026-06-14.*
