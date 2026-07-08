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

**Analytics & Observabilité**
- **FR64** : Le système tracke automatiquement les vues de pages et clics utilisateurs (autocapture PostHog)
- **FR65** : Le système identifie les utilisateurs connectés (userId, tier, role) dans PostHog pour segmenter l'analytics
- **FR66** : Le système tracke les événements métier clés : inscription, sélection tier, soumission opportunité, upload document, manifestation intérêt, lecture article

**Support Bêta & Feedback**
- **FR73** : La plateforme affiche un bouton flottant en bas à gauche sur toutes les pages, permettant d'ouvrir une fenêtre de chat de support. Le chat indique clairement que la plateforme est en phase bêta.
- **FR74** : Un membre connecté peut soumettre un message via le chat de support (bug technique, problème d'accessibilité, demande d'intégration). Le système envoie un auto-acknowledgement immédiat confirmant la réception.
- **FR75** : Les messages de chat sont stockés en base de données et accessibles via une API authentifiée. Un agent externe (Hermes) peut lire les messages non traités et y répondre via une API sécurisée par token.
- **FR76** : Chaque message de chat reçu est automatiquement ajouté à la to-do liste permanente du système de support (Hermes), permettant le suivi et la traitement des demandes.

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
| FR64 | Epic 19 | 19-1 | Le système tracke automatiquement les vues de pages et clics (autocapture) |
| FR65 | Epic 19 | 19-2 | Le système identifie les utilisateurs connectés dans PostHog |
| FR66 | Epic 19 | 19-2 | Le système tracke les événements métier clés |
| FR73 | Epic 18 | 18-2 | La plateforme affiche un bouton flottant et une fenêtre de chat de support |
| FR74 | Epic 18 | 18-1 / 18-2 | Soumission message chat + auto-acknowledgement immédiat |
| FR75 | Epic 18 | 18-1 | Messages stockés en base et API authentifiée pour Hermes |
| FR76 | Epic 18 | 18-3 | Hermes récupère les messages et les ajoute à sa to-do list |

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

### Epic 18: Chat de Support Bêta & Feedback Membres
Widget de support in-app permettant d'ouvrir un canal de support direct pour les membres connectés, avec auto-acknowledgement, rate limiting et polling/gestion sécurisée via l'agent Hermes.

**FRs couverts :** FR73, FR74, FR75, FR76
**NFRs couverts :** NFR-P2, NFR-S5, NFR-I1
**UX-DRs couverts :** UX-DR9 (StatusPill), UX-DR16 (modales/sheets), UX-DR19 (loading states)

### Epic 19: Analytics Comportemental PostHog
Intégration du SDK PostHog (client/serveur) pour suivre les interactions utilisateurs, identifier les membres d'après leur tier et configurer des insights et entonnoirs.

**FRs couverts :** FR64, FR65, FR66
**NFRs couverts :** NFR-P1

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

## Epic 8: Tests E2E Playwright — Couverture complète du site en conditions réelles

Mettre en place une suite de tests E2E Playwright couvrant tous les parcours critiques du site en conditions réelles, afin de détecter automatiquement les régressions sur l'environnement de production VPS.

### Story 8.1: Tests E2E Playwright — Couverture complète du site en conditions réelles

Cette story met en place une suite de tests E2E Playwright ciblant le site IBC déployé sur `https://ivoire-business-club.com`, avec des helpers d'authentification et des sélecteurs stables. Elle couvre l'ensemble des parcours critiques : authentification, tiers, opportunités, documents, gâtes premium, matching, reviews, admin, landing, navigation, profil, suppression de compte et notifications.

