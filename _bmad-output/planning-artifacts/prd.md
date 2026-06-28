---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-02b-vision
  - step-02c-executive-summary
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-06-innovation
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
  - step-12-complete
inputDocuments:
  - product-brief.md
  - brainstorming-session-2026-05-12-ibc-product-vision.md
  - domain-research-2026-05-12-ibc-deep-dive.md
  - technical-feasibility-ibc-2026-05-12.md
  - market-ibc-ivoire-business-club-research-2026-05-12.md
  - prisma/schema.prisma
  - src/lib/auth.config.ts
  - src/lib/auth.ts
workflowType: prd
classification:
  projectType: Web Application (SaaS / Club Business Digital)
  domain: Fintech / Business Networking Diaspora
  complexity: High
  projectContext: brownfield
---

# Document de Spécifications Produit — IBC (Ivoire Business Club)

**Auteur :** Alphaperseii  
**Date :** 2026-05-12  
**Version :** 1.0  
**Statut :** Approuvé pour Phase 1 (M1–M3)  
**Langue :** Français — Produit destiné à la diaspora ivoirienne en Europe

---

## Table des matières

1. Résumé Exécutif
2. Vision Produit
3. Critères de Succès
4. Parcours Utilisateurs & Personas
5. Exigences Domaine (Trust & Compliance)
6. Patterns d'Innovation
7. Contexte Projet — Phase 1
8. Exigences Fonctionnelles (FR)
9. Exigences Non-Fonctionnelles (NFR)
10. Contexte Technique
11. Blockers P0 & Risques
12. Feuille de Route

---

## 1. Résumé Exécutif

IBC est le premier **opérateur de confiance informationnel** pour l'investisseur diaspora ivoirien en Europe. Il ne vend pas des opportunités — il vend la **réduction du risque perçu** à distance.

Chaque année, la diaspora ivoirienne (1,2 million de personnes dans 140 pays) transfère ~1,4 milliard USD vers la Côte d'Ivoire. Seulement 10 à 15 % de ces flux financent des projets productifs. Le reste alimente la consommation familiale — parce que la diaspora a peur : peur des arnaques immobilières, peur des doubles ventes de terrains, peur de ne pas pouvoir vérifier l'identité d'un porteur de projet à 6 000 km de distance.

IBC résout ce problème en combinant trois piliers inimitables à court terme :

1. **Infrastructure de confiance** : vérification graduée (bronze/argent/or), dossiers juridiques attachés, reviews post-deal.
2. **Matching qualifié + WhatsApp natif** : algorithme par tags (secteur, montant, localisation) + deep links `wa.me` sur chaque profil.
3. **Paiement simplifié par virement bancaire** : compte KS Investment (société ivoirienne), validation manuelle admin, zéro dépendance fournisseur de paiement tiers (Stripe/CinetPay retirés).

La plateforme est construite sur une stack moderne (Next.js 16, Prisma 7, Auth.js v5, TailwindCSS 4) avec un modèle à trois tiers : **Affranchis (€29/mo)** → **Grands Frères (€49/mo)** → **Boss (€99/mo)**.

**Pourquoi maintenant ?** Le gouvernement ivoirien a lancé en mai 2026 le forum « Diaspora for Growth » pour structurer l'investissement productif. IBC se positionne comme **l'interface privée opérationnalisant cette volonté publique**.

---

## 2. Vision Produit

### 2.1 Problème fondamental

La peur paralyse l'investissement diaspora. Sarah, 34 ans, infirmière à Paris, veut investir 20 000 € en immobilier à Abidjan. Elle trouve une annonce sur un groupe WhatsApp. Le promoteur lui envoie des photos. Elle hésite — elle n'a aucun moyen de vérifier le titre foncier, le registre du commerce, ou les antécédents du vendeur. Elle renonce. Son argent reste sur son Livret A à 2 %.

Ce scénario se répète des milliers de fois chaque jour. Les pain points sont structurels :

- **Arnaques endémiques** : faux agents immobiliers, doubles ventes de terrains, escroqueries sentimentales ciblant la diaspora
- **Asymétrie d'information** : l'investisseur à Paris ne peut pas vérifier sur place une opportunité à Abidjan
- **Confiance faible dans le digital** : les groupes Facebook/WhatsApp sont bruyants, non modérés, remplis de spam
- **Barrière bancaire** : payer un abonnement en ligne depuis l'étranger peut être bloquant — le virement bancaire est universel
- **Fracture numérique** : une partie de la cible n'est pas tech-savvy — l'UX doit être mobile-first et WhatsApp-native

