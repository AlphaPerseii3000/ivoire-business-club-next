# Product Brief : IBC (Ivoire Business Club)

---
title: "Product Brief: ibc"
status: "complete"
created: "2026-05-12"
updated: "2026-05-12"
inputs:
  - brainstorming-session-2026-05-12-ibc-product-vision.md
  - domain-research-2026-05-12-ibc-deep-dive.md
  - market-ibc-ivoire-business-club-research-2026-05-12.md
  - technical-feasibility-ibc-2026-05-12.md
  - prisma/schema.prisma
  - src/lib/stripe.ts
  - src/lib/cinetpay.ts
  - src/lib/auth.config.ts
  - src/lib/auth.ts
---

## Résumé Exécutif

IBC est le premier opérateur de confiance informationnel pour l'investisseur diaspora ivoirien en Europe. Il ne vend pas des opportunités — il vend la **réduction du risque perçu** à distance.

Chaque année, la diaspora ivoirienne (1,2 million de personnes dans 140 pays) transfère ~1,4 milliard USD vers la Côte d'Ivoire. Pourtant, seulement 10 à 15 % de ces flux financent des projets productifs. Le reste alimente la consommation familiale — parce que la diaspora a peur. Peur des arnaques immobilières, peur des doubles ventes de terrains, peur de ne pas pouvoir vérifier l'identité d'un porteur de projet à 6 000 km de distance.

IBC résout ce problème en combinant trois piliers inimitables à court terme : une **infrastructure de confiance** (vérification graduée, dossiers juridiques attachés, reviews post-deal), un **matching qualifié + WhatsApp natif** (algorithme par tags + deep links wa.me), et un **paiement dual EUR/XOF** (Stripe pour la diaspora, CinetPay mobile money pour le local). La plateforme est construite sur une stack moderne (Next.js 16, Prisma 7, Auth.js v5) avec un modèle à trois tiers : Affranchis, Grands Frères, Boss.

**Pourquoi maintenant ?** Le gouvernement ivoirien a lancé en mai 2026 le forum « Diaspora for Growth » pour structurer l'investissement productif. IBC se positionne comme **l'interface privée opérationnalisant cette volonté publique**.

---

## Le Problème

### La peur paralyse l'investissement diaspora

Sarah, 34 ans, infirmière à Paris, veut investir 20 000 € en immobilier à Abidjan. Elle trouve une annonce sur un groupe WhatsApp. Le promoteur lui envoie des photos. Elle hésite — elle n'a aucun moyen de vérifier le titre foncier, le registre du commerce, ou les antécédents du vendeur. Elle renonce. Son argent reste sur son Livret A à 2 %.

Ce scénario se répète des milliers de fois chaque jour. Les pain points sont structurels :

1. **Arnaques endémiques** : faux agents immobiliers, doubles ventes de terrains, escroqueries sentimentales ciblant la diaspora
2. **Asymétrie d'information** : l'investisseur à Paris ne peut pas vérifier sur place une opportunité à Abidjan
3. **Confiance faible dans le digital** : les groupes Facebook/WhatsApp sont bruyants, non modérés, remplis de spam
4. **Barrière bancaire** : payer un abonnement en ligne depuis la diaspora peut être bloquant (carte requise, suspicion de fraude bancaire)
5. **Fracture numérique** : une partie de la cible n'est pas tech-savvy — l'UX doit être mobile-first et WhatsApp-native

### Le coût du statu quo

> 1,2 milliard USD de transferts annuels. Seulement 10–15 % productifs. **Plus d'1 milliard USD par an non investi** — non par manque de volonté, mais par manque de confiance.

---

## La Solution

IBC est un club business digital à trois niveaux qui transforme l'investissement à distance en expérience de confiance structurée.

### Ce que nous construisons

Une plateforme Next.js 16 (App Router, React 19, Tailwind 4, Prisma 7) avec :

- **Auth dual** : Google OAuth + credentials (bcryptjs), sécurisé par Auth.js v5 avec split config Edge/Node.js
- **Paiement dual** : Stripe (EUR, diaspora Europe) + CinetPay (XOF, mobile money local)
- **Marketplace d'opportunités** : immobilier, business, investissement, partenariat — avec workflow de vérification
- **Système de tiers** : Affranchis (accès deals vérifiés) → Grands Frères (deals prioritaires, events) → Boss (deals exclusifs, mentorat 1-1)
- **Admin verification** : workflow kanban pour la modération des opportunités
- **Landing page** : promesse marketing alignée avec le produit technique

