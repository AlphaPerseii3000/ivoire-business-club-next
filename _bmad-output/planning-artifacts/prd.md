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
  - product-brief-ivoire-business-club.md
  - product-brief-ivoire-business-club-distillate.md
  - review-ivoire-business-club.md
  - "Business Club Presentation copie.md"
  - "NEW landing page.md"
workflowType: prd
---

# Document des Exigences Produit — Ivoire Business Club

**Auteur :** Jonathan
**Date :** 11 mai 2026
**Statut :** Complet

---

## 1. Résumé exécutif

Ivoire Business Club (IBC) est une plateforme web d'adhésion qui connecte la diaspora africaine d'Europe aux opportunités business en Côte d'Ivoire. Le MVP fournit : une landing page conversionnelle, un tunnel d'inscription avec paiement, un espace membre avec consultation de profil et d'opportunités, et un admin basique.

**Stack technique :** Next.js 15 + TypeScript + TailwindCSS 4 + Prisma + SQLite + Auth.js + Stripe/CinetPay

**Objectif commercial :** 100 membres payants en 6 mois, 65% rétention M1.

---

## 2. Vision produit

Investir ou entreprendre en Côte d'Ivoire ne s'improvise pas. IBC élimine l'opacité, la solitude et la friction en offrant un réseau de confiance, des opportunités vérifiées et un accompagnement structuré. La plateforme est le pont digital entre les ambitions de la diaspora et le marché ivoirien.

---

## 3. Critères de succès

| ID | Critère | Mesure | Objectif 6 mois |
|----|---------|--------|-----------------|
| SC-1 | Acquisition emails | landing→lead magnet | > 20% |
| SC-2 | Conversion trial→paid | trial→subscription | > 30% |
| SC-3 | Membres payants | count actif | 100+ |
| SC-4 | Rétention M1 | % still active month 2 | > 65% |
| SC-5 | Mises en relation | count réalisées | 50+ |
| SC-6 | Opportunités publiées | count sur plateforme | 30+ |
| SC-7 | Performance Lighthouse | score global | > 90 |
| SC-8 | Disponibilité | uptime | > 99.5% |

---

## 4. Parcours utilisateur

### 4.1 Parcours Visiteur → Membre (Conversion)

1. Le visiteur arrive sur la landing page (SEO, social, referral)
2. Découvre la proposition de valeur, les tiers, les témoignages
3. Télécharge le lead magnet (guide gratuit "Investir en CI 2026") → capture email
4. Reçoit email de bienvenue avec lien vers page tarifs
5. Clique "Rejoins le club" → sélection du tier → création de compte
6. Période d'essai 14 jours (accès lecture seule)
7. Paiement via Stripe (€) ou CinetPay (CFA/mobile money)
8. Accès complet à l'espace membre

### 4.2 Parcours Membre → Opportunité