### 2.2 Solution

IBC est un **club business digital à trois niveaux** qui transforme l'investissement à distance en expérience de confiance structurée.

- **Auth dual** : Google OAuth + credentials (bcryptjs), sécurisé par Auth.js v5 avec split config Edge/Node.js
- **Inscription & paiement** : virement bancaire sur le compte de KS Investment, validation manuelle par un admin après confirmation de réception — aucun provider de paiement tiers
- **Marketplace d'opportunités** : immobilier, business, investissement, partenariat — avec workflow de vérification
- **Système de tiers** : Affranchis (accès deals vérifiés) → Grands Frères (deals prioritaires, events) → Boss (deals exclusifs, mentorat 1-1)
- **Admin verification** : workflow kanban pour la modération des opportunités
- **Landing page** : promesse marketing alignée avec le produit technique

### 2.3 L'expérience de confiance

1. **Découverte** : deals teaser publics (titre + localisation) sur la landing — SEO organique, pas de paywall immédiat
2. **Vérification** : chaque deal affiche un niveau de confiance IBC (bronze/argent/or), un dossier juridique attaché (titre foncier, KYC promoteur), et un score de fiabilité
3. **Conversion** : onboarding (Google auth + choix tier + instructions virement bancaire KS Investment), activation après validation admin
4. **Networking** : matching basé sur tags (secteur, montant, localisation) + deep link WhatsApp sur chaque profil
5. **Post-deal** : reviews mutuelles investisseur/porteur, traçabilité réputationnelle, badge « Membre Platinum »

### 2.4 Ce qui nous différencie

1. **Trust Infrastructure** — le moat fondamental : aucun concurrent ne combine vérification multi-niveaux + dossier juridique attaché + reviews post-deal pour la zone CFA francophone.
2. **Matching + WhatsApp Native** : la culture WhatsApp en Afrique est un avantage local que les acteurs occidentaux ne maîtrisent pas.
3. **Paiement par virement bancaire** : élimine la dépendance aux providers tiers, réduit les frais, évite les complexités de webhook HMAC et de conformité PCI-DSS.
4. **Positionnement réglementaire clair** : IBC est explicitement un **intermédiaire informationnel**, pas financier. Nous ne touchons pas aux flux d'investissement.

---

## 3. Critères de Succès

### 3.1 North Star Metric

**Mises en relation qualifiées par mois** — c'est la meilleure mesure de la valeur créée par IBC. Un deal immobilier prend 6–18 mois. Une mise en relation qualifiée est le leading indicator immédiat.

### 3.2 KPIs par phase

- **Lancement (M1–M3)**
  - Taux de conversion onboarding → signup : > 40 %
  - Temps moyen de vérification d'un deal : < 48h
  - Taux de deals refusés (garantie qualité) : > 20 %

- **Croissance (M4–M9)**
  - MRR : > 3 000 €
  - Nombre de membres actifs payants : > 200
  - Taux de churn mensuel : < 3 %
  - Mises en relation qualifiées/mois : > 50

- **Maturité (M10–M18)**
  - NPS membres : > 40
  - CAC / LTV ratio : < 1:3
  - Expansion géographique : 3 pays UEMOA

---

## 4. Parcours Utilisateurs & Personas

### 4.1 Segment primaire — Sarah, l'investisseur diaspora novice
- **Profil** : Infirmière/employée à Paris, 20–40 k€ à investir, 20–45 ans
- **Besoin** : confiance absolue, traçabilité légale, accompagnement pas-à-pas
- **Offre IBC** : deals teaser, simulateur rentabilité, onboarding guidé, tier Affranchis (29 €/mois)
- **Parcours** : Découverte via SEO/groupe WhatsApp → landing page → inscription Google → choix tier Affranchis → virement bancaire KS Investment → activation admin → accès deals vérifiés → mise en relation via WhatsApp

### 4.2 Segment secondaire — Jean, l'investisseur avancé
- **Profil** : Entrepreneur en Suisse, capitaux importants, 35–55 ans
- **Besoin** : accès prioritaire, deals exclusifs, networking de haut niveau
- **Offre IBC** : deals Boss, booking 1-1 avec porteurs de projet, due diligence complète, tier Boss (99 €/mois)
- **Parcours** : Recommandation d'un membre → landing Boss → inscription → virement → accès deals exclusifs → rendez-vous structurés → investissement externe

