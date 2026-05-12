# Product Brief Distillate: ibc

---
title: "Product Brief Distillate: ibc"
type: llm-distillate
source: "product-brief.md"
created: "2026-05-12"
purpose: "Token-efficient context for downstream PRD creation"
---

## Rejected Ideas & Pourquoi

- **App mobile native** → PWA/responsive web suffit pour MVP (contrainte imaginaire éliminée). Le segment cible utilise mobile money à 37,89 % mais sur navigateur mobile, pas via apps stores.
- **Intégration WhatsApp Business API** → Commencer par deep links `wa.me` simples (contrainte imaginaire éliminée). L'API Business est complexe à certifier ; les liens directs couvrent 80 % du besoin MVP.
- **Matching AI complexe** → Matching basé sur règles + tags suffit pour 0–500 membres (contrainte imaginaire éliminée). Pas de ROI ML avant 500+ membres actifs.
- **Panier de prix complexe (annual/mensuel comparé)** → 1 CTA par tier pour éviter le paradoxe du choix (SCAMPER Eliminate).
- **Carte bancaire obligatoire pour tiers bas** → CinetPay-only onboarding pour Affranchis (SCAMPER Eliminate). La diaspora africaine utilise mobile money 4,5× plus que les banques.
- **Paiement par virement bancaire pour Boss** → reporté post-MVP. Le virement est utile pour les montants annuels élevés mais nécessite une facturation PDF + numérotation automatique.

## Requirements Hints Capturés

- **Dossier juridique par opportunité** : titre foncier, KYC promoteur, registre du commerce, contrat type — prérequis absolu pour l'immobilier (domain research)
- **Système de reviews mutuelles post-deal** : équivalent digital des tontines (réputation sociale réciproque) — culturellement naturel en Afrique de l'Ouest
- **Niveaux de confiance gradués** : bronze/argent/or au lieu du binaire PENDING/VERIFIED actuel — nécessite migration DB + UI
- **Profil entreprise distinct du profil membre** : porteurs de projet doivent avoir un profil dédié avec upload pitch deck / business plan
- **Section « Deals Boss » réservée** : opportunités visibles uniquement par tier BOSS — différenciation par accès
- **Système de rendez-vous intégré** : booking 1-1 avec porteurs de projet ou experts — promise Boss (mentorat 1h/mois)
- **Mur des succès** : testimonials, deals closés, photos événements — page statique + CMS léger, quick win
- **CRM interne minimal** : suivi des deals consultés, contacts faits, rendez-vous pour chaque membre
- **Simulateur de rentabilité immobilier** : différenciant, mais peut être un lien externe MVP
- **Facturation automatique PDF** : librairie + template, nécessaire pour les comptabilités des membres

## Technical Context & Contraintes