**Acceptance Criteria:**
- La configuration Playwright cible la production VPS avec un `baseURL` configurable via `BASE_URL`, supporte Chromium/Firefox/WebKit, et fournit les scripts `test:e2e` et `test:e2e:local`
- Les tests d'inscription et de connexion valident les champs requis, les messages d'erreur, la création de compte et le refus des identifiants invalides sans fuite d'information
- Les tests de tiers et abonnements vérifient l'affichage des trois tiers, les instructions de virement, le statut TRIAL/PENDING et la validation admin TRIAL → ACTIVE
- Les tests d'opportunités couvrent la création, la vérification, le rejet et la visibilité publique des teasers
- Les tests de documents vérifient l'upload, les permissions et la gestion admin
- Les tests de gâtes premium bloquent un membre AFFRANCHI sur un deal BOSS et montrent le CTA d'upgrade
- Les tests de matching et tags vérifient l'affichage priorisé et la manifestation d'intérêt
- Les tests de reviews vérifient l'enregistrement d'une review et le recalcul du score de fiabilité
- Les tests admin couvrent le kanban, la gestion des membres et les logs d'audit
- Les tests de landing et navigation vérifient les contenus publics, la responsive, les routes protégées et la redirection des utilisateurs authentifiés
- Les tests de profil et de suppression de compte vérifient la modification, la persistance et l'anonymisation RGPD
- Les tests de notifications vérifient l'affichage et le marquage comme lu

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
**Je veux** une interface de gestion des articles avec un éditeur Markdown enrichi (barre d'outils de formatage et prévisualisation en temps réel), un sélecteur de visibilité par tier et la possibilité d'associer une opportunité,  
**Afin de** rédiger confortablement et de lier le contenu éditorial aux opportunités d'affaires.

**Acceptance Criteria :**

**Given** un admin sur `/admin/articles`  
**When** la page se charge  
**Then** un tableau affiche tous les articles (titre, catégorie, visibilité badge, statut published, date, opportunité associée) avec actions modifier/supprimer/publier

**Given** un admin sur `/admin/articles/new` ou d'édition `/admin/articles/[id]`  
**When** il rédige l'article  
**Then** il dispose d'une barre d'outils de formatage (Titres, Gras, Italique, Listes) et d'une prévisualisation du rendu en temps réel  
**And** le contenu est stocké sous format Markdown valide dans la base de données

**Given** un admin sur `/admin/articles/new` ou d'édition `/admin/articles/[id]`  
**When** il remplit le formulaire  
**Then** il peut sélectionner facultativement une opportunité existante à associer via un sélecteur d'opportunités (affichant les opportunités vérifiées)

**Given** un admin sur `/admin/articles/new`  
**When** il remplit le formulaire et soumet  
**Then** l'article est créé en base avec `published: false`, slug auto-généré, relation opportunité optionnelle configurée, et redirection vers la liste admin

**Given** un admin sur `/admin/articles/[id]/edit`  
**When** il modifie les champs et soumet  
**Then** l'article est mis à jour en base et redirection vers la liste admin

**Given** un admin sur la liste articles  
**When** il clique "Publier" sur un article draft  
**Then** l'article passe `published: true`, `publishedAt` est setté, et un audit log est créé

**Given** un admin sur la liste articles  
**When** il clique "Supprimer" et confirme  
**Then** l'article est supprimé en base et un audit log est créé

---

### Story 9.3: Catalogue Public et Pages Détail avec Gate Premium

**En tant que** visiteur ou membre IBC,  
**Je veux** parcourir et lire des articles selon mon niveau d'accès, voir l'opportunité associée et partager l'article sur les réseaux sociaux,  
**Afin de** bénéficier du contenu, évaluer les deals connexes et diffuser les analyses intéressantes.

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

**Given** un membre connecté éligible lisant un article sur `/articles/[slug]`  
**When** cet article est associé à une opportunité  
**Then** un encart "Opportunité associée" s'affiche sous l'article en utilisant le composant `DealCard` (sous réserve que l'utilisateur ait le tier requis pour cette opportunité)

**Given** la page détail d'un article sur `/articles/[slug]`  
**When** elle est rendue  
**Then** des boutons de partage (WhatsApp, LinkedIn, Twitter/X, Email, et Copier le lien) sont disponibles  
**And** ils utilisent des URLs de partage propres et dynamiques basées sur les métadonnées SEO existantes de l'article

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

### Story 9.7: Système de Commentaires — Modèle, Migration et API

**En tant que** développeur,  
**Je veux** ajouter le modèle Prisma pour les commentaires, exécuter la migration et créer les API routes GET et POST `/api/articles/[id]/comments`,  
**Afin de** stocker et d'exposer les commentaires des membres de manière sécurisée.

**Acceptance Criteria :**

**Given** le schéma Prisma mis à jour avec le modèle `Comment`  
**When** la migration est lancée via `npx prisma migrate dev`  
**Then** la table `article_comments` est créée avec relation vers `articles` et `users` et suppression en cascade en cas de suppression de l'article ou de l'utilisateur

**Given** un membre connecté avec un abonnement actif  
**When** il envoie une requête `POST /api/articles/[id]/comments` avec un contenu valide  
**Then** le commentaire est persisté en base et associé à l'utilisateur et à l'article, retournant un code 201

**Given** un visiteur anonyme ou un membre abonné inactif  
**When** il tente d'accéder aux API routes `GET` ou `POST` de commentaires  
**Then** l'API renvoie une erreur `401 Unauthorized` ou `403 Forbidden`

---

### Story 9.8: Section Commentaires UI

**En tant que** membre connecté ayant un abonnement actif,  
**Je veux** voir la liste des commentaires et soumettre mon propre commentaire sous un article,  
**Afin de** participer aux discussions autour des analyses et ressources du club.

**Acceptance Criteria :**

**Given** un membre abonné actif sur `/articles/[slug]`  
**When** il consulte un article  
**Then** une section "Commentaires" apparaît sous l'article affichant l'auteur (avatar, nom), la date de création et le contenu  
**And** un formulaire permet de rédiger et soumettre un nouveau commentaire (avec état loading et validation de longueur minimale)

**Given** un membre sans abonnement actif ou un visiteur anonyme  
**When** il consulte la page détail de l'article  
**Then** la section des commentaires est remplacée par un encart d'incitation : "Devenez membre actif pour consulter et participer aux discussions."  
  
### Story 9.9: Lead Magnet — Envoi automatique du guide gratuit

Cette story transforme le formulaire lead magnet de la landing page en un backend fonctionnel qui persiste les emails et envoie le guide PDF gratuit « Investir en Côte d'Ivoire 2026 » par email.

**Acceptance Criteria:**
- L'endpoint `POST /api/lead-magnet` valide l'email, persiste l'entrée dans la table `lead_magnets` et envoie un email avec le lien de téléchargement du guide PDF
- Le modèle Prisma `LeadMagnet` est créé avec un index unique sur `email`
- La déduplication est idempotente : un email déjà présent retourne un message « déjà reçu » sans renvoyer l'email
- Le composant `LeadMagnet` gère les états loading, success et error
- Les requêtes malformées retournent 400 sans divulguer d'information sensible

### Story 9.10: Éditeur d'articles TipTap (WYSIWYG Markdown)

Cette story remplace le textarea Markdown de l'article-form admin par un éditeur WYSIWYG TipTap, tout en conservant le stockage Markdown en base de données et la compatibilité du rendu public.

**Acceptance Criteria:**
- L'éditeur TipTap remplace le textarea dans `/admin/articles/new` et `/admin/articles/[id]/edit`
- La barre d'outils propose : titres H1-H4, gras, italique, listes, citation, lien, code inline, séparateur horizontal
- Le contenu est sérialisé en Markdown valide avant soumission à l'API
- Le contenu Markdown existant est correctement chargé dans l'éditeur
- L'upload d'images en ligne est préservé et inséré comme `![alt](url)`
- Le rendu public via `ArticleContent.tsx` reste inchangé et compatible
- Les tests unitaires interagissent avec l'éditeur TipTap et vérifient la sérialisation Markdown

---  

## Epic 10: Vérification des Membres & Data Room Sécurisée

Ajouter un workflow de vérification des membres basé sur des prérequis automatiques et une validation admin, puis sécuriser l'accès aux documents juridiques sensibles par demande explicite et validation manuelle.

### Story 10.1: Vérification des membres — prérequis automatiques et validation admin

Cette story introduit une logique centralisée de vérification des membres. Un membre doit avoir son email vérifié, une bio, une localisation, un pays et un compte actif pour devenir éligible. La transition automatique PENDING → EN_COURS se déclenche lorsque tous les prérequis sont remplis, et l'admin valide manuellement le passage à VERIFIED.

**Acceptance Criteria:**
- Le flux d'envoi et de vérification d'email est fonctionnel, avec token sécurisé expirant après 24h, suppression des anciens tokens et email en français
- `isEligibleForVerification()` retourne l'éligibilité et les critères manquants ; `autoTransitionVerificationStatus()` passe PENDING → EN_COURS sans jamais rétrograder VERIFIED ou REJECTED
- La route admin `/api/admin/users/[id]/verify` refuse la vérification si les prérequis sont manquants et crée un audit log uniquement en cas de changement réel
- La page `/admin/members` affiche les indicateurs de prérequis et désactive le bouton « Vérifier ✓ » avec une infobulle si le membre n'est pas éligible
- La page `/settings` affiche le statut de vérification exact, les prérequis manquants et un bouton de renvoi d'email de vérification si nécessaire
- La mise à jour du profil et la vérification d'email déclenchent `autoTransitionVerificationStatus()`
- Les tests couvrent tous les cas de succès, d'erreur, de guards admin, de suspension et de non-rétrogradation

### Story 10.2: Data Room sécurisée — accès conditionnel aux documents juridiques sensibles

Cette story protège l'accès aux documents juridiques sensibles attachés aux opportunités. Un membre doit demander l'accès pour chaque document, et le porteur de projet ou un admin doit approuver la demande. Les consultations et téléchargements sont journalisés via audit log.

**Acceptance Criteria:**
- Le modèle `DocumentAccessRequest` est créé avec les statuts PENDING, APPROVED, DENIED et une contrainte unique `[requesterId, documentId]`
- Un membre authentifié avec abonnement actif peut créer une demande d'accès ; un doublon retourne 409, l'auteur/admin n'a pas besoin de demander
- L'auteur de l'opportunité ou un admin peut approuver/refuser les demandes en lot, avec audit log idempotent et vérification du statut non suspendu
- L'accès aux routes de consultation/téléchargement est conditionné à une demande APPROVED, sauf pour l'auteur/admin
- L'UI affiche « Demander l'accès », « En attente de validation », « Accès refusé » ou les boutons de preview/download selon le statut
- Une section « Demandes d'accès » apparaît pour l'auteur/admin avec les actions approuver/refuser
- Les tests couvrent les succès, erreurs, doublons, idempotence, audit logs et non-régression des accès existants

---

## Epic 11: Onboarding & Paiement Mobile Money

Automatiser l'accueil des nouveaux adhérents par un email d'accueil et un formulaire de complétion, et étendre les moyens de paiement aux solutions mobile money africaines (Wave, Orange Money).

### Story 11.1: Email d'accueil automatique post-inscription

Cette story envoie automatiquement un email d'accueil au nouveau membre après son inscription, avec les prochaines étapes, le lien vers le formulaire de complétion, les informations de paiement et le contrat d'adhésion.

**Acceptance Criteria:**
- Un email d'accueil est envoyé automatiquement via Resend ou SMTP après la création du compte
- L'email contient : confirmation d'inscription, tier choisi, lien vers `/onboarding/complete-profile`, instructions de paiement et lien vers le contrat d'adhésion
- Le template HTML est responsive, en français et avec le branding IBC
- Un échec d'envoi est loggué sans bloquer l'inscription

### Story 11.2: Formulaire de complétion de profil post-inscription

Cette story fournit un formulaire de complétion du profil accessible aux nouveaux membres authentifiés, pré-rempli avec les données existantes et persistant dans `onboardingForm` (JSON).

**Acceptance Criteria:**
- Les champs existants du profil sont pré-remplis dans le formulaire `/onboarding/complete-profile`
- Les données sont sauvegardées dans `onboardingForm` (JSON) et `onboardingCompletedAt` est renseigné
- Un visiteur non authentifié est redirigé vers `/auth/signin`
- Un membre ayant déjà complété le formulaire peut revenir le modifier

### Story 11.3: Modèle de paiement mobile money — extension PaymentProvider

Cette story étend l'enum `PaymentProvider` pour supporter Wave et Orange Money, et ajoute le champ `providerPhone` dans `Subscription` pour stocker le numéro mobile money.

**Acceptance Criteria:**
- L'enum `PaymentProvider` inclut `WAVE` et `ORANGE_MONEY` après migration
- Le champ `providerPhone` stocke le numéro de téléphone mobile money
- Un champ de numéro de téléphone apparaît sur la page de sélection de tier lorsque Wave ou Orange Money est choisi

### Story 11.4: UI sélection paiement — page tier avec choix multi-provider

Cette story permet au membre de choisir son moyen de paiement (virement, Wave ou Orange Money) et affiche les instructions correspondantes avec création d'un abonnement en statut TRIAL.

**Acceptance Criteria:**
- Trois options de paiement s'affichent : virement bancaire (par défaut), Wave, Orange Money
- Le virement affiche le RIB KS Investment, le montant et la référence
- Wave affiche le numéro à appeler, le montant et la référence, et crée un abonnement TRIAL avec `provider = WAVE`
- Orange Money affiche le code USSD ou le numéro, le montant et la référence, et crée un abonnement TRIAL avec `provider = ORANGE_MONEY`

### Story 11.5: Validation admin des paiements mobile money

Cette story permet à l'admin de valider manuellement un paiement Wave ou Orange Money, en utilisant le même workflow TRIAL → ACTIVE que pour le virement bancaire.

**Acceptance Criteria:**
- Les abonnements TRIAL avec `provider = WAVE` ou `ORANGE_MONEY` sont affichés dans le tableau de bord admin avec une icône distinctive
- La validation admin passe l'abonnement de TRIAL à ACTIVE

---

## Epic 12: Événements & Calendrier

Permettre à l'admin de publier des événements de networking et au public de consulter le calendrier, avec mise en avant du prochain événement sur la landing page.

### Story 12.1: Modèle Event + CRUD admin

Cette story crée le modèle `Event` et l'interface admin de CRUD pour créer, publier, annuler et gérer les événements.

**Acceptance Criteria:**
- L'admin peut créer un événement avec titre, description, date, date de fin, lieu, image et statut
- L'événement est créé en statut DRAFT par défaut avec un slug auto-généré
- La publication passe l'événement à PUBLISHED et le rend visible publiquement
- L'annulation passe l'événement à CANCELLED et le retire du composant « prochain événement »
- La liste admin trie les événements par date décroissante avec actions Modifier/Supprimer/Changer statut

### Story 12.2: Page calendrier d'événements publique

Cette story affiche la page publique `/events` avec le calendrier des événements publiés et la page de détail `/events/[slug]`.

**Acceptance Criteria:**
- La page `/events` affiche les événements publiés triés par date croissante avec une carte par événement
- La page `/events/[slug]` affiche tous les détails de l'événement
- Un `EmptyState` s'affiche si aucun événement n'est à venir

### Story 12.3: Composant « prochain événement » sur landing + pop-up

Cette story met en avant le prochain événement sur la landing page, soit dans le flux de la page, soit en pop-up configurable par l'admin.

**Acceptance Criteria:**
- Le composant `NextEventCard` s'affiche sur la landing page avec titre, date, lieu et bouton « En savoir plus »
- Si la configuration pop-up est activée, un Dialog s'affiche pour les nouveaux visiteurs avec un mécanisme de fermeture persistant
- Le composant ne s'affiche pas si aucun événement à venir n'existe

---

## Epic 13: Annuaire Experts & Entreprises Agréées

Créer deux annuaires publics : un annuaire des experts (consultants directs du club) et un annuaire des entreprises agréées (partenaires engageables).

### Story 13.1: Modèle Expert + CRUD admin

Cette story crée le modèle `Expert` et l'interface admin de CRUD pour gérer les fiches expert.

**Acceptance Criteria:**
- L'admin peut créer une fiche expert avec nom, titre/fonction, bio, photo, téléphone, email, WhatsApp, spécialités et statut publication
- La fiche est créée en base avec un slug auto-généré et `isPublished = false`
- La publication rend la fiche visible sur `/experts`
- La liste admin affiche les experts avec actions Modifier/Supprimer/Changer statut

### Story 13.2: Page publique liste des experts

Cette story affiche la page publique `/experts` avec les experts publiés et leurs filtres par spécialité.

**Acceptance Criteria:**
- La page `/experts` affiche les experts publiés en cartes avec photo, nom, titre et spécialités
- Des filter chips permettent de filtrer par spécialité
- La page `/experts/[slug]` affiche le profil complet avec boutons de contact
- Un `EmptyState` s'affiche si aucun expert n'est publié

### Story 13.3: Modèle Company + CRUD admin

Cette story crée le modèle `Company` et l'interface admin de CRUD pour gérer les fiches entreprise agréée.

**Acceptance Criteria:**
- L'admin peut créer une fiche entreprise avec nom, description, logo, contact, téléphone, email, site web, localisation, certifications, secteurs et statut publication
- La fiche est créée en base avec un slug auto-généré et `isPublished = false`
- La publication rend la fiche visible sur `/partners`
- La liste admin affiche les entreprises avec actions Modifier/Supprimer/Changer statut

### Story 13.4: Page publique liste des entreprises agréées

Cette story affiche la page publique `/partners` avec les entreprises agréées publiées et leurs filtres par secteur.

**Acceptance Criteria:**
- La page `/partners` affiche les entreprises publiées en cartes avec logo, nom, description courte et secteurs
- Des filter chips permettent de filtrer par secteur
- La page `/partners/[slug]` affiche le profil complet avec certifications et informations de contact
- Un `EmptyState` s'affiche si aucune entreprise n'est publiée

---

## Epic 14: SEO & Indexation

Corriger les problèmes SEO techniques bloquants et créer des pages de contenu pour capturer le trafic non-brand.

### Story 14.1: Infrastructure SEO technique

Cette story met en place les fondations SEO techniques : canonicalisation www, balises canonical, robots.txt, sitemap XML complet et meta tags optimisés sur la homepage.

**Acceptance Criteria:**
- Une redirection 301 permanente redirige `ivoire-business-club.com` (sans www) vers `www.ivoire-business-club.com`
- Chaque page inclut une balise `<link rel="canonical">` pointant vers sa version www
- Le fichier `robots.txt` expose `Allow: /`, référence le sitemap et disallow les routes privées
- Le `sitemap.xml` couvre toutes les routes publiques statiques et dynamiques avec l'URL de base correcte, sans `force-dynamic`
- La homepage a un `<title>` de 50-60 caractères mentionnant « business club » et « Abidjan », et une `<meta description>` de 140-160 caractères
- La configuration serveur Infomaniak est documentée pour la redirection 301

### Story 14.2: Pages de contenu SEO quick wins

Cette story crée les pages `/business-abidjan` et `/actualites` pour capturer le trafic sur les requêtes ciblées.

**Acceptance Criteria:**
- La page `/business-abidjan` a un `<h1>` et un `<title>` contenant « Business à Abidjan », une meta description ciblant « business abidjan » et « opportunités », au moins 300 mots de contenu, et une balise canonical
- La page `/actualites` a un `<h1>` et un `<title>` contenant « Actualités » et « Ivoire Business Club », agrège les derniers articles publiés et les prochains événements
- La homepage contient au moins un lien vers chaque nouvelle page avec des ancres descriptives
- Les pages `/articles`, `/events`, `/experts`, `/partners`, `/opportunities` ont des title et meta description optimisés

---

## Epic 15: Onboarding Enforcement & Relances Automatiques

Forcer la complétion de l'onboarding (vérification email + profil) en bloquant l'accès aux features premium et en envoyant des relances automatiques.

### Story 15.1: Widget de progression + soft-gate sur features premium

Cette story remplace la bannière passive du dashboard par un widget de progression interactif et bloque l'accès aux routes premium tant que l'onboarding n'est pas complet.

**Acceptance Criteria:**
- Le `OnboardingProgressWidget` affiche les deux étapes « Vérifier mon email » et « Compléter mon profil » avec pourcentage et CTAs
- Les routes `/dashboard/opportunities`, `/members`, `/dashboard/matching`, `/articles` redirigent les membres incomplets vers `/dashboard?incomplete=1`
- L'email de vérification est renvoyé automatiquement à la connexion si le dernier envoi date de plus de 24h
- Les champs `emailVerified` et `onboardingCompleted` sont embarqués dans le JWT pour le middleware Edge Runtime

### Story 15.2: Relances automatiques par email (cron)

Cette story met en place une route cron quotidienne qui envoie des relances automatiques aux membres incomplets à J+1, J+3 et J+7.

**Acceptance Criteria:**
- La route `POST /api/cron/remind-incomplete-users` est protégée par `CRON_SECRET`
- Les relances sont envoyées à J+1 (vérification email), J+3 (complétion profil) et J+7 (dernier rappel)
- Un log de relance évite les doublons et garantit l'idempotence
- Les emails sont en français, responsive, avec CTA clair et branding IBC
- Le crontab VPS Hetzner est documenté

### Story 15.3: Indicateur admin de complétion onboarding

Cette story ajoute des badges de complétion onboarding dans la liste admin des membres et permet de relancer manuellement.

**Acceptance Criteria:**
- La liste `/admin/members` affiche les badges « Email ✓/✗ » et « Profil ✓/✗ » pour chaque membre
- Un filtre rapide permet d'afficher uniquement les membres incomplets
- L'admin peut envoyer manuellement une relance depuis le détail d'un membre incomplet

---

## Epic 16: Synchronisation Onboarding → Profil & Migration Rétroactive

Éliminer l'incohérence entre le formulaire d'onboarding, le widget de progression et les prérequis de vérification admin. Un seul formulaire remplit tous les champs User nécessaires.

### Story 16.1: Synchronisation des champs onboarding → User

Cette story étend l'API `PUT /api/user/onboarding` pour synchroniser les champs `name`, `phone`, `location`, `country`, `bio` et `tier` dans le modèle User, et déclenche l'auto-transition du `verificationStatus`.

**Acceptance Criteria:**
- La soumission du formulaire d'onboarding sauvegarde le JSON `onboardingForm` et synchronise les colonnes User correspondantes
- Le champ « Pays » est ajouté au formulaire d'onboarding
- `autoTransitionVerificationStatus` est appelée dans la même transaction Prisma
- La réponse API ne contient pas `passwordHash`
- Les tests vérifient la synchronisation des champs et l'auto-transition

### Story 16.2: Migration rétroactive — synchroniser les membres existants

Cette story fournit un script one-shot pour synchroniser rétroactivement les membres ayant un `onboardingForm` rempli mais des champs User vides.

**Acceptance Criteria:**
- Le script `scripts/sync-onboarding-to-profile.ts` parcourt les utilisateurs avec `onboardingCompletedAt !== null`
- Il synchronise uniquement les champs User vides sans écraser les données existantes
- Il appelle `autoTransitionVerificationStatus` pour chaque utilisateur synchronisé
- Le script supporte `--dry-run` et est idempotent
- Un audit log est créé pour chaque synchronisation

### Story 16.3: Email d'accueil dynamique selon le mode de paiement

Cette story adapte l'email d'accueil pour refléter le mode de paiement et le tier choisis par le membre après la sélection de l'abonnement.

**Acceptance Criteria:**
- L'email envoyé après la sélection du tier/paiement contient les instructions correspondant au provider choisi (virement, Wave, Orange Money)
- L'email post-inscription reste générique sans instructions de paiement et invite à choisir sur `/pricing`
- Le membre ne reçoit pas l'email de bienvenue post-inscription une deuxième fois après la sélection du paiement
- Les tests vérifient les trois providers et le cas sans provider

---

## Epic 17: Bannière d'abonnement en attente d'activation

Afficher une bannière discrète sur le dashboard principal quand un membre a complété son onboarding mais n'a pas encore d'abonnement actif, pour l'inciter à finaliser son paiement.

### Story 17.1: Bannière dashboard — abonnement en attente d'activation

Cette story crée le composant `PendingSubscriptionBanner` et l'intègre dans la page dashboard pour rappeler aux membres de finaliser leur paiement.

**Acceptance Criteria:**
- Le composant server-side `PendingSubscriptionBanner` affiche le titre, le texte explicatif et un CTA vers `/pricing/virement?tier=[tier]`
- Le tier label utilise la même map que le dashboard (« Les Affranchis », « Les Grands Frères », « Les Boss »)
- Le style est cohérent avec `PremiumAccessBlockedPanel` (bordure et fond ambre)
- La bannière s'affiche uniquement si `onboardingCompletedAt !== null`, `role !== ADMIN` et `hasActiveSubscription(user.id) === false`
- La bannière s'affiche avant la section « Mon abonnement »
- Les tests unitaires couvrent les cas admin, abonnement actif, onboarding incomplet et tiers sans abonnement actif

---

## Epic 18: Chat de Support Bêta & Feedback Membres

**Objectif :** Fournir un canal in-app pour que les membres bêta puissent soumettre des commentaires (bogues, accessibilité, suggestions d'intégration). Les messages sont stockés en DB, bénéficient d'un accusé de réception immédiat, et sont gérés de manière asynchrone par l'agent Hermes qui se synchronise avec l'API toutes les 5 minutes et gère les tâches via son fichier todo local.

---

### Story 18-1: Modèle ChatMessage + API Routes de Support

**En tant que** développeur,  
**Je veux** créer le modèle de données `ChatMessage` dans Prisma, exécuter la migration et implémenter les routes API pour les membres et l'agent Hermes,  
**Afin de** stocker et exposer de manière sécurisée les messages de support.

**Acceptance Criteria :**

**Given** le schéma Prisma mis à jour avec le modèle `ChatMessage` et ses enums `ChatMessageStatus` et `ChatMessageAuthor`  
**When** la migration Prisma est lancée  
**Then** les tables de chat sont créées en base PostgreSQL avec relations vers l'utilisateur et suppression en cascade  

**Given** un membre connecté avec session active  
**When** il envoie une requête POST `/api/chat/messages` avec un contenu valide  
**Then** le système enregistre son message en base en statut `PENDING`  
**And** crée automatiquement dans la même transaction un message système d'accusé de réception (`author = SYSTEM`, `status = ACKNOWLEDGED`)  

**Given** un membre connecté  
**When** il appelle GET `/api/chat/messages`  
**Then** le système renvoie la liste paginée de ses messages et des réponses associées, ordonnés par date de création  

**Given** l'agent externe Hermes  
**When** il effectue des requêtes sur `/api/chat/agent/read`, `/api/chat/agent/reply` ou `/api/chat/agent/close`  
**Then** les appels doivent être authentifiés par Bearer token (`CRON_SECRET`)  
**And** Hermes ne peut lire que les messages `PENDING` et ne peut en aucun cas accéder à d'autres ressources DB via ces endpoints  

---

### Story 18-2: Widget UI de Chat de Support Bêta

**En tant que** membre connecté,  
**Je veux** disposer d'un bouton flottant de support ouvrant une fenêtre de chat,  
**Afin de** signaler un bogue ou soumettre un feedback sans quitter la plateforme.

**Acceptance Criteria :**

**Given** un membre connecté naviguant sur l'application  
**When** le layout principal est rendu  
**Then** un bouton flottant `BetaChatWidget` est affiché en bas à gauche (`z-index: 50`)  

**Given** le widget de chat  
**When** le membre clique dessus  
**Then** un panneau ou une fenêtre de chat s'ouvre, affichant clairement une bannière de phase bêta : « 🚧 Plateforme en phase bêta — Votre feedback nous aide à nous améliorer »  

**Given** le formulaire de chat  
**When** le membre sélectionne une catégorie (Bogue, Accessibilité, Intégration, Autre), écrit un message (max 5000 caractères) et clique sur envoyer  
**Then** le message est transmis à l'API, s'affiche instantanément dans l'historique et l'auto-acknowledgement système s'affiche immédiatement en dessous  

**Given** le widget de chat  
**When** le membre le consulte  
**Then** il voit l'historique de ses messages et les réponses de l'équipe, ainsi qu'un indicateur de statut "En ligne" (si Hermes a répondu récemment) ou "Hors ligne" (si pas d'activité Hermes depuis > 30 minutes)  
**And** un badge numérique rouge indique le nombre de réponses d'Hermes non lues  

---

### Story 18-3: Intégration de l'Agent Hermes (Skill & Cron Job)

**En tant que** Product Owner,  
**Je veux** configurer le skill Hermes dédié et son cron job de polling régulier,  
**Afin de** automatiser le traitement des messages et l'alimentation de la to-do list d'Hermes.

**Acceptance Criteria :**

**Given** le fichier de configuration du support Hermes  
**When** le skill `ibc-beta-chat-support` est chargé  
**Then** les outils système et de fichiers d'Hermes sont désactivés (`enabled_toolsets = ["web"]`), et le skill n'autorise des appels HTTP que vers les endpoints `/api/chat/agent/*`  

**Given** le cron job Hermes configuré pour tourner toutes les 5 minutes  
**When** il s'exécute sur la machine de l'admin  
**Then** il effectue une requête GET `/api/chat/agent/read` pour récupérer tous les messages `PENDING`  

**Given** un message de support récupéré par Hermes  
**When** Hermes le traite  
**Then** il génère une réponse appropriée et l'envoie via POST `/api/chat/agent/reply`  
**And** il extrait la demande et l'ajoute au fichier local `~/.hermes/jonathan_todo.json` avec le préfixe `[IBC-CHAT]`  

---

### Story 18-4: Webhook Temps Réel — Remplacement du Polling par Notification Push

**En tant que** membre connecté,
**Je veux** que mes messages de support soient traités en temps réel (et non dans un délai de 5 minutes),
**Afin de** recevoir une réponse quasi-immédiate de l'équipe de support.

**Contexte technique :** Le cron Hermes actuel (Story 18-3) pole l'API IBC toutes les 5 minutes pour récupérer les messages PENDING. L'expérience utilisateur est dégradée : un membre peut attendre jusqu'à 5 minutes. Ce story remplace le polling par un webhook temps réel, tout en conservant le cron comme filet de sécurité.

**Architecture cible :**
1. Tunnel Cloudflare expose le port 8644 du gateway Hermes sur une URL publique
2. Webhook subscription Hermes `ibc-chat-trigger` déclenche le skill `ibc-beta-chat-support` à chaque POST reçu
3. L'API IBC `POST /api/chat/messages` fait un appel webhook fire-and-forget vers Hermes après la création du message
4. Le cron 5 min reste actif comme backup pour les messages ratés par le webhook

**Acceptance Criteria :**

**Given** le fichier `src/app/api/chat/messages/route.ts` modifié
**When** un membre envoie un message via POST `/api/chat/messages` et que la transaction DB réussit
**Then** l'API retourne 201 immédiatement (avant ou indépendamment de l'appel webhook)
**And** un appel HTTP POST fire-and-forget est envoyé vers l'URL définie par `WEBHOOK_URL` avec un header d'authentification contenant le `WEBHOOK_SECRET`
**And** si le webhook échoue (Hermes down, réseau, timeout), l'API retourne quand même 201 — l'échec est loggé mais ne bloque pas la réponse

**Given** les variables d'environnement du projet IBC
**When** le code lit `WEBHOOK_URL` et `WEBHOOK_SECRET`
**Then** ces variables sont présentes dans `.env.example` avec des commentaires explicatifs
**And** si `WEBHOOK_URL` n'est pas définie, l'appel webhook est silencieusement ignoré (pas d'erreur, pas de crash)

**Given** le webhook Hermes configuré avec la subscription `ibc-chat-trigger`
**When** un POST arrive sur l'URL du webhook avec un payload JSON contenant `{ "messageId": "...", "userId": "...", "category": "...", "content": "..." }`
**Then** Hermes déclenche le skill `ibc-beta-chat-support` qui exécute le workflow de réponse en temps réel
**And** la signature HMAC-SHA256 du header est validée avant le déclenchement

**Given** le cron de backup 5 min toujours actif
**When** un message a déjà été traité par le webhook
**Then** le cron ne re-traite pas le message (idempotence via `msg_id` dans le todo file + statut non-PENDING en DB)

**Given** le code modifié
**When** `npm run build` et `npx vitest run` sont exécutés
**Then** le build passe sans erreur et les tests existants passent (pas de régression)

---

## Epic 19: Analytics Comportemental PostHog

**Objectif :** Intégrer PostHog sur la plateforme IBC pour suivre le comportement des utilisateurs, mesurer l'engagement sur les fonctionnalités clés, identifier les utilisateurs par tier d'abonnement et bâtir des entonnoirs d'acquisition et d'activation.

---

### Story 19-1: Installation et Initialisation de PostHog

**En tant que** développeur,  
**Je veux** installer les dépendances PostHog, configurer le provider client-side avec gestion SSR, et mettre à jour les variables d'environnement,  
**Afin de** démarrer le tracking automatique des pages et des clics.

**Acceptance Criteria :**

**Given** le projet IBC  
**When** les packages `posthog-js` et `posthog-node` sont installés  
**Then** l'application compile sans erreur  

**Given** le fichier `src/components/providers/posthog-provider.tsx` (ou similaire)  
**When** il est inséré dans le layout racine après le AuthProvider  
**Then** le script de tracking s'exécute uniquement côté client (gating `typeof window !== 'undefined'`) pour éviter tout plantage ou divergence de rendu au build  

**Given** les variables d'environnement `NEXT_PUBLIC_POSTHOG_KEY` et `NEXT_PUBLIC_POSTHOG_HOST` configurées  
**When** l'application tourne en production ou en développement  
**Then** PostHog capture automatiquement les événements de page vue (`$pageview`) et d'autocapture des clics  

---

### Story 19-2: Identification et Tracking d'Événements Métier

**En tant que** Product Owner,  
**Je veux** que les utilisateurs connectés soient identifiés dans PostHog avec leurs attributs (tier, rôle) et que les actions métier soient trackées,  
**Afin de** segmenter l'analytics et de construire des analyses précises.

**Acceptance Criteria :**

**Given** un membre connecté à la plateforme  
**When** la session utilisateur est initialisée  
**Then** le système appelle `posthog.identify(userId, { email, tier, role })` pour associer ses actions à son profil  

**Given** un utilisateur connecté  
**When** il se déconnecte de la plateforme  
**Then** le système appelle `posthog.reset()` pour effacer les cookies et dissocier les futures actions anonymes  

**Given** les actions métier clés effectuées par l'utilisateur (inscription, choix de tier, soumission d'une opportunité, upload de document juridique, clic sur WhatsApp)  
**When** ces actions se produisent  
**Then** les événements correspondants (ex: `user_signed_up`, `tier_selected`, `opportunity_submitted`, `interest_expressed`, `document_uploaded`) sont envoyés à PostHog avec leurs métadonnées  

**Given** les routes API critiques côté serveur (comme la validation d'un abonnement ou l'inscription)  
**When** elles s'exécutent  
**Then** le SDK `posthog-node` est utilisé pour logger l'événement métier côté serveur avec le `distinctId` de l'utilisateur  

### Story 19.2b: PostHog Identification Gaps

Cette story comble les gaps d'identification PostHog restants : `posthog.identify()` après chaque connexion (credentials et OAuth), envoi des propriétés `tier` et `role`, et événement `tier_selected` sur la page `/pricing`.

**Acceptance Criteria:**
- `posthog.identify(userId, { email, name, tier, role })` est appelé automatiquement côté client dès qu'une session authentifiée est établie
- Les utilisateurs OAuth et les visiteurs de retour ne restent pas anonymes dans PostHog
- Le hook d'identification est idempotent et intégré dans le provider PostHog sans casser le SSR
- L'appel manuel `posthog.identify` sur la page signup est retiré ou aligné
- `posthog.capture('tier_selected', { tier, source: 'pricing_page' })` est déclenché lors de la sélection d'un tier dans `PricingTierSelection`
- Le `posthog.reset()` au logout reste intact

---

### Story 19-3: Configuration des Tableaux de Bord et Funnels PostHog

**En tant que** Product Owner,  
**Je veux** configurer des Insights, des Funnels d'acquisition, et activer les Session Replays dans la console PostHog,  
**Afin de** analyser visuellement le trafic et détecter les points de friction.

**Acceptance Criteria :**

**Given** les événements envoyés à PostHog  
**When** j'accède à l'interface d'administration PostHog  
**Then** les funnels d'acquisition (Landing → Signup → Tier Selection → Activation) et d'engagement (Dashboard → Opportunity click → Interest expressed) sont créés et opérationnels  

**Given** les attributs utilisateurs (tier et role)  
**When** je filtre les tendances ou les funnels  
**Then** je peux analyser distinctement le comportement des membres selon leur tier d'abonnement (Affranchis, Grands Frères, Boss)  

**Given** les replays de sessions activés dans PostHog  
**When** un utilisateur navigue sur la plateforme  
**Then** je peux rejouer sa session de manière anonymisée pour comprendre son parcours d'onboarding  

---

---

## Epic 20: Fix connexion comptes non vérifiés

Corriger l'expérience de connexion pour les utilisateurs credentials dont l'email n'est pas encore vérifié, en affichant un message clair et en bloquant la session.

### Story 20.1: Fix connexion comptes non vérifiés

Cette story modifie le callback `signIn` d'Auth.js et les pages signin/signup pour afficher un message explicite quand un compte credentials n'est pas vérifié, tout en continuant à renvoyer l'email de vérification à chaque tentative.

**Acceptance Criteria:**
- Un utilisateur non vérifié voit le message « Vérifie ton email pour te connecter. Un lien de vérification t'a été envoyé. » au lieu de « Email ou mot de passe incorrect. »
- Aucun cookie de session JWT n'est créé pour un compte non vérifié
- L'email de vérification est renvoyé automatiquement à chaque tentative de connexion
- Les comptes vérifiés se connectent normalement vers `/dashboard`
- Le flux Google OAuth non vérifié reste redirigé vers `/dashboard?resend=1`
- Après un signup credentials, la page signup redirige vers `/auth/signin?error=unverified`

---

## Epic 21: Gestion des Mots de Passe

**Objectif :** Permettre aux utilisateurs de récupérer leur accès en cas de mot de passe oublié, de modifier leur mot de passe depuis leur profil, et de définir un mot de passe initial pour les comptes créés via WhatsApp/admin sans consentement explicite de l'utilisateur.

**FRs couverts :** FR77, FR78, FR79
**NFRs couverts :** NFR-S10, NFR-S11, NFR-S12
**UX-DRs couverts :** UX-DR14 (formulaires), UX-DR19 (états chargement), UX-DR20 (états erreur), UX-DR23 (focus rings)

### Story 21-1: Mot de Passe Oublié

**En tant que** utilisateur non connecté,
**Je veux** pouvoir demander un email de réinitialisation de mot de passe,
**Afin de** récupérer l'accès à mon compte si j'ai oublié mon mot de passe.

**Acceptance Criteria :**

**Given** un visiteur sur la page `/auth/signin`
**When** il clique sur le lien « Mot de passe oublié ? »
**Then** il est redirigé vers `/auth/forgot-password`

**Given** un visiteur sur la page `/auth/forgot-password`
**When** il saisit une adresse email valide et soumet le formulaire
**Then** le système génère un token de réinitialisation (expire dans 1 heure, NFR-S11) et envoie un email contenant un lien `/auth/reset-password?token=xxx`
**And** un message générique s'affiche : « Si un compte est associé à cet email, un lien de réinitialisation a été envoyé. » (ne révèle pas si l'email existe)