### 4.3 Segment tertiaire — Koffi, le porteur de projet local
- **Profil** : Promoteur immobilier à Cocody, cherche des investisseurs externes
- **Besoin** : visibilité auprès de la diaspora, crédibilité
- **Offre IBC** : profil entreprise vérifié, upload pitch deck/business plan, visibilité payante
- **Parcours** : Découverte via événement IBC → création profil entreprise → upload documents KYC → soumission deal → workflow admin → publication deal → réception mises en relation

### 4.4 Segment quaternaire — Awa, la consultante chercheuse de partenaires
- **Profil** : Cadre en France, cherche des partenaires business import/export
- **Besoin** : matching ciblé, pas de broadcast
- **Offre IBC** : matching par tags secteur/localisation, demandes de mise en relation formelles, tier Grand Frère (49 €/mois)

---

## 5. Exigences Domaine (Trust & Compliance)

### 5.1 Statut d'intermédiaire non-financier

IBC ne touche pas aux flux d'investissement. Les transactions financières restent entre investisseur et porteur de projet, en dehors de la plateforme. Cela évite le statut d'établissement de paiement (très régulé en UEMOA) et protège l'entreprise juridiquement.

### 5.2 KYC & Vérification

- **KYC léger des membres** : identité, téléphone, localisation pour les membres (suffisant pour un club privé)
- **KYC renforcé des porteurs de projet** : national ID, registre du commerce, titre foncier pour les porteurs de projet
- **Vérification graduée des deals** :
  - **Bronze** : documents uploadés par le porteur
  - **Argent** : admin IBC a validé l'authenticité
  - **Or** : reviews positives, 3+ deals validés, double-vérification pour deals > 50 000 €

### 5.3 Conformité réglementaire CI/UEMOA

- **BCEAO** : Réglementation UEMOA sur l'émission de monnaie électronique (Instruction 008-05-2015)
- **CENTIF-CI** : Anti-blanchiment / lutte contre le financement du terrorisme — piste d'audit sur toutes les transactions d'abonnement
- **APDP** : Protection des données personnelles (Loi 2013-450) — consentement explicite requis
- **ARTCI** : Enregistrement SIM / télécoms

### 5.4 Playbook de vérification documenté

Un playbook public détaille les critères de vérification par catégorie de deal (immobilier vs business vs partenariat), assurant la transparence totale sur les critères et renforçant la confiance.

---

## 6. Patterns d'Innovation

### 6.1 Freemium inversé (Cat #27)

Les deals sont publics partiellement (teaser : titre + localisation), mais la mise en relation et le dossier complet sont payants. Les articles PUBLIC servent de levier de conversion gratuit : conseils investissement, guides juridiques, témoignages — les articles premium (visibilité tier) donnent un aperçu de la valeur réservée aux abonnés. Cela augmente le SEO organique et convertit par la preuve de valeur.

### 6.2 Crowd-due diligence future (Cat #28)

À moyen terme, la vérification sera collaborative : les membres Boss participent à la validation des deals, créant un effet de réseau vertueux et réduisant la charge opérationnelle admin.

### 6.3 Mur des succès (Cat #51)

Page publique affichant testimonials, deals closés, photos d'événements — renforce la preuve sociale et la crédibilité externe.

### 6.4 Engagement loop (Cat #52)

Newsletter hebdomadaire, rappel des opportunités matchées, renouvellement automatique avec bonus — réduit le churn et maintient l'engagement entre deux deals.

### 6.5 Badge « Membre Platinum » (Cat #42)

Équivalent digital du « Superhost » Airbnb : badge pour les membres avec 3+ deals validés et reviews 5★, renforçant la traçabilité réputationnelle.

---

## 7. Contexte Projet — Phase 1

### 7.1 IN (Phase 1 — M1–M3)

