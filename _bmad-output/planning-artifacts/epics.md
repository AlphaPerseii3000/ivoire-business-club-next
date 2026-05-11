---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
inputDocuments:
  - prd.md
  - architecture.md
  - product-brief-ivoire-business-club.md
---

# Ivoire Business Club — Epics et Stories

## Aperçu

Ce document décompose les exigences du PRD et les décisions d'architecture en épics et stories implémentables.

## Inventaire des exigences

### Exigences fonctionnelles couvertes

**Landing Page :** LP-01 à LP-09
**Authentification :** AUTH-01 à AUTH-07
**Abonnements :** SUB-01 à SUB-04
**Paiements :** PAY-01 à PAY-06
**Espace Membre :** MEM-01 à MEM-05
**Opportunités :** OPP-01 à OPP-05
**Administration :** ADM-01 à ADM-04

### Exigences non-fonctionnelles couvertes

**Performance :** NF-PERF-01 à 04
**Sécurité :** NF-SEC-01 à 06
**Disponibilité :** NF-AVAIL-01 à 02
**Compatibilité :** NF-COMP-01 à 03
**Accessibilité :** NF-ACC-01 à 02
**i18n :** NF-I18N-01 à 02

---

## Liste des Epics

1. **Epic 1 : Fondation technique** — Setup projet Next.js + Prisma + Auth + déploiement
2. **Epic 2 : Landing Page** — Page publique conversionnelle complète
3. **Epic 3 : Authentification & Inscription** — Flux complet signup/login/trial
4. **Epic 4 : Abonnements & Paiements** — Stripe + CinetPay + abonnements récurrents
5. **Epic 5 : Espace Membre** — Dashboard, profil, annuaire
6. **Epic 6 : Opportunités** — CRUD + vérification + publication
7. **Epic 7 : Administration** — Panel admin basique
8. **Epic 8 : UX, Performance & Polissage** — Mode sombre, responsive, SEO, a11y

---

## Epic 1 : Fondation technique

Mise en place de la base technique du projet : scaffold Next.js, configuration Prisma, Auth.js, CI/CD, et structure du projet.

### Story 1.1 : Scaffold Next.js + TailwindCSS + shadcn/ui

As a **développeur**,
I want que le projet Next.js soit initialisé avec TypeScript, TailwindCSS 4 et shadcn/ui,
So that la base technique est prête pour le développement des features.

**Acceptance Criteria:**

**Given** un répertoire vide
**When** j'initialise le projet
**Then** le projet Next.js 15 App Router est créé avec TypeScript strict
**And** TailwindCSS 4 est configuré
**And** les composants shadcn/ui de base sont installés (Button, Card, Input, Form, Badge, Avatar, Tabs, Table, Dialog, DropdownMenu, Select, Sheet, Separator, Toast)
**And** le thème IBC est configuré (primary gold, secondary navy, accent emerald, dark mode)
**And** `npm run build` passe sans erreur
**And** `npm run dev` lance le serveur sur localhost:3000

### Story 1.2 : Prisma Schema + Migrations

As a **développeur**,
I want le schéma Prisma soit créé et les migrations exécutées,
So that la base de données est prête pour les features.

**Acceptance Criteria:**

**Given** le projet scaffoldé
**When** je crée le schéma Prisma
**Then** les modèles User, Subscription, Opportunity, Payment sont créés selon l'architecture AD-06
**And** les enums sont définis (Tier, UserRole, SubscriptionStatus, etc.)
**And** `npx prisma migrate dev` crée les tables dans SQLite
**And** `npx prisma generate` génère les types TypeScript
**And** le singleton Prisma client est configuré dans `lib/prisma.ts`

### Story 1.3 : Auth.js Configuration

As a **développeur**,
I want Auth.js soit configuré avec email/password + Google OAuth,
So that les utilisateurs peuvent s'authentifier.

**Acceptance Criteria:**