**Given** un visiteur saisit une email inexistant
**When** il soumet le formulaire
**Then** le même message générique s'affiche (pas de fuite d'information sur l'existence du compte)

**Given** un visiteur tente de spammer l'endpoint forgot-password
**When** il effectue plus de 3 demandes en 1 minute depuis la même IP
**Then** la 4ème tentative est bloquée avec statut 429 (NFR-S10)

**Given** un utilisateur clique sur le lien de reset dans l'email
**When** il arrive sur `/auth/reset-password?token=xxx` avec un token valide
**Then** il voit un formulaire avec nouveau mot de passe + confirmation
**And** un indicateur de force du mot de passe s'affiche en temps réel

**Given** un utilisateur sur la page reset-password avec un token valide
**When** il saisit un nouveau mot de passe (≥ 8 caractères) et sa confirmation, puis soumet
**Then** le système hash le nouveau password avec bcryptjs (coût ≥ 10), invalide le token, et redirige vers `/auth/signin` avec un message de succès

**Given** un utilisateur clique sur un lien de reset avec un token expiré (> 1h)
**When** il tente de soumettre un nouveau mot de passe
**Then** un message d'erreur s'affiche : « Ce lien de réinitialisation a expiré. Veuillez en demander un nouveau. »

**Given** un utilisateur clique sur un lien de reset avec un token déjà utilisé
**When** il tente de soumettre un nouveau mot de passe
**Then** un message d'erreur s'affiche : « Ce lien a déjà été utilisé. »