- **Stack** : Next.js 16.2.6, React 19.2.4, Prisma 7.8.0, Auth.js v5 beta, Stripe 22.1.1, CinetPay API v2, Tailwind 4.x, shadcn/ui
- **Auth pattern** : Split config édge-compatible `auth.config.ts` + Node.js full `auth.ts`. **Manque critique** : aucun `middleware.ts` ou `proxy.ts` → routes protégées non protégées.
- **DB** : SQLite (`better-sqlite3`) en dev → **Migration PostgreSQL requise avant production**. Prisma schema prêt : `User`, `Account`, `Session`, `VerificationToken`, `Subscription`, `Opportunity`, `Payment`.
- **Paiement** : Stripe EUR webhook HMAC OK. CinetPay XOF webhook HMAC = placeholder `return true` → **risque fraude critique**.
- **Déploiement** : Infomaniak VPS Cloud recommandé (pas Node.js Site managed). Nécessite `output: 'standalone'`, PM2 ecosystem, Nginx reverse proxy.
- **Rate limiting** : aucun sur `/api/auth/signup` → **risque brute-force**. Recommandation : `@upstash/ratelimit` (gratuit jusqu'à 10k req/jour).
- **Stockage fichiers** : Cloudflare R2 recommandé (pas de frais de sortie) pour pitch decks et documents juridiques.
- **Notifications** : Resend ou SendGrid pour emails transactionnels. WhatsApp deep links (`wa.me`) pour le canal principal.
- **Analytics** : PostHog (open source) ou Plausible dès le déploiement production.

## Detailed User Scenarios

### Sarah — Premier investisseur (Affranchis)
1. Découvre IBC via Instagram/TikTok ou bouche-à-oreille
2. Atterrit sur landing, voit 2–3 deals teaser (titre + localisation + image)
3. Clique sur un deal immobilier à Cocody, voit le score de fiabilité IBC (argent) + dossier juridique attaché
4. S'inscrit en 3 clics : Google OAuth → choix tier Affranchis → paiement CinetPay (10 000 XOF/mois)
5. Accède au deal complet : montant, promoteur vérifié, simulateur rentabilité, bouton WhatsApp
6. Discute avec le promoteur via WhatsApp, demande une visite vidéo
7. Post-investissement : laisse un review sur le promoteur, reçoit un reporting périodique

### Jean — Investisseur avancé (Boss)
1. Accède via recommandation d'un membre existant
2. Paiement annuel Stripe (990 €) — virement bancaire optionnel pour gros montants
3. Accède à la section « Deals Boss » : opportunités non visibles par les autres tiers
4. Utilise le matching avancé pour trouver des partenaires business dans son secteur
5. Booking 1-1 avec un porteur de projet via le système de rendez-vous intégré
6. Participe à un événement VIP (Paris, Milan, Abidjan)

### Koffi — Porteur de projet local
1. Crée un profil entreprise distinct, upload son registre du commerce + titre foncier
2. Soumet une opportunité immobilière à 150 000 €
3. Passe la vérification admin (workflow kanban : à faire → en cours → validé)
4. Deal publié avec badge or + dossier juridique complet
5. Reçoit des demandes de mise en relation de membres qualifiés
6. Post-closing : reçoit un review 5★, obtient le badge « Membre Platinum »

## Competitive Intelligence à Préserver

- **Diaspo4Africa** : pricing 0 € / 9,99 €/mois, pas de matching algorithmique, pas de due diligence deal, pas ivoirien-spécifique, pas de dual currency EUR/XOF
- **Diaspora Business Club** : anglophone, selective gatekeeping, pas de tech/platform (120 M$+ mobilisés, 27 chapitres)
- **Daba Finance** : mobile-first BRVM/obligations, pas de networking social, pas de deals immobiliers directs
- **LinkedIn Premium** : ~30 €/mois, échelle massive mais non segmenté Africa-focused, fatigue du créateur
- **Tontines informelles** : équivalent culturel de la confiance par réseau — IBC doit répliquer ce mécanisme digitalement via reviews + parrainage
- **Positionnement white space** : aucun acteur ne combine spécificité CI/UEMOA + dual membership tiers + dual currency payment + trust infrastructure + hybrid digital/offline

## Open Questions

1. Quelle est la stratégie exacte de contenu pour attirer organiquement la diaspora ivoirienne en France ? (Instagram, TikTok, podcast ?)
2. Quels partenaires juridiques/locaux (notaires, avocats, agents immobiliers) peuvent être intégrés comme « vérificateurs tiers » pour renforcer la crédibilité ?
3. Que se passe-t-il si un deal validé par IBC tourne mal malgré la due diligence ? (clause de non-responsabilité, assurance partenaire, fonds de garantie ?)
4. Comment gérer les conflits d'intérêts si un admin valide son propre deal ou celui d'un proche ?
5. Quel est le CAC acceptable pour un LTV de ~350 €/an (Grand Frère) ? Benchmark : 50–100 € via contenu organique + événements
6. Faut-il intégrer un provider KYC API (uqudo, Smile ID, Didit) dès le MVP, ou l'upload manuel + vérification admin suffit-il pour 0–500 membres ?
7. Quelle est la politique de remboursement si un membre n'est pas satisfait après 30 jours ?

## Scope Signals

### IN MVP (Phase 1 — M1-M3)
- Auth dual (Google + credentials)
- Paiement dual Stripe + CinetPay (webhooks sécurisés)
- Marketplace opportunités + workflow vérification binaire
- Système de tiers 3 niveaux
- Deep links WhatsApp
- Landing page deals teaser
- Dashboard admin minimal
- CGV + clause intermédiaire non-financier
- Rate limiting + middleware Auth.js
- HMAC CinetPay + idempotence

### MAYBE (Phase 2 — M4-M6)
- Matching par tags + scoring simple
- Niveaux de confiance gradués (bronze/argent/or)
- Profil entreprise distinct
- Upload pitch deck / business plan
- Workflow kanban admin drag-and-drop
- Section Deals Boss réservée
- Mur des succès
- Analytics PostHog/Plausible

### OUT (Phase 3+)
- Matching algorithmique ML
- App mobile native
- WhatsApp Business API intégration
- Crowd-due diligence communautaire
- Impact tracking ESG
- Tokenisation actifs
- PWA + push notifications
- Simulateur rentabilité intégré (peut être lien externe MVP)
- Paiement par virement bancaire Boss annuel

## North Star Metric Rationale

Pourquoi « mises en relation qualifiées par mois » et pas MRR ou nombre d'abonnés ?
- En culture business ouest-africaine, la valeur n'est pas dans le deal clos (trop long, 6–18 mois) mais dans la **connexion de confiance établie**
- Le MRR peut être gonflé par des abonnés inactifs
- Le nombre d'abonnés ne mesure pas la valeur réelle créée
- Une mise en relation qualifiée = matching pertinent + premier contact établi (WhatsApp ou email) + les deux parties ont exprimé un intérêt explicite

## Architecture Decision Records (ADRs) à Formaliser

1. **ADR-001** : Split Auth.js Config — validé, implémenté. Nécessite `middleware.ts` pour activation.
2. **ADR-002** : Paiement Dual Stripe + CinetPay — validé avec modifications. HMAC + idempotence requis.
3. **ADR-003** : SQLite → PostgreSQL — à décider. Recommandation : PostgreSQL managed (Supabase/Railway) pour MVP.
4. **ADR-004** : Rate Limiting Strategy — Upstash Redis (`@upstash/ratelimit`) pour prod. Fallback in-memory Map si indisponible.
5. **ADR-005** : Déploiement Infomaniak VPS vs Node.js Site — VPS Cloud avec PM2 + Nginx.

---

*Distillate produit IBC — contexte dense pour la phase PRD. Créé automatiquement en mode headless.*