- Authentification dual (Google OAuth + credentials)
- Paiement par virement bancaire KS Investment avec validation manuelle admin
- Marketplace d'opportunités avec workflow de vérification (PENDING → VERIFIED → REJECTED)
- Système de tiers (Affranchis / Grands Frères / Boss)
- Deep links WhatsApp sur profils et deals
- Landing page avec deals teaser publics
- Dashboard admin minimal (kanban vérification, métriques MRR)
- CGV avec clause d'intermédiaire non-financier
- Niveaux de confiance gradués (bronze/argent/or)
- Upload de dossiers juridiques par deal
- Système de reviews mutuelles post-deal
- Onboarding guidé 3 clics
- Matching basique par tags (secteur, montant, localisation)
- Mur des succès (page statique)

### 7.2 OUT (Phase 1)

- Matching algorithmique avancé (ML) → MVP par tags + scoring simple
- App mobile native → PWA future, responsive web pour le MVP
- Intégration WhatsApp Business API → deep links wa.me uniquement
- Crowd-due diligence communautaire → admin vérification seule pour lancer
- Impact tracking ESG → nice-to-have à 12 mois
- Simulateur de rentabilité immobilier → lien externe ou Phase 2
- Système de booking 1-1 → Phase 2

---

## 8. Exigences Fonctionnelles (FR)

### 8.1 Authentification & Gestion des Utilisateurs

- **FR1** : Un visiteur peut s'inscrire via Google OAuth en un clic
- **FR2** : Un visiteur peut s'inscrire avec email + mot de passe (bcryptjs)
- **FR3** : Un utilisateur connecté peut consulter et modifier son profil (nom, bio, téléphone, localisation, pays)
- **FR4** : Un utilisateur connecté peut supprimer son compte (RGPD)
- **FR5** : Le système distingue les rôles MEMBER et ADMIN
- **FR6** : Le système attribue un tier par défaut (AFFRANCHI) à l'inscription
- **FR7** : L'admin peut lister, suspendre ou réactiver un compte utilisateur

### 8.2 Tiers & Abonnements

- **FR8** : Un membre peut visualiser les trois tiers (Affranchis, Grands Frères, Boss) et leurs avantages
- **FR9** : Un membre peut sélectionner un tier et recevoir les instructions de virement bancaire (RIB KS Investment, montant, référence)
- **FR10** : Le système crée un abonnement en statut TRIAL à la soumission du virement
- **FR11** : L'admin peut valider manuellement un abonnement après confirmation de réception du virement (passage TRIAL → ACTIVE)
- **FR12** : L'admin peut refuser ou suspendre un abonnement avec justification
- **FR13** : Le membre reçoit un email de confirmation une fois son abonnement activé
- **FR14** : Le système bloque l'accès aux contenus premium si l'abonnement est CANCELLED ou PAST_DUE

### 8.3 Marketplace d'Opportunités

- **FR15** : Un porteur de projet (membre ou admin) peut soumettre une opportunité (titre, description, catégorie, montant, documents)
- **FR16** : Le système attribue un statut de vérification PENDING par défaut à chaque nouvelle opportunité
- **FR17** : L'admin peut modifier le statut d'une opportunité (PENDING → VERIFIED → REJECTED) via un workflow kanban
- **FR18** : Une opportunité REJECTED est visible uniquement par son auteur et les admins
- **FR19** : Une opportunité VERIFIED est visible par les membres selon leur tier (filtrage par visibilité)
- **FR20** : Les opportunités teaser (titre + localisation) sont publiquement visibles sans connexion
- **FR21** : Le système affiche le niveau de confiance IBC (bronze/argent/or) sur chaque deal
- **FR22** : Le système exige une double-vérification admin pour les deals > 50 000 €
- **FR23** : Un membre peut consulter le dossier juridique attaché à une opportunité (titre foncier, KYC promoteur)

### 8.4 Networking & Matching

- **FR24** : Chaque profil membre affiche un bouton « Discuter sur WhatsApp » (deep link wa.me)
- **FR25** : Chaque opportunité affiche un bouton « Contacter le porteur sur WhatsApp »
- **FR26** : Les membres peuvent ajouter des tags à leur profil (secteur, montant recherché, localisation)
- **FR27** : Les opportunités peuvent être taguées (secteur, montant, localisation)
- **FR28** : Le système propose un matching basique entre profils et opportunités basé sur les tags communs
- **FR29** : Un membre peut marquer son intérêt (soft commitment) sur un deal
- **FR30** : Le système notifie l'auteur d'une opportunité lorsqu'un membre manifeste son intérêt

### 8.5 Reviews & Réputation