**Given** le code modifié
**When** `npm run build` et `npx vitest run` sont exécutés
**Then** le build passe sans erreur et les tests existants passent (pas de régression)

---

### Story 21-2: Changement de Mot de Passe dans le Profil

**En tant que** membre connecté,
**Je veux** modifier mon mot de passe depuis mon profil,
**Afin de** sécuriser mon compte ou changer un mot de passe que je ne souhaite plus utiliser.

**Acceptance Criteria :**

**Given** un membre connecté sur `/profile`
**When** il consulte sa page de profil
**Then** il voit une section « Sécurité » avec un formulaire de changement de mot de passe (ancien mot de passe, nouveau mot de passe, confirmation)

**Given** un membre connecté sur `/profile`
**When** il saisit son ancien mot de passe correct et un nouveau mot de passe valide (≥ 8 caractères) avec confirmation matching
**Then** le système vérifie l'ancien mot de passe avec bcrypt.compare (NFR-S12), hash le nouveau, met à jour `passwordHash` en base, et affiche un toast : « Mot de passe modifié avec succès. »

**Given** un membre saisit un ancien mot de passe incorrect
**When** il soumet le formulaire
**Then** une erreur inline s'affiche : « Ancien mot de passe incorrect. »

**Given** un membre saisit un nouveau mot de passe différent de la confirmation
**When** il soumet le formulaire
**Then** une erreur inline s'affiche : « Les mots de passe ne correspondent pas. »