**Given** le schéma Prisma avec le modèle User
**When** je configure Auth.js
**Then** l'API route `/api/auth/[...nextauth]` est créée
**And** le Credentials provider est configuré (email + password, bcrypt)
**And** le Google provider est configuré
**And** la session JWT est dans les cookies HttpOnly
**And** les pages custom signin/signup sont définies
**And** les callbacks enrichissent le JWT avec tier et role
**And** la connexion et déconnexion fonctionnent

### Story 1.4 : Structure du projet complet

As a **développeur**,
I want la structure des répertoires et les layouts soient en place,
So que les features peuvent être développées de manière organisée.

**Acceptance Criteria:**

**Given** le scaffold de base
**When** je crée la structure complète
**Then** les route groups `(public)`, `(dashboard)`, `(admin)` sont créés
**And** les layouts vides pour chaque route group sont en place
**And** le root layout inclus les fonts, les metadata globales
**And** le middleware de protection des routes est configuré
**And** le gitignore inclut .env*, node_modules, .next, *.db

### Story 1.5 : CI/CD GitHub Actions

As a **développeurur**,
I want un pipeline CI soit configuré,
So que chaque push sur main vérifie lint, type-check et build.

**Acceptance Criteria:**

**Given** le repo GitHub
**When** je pousse sur main
**Then** GitHub Actions exécute lint (eslint), type-check (tsc), et build (next build)
**And** le pipeline échoue si une étape ne passe pas
**And** le cache node_modules est configuré pour la vitesse

---

## Epic 2 : Landing Page

Construction de la landing page publique complète avec sections conversionnelles, lead magnet et pricing.

### Story 2.1 : Hero Section

As a **visiteur**,
I want une hero section impactante,
So que je comprends immédiatement la proposition de valeur d'IBC.

**Acceptance Criteria:**

**Given** la landing page
**When** je visite la page d'accueil
**Then** je vois le titre "Bâtir son futur en Afrique"
**And** le sous-titre "Avec l'Ivoire Business Club accède aux meilleures opportunités business en Côte d'Ivoire"
**And** le tagline "Investir ou entreprendre ne s'improvise pas"
**And** le CTA "Rejoins le club" qui redirige vers /pricing
**And** la section est responsive et animée (fade-in)
**And** un background visuel premium (gradient/image)

### Story 2.2 : Sections Mission + Comment ça marche + C'est pour toi

As a **visiteur**,
I want comprendre la mission et le fonctionnement d'IBC,
So que je sais si c'est fait pour moi.

**Acceptance Criteria:**

**Given** la landing page
**When** je scrolle vers le bas
**Then** je vois la section "Notre mission" avec les 4 points
**And** je vois la section "Comment ça marche" avec les 3 étapes illustrées
**And** je vois la section "C'est pour toi si…" avec les 3 profils (Investisseurs, Entrepreneurs, Acteurs locaux)
**And** chaque section est bien espacée et responsive

### Story 2.3 : Section Pricing + Offre de lancement

As a **visiteur**,
I want voir les formules d'adhésion et leurs prix,
So que je peux choisir mon niveau d'engagement.

**Acceptance Criteria:**

**Given** la landing page
**When** j'arrive à la section pricing
**Then** je vois le tableau comparatif des 3 tiers (Affranchis, Grands Frères, Boss)
**And** chaque tier affiche le prix mensuel ET annuel en € et CFA
**And** le tier recommandé (Grands Frères) est mis en avant visuellement
**And** l'offre de lancement est affichée (-50% annuel ou 1 mois offert)
**And** un CTA "Rejoins le club" par tier redirige vers /auth/signup

### Story 2.4 : Lead Magnet + Footer

As a **visiteur**,
I want télécharger un guide gratuit et accéder aux informations de contact,
So que je peux en savoir plus avant de m'inscrire.

**Acceptance Criteria:**

**Given** la landing page
**When** je vois la section lead magnet
**Then** je peux entrer mon email pour recevoir le guide "Investir en CI 2026"
**And** mon email est stocké (envoi vers une liste ou DB)
**And** le footer contient les informations de contact (+41 79 421 47 89, sarah@ivoire-business-club.com)
**And** le footer contient les liens réseaux sociaux
**And** le footer contient les mentions légales