- **FR31** : Après une mise en relation conclue, l'investisseur et le porteur de projet peuvent se laisser mutuellement une review (note + commentaire)
- **FR32** : Le système calcule un score de fiabilité IBC par membre et par porteur de projet
- **FR33** : Le système attribue automatiquement le badge « Membre Platinum » après 3+ deals validés et reviews moyennes ≥ 4,5/5
- **FR34** : Les reviews sont visibles sur le profil public du membre

### 8.6 Administration & Back-office

- **FR35** : L'admin visualise un tableau de bord kanban des opportunités à vérifier (à faire / en cours / validé / refusé)
- **FR36** : L'admin consulte les métriques clés : MRR, nombre de membres actifs, taux de conversion onboarding, taux de churn
- **FR37** : L'admin peut uploader ou consulter les documents juridiques attachés à une opportunité
- **FR38** : L'admin peut éditer ou supprimer une opportunité publiée
- **FR39** : Le système logue toutes les actions d'admin (piste d'audit pour compliance)
- **FR40** : L'admin peut envoyer un email de confirmation de virement à un membre

### 8.7 Landing & Contenu Éditorial

- **FR41** : La landing page affiche les deals teaser publics sans connexion
- **FR42** : La landing page présente les trois tiers avec leurs avantages et prix
- **FR43** : La landing page affiche le mur des succès (testimonials, deals closés)
- **FR44** : Le site est entièrement en français
- **FR45** : Le site est responsive et mobile-first
- **FR46** : L'admin peut créer, éditer et publier des articles (titre, extrait, contenu riche, catégorie, visibilité)
- **FR47** : L'admin peut définir la visibilité d'un article : PUBLIC (tous), AFFRANCHI, GRAND_FRERE, BOSS
- **FR48** : Un visiteur non connecté peut consulter les articles publics (visibilité PUBLIC)
- **FR49** : Un membre connecté peut consulter les articles dont la visibilité correspond à son tier ou inférieur
- **FR50** : Un membre sans abonnement actif voit les articles PUBLIC uniquement, avec un CTA d'upgrade pour les articles premium
- **FR51** : Les articles sont accessibles via /articles (catalogue) et /articles/[slug] (détail), optimisés pour le SEO
- **FR52** : Un membre connecté peut réagir à un article publié en choisissant parmi plusieurs types de réactions (LIKE, CLAP, INSIGHTFUL). Cliquer à nouveau retire la réaction (toggle).
- **FR53** : Le système comptabilise et affiche le nombre de réactions par type sur la page de détail de l'article en temps réel.
- **FR54** : L'administrateur dispose d'un éditeur de texte riche ou Markdown interactif doté d'une barre d'outils (Titres, Gras, Italique, Listes) et d'une prévisualisation en temps réel pour créer/modifier des articles. Les articles sont stockés sous format Markdown valide dans la base de données.
- **FR55** : Les membres connectés ayant un abonnement actif peuvent lire et publier des commentaires sous les articles. L'accès est bloqué pour les visiteurs anonymes et les abonnements inactifs.
- **FR56** : L'administrateur peut associer un article à une opportunité existante. L'article affiche l'opportunité via le composant `DealCard` sous réserve que l'utilisateur ait le tier requis pour cette opportunité.
- **FR57** : Les articles affichent des boutons de partage sur les réseaux sociaux (WhatsApp, LinkedIn, Twitter/X, Email, Copier le lien) utilisant des URLs de partage propres et dynamiques.

### 8.8 Analytics & Observabilité

- **FR64** : Le système tracke automatiquement les vues de pages et clics utilisateurs (autocapture PostHog)
- **FR65** : Le système identifie les utilisateurs connectés (userId, tier, role) dans PostHog pour segmenter l'analytics
- **FR66** : Le système tracke les événements métier clés : inscription, sélection tier, soumission opportunité, upload document, manifestation intérêt, lecture article

### 8.9 Support Bêta & Feedback

- **FR73** : La plateforme affiche un bouton flottant en bas à gauche sur toutes les pages, permettant d'ouvrir une fenêtre de chat de support. Le chat indique clairement que la plateforme est en phase bêta.
- **FR74** : Un membre connecté peut soumettre un message via le chat de support (bug technique, problème d'accessibilité, demande d'intégration). Le système envoie un auto-acknowledgement immédiat confirmant la réception.
- **FR75** : Les messages de chat sont stockés en base de données et accessibles via une API authentifiée. Un agent externe (Hermes) peut lire les messages non traités et y répondre via une API sécurisée par token.
- **FR76** : Chaque message de chat reçu est automatiquement ajouté à la to-do liste permanente du système de support (Hermes), permettant le suivi et la traitement des demandes.