1. Dashboard membre avec activité récente
2. Consulte les opportunités filtrées par catégorie/type
3. Consulte le détail d'une opportunité vérifiée
4. Consulte le profil du porteur de projet
5. Demande de mise en relation (formulaire ou via l'admin)

### 4.3 Parcours Porteur de projet → Publication

1. Dashboard membre → "Publier une opportunité"
2. Remplit le formulaire (titre, description, catégorie, montant, documents)
3. Soumission → en attente de vérification
4. Admin valide l'opportunité (grille de due diligence)
5. Publication visible par les autres membres

### 4.4 Parcours Admin

1. Login admin (/admin)
2. Dashboard : membres, abonnements, opportunités en attente
3. Valide/rejette les opportunités soumises
4. Gère les membres (liste, désactivation, changement de tier)

---

## 5. Modèle de domaine

### Entités principales

- **User** : id, email, name, avatar, tier (AFFRANCHI|GRAND_FRERE|BOSS), role (MEMBER|ADMIN), status (TRIAL|ACTIVE|PAST_DUE|CANCELLED), createdAt
- **Subscription** : id, userId, tier, period (MONTHLY|ANNUAL), provider (STRIPE|CINETPAY), providerRef, status, startDate, endDate
- **Opportunity** : id, authorId, title, description, category (INVESTMENT|BUSINESS|PARTNERSHIP|REAL_ESTATE), verificationStatus (PENDING|VERIFIED|REJECTED), verifiedAt, verifiedBy, createdAt
- **Payment** : id, userId, amount, currency (EUR|xOF), provider, providerRef, status, createdAt

### Relations

- User 1:N Subscription
- User 1:N Opportunity (author)
- User 1:N Payment
- Opportunity N:1 User (verifiedBy)

---

## 6. Innovation et différenciation

- **Double devise native** : pas de conversion, le membre choisit € ou CFA, deux passerelles de paiement différentes
- **Processus de vérification visible** : chaque opportunité affiche son statut de vérification et la grille appliquée — transparence comme feature
- **Cachet de conformité** : badge exclusive tier Boss sur les profils et opportunités vérifiées
- **Période d'essai 14j** : friction minimale d'entrée contrairement aux concurrents paywall immédiat

---

## 7. Typologie de projet

**Type :** Plateforme SaaS B2C avec freemium trial
**Complexité :** Modérée (CRUD + auth + paiements récurrents)
**Risque principal :** Adoption et rétention (network effects)

---

## 8. Périmètre MVP

### IN SCOPE (V1)

- **LP-01** Landing page complète (hero, mission, comment ça marche, pricing, footer)
- **LP-02** Lead magnet avec capture email
- **AUTH-01** Inscription email/password + Google OAuth
- **AUTH-02** Connexion/déconnexion
- **AUTH-03** Période d'essai 14 jours
- **SUB-01** Page de sélection du tier avec pricing mensuel/annuel
- **PAY-01** Intégration Stripe (€)
- **PAY-02** Intégration CinetPay (CFA/mobile money)
- **PAY-03** Gestion des abonnements récurrents (webhooks)
- **MEM-01** Dashboard membre (résumé, activité récente)
- **MEM-02** Profil membre (édition nom, bio, avatar, contacts)
- **MEM-03** Annuaire des membres (filtrable par tier, localisation)
- **OPP-01** Liste des opportunités (filtrable par catégorie, statut vérification)
- **OPP-02** Détail d'une opportunité
- **OPP-03** Publication d'une opportunité (formulaire)
- **OPP-04** Processus de vérification des opportunités (admin)
- **ADM-01** Dashboard admin basique (stats, membres, opportunités en attente)
- **ADM-02** Gestion CRUD des membres
- **ADM-03** Gestion CRUD des opportunités (validate/reject)
- **UX-01** Mode sombre/clair
- **UX-02** Responsive mobile-first
- **SEO-01** Meta tags, Open Graph, structured data
- **PERF-01** Lighthouse > 90

### OUT OF SCOPE (V1)

- App mobile native
- Messagerie temps réel intégrée
- Système de commission automatique
- Dashboard admin avancé (analytics, rapports)
- CRM intégré
- Multi-langue
- Service mandataire terrain
- Contenu éditorial (podcast, webinars)
- Intégration WhatsApp
- Notifications push

---

## 9. Exigences fonctionnelles

### LP — Landing Page

| ID | Exigence | Priorité |
|----|----------|----------|
| LP-01 | Afficher hero section avec titre, sous-titre, CTA principal | P0 |
| LP-02 | Afficher section "Notre mission" (4 points) | P0 |
| LP-03 | Afficher section "Comment ça marche" (3 étapes) | P0 |
| LP-04 | Afficher section "C'est pour toi si…" (3 profils) | P0 |
| LP-05 | Afficher tableau comparatif des 3 tiers avec prix € et CFA | P0 |
| LP-06 | Afficher section "Offre de lancement" (-50% annuel ou 1 mois offert mensuel) | P0 |
| LP-07 | Afficher section "Plonge au sein d'IBC" (chiffres-clés) | P1 |
| LP-08 | Lead magnet : formulaire email → download guide PDF | P0 |
| LP-09 | Footer avec contact, réseaux sociaux, mentions légales | P1 |

### AUTH — Authentification

| ID | Exigence | Priorité |
|----|----------|----------|
| AUTH-01 | Inscription email/password avec validation | P0 |
| AUTH-02 | Connexion email/password | P0 |
| AUTH-03 | Connexion Google OAuth | P1 |
| AUTH-04 | Déconnexion | P0 |
| AUTH-05 | Mot de passe oublié (reset par email) | P0 |
| AUTH-06 | Période d'essai 14 jours après inscription | P0 |
| AUTH-07 | Session persistante (cookie JWT) | P0 |

### SUB — Abonnements

| ID | Exigence | Priorité |
|----|----------|----------|
| SUB-01 | Page sélection tier (3 niveaux avec détails et prix) | P0 |
| SUB-02 | Choix périodicité (mensuel/annuel, 2 mois offerts annuel) | P0 |
| SUB-03 | Affichage prix en € et CFA | P0 |
| SUB-04 | Badge "Membre Fondateur" pour les 200 premiers annuels | P1 |

### PAY — Paiements

| ID | Exigence | Priorité |
|----|----------|----------|
| PAY-01 | Checkout Stripe pour paiements en € | P0 |
| PAY-02 | Checkout CinetPay pour paiements en CFA/mobile money | P0 |
| PAY-03 | Webhook Stripe : paiement réussi, échoué, abonnement annulé | P0 |
| PAY-04 | Webhook CinetPay : confirmation paiement | P0 |
| PAY-05 | Gestion downgrade/upgrade de tier | P1 |
| PAY-06 | Annulation d'abonnement | P0 |

### MEM — Espace Membre

| ID | Exigence | Priorité |
|----|----------|----------|
| MEM-01 | Dashboard avec résumé d'activité et stats personnelles | P0 |
| MEM-02 | Profil éditable (nom, bio, avatar, téléphone, localisation, liens) | P0 |
| MEM-03 | Annuaire des membres (recherche, filtres tier/localisation) | P0 |
| MEM-04 | Page détail d'un membre | P1 |
| MEM-05 | Demande de mise en relation (formulaire contact admin) | P1 |

### OPP — Opportunités

| ID | Exigence | Priorité |
|----|----------|----------|
| OPP-01 | Liste paginée avec filtres (catégorie, statut vérification, tri date) | P0 |
| OPP-02 | Page détail opportunité (titre, description, catégorie, documents, auteur, statut vérification) | P0 |
| OPP-03 | Formulaire de publication (titré, description riche, catégorie, montant, upload documents) | P0 |
| OPP-04 | Affichage badge vérification (Vérifié / En attente / Rejeté) | P0 |
| OPP-05 | Catégories : Investissement, Business, Partenariat, Immobilier | P0 |

### ADM — Administration

| ID | Exigence | Priorité |
|----|----------|----------|
| ADM-01 | Dashboard admin : comptes membres, abonnements actifs, opportunités en attente | P0 |
| ADM-02 | CRUD membres (liste, détail, changement tier, désactivation) | P0 |
| ADM-03 | CRUD opportunités (liste, validation/rejet avec motif) | P0 |
| ADM-04 | Accès restreint au rôle ADMIN | P0 |

---

## 10. Exigences non-fonctionnelles

### Performance

| ID | Exigence | Critère |
|----|----------|---------|
| NF-PERF-01 | Lighthouse Performance | > 90 |
| NF-PERF-02 | First Contentful Paint | < 1.5s |
| NF-PERF-03 | Time to Interactive | < 3s |
| NF-PERF-04 | Images optimisées | WebP/AVIF, lazy loading |

### Sécurité

| ID | Exigence | Critère |
|----|----------|---------|
| NF-SEC-01 | Mots de passe | Bcrypt, min 8 chars |
| NF-SEC-02 | Authentification | JWT HttpOnly cookie |
| NF-SEC-03 | CSRF | Protection Next.js native |
| NF-SEC-04 | Headers sécurité | CSP, X-Frame-Options, HSTS |
| NF-SEC-05 | Rate limiting | API endpoints (100 req/min) |
| NF-SEC-06 | Variables sensibles | .env, jamais dans le code |

### Disponibilité

| ID | Exigence | Critère |
|----|----------|---------|
| NF-AVAIL-01 | Uptime | > 99.5% |
| NF-AVAIL-02 | Monitoring | Health check endpoint |

### Compatibilité

| ID | Exigence | Critère |
|----|----------|---------|
| NF-COMP-01 | Navigateurs | Chrome, Firefox, Safari, Edge (2 dernières versions) |
| NF-COMP-02 | Appareils | Mobile (375px+), tablette (768px+), desktop (1024px+) |
| NF-COMP-03 | SEO | Meta tags, Open Graph, sitemap, robots.txt |

### Accessibilité

| ID | Exigence | Critère |
|----|----------|---------|
| NF-ACC-01 | WCAG 2.1 | Niveau AA minimum |
| NF-ACC-02 | Navigation clavier | Tous les éléments interactifs accessibles |

### Internationalisation

| ID | Exigence | Critère |
|----|----------|---------|
| NF-I18N-01 | Langue | V1 = français uniquement |
| NF-I18N-02 | Devises | Affichage € et CFA simultané |

---

## 11. Contraintes techniques

- **Framework** : Next.js 15 App Router, React Server Components
- **Langage** : TypeScript strict
- **Styling** : TailwindCSS 4
- **ORM** : Prisma (SQLite dev, PostgreSQL prod)
- **Auth** : Auth.js (NextAuth v5)
- **Paiement** : Stripe (€) + CinetPay (CFA)
- **Hébergement** : Infomaniak (Node.js 22+, déploiement SSH/rsync)
- **CI/CD** : GitHub Actions (lint + type-check + build)
- **Tests** : Vitest (unit), Playwright (E2E)