**Given** un membre connecté via Google OAuth (pas de passwordHash)
**When** il consulte la section « Sécurité » de son profil
**Then** la section affiche : « Votre compte utilise Google pour la connexion. Aucun mot de passe à modifier. »

**Given** le code modifié
**When** `npm run build` et `npx vitest run` sont exécutés
**Then** le build passe sans erreur et les tests existants passent (pas de régression)

---

### Story 21-3: Set-Password Flow pour Utilisateurs Créés via WhatsApp

**En tant que** utilisateur créé via WhatsApp par Sarah (sans mot de passe connu),
**Je veux** recevoir un email me permettant de définir mon mot de passe,
**Afin de** pouvoir me connecter à la plateforme IBC de manière autonome.

**Acceptance Criteria :**

**Given** un utilisateur existe en base avec un `passwordHash` généré automatiquement (créé via WhatsApp/admin) et `emailVerified = false`
**When** l'admin ou le système déclenche l'envoi d'un email d'invitation (set-password)
**Then** un token de type SET_PASSWORD est généré (expire 7 jours) et un email est envoyé avec un lien `/auth/reset-password?token=xxx&type=set`

**Given** un utilisateur clique sur le lien d'invitation dans l'email
**When** il arrive sur `/auth/reset-password?token=xxx&type=set`
**Then** il voit un formulaire « Définir votre mot de passe » (sans champ ancien mot de passe)
**And** un indicateur de force s'affiche en temps réel