### L'expérience de confiance

1. **Découverte** : deals teaser publics (titre + localisation) sur la landing — SEO organique, pas de paywall immédiat
2. **Vérification** : chaque deal affiche un niveau de confiance IBC (bronze/argent/or), un dossier juridique attaché (titre foncier, KYC promoteur), et un score de fiabilité
3. **Conversion** : onboarding en 3 clics (Google auth + choix tier + paiement CinetPay ou Stripe)
4. **Networking** : matching basé sur tags (secteur, montant, localisation) + deep link WhatsApp sur chaque profil
5. **Post-deal** : reviews mutuelles investisseur/porteur, traçabilité réputationnelle, badge « Membre Platinum »

---

## Ce Qui Nous Différencie

### 1. Trust Infrastructure — le moat fondamental

Aucun concurrent ne combine vérification multi-niveaux + dossier juridique attaché + reviews post-deal pour la zone CFA francophone. C'est le pilier le plus difficile à copier car il demande une discipline opérationnelle et une réputation accumulée.

- **Vérification graduée** : bronze (documents uploadés) → argent (admin validé) → or (reviews positives, 3+ deals validés)
- **Double-vérification** obligatoire pour les deals > 50 000 €
- **Playbook de vérification** documenté et public — transparence totale sur les critères

### 2. Matching + WhatsApp Native

La culture WhatsApp en Afrique est un avantage local que les acteurs occidentaux ne maîtrisent pas. Chaque profil et chaque deal dispose d'un bouton « Discuter sur WhatsApp » (wa.me). Le matching par tags (secteur, montant, localisation) est culturellement plus naturel qu'un algorithme black-box.

### 3. Paiement Dual EUR/XOF

La diaspora paie en EUR via Stripe (abonnements récurrents, factures PDF, SCA-compliant). Les porteurs de projet locaux paient en XOF via CinetPay (mobile money, USSD fallback). Cette dualité est unique sur le créneau.

### 4. Positionnement réglementaire clair

IBC est explicitement un **intermédiaire informationnel**, pas financier. Nous ne touchons pas aux flux d'investissement. Cela évite le statut d'établissement de paiement (très régulé en UEMOA) et protège l'entreprise juridiquement.

---

## Qui Nous Servons

### Segment primaire — Sarah, l'investisseur diaspora novice
- Infirmière/employée à Paris, 20–40 k€ à investir
- Besoin : confiance absolue, traçabilité légale, accompagnement pas-à-pas
- Offre : deals teaser, simulateur rentabilité, onboarding guidé, tier Affranchis (29 €/mois)

### Segment secondaire — Jean, l'investisseur avancé
- Entrepreneur en Suisse, capitaux importants
- Besoin : accès prioritaire, deals exclusifs, networking de haut niveau
- Offre : deals Boss, booking 1-1 avec porteurs de projet, due diligence complète, tier Boss (99 €/mois)

### Segment tertiaire — Koffi, le porteur de projet local
- Promoteur immobilier à Cocody, cherche des investisseurs externes
- Besoin : visibilité auprès de la diaspora, crédibilité
- Offre : profil entreprise vérifié, upload pitch deck/business plan, visibilité payante

---

## Critères de Succès

### North Star Metric
**Mises en relation qualifiées par mois** — c'est la meilleure mesure de la valeur créée par IBC. Un deal immobilier prend 6–18 mois. Une mise en relation qualifiée est le leading indicator immédiat.

### KPIs par phase

| Phase | KPI | Cible |
|-------|-----|-------|
| Lancement (M1-M3) | Taux de conversion onboarding → signup | > 40 % |
| | Temps moyen de vérification d'un deal | < 48h |
| | Taux de deals refusés (garantie qualité) | > 20 % |
| Croissance (M4-M9) | MRR | > 3 000 € |
| | Nombre de membres actifs payants | > 200 |
| | Taux de churn mensuel | < 3 % |
| | Mises en relation qualifiées/mois | > 50 |
| Maturité (M10-M18) | NPS membres | > 40 |
| | CAC / LTV ratio | < 1:3 |
| | Expansion géographique | 3 pays UEMOA |

---

## Périmètre

### Ce qui est IN pour la Phase 1 (M1-M3)

- Authentification dual (Google OAuth + credentials)
- Paiement dual Stripe + CinetPay avec webhooks sécurisés
- Marketplace d'opportunités avec workflow de vérification (PENDING → VERIFIED → REJECTED)
- Système de tiers (Affranchis / Grands Frères / Boss)
- Deep links WhatsApp sur profils et deals
- Landing page avec deals teaser publics
- Dashboard admin minimal (kanban vérification, métriques MRR)
- CGV avec clause d'intermédiaire non-financier