---

## Epic 3 : Authentification & Inscription

Flux complet d'inscription, connexion, déconnexion, et période d'essai.

### Story 3.1 : Page d'inscription

As a **visiteur**,
I want m'inscrire avec mon email et un mot de passe,
So que je peux accéder à la plateforme.

**Acceptance Criteria:**

**Given** la page /auth/signup
**When** je remplis le formulaire (nom, email, mot de passe)
**Then** mon compte est créé avec le tier par défaut (AFFRANCHI)
**And** le statut est TRIAL (14 jours)
**And** je suis redirigé vers /pricing pour choisir un abonnement
**And** la validation Zod vérifie l'email et le mot de passe (min 8 chars)
**And** les erreurs de validation sont affichées en temps réel

### Story 3.2 : Page de connexion

As a **membre**,
I want me connecter avec mon email/mot de passe ou Google,
So que j'accède à mon espace.

**Acceptance Criteria:**

**Given** la page /auth/signin
**When** je saisis mes identifiants
**Then** je suis authentifié et redirigé vers /dashboard
**And** le bouton Google OAuth est disponible
**And** le lien "Mot de passe oublié" redirige vers le flux de reset
**And** les erreurs de connexion sont affichées clairement

### Story 3.3 : Mot de passe oublié

As a **membre**,
I want réinitialiser mon mot de passe,
So que je peux récupérer l'accès à mon compte.

**Acceptance Criteria:**

**Given** la page /auth/forgot-password
**When** je saisie mon email
**Then** un email de reset est envoyé
**And** le lien dans l'email redirige vers /auth/reset-password
**And** le nouveau mot de passe est validé et enregistré

### Story 3.4 : Middleware de protection

As a **développeur**,
I want les routes authentifiées soient protégées,
So que seuls les membres connectés accèdent au dashboard.

**Acceptance Criteria:**