**Given** un utilisateur sur la page set-password avec un token valide
**When** il saisit un nouveau mot de passe (≥ 8 caractères) et sa confirmation, puis soumet
**Then** le système hash le password avec bcryptjs, invalide le token, marque `emailVerified = true`, et redirige vers `/auth/signin` avec un message : « Votre mot de passe a été défini. Vous pouvez vous connecter. »

**Given** un token SET_PASSWORD expiré (> 7 jours)
**When** l'utilisateur tente de soumettre
**Then** un message s'affiche : « Ce lien d'invitation a expiré. Contactez le support pour en recevoir un nouveau. »

**Given** le code modifié
**When** `npm run build` et `npx vitest run` sont exécutés
**Then** le build passe sans erreur et les tests existants passent (pas de régression)

---

## Epic 22: Fix UX post-signup — page de confirmation

Améliorer l'expérience post-inscription en affichant une page de confirmation claire au lieu de rediriger vers la page de connexion quand l'auto-login échoue à cause d'un email non vérifié.

### Story 22.1: Fix UX post-signup — page de confirmation au lieu de redirection vers signin

Cette story crée une page `/auth/signup-success` et supprime l'auto-login post-signup dans la page signup.

**Acceptance Criteria:**
- Après un signup réussi, l'utilisateur est redirigé vers `/auth/signup-success`
- La page affiche un message de succès, des instructions de vérification email, un bouton « Se connecter » et un lien de renvoi d'email
- Le client ne tente plus `signIn("credentials")` après le signup
- Le tracking PostHog `user_signed_up` est conservé
- Le flux Google OAuth reste inchangé
- Les tests existants sont mis à jour pour refléter la nouvelle redirection