### Ce qui est OUT pour la Phase 1

- Matching algorithmique avancé (ML) → MVP par tags + scoring simple
- App mobile native → PWA future, responsive web pour le MVP
- Intégration WhatsApp Business API → deep links wa.me uniquement
- Crowd-due diligence communautaire → admin vérification seule pour lancer
- Impact tracking ESG → nice-to-have à 12 mois

### Blocages P0 à résoudre avant production

1. **CinetPay HMAC** : la vérification de signature webhook est un placeholder (`return true`). Risque : fraude par notification spoofing. Action : implémenter `crypto.createHmac("sha256", secretKey)` + idempotence sur `providerRef`.
2. **Rate limiting API** : aucune protection sur `/api/auth/signup`. Risque : brute-force account creation. Action : installer `@upstash/ratelimit` (5 inscriptions/minute/IP).
3. **Auth.js middleware absent** : `auth.config.ts` existe mais aucun `middleware.ts` n'instancie Auth.js. Risque : accès non autorisé aux routes protégées. Action : créer `src/middleware.ts` avec `NextAuth(authConfig)`.
4. **Configuration déploiement manquante** : pas de `output: 'standalone'` dans `next.config.ts`, pas de PM2 ecosystem. Risque : déploiement Infomaniak bloqué. Action : configurer standalone + scripts `ecosystem.config.js` + `prepare-deploy.sh`.

### Prérequis technique immédiats (Semaine 1)

- [ ] HMAC CinetPay + idempotence webhook
- [ ] Rate limiting signup
- [ ] Middleware Auth.js
- [ ] `output: 'standalone'` + scripts déploiement

---

## Vision

### À 12 mois
IBC est le club business de référence pour la diaspora ivoirienne en Europe. 200 membres payants, 50+ mises en relation qualifiées par mois, taux de churn < 3 %. La Trust Infrastructure est opérationnelle : workflow admin kanban, vérification graduée, reviews post-deal.

### À 24 mois
Expansion aux autres pays UEMOA (Sénégal, Cameroun, Gabon) via le champ `country` déjà présent dans le schéma. Introduction du crowd-due diligence : les membres Boss participent à la vérification. PWA avec push notifications. Programme de parrainage actif.

### À 36 mois
IBC devient le standard de confiance pour l'investissement diaspora en zone CFA francophone. Potentiel partenariat avec « Diaspora for Growth » gouvernemental ou émission d'obligations diaspora. Tokenisation d'actifs africains pour investissement fractionné.

---

## Compliance & Réglementaire

- **Statut d'intermédiaire non-financier** : IBC ne touche pas aux flux d'investissement. Les transactions financières restent entre investisseur et porteur de projet, en dehors de la plateforme.
- **KYC léger** : identité, téléphone, localisation pour les membres (suffisant pour un club privé).
- **KYC renforcé** : national ID, registre du commerce, titre foncier pour les porteurs de projet.
- **Piste d'audit** : toutes les transactions d'abonnement et les mises en relation sont loguées pour compliance future-proof (Loi 2013-450 APDP, CENTIF-CI AML).

---

## Notes sur la Stack Technique

| Composant | Version | État |
|-----------|---------|------|
| Next.js | 16.2.6 | ✅ Moderne — App Router + RSC |
| React | 19.2.4 | ✅ Moderne |
| Prisma | 7.8.0 | ✅ Moderne — client + adapter pattern |
| Auth.js | 5.0.0-beta.31 | ⚠️ Beta — split config OK, middleware manquant |
| Stripe | 22.1.1 | ✅ Webhook HMAC vérifié correctement |
| CinetPay | API v2 | 🔴 Bloquant — HMAC non implémenté |
| TailwindCSS | 4.x | ✅ OK |
| better-sqlite3 | 12.9.0 | ⚠️ Dev only — migrer vers PostgreSQL en prod |

**Architecture cible** : VPS Cloud Infomaniak (Ubuntu 24.04), PM2 cluster, Nginx reverse proxy, PostgreSQL managed (Supabase/Railway pour le MVP). Migration SQLite → PostgreSQL requise avant production.

---

*Brief produit IBC — synthèse des recherches brainstorming, domaine, marché et faisabilité technique. Prochaine étape BMAD recommandée : `bmad-create-prd`.*