---

## 9. Exigences Non-Fonctionnelles (NFR)

### 9.1 Performance

- **NFR-P1** : Temps de chargement initial de la landing page < 2 s sur connexion 3G
- **NFR-P2** : Temps de réponse des API protégées < 500 ms (p95)
- **NFR-P3** : Temps de réponse Auth.js (signin/session) < 300 ms
- **NFR-P4** : Le build Next.js standalone doit être < 100 Mo

### 9.2 Sécurité

- **NFR-S1** : Toutes les communications sont en HTTPS avec HSTS
- **NFR-S2** : Les mots de passe sont hashés avec bcryptjs (coût ≥ 10)
- **NFR-S3** : Rate limiting sur `/api/auth/signup` : 5 inscriptions/minute/IP
- **NFR-S4** : Rate limiting sur `/api/auth/signin` : 10 tentatives/minute/IP
- **NFR-S5** : Middleware Auth.js actif sur toutes les routes protégées (`/dashboard`, `/admin`, `/api/*` sensibles)
- **NFR-S6** : Protection CSRF native sur toutes les routes Auth.js
- **NFR-S7** : Headers de sécurité : Content-Security-Policy, X-Frame-Options, X-Content-Type-Options
- **NFR-S8** : Pas de données sensibles en clair dans les logs
- **NFR-S9** : Piste d'audit sur toutes les transactions d'abonnement et mises en relation

### 9.3 Scalabilité

- **NFR-SC1** : Support de 500 membres actifs simultanés en Phase 1
- **NFR-SC2** : Architecture prévue pour 2 000 membres sans refonte majeure
- **NFR-SC3** : DB PostgreSQL en production (remplace SQLite avant déploiement)

### 9.4 Accessibilité

- **NFR-A1** : Conformité WCAG 2.1 niveau AA pour les parcours critiques (onboarding, paiement, consultation deal)
- **NFR-A2** : Support du mode sombre via TailwindCSS
- **NFR-A3** : Textes en français adaptés à un public non technique

### 9.5 Déploiement & Fiabilité

- **NFR-D1** : Configuration `output: 'standalone'` dans next.config.ts
- **NFR-D2** : Déploiement sur VPS Infomaniak (Ubuntu 24.04) avec PM2 cluster
- **NFR-D3** : Nginx reverse proxy avec cache des assets statiques (1 an)
- **NFR-D4** : SSL Let's Encrypt avec renouvellement automatique (Certbot)
- **NFR-D5** : Scripts de déploiement automatisés (`prepare-deploy.sh`, `ecosystem.config.js`)
- **NFR-D6** : Logs PM2 rotatifs et centralisés

### 9.6 Intégration & Compatibilité

- **NFR-I1** : Deep links WhatsApp fonctionnels sur mobile et desktop (`https://wa.me/<numéro>`)
- **NFR-I2** : Emails transactionnels envoyés via Resend ou SendGrid
- **NFR-I3** : Stockage des documents juridiques sur Cloudflare R2 (pas de frais de sortie)

---

## 10. Contexte Technique

### 10.1 Stack actuelle

| Composant | Version | État |
|-----------|---------|------|
| Next.js | 16.2.6 | ✅ Moderne — App Router + RSC |
| React | 19.2.4 | ✅ Moderne |
| Prisma | 7.8.0 | ✅ Moderne — client + adapter pattern |
| Auth.js | 5.0.0-beta.31 | ⚠️ Beta — split config OK, middleware manquant |
| TailwindCSS | 4.x | ✅ OK |
| better-sqlite3 | 12.9.0 | ⚠️ Dev only — migrer vers PostgreSQL en prod |

### 10.2 Architecture Auth.js v5 (Split Config)

- `auth.config.ts` : Config Edge-compatible (pas de Prisma, pas de bcrypt), utilisée pour middleware
- `auth.ts` : Instance complète Node.js avec PrismaAdapter + Credentials provider + bcrypt
- **Action requise** : créer `src/middleware.ts` qui instancie Auth.js with `authConfig`

