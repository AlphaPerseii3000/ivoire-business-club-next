---
title: "Product Brief Distillate: Ivoire Business Club"
type: llm-distillate
source: "product-brief-ivoire-business-club.md"
created: "2026-05-11"
purpose: "Token-efficient context for downstream PRD creation"
---

## Stack technique décidée
- Framework : Next.js 15 + TypeScript + App Router
- Styling : TailwindCSS 4
- Base de données : SQLite (Prisma ORM) pour MVP → migration facile vers PostgreSQL
- Auth : Auth.js (NextAuth v5) — email/password + Google OAuth
- Paiements : Stripe (€) + CinetPay (CFA/mobile money)
- Hébergement : Infomaniak (SSH deploy)
- Admin : Panel admin basique ( Filament-style table CRUD)

## Rejeté explicitement
- Laravel (projet précédent dysfonctionnel, cause du rebuild)
- Nuxt/Vue (pas de préférence, Next.js a un écosystème plus large pour ce type de plateforme)
- SvelteKit (trop niche pour une équipe projet potentiel)
- MySQL (SQLite suffisant pour le MVP, PostgreSQL pour la prod)
- Clerk auth (coût supplémentaire, Auth.js suffit)
- App mobile native (V2+)

## Exigences de design
- Look premium, business, moderne — pas cheap
- Mode sombre/clair obligatoire
- Sections animées mais performances prioritaires (Lighthouse > 90)
- Mobile-first responsive
- Palette : tons dorés/warm professionnels (cohérent avec l'identité CI/Europe)

## Modèle de données (MVP)
- Users (profil, tier, statut abonnement, dates)
- Subscriptions (Stripe/CinetPay, tier, period, status)
- Opportunities (titre, description, catégorie, vérification status, auteur)
- Memberships/Payments (historique)
- Admin dashboard basique

## Processus de vérification des opportunités (MVP)
- Grille de critères minimaux : existence légale, documentation financière, références vérifiables
- Responsable : un admin/fondateur valide manuellement
- Délai : 48h maximum
- Disclaimer : "IBC facilite la mise en relation et ne garantit pas le rendement des investissements"

## Pricing détaillé (depuis fichiers fondation)
- Les Affranchis : 29€/mois | 290€/an (10 000 CFA/mois | 100 000 CFA/an)
- Les Grands Frères : 59€/mois | 590€/an (25 000 CFA/mois | 250 000 CFA/an)
- Les Boss : 129€/mois | 1290€/an (50 000 CFA/mois | 500 000 CFA/an) [NOTE : le doc landing page dit 99€/500 000 CFA]
- Options à la carte : Visibilité 20€, Accompagnement groupe 50€/mois, Accompagnement sur mesure sur devis, Conseil juridique, Conférences
- Offre lancement : 50% sur l'annuel OU 1 mois offert en mensuel

## Questions ouvertes
- Pricing Boss : 99€ ou 129€/mois ? (discordance entre les deux docs)
- Processus de due diligence détaillé : à affiner dans le PRD
- Branding/charte graphique : existe-t-il déjà un logo ou des guidelines ?
- Domaine : ivoire-business-club.com est déjà utilisé, quel domaine pour le nouveau site ?
- CinetPay : vérifier la faisabilité technique d'intégration pour V1

## Signaux de scope
- V1 scope = landing + auth + paiement + espace membre basique + opportunités CRUD + admin minimal
- V2 scope = messagerie temps réel, service mandataire, dashboard admin avancé, contenu éditorial
- Post-V1 = app mobile, extension géographique, CRM