---

## Epic 23: Durée d'abonnement et tarification périodique

Permettre aux membres de choisir la durée de leur abonnement (mensuel, semestriel, annuel) avec des tarifs adaptés par tier.

### Story 23.1: Durée d'abonnement et tarification périodique

Cette story étend la tarification et l'UI de sélection de tier pour supporter trois durées d'abonnement avec des montants distincts par tier.

**Acceptance Criteria:**
- La structure tarifaire `bank-transfer-config.ts` supporte les périodes MONTHLY, SEMESTERIAL et ANNUAL avec les montants corrects par tier
- Le schéma de validation inclut SEMESTERIAL comme valeur valide
- Un sélecteur de durée apparaît dans l'UI après le choix du tier et avant le choix du moyen de paiement
- Le montant affiché se met à jour selon la durée sélectionnée
- La route API `/api/subscriptions` calcule et stocke `endDate` selon la période
- Le tableau admin affiche les colonnes « Durée » et « Échéance »
- La validation admin recalcule `endDate` si manquant

---

## Epic 24: Filtrage et Recherche des Membres

Permettre aux membres et aux admins de rechercher et filtrer la liste des membres par nom, tier, statut d'abonnement, statut de compte, statut de vérification et date d'inscription, avec tri et pagination. Active le requirement UX-DR18 ("Recherche et filtrage — search debounced 300ms, filter chips horizontaux scrollables, tri dropdown") qui n'avait jamais été implémenté pour la liste des membres.

**FRs couverts :** FR77 (recherche et filtrage membres côté espace membre), FR78 (filtrage avancé admin members)
**UX-DRs couverts :** UX-DR18 (recherche debounced, filter chips, tri dropdown)
**NFRs couverts :** NFR-P2 (temps réponse < 500ms), NFR-A1 (accessibilité)

---

### Story 24-1: Filtrage de la page membres (espace membre)

**En tant que** membre connecté,
**Je veux** rechercher et filtrer les membres par nom et tier,
**Afin de** trouver rapidement des membres selon des critères pertinents.

**Acceptance Criteria :**

**Given** un membre connecté sur la page `/members`
**When** il saisit du texte dans le champ de recherche
**Then** les résultats sont filtrés par nom avec un debounce de 300ms et l'URL est mise à jour (`?q=...`)