### 10.3 Modèle de données (Prisma)

Les modèles clés existants : `User`, `Account`, `Session`, `VerificationToken`, `Subscription`, `Opportunity`, `Payment`.

Enums : `Tier` (AFFRANCHI, GRAND_FRERE, BOSS), `UserRole` (MEMBER, ADMIN), `SubscriptionStatus`, `OpportunityCategory`, `VerificationStatus`.

**Champs critiques** : `country` sur `User` (prêt pour l'expansion UEMOA), `verificationStatus` sur `User` et `Opportunity`.

---

## 11. Blockers P0 & Risques

### 11.1 Blockers P0 à résoudre avant production

1. **Auth.js middleware absent** : `auth.config.ts` existe avec `authorized` callback, mais aucun fichier `middleware.ts` n'instancie Auth.js. Risque : accès non autorisé aux routes protégées.
2. **Rate limiting API** : aucune protection sur `/api/auth/signup`. Risque : brute-force account creation.
3. **Configuration déploiement manquante** : pas de `output: 'standalone'` dans `next.config.ts`, pas de PM2 ecosystem. Risque : déploiement Infomaniak bloqué.
4. **Stripe & CinetPay retirés** : le paiement par virement bancaire KS Investment élimine tout besoin de webhook de paiement. Les fichiers `cinetpay.ts` et `stripe.ts` doivent être retirés du codebase.

### 11.2 Risques métier & mitigation

| Risque | Probabilité | Impact | Mitigation |
|--------|------------|--------|-----------|
| Arnaque passe la vérification IBC | Moyenne | Critique | Double-vérification >50 k€, clause de non-responsabilité, playbook public |
| Régulation intermédiaire financier | Faible | Majeur | CGV claires : IBC = opérateur informationnel, pas financier |
| Churn élevé post-abonnement | Moyenne | Majeur | Engagement loop, newsletter, events, renouvellement avec bonus |
| Concurrence Diaspo4Africa | Moyenne | Majeur | Spécificité CI/UEMOA, WhatsApp natif, Trust Infrastructure comme moat |
| Fracture numérique cible | Moyenne | Moyen | UX mobile-first, onboarding guidé, support WhatsApp humain |
| Petit équipe technique | Haute | Moyen | PWA pas app native, matching par règles pas IA, no-code où possible |

---

## 12. Feuille de Route

### 12.1 Semaine 1 — Sécurité & stabilité

- [ ] Créer `src/middleware.ts` avec `NextAuth(authConfig)`
- [ ] Installer `@upstash/ratelimit`, protéger `/api/auth/signup` (5/min/IP)
- [ ] Retirer Stripe + CinetPay du codebase et des dépendances
- [ ] Implémenter le workflow de virement bancaire (RIB KS Investment, page instructions, validation admin)

### 12.2 Semaine 2 — Préparation déploiement

- [ ] Ajouter `output: 'standalone'` dans `next.config.ts`
- [ ] Créer `prepare-deploy.sh` + `ecosystem.config.js`
- [ ] Migrer SQLite → PostgreSQL
- [ ] Tester build + déploiement local

### 12.3 Semaine 3–4 — Trust Infrastructure minimale

- [ ] Implémenter les niveaux de confiance gradués (bronze/argent/or)
- [ ] Créer le workflow kanban admin pour vérification des opportunités
- [ ] Ajouter l'upload de documents juridiques par deal
- [ ] Rédiger les CGV avec clause d'intermédiaire non-financier

### 12.4 Semaine 5–6 — Activation Network Effect

- [ ] Deep links WhatsApp sur tous les profils et deals
- [ ] Système de tags profil + deal + filtrage
- [ ] Matching basique (règles + scoring)
- [ ] Mur des succès (page statique + CMS léger)

### 12.5 Semaine 7–8 — Lancement & Analytics

- [ ] Onboarding guidé 3 clics
- [ ] Intégration PostHog pour l'analytics comportemental (Epic 19)
- [ ] Chat de Support Beta & Feedback Membres avec intégration Hermes (Epic 18)
- [ ] Newsletter hebdo + emails transactionnels
- [ ] 5 premiers deals vérifiés et publiés

---

*Document de Spécifications Produit IBC v1.1 — Mis à jour le 2026-06-28 avec Epic 18 (Support Chat Beta) et Epic 19 (PostHog Analytics).*