**Given** le middleware Next.js
**When** un visiteur non authentifié accède à /dashboard
**Then** il est redirigé vers /auth/signin
**And** les routes /admin nécessitent le rôle ADMIN
**And** les routes /auth/* sont accessibles sans authentification
**And** les routes / (landing page, /pricing) sont publiques

---

## Epic 4 : Abonnements & Paiements

Intégration Stripe et CinetPay pour les abonnements récurrents avec gestion du cycle de vie.

### Story 4.1 : Page sélection tier + checkout Stripe

As a **membre**,
I want choisir mon tier et payer en euros via Stripe,
So que mon abonnement est activé.

**Acceptance Criteria:**

**Given** la page /pricing (authentifié)
**When** je sélectionne un tier et la périodicité (mensuel/annuel)
**Then** je suis redirigé vers Stripe Checkout
**And** le paiement en € est traité
**And** en cas de succès, mon abonnement passe à ACTIVE
**And** mon tier est mis à jour en base
**And** je suis redirigé vers /dashboard avec confirmation

### Story 4.2 : Checkout CinetPay

As a **membre**,
I want payer en CFA via CinetPay (Orange Money, Wave, etc.),
So que je peux utiliser les moyens de paiement locaux.

**Acceptance Criteria:**

**Given** la page /pricing
**When** je choisis le paiement en CFA
**Then** je suis redirigé vers CinetPay Checkout
**And** les moyens de paiement locaux sont disponibles (Orange Money, MTN, Wave)
**And** le montant en CFA correspond au taux du tier
**And** en cas de succès, mon abonnement est activé

### Story 4.3 : Webhooks Stripe

As a **système**,
I want les événements Stripe soient traités via webhook,
So que les abonnements sont synchronisés.

**Acceptance Criteria:**

**Given** l'API route /api/stripe/webhook
**When** Stripe envoie un événement checkout.session.completed
**Then** l'abonnement est créé en base avec status=ACTIVE
**And** le tier de l'utilisateur est mis à jour
**And** l'événement customer.subscription.deleted passe le status à CANCELLED
**And** l'événement invoice.payment_failed passe le status à PAST_DUE
**And** la signature Stripe est vérifiée (STRIPE_WEBHOOK_SECRET)

### Story 4.4 : Webhooks CinetPay

As a **système**,
I want les événements CinetPay soient traités,
So que les paiements CFA sont synchronisés.

**Acceptance Criteria:**

**Given** l'API route /api/cinetpay/webhook
**When** CinetPay envoie une confirmation de paiement
**Then** l'abonnement est activé en base
**And** le statut du paiement est mis à jour
**And** la signature CinetPay est vérifiée

### Story 4.5 : Gestion abonnements (upgrade/downgrade/cancel)

As a **membre**,
I want changer ou annuler mon abonnement,
So que j'ai le contrôle sur mon engagement.

**Acceptance Criteria:**

**Given** la page /settings
**When** je change de tier (upgrade ou downgrade)
**Then** le changement est effectif immédiatement (upgrade) ou en fin de période (downgrade)
**And** lorsque j'annule mon abonnement, il reste actif jusqu'à la fin de la période payée
**And** le status passe à CANCELLED après la date de fin

---

## Epic 5 : Espace Membre

Dashboard, profil éditable, et annuaire des membres.

### Story 5.1 : Dashboard Membre

As a **membre**,
I want un dashboard avec un résumé de mon activité,
So que j'ai une vue d'ensemble de mon espace.

**Acceptance Criteria:**

**Given** /dashboard
**When** je me connecte
**Then** je vois mon nom, mon tier, et mon statut d'abonnement
**And** je vois le nombre d'opportunités disponibles
**And** je vois les dernières opportunités publiées
**And** je vois les liens rapides vers profil, annuaire, opportunités

### Story 5.2 : Profil Membre

As a **membre**,
I want éditer mon profil,
So que les autres membres peuvent me connaître.

**Acceptance Criteria:**

**Given** /profile
**When** j'édite mon profil (nom, bio, avatar, téléphone, localisation, liens)
**Then** les changements sont sauvegardés
**And** mon avatar est uploadé et stocké
**And** la page profil publique est accessible aux autres membres

### Story 5.3 : Annuaire des Membres

As a **membre**,
I want parcourir les autres membres du club,
So que je peux identifier des partenaires potentiels.

**Acceptance Criteria:**

**Given** /members
**When** je consulte l'annuaire
**Then** je vois une liste paginée des membres actifs
**And** je peux filtrer par tier et localisation
**And** je peux cliquer sur un membre pour voir son profil
**And** les membres inactifs ne sont pas visibles

---

## Epic 6 : Opportunités

CRUD des opportunités avec processus de vérification.

### Story 6.1 : Liste des Opportunités

As a **membre**,
I want parcourir les opportunités disponibles,
So que je peux identifier des investissements ou partenariats.

**Acceptance Criteria:**

**Given** /opportunities
**When** je consulte la liste
**Then** je vois les opportunités vérifiées en priorité
**And** je peux filtrer par catégorie (Investissement, Business, Partenariat, Immobilier)
**And** je peux trier par date
**And** la liste est paginée (10 par page)
**And** chaque carte affiche : titre, catégorie, statut vérification, auteur

### Story 6.2 : Détail Opportunité

As a **membre**,
I want voir le détail complet d'une opportunité,
So que je peux évaluer si elle me convient.

**Acceptance Criteria:**

**Given** /opportunities/[id]
**When** j'accède au détail
**Then** je vois le titre, la description complète, la catégorie, le montant
**And** je vois le statut de vérification avec badge (Vérifié ✓ / En attente ⏳)
**And** je vois le profil de l'auteur
**And** je vois les documents attachés (si disponible pour mon tier)
**And** un CTA "Demander une mise en relation" est disponible

### Story 6.3 : Publication d'Opportunité

As a **membre**,
I want publier une opportunité business,
So que les autres membres peuvent la découvrir.

**Acceptance Criteria:**

**Given** /opportunities/new
**When** je remplit le formulaire (titre, description riche, catégorie, montant, documents)
**Then** l'opportunité est créée avec verificationStatus=PENDING
**And** je reçois une confirmation que l'opportunité est en attente de vérification
**And** je suis redirigé vers le détail de mon opportunité

### Story 6.4 : Processus de Vérification Admin

As a **admin**,
I want vérifier les opportunités soumises,
So que les membres ont confiance dans la qualité des opportunités.

**Acceptance Criteria:**

**Given** /admin/opportunities
**When** je consulte les opportunités en attente
**Then** je peux valider ou rejeter une opportunité
**And** en cas de rejet, je dois fournir un motif
**And** l'auteur est notifié du résultat

---

## Epic 7 : Administration

Panel admin basique pour gérer membres et opportunités.

### Story 7.1 : Dashboard Admin

As a **admin**,
I want un dashboard avec les métriques clés,
So que j'ai une vue d'ensemble de la plateforme.

**Acceptance Criteria:**

**Given** /admin
**When** je me connecte en tant qu'admin
**Then** je vois le nombre total de membres, par tier
**And** je vois le nombre d'abonnements actifs
**And** je vois le nombre d'opportunités en attente de vérification
**And** je vois les dernières inscriptions

### Story 7.2 : Gestion des Membres

As a **admin**,
I want gérer les comptes membres,
So que je peux modérer la communauté.

**Acceptance Criteria:**

**Given** /admin/members
**When** j'accède à la liste des membres
**Then** je peux voir le détail de chaque membre
**And** je peux changer le tier d'un membre
**And** je peux désactiver un compte
**And** la liste est filtrable et paginée

### Story 7.3 : Gestion des Opportunités

As a **admin**,
I want gérer les opportunités,
So que je peux contrôler la qualité du contenu.

**Acceptance Criteria:**

**Given** /admin/opportunities
**When** j'accède à la liste des opportunités
**Then** je peux filtrer par statut de vérification
**And** je peux valider/rejeter une opportunité avec motif
**And** je peux supprimer une opportunité
**And** la liste est paginée

---

## Epic 8 : UX, Performance & Polissage

Mode sombre/clair, responsive, SEO technique, accessibilité et optimisation performance.

### Story 8.1 : Mode Sombre/Clair

As a **utilisateur**,
I want basculer entre mode clair et sombre,
So que je suis confortable selon mon environnement.

**Acceptance Criteria:**

**Given** n'importe quelle page
**When** je clique le toggle thème
**Then** l'interface bascule entre mode clair et sombre
**And** la préférence est persistée dans localStorage
**And** la détection système (prefers-color-scheme) est appliquée par défaut
**And** le logo et les couleurs s'adaptent au thème

### Story 8.2 : Responsive Mobile-First

As a **utilisateur mobile**,
I want que l'interface s'adapte à mon écran,
So que je peux utiliser la plateforme sur téléphone.

**Acceptance Criteria:**

**Given** un écran de 375px
**When** je navigue sur la plateforme
**Then** toutes les pages sont lisibles et utilisables
**And** les tableaux utilisent des cards sur mobile
**And** la navigation utilise un hamburger/sheet menu
**And** les formulaires sont optimisés pour le clavier mobile

### Story 8.3 : SEO Technique

As a **moteur de recherche**,
I want que les meta tags et la structure soient optimisés,
So que les pages sont bien indexées.

**Acceptance Criteria:**

**Given** chaque page publique
**When** un crawler analyse la page
**Then** les meta tags (title, description) sont présents et pertinents
**And** les Open Graph tags sont configurés
**And** un sitemap.xml est généré
**And** un robots.txt est configuré
**And** les données structurées (JSON-LD) sont présentes sur la landing page

### Story 8.4 : Performance & Lighthouse

As a **développeur**,
I want que la plateforme atteigne un score Lighthouse > 90,
So que l'expérience utilisateur est optimale.

**Acceptance Criteria:**

**Given** la landing page en production
**When** on exécute un audit Lighthouse
**Then** le score Performance est > 90
**And** le score Accessibility est > 90
**And** le score Best Practices est > 90
**And** le FCP est < 1.5s
**And** les images sont en WebP avec lazy loading
**And** le code est split par route (dynamic imports)