**Given** un membre sur la page `/members`
**When** il clique sur un filter chip de tier (Affranchis / Grands Frères / Boss)
**Then** seuls les membres du tier sélectionné s'affichent et l'URL est mise à jour (`?tier=...`)

**Given** un membre sur la page `/members`
**When** il sélectionne un tri dans le dropdown (Nom A→Z, Nom Z→A, Plus récents, Plus anciens)
**Then** l'ordre des résultats change et l'URL est mise à jour (`?sort=...`)

**Given** plus de 20 membres dans les résultats
**When** l'utilisateur scroll en bas
**Then** une pagination s'affiche (page précédente / suivante) via `?page=...`

**Given** des filtres actifs ne retournant aucun résultat
**When** la page se charge
**Then** un empty state s'affiche : "Aucun membre ne correspond à vos critères" avec un bouton "Réinitialiser les filtres"

**Given** la page `/members` avec différents `searchParams`
**When** `npm run build` et les tests sont exécutés
**Then** le build passe et les tests unitaires vérifient le rendu selon les paramètres

---

### Story 24-2: Filtrage avancé de la page admin members

**En tant qu'** admin,
**Je veux** rechercher et filtrer les membres par nom, tier, statut d'abonnement, statut de compte, statut de vérification et date d'inscription,
**Afin de** gérer efficacement la base de membres.

**Acceptance Criteria :**

**Given** un admin sur la page `/admin/members`
**When** il saisit du texte dans le champ de recherche
**Then** les résultats sont filtrés par nom OU email (debounce 300ms) via `?q=...`

**Given** un admin sur la page `/admin/members`
**When** il sélectionne un tier dans le dropdown
**Then** seuls les membres du tier sélectionné s'affichent via `?tier=...`

**Given** un admin sur la page `/admin/members`
**When** il sélectionne un statut d'abonnement (TRIAL / PENDING / ACTIVE / PAST_DUE / CANCELLED)
**Then** seuls les membres avec ce statut d'abonnement s'affichent via `?subscription=...`

**Given** un admin sur la page `/admin/members`
**When** il sélectionne un statut de compte (Actif / Suspendu)
**Then** seuls les membres avec ce statut s'affichent via `?status=...`

**Given** un admin sur la page `/admin/members`
**When** il sélectionne un statut de vérification (PENDING / EN_COURS / VERIFIED / REJECTED)
**Then** seuls les membres avec ce statut s'affichent via `?verification=...`

**Given** un admin avec le filtre `?incomplete=1` actif
**When** il ajoute d'autres filtres (tier, statut, etc.)
**Then** les filtres se combinent (AND logique) et `?incomplete=1` reste actif

**Given** plus de 25 membres dans les résultats
**When** l'admin scroll en bas
**Then** une pagination s'affiche via `?page=...`

**Given** des filtres actifs ne retournant aucun résultat
**When** la page se charge
**Then** un empty state s'affiche avec un bouton de réinitialisation

**Given** la page `/admin/members` avec différentes combinaisons de `searchParams`
**When** les tests sont exécutés
**Then** les tests unitaires vérifient le `whereClause` selon les paramètres

## Epic 25: Plateforme d'Événements — Couverture, Visibilité, Tarification & Galerie

Transformer le MVP événements en une plateforme complète générant des revenus et servant de levier de conversion d'abonnement.

### Story 25.1: Migration modèle Event + pricing + visibility + eventType

Cette story étend le modèle Event avec type d'événement, visibilité, capacité, tarification par tier, couverture sur VPS et ajoute les modèles `EventRegistration` et `EventGalleryPhoto`.

**Acceptance Criteria:**
- Le modèle Event inclut `eventType`, `visibility`, `location` optionnel, `onlineUrl`, `coverImagePath`, `maxCapacity`, `pricing` JSON et les nouveaux enums
- Les modèles `EventRegistration` et `EventGalleryPhoto` sont créés avec leurs relations
- Le champ `imageUrl` existant est supprimé/renommé
- Les types TypeScript sont générés et disponibles
- Les schémas Zod incluent les nouveaux champs et validations conditionnelles
- Le build et les tests restent verts

### Story 25.2: Upload couverture VPS + refactor form admin

Cette story permet à l'admin d'uploader une image de couverture sur le VPS et refond le formulaire admin en sections.

**Acceptance Criteria:**
- Le formulaire admin est organisé en 5 sections : infos générales, logistique, couverture, tarification, publication
- L'upload d'image (jpeg/png/webp, max 5MB) redimensionne avec `sharp` et stocke dans `/var/www/ibc-media/events/{eventId}/cover.{ext}`
- Les champs requis sont adaptés au type d'événement (`location` pour IN_PERSON, `onlineUrl` pour ONLINE)
- La grille tarifaire par tier accepte des montants entiers positifs, null ou 0 pour gratuit

### Story 25.3: Page event publique avec teaser privé + compteur places + grille tarifaire

Cette story affiche la page publique des événements avec distinctions public/privé, compteur de places et grille tarifaire.

**Acceptance Criteria:**
- Les événements PUBLIC s'affichent normalement pour tous les visiteurs
- Les événements PRIVÉ affichent une card floutée avec CTA « Devenir membre pour réserver » pour les visiteurs non connectés
- Les membres connectés voient les événements PRIVÉ sans flou avec bouton « S'inscrire »
- Le compteur de places affiche « X places restantes » ou « Places illimitées »
- La grille tarifaire affiche les prix par tier et met en avant le tarif du membre connecté

### Story 25.4: Inscription + paiement event (virement + mobile money + pay-on-site)

Cette story permet aux utilisateurs de s'inscrire à un événement et de payer selon le mode choisi.

**Acceptance Criteria:**
- Le membre connecté voit un formulaire d'inscription avec choix du moyen de paiement et montant basé sur son tier
- Le visiteur non connecté pour un event PUBLIC saisit son email et choisit son paiement au tarif visiteur
- L'option « payer sur place » affiche un avertissement et crée une inscription avec `payOnSite: true`
- Le virement/mobile money crée un enregistrement `Payment` et une `EventRegistration`
- Le bouton « S'inscrire » est désactivé quand la capacité est atteinte
- L'admin consulte la liste des inscrits avec tier, mode de paiement et statut

### Story 25.5: Galerie collaborative post-event

Cette story permet aux membres et à l'admin d'uploader des photos dans une galerie collaborative après un événement.

**Acceptance Criteria:**
- Les membres et l'admin peuvent uploader des photos (jpeg/png/webp, max 10MB) redimensionnées avec `sharp` dans `/var/www/ibc-media/events/{eventId}/gallery/{uuid}.{ext}`
- L'admin peut modérer et supprimer toutes les photos ; le membre ne peut supprimer que les siennes
- La galerie publique s'affiche en bas de la page de l'événement

### Story 25.6: Section « Moments IBC » sur landing + page dashboard events passés

Cette story affiche les photos des derniers événements sur la landing page et crée une page dashboard des événements passés.

**Acceptance Criteria:**
- La landing page affiche une section « Moments IBC » avec un carousel/grid de photos récentes d'événements passés PUBLISHED
- Cliquer sur une photo redirige vers la page de l'événement (PUBLIC) ou un teaser (PRIVÉ)
- Le dashboard `/dashboard/events` affiche une section « Événements passés » avec aperçu des galeries

---

---

*Fin du document Epic Breakdown — IBC v1.7. Épiques 8, 10-17, 20, 22-25 ajoutés via Sprint Change Propals. Stories 9-9, 9-10, 19-2b ajoutées. Audit BMAD 2026-07-08.*
