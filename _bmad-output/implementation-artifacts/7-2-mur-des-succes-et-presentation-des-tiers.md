---
Story: "7.2"
StoryKey: "7-2-mur-des-succes-et-presentation-des-tiers"
Title: "Mur des Succès et Présentation des Tiers"
Status: "done"
Priority: "P1"
Epic: "Epic 7 — Landing Page et Découverte Publique"
FRs: ["FR42", "FR43", "FR44", "FR45"]
UX_DRs: ["UX-DR6", "UX-DR29", "UX-DR24", "UX-DR25", "UX-DR26", "UX-DR27"]
Created: "2026-06-11"
baseline_commit: "34e9c4acf9682b36236e55d03bd79eb773e8adbf"
---

# Story 7.2: Mur des Succès et Présentation des Tiers

Status: done

<!-- Note: Validation is complete. Story updated with premium ReactBits guidelines. -->

## Story

En tant que visiteur non connecté,
Je veux consulter les témoignages des membres d'IBC et comparer les offres d'abonnement,
Afin de juger de la crédibilité du club et de choisir le tier adapté à mon profil d'investisseur ou d'entrepreneur.

## Critères d'acceptation (Acceptance Criteria)

1. **Section « Mur des Succès » interactive et enrichie**
   - **Given** un visiteur sur la page d'accueil `/`,
   - **When** il fait défiler la page jusqu'au « Mur des Succès » (Success Wall),
   - **Then** le titre principal s'anime via le composant `SplitText` pour une entrée élégante lettre par lettre.
   - **And** le sous-titre de section et les compteurs statistiques ("15+ deals vérifiés" et "500+ membres actifs") utilisent le composant `ShinyText` avec un reflet or (`#D4A847`).
   - **And** le système affiche un carrousel horizontal interactif contenant les témoignages des membres avec :
     - Leurs photos de profil (assets fournis : `/profil-1-jeune-entrepreneure-tech.webp`, `/profil-2-investisseur-senior-business-angel.webp`, `/profil-3-entrepreneur-local-cote-divoire.webp`, `/profil-4-cadre-financiere-experte-en-investissement.webp`)
     - Leurs noms, rôles/fonctions et localisations (ex: Paris, Abidjan)
     - Leurs deals closés réels avec montants associés (ex: "Deal closés: €25k", "3+ deals closés")
     - Leurs citations courtes et percutantes en français.
   - **And** le carrousel propose des boutons de navigation (précédent/suivant) et supporte le défilement tactile ou par glissement (drag scroll).
   - **And** les cartes de témoignage utilisent un style de conteneur premium avec effet de surbrillance (`SpotlightCard` avec une couleur de faisceau par défaut `rgba(255, 255, 255, 0.15)`) et bordures discrètes en dégradé.

2. **Présentation et Comparaison des Tiers (« Nos offres »)**
   - **Given** un visiteur sur la section des tarifs (sur `/` ou `/pricing`),
   - **When** la section s'affiche,
   - **Then** le titre de la section "Nos offres" s'anime avec le composant `SplitText`.
   - **And** il voit une grille de cartes présentant les trois tiers d'abonnement IBC (FR42) :
     - **Affranchis** : €29/mois (ou 10 000 CFA/mois) — accès de base aux deals vérifiés, événements payants.
     - **Grands Frères** : €49/mois (ou 25 000 CFA/mois) — accès prioritaire, événements inclus. *Marqué comme tier recommandé.*
     - **Boss** : €99/mois (ou 50 000 CFA/mois) — accès exclusif aux deals stratégiques, 1h de mentorat/conseil mensuel.
   - **And** chaque carte utilise le composant partagé `TierCard` et propose un bouton « Choisir » qui redirige vers le formulaire d'inscription en spécifiant précisément le tier en majuscules dans l'URL :
     - Affranchis : `/auth/signup?tier=AFFRANCHI`
     - Grands Frères : `/auth/signup?tier=GRAND_FRERE`
     - Boss : `/auth/signup?tier=BOSS`
   - **And** les cartes sont enveloppées dans un composant interactif `SpotlightCard` avec des couleurs de faisceau spécifiques :
     - Grands Frères (Recommandé) : `rgba(212, 168, 71, 0.15)` (teinte dorée)
     - Autres tiers : `rgba(255, 255, 255, 0.15)`
   - **And** le badge "Recommandé" sur la carte Grands Frères utilise le composant `ShinyText` pour attirer visuellement l'attention de manière haut de gamme.

3. **Tableau Comparatif Horizontal pour Desktop**
   - **Given** un visiteur sur un écran large (desktop, ≥ 1024px),
   - **When** il consulte la section des tarifs,
   - **Then** la disposition en cartes se transforme en un tableau comparatif horizontal structuré.
   - **And** le tableau possède un en-tête fixe (sticky header) affichant les trois offres et leurs prix.
   - **And** il compare précisément les fonctionnalités clés avec des indicateurs clairs :
     - **Accès WhatsApp** : Affranchis (✓ Oui), Grands Frères (✓ Oui), Boss (✓ Oui)
     - **Visibilité des opportunités** : Affranchis ("Standard (deals vérifiés)"), Grands Frères ("Prioritaire"), Boss ("Exclusive (deals stratégiques)")
     - **Événements IBC** : Affranchis ("Accès payant"), Grands Frères ("Inclus"), Boss ("Inclus + Accès VIP")
     - **Conseil & Mentorat** : Affranchis ("Non"), Grands Frères ("Non"), Boss ("1h / mois incluse")
     - **Tarif mensuel** : Affranchis ("€29 / mois"), Grands Frères ("€49 / mois"), Boss ("€99 / mois")

4. **Responsive Mobile-First et Accessibilité**
   - **Given** un visiteur sur mobile (320px–767px),
   - **When** il consulte ces sections,
   - **Then** le layout s'adapte en colonne unique, les cibles tactiles des boutons de navigation et d'action sont d'au moins 44×44px, et l'espacement empêche tout chevauchement.
   - **And** les boutons iconiques possèdent des `aria-label` descriptifs (ex: `aria-label="Témoignage précédent"`).
   - **And** si la préférence système `prefers-reduced-motion: reduce` est active, les animations de glissement, les effets de texte animé (`SplitText`) et les effets de faisceau lumineux (`SpotlightCard`) sont désactivés pour respecter les normes d'accessibilité.

## Tasks / Subtasks

- [x] **Rénovation et enrichissement du Mur des Succès (AC: 1, 4)**
  - [x] Extraire les données de témoignage dans une structure constante ou un fichier de configuration dédié `src/lib/testimonials-config.ts` pour faciliter la future intégration CMS.
  - [x] Modifier [success-wall.tsx](file:///d:/Code/ivoire-business-club-next/src/components/landing/success-wall.tsx) pour intégrer la localisation et les informations de deals closés (ex. "Deal closés: €25k", "3+ deals closés").
  - [x] Remplacer l'animation du titre par le composant `SplitText` (`src/components/ui/split-text.tsx`).
  - [x] Utiliser `ShinyText` (`src/components/ui/shiny-text.tsx`) sur le sous-titre de section et les indicateurs de statistiques globales du club (ex. "15+ deals vérifiés", "500+ membres actifs").
  - [x] Appliquer le design premium `SpotlightCard` sur les cartes de témoignage avec survol interactif.
  - [x] Garantir le défilement fluide au clic (via scrollRef et scrollLeft offset) et le support du drag-scroll sur terminaux mobiles.
  
- [x] **Intégration du Comparateur et des Tiers de tarification (AC: 2, 3)**
  - [x] Adapter [pricing.tsx](file:///d:/Code/ivoire-business-club-next/src/components/landing/pricing.tsx) pour utiliser `SplitText` pour le titre "Nos offres".
  - [x] Assurer la liaison entre `pricing.tsx` et `TierCard` en lui passant les configurations dynamiques issues de [tier-config.ts](file:///d:/Code/ivoire-business-club-next/src/lib/tier-config.ts).
  - [x] Modifier [tier-card.tsx](file:///d:/Code/ivoire-business-club-next/src/components/tier-card.tsx) pour utiliser le composant `ShinyText` sur le badge "Recommandé" du tier Grands Frères.
  - [x] Modifier l'URL de redirection du CTA de chaque offre pour inclure précisément la clé de tier en majuscule : `/auth/signup?tier=AFFRANCHI`, `/auth/signup?tier=GRAND_FRERE` ou `/auth/signup?tier=BOSS`.
  - [x] Mettre en place le tableau comparatif horizontal pour desktop (≥ 1024px) avec un en-tête figé (sticky header) comparant précisément les fonctionnalités : Accès WhatsApp, Visibilité opportunités, Événements, Conseil & Mentorat, Tarif.
  
- [x] **Respect des normes d'accessibilité et de performance (AC: 4)**
  - [x] Ajouter les tags `aria-label` et `aria-hidden` manquants sur les icônes de contrôle du carrousel.
  - [x] Coordonner la détection globale de `prefers-reduced-motion` pour débrayer les animations dans `SplitText`, `BlurText` et les reflets interactifs de `SpotlightCard`.
  - [x] Valider le contraste des couleurs pour les textes descriptifs en gris (ex: slate-400) et or (ex: `#D4A847`).

- [x] **Tests unitaires et validation (AC: 1, 2, 3, 4)**
  - [x] Mettre à jour [pricing.test.tsx](file:///d:/Code/ivoire-business-club-next/src/components/landing/pricing.test.tsx) pour couvrir l'affichage des trois offres avec leurs liens CTA correspondants (en majuscules) et l'existence du tableau comparatif sur grand écran.
  - [x] Créer un fichier de test `src/components/landing/success-wall.test.tsx` pour valider le chargement des témoignages, les images associées, les boutons de navigation et les statistiques globales du club.
  - [x] Lancer les tests unitaires via `npx vitest run`.
  - [x] Lancer un build complet de production via `npm run build` pour s'assurer de l'absence d'erreurs de compilation ou de régression sur le bundle standalone.

## Dev Notes

### Contexte Produit Critique
La landing page est la vitrine de confiance de l'Ivoire Business Club. Cette story complète l'Epic 7 en fournissant la preuve sociale essentielle (le Mur des Succès) et la clarté financière (la comparaison des tiers) pour inciter les visiteurs de la diaspora à s'abonner par virement. Il est impératif de conserver la cohérence visuelle haut de gamme initiée dans la Story 7.1 (mode sombre `#090D16`, bordures glassmorphism, effets or `#D4A847`).

### Composants et configurations existants à réutiliser
- **Config Tiers** : Utiliser [tier-config.ts](file:///d:/Code/ivoire-business-club-next/src/lib/tier-config.ts) et [bank-transfer-config.ts](file:///d:/Code/ivoire-business-club-next/src/lib/bank-transfer-config.ts) pour récupérer les tarifs et les caractéristiques de chaque tier.
- **TierCard** : Le composant [tier-card.tsx](file:///d:/Code/ivoire-business-club-next/src/components/tier-card.tsx) is already ready and styled. Do not re-implement, but integrate in the Pricing section.
- **SpotlightCard** : Use [spotlight-card.tsx](file:///d:/Code/ivoire-business-club-next/src/components/ui/spotlight-card.tsx) for light motion effects.
- **SplitText & ShinyText** : Reuse the existing components located respectively in `src/components/ui/split-text.tsx` and `src/components/ui/shiny-text.tsx`.

### Garde-fous d'implémentation (Guardrails)
- **JSX Boolean Guardrail (Next.js 16)** : Ne jamais utiliser d'expressions conditionnelles complexes avec `&&` directement dans le JSX de retour. Toujours pré-calculer les conditions booléennes complexes dans des constantes avant le bloc `return`.
- **Pas d'ancres imbriquées (Nested Anchors)** : Veiller à ce que l'utilisation de `TierCard` ou des cartes du Mur des Succès ne génère pas de balises `<a>` ou `<Link>` imbriquées, ce qui brise la validation HTML et l'hydratation Next.js.
- **Garantie de non-redondance** : Ne pas ajouter d'autres boutons CTA de redirection vers des solutions de paiement externes (Stripe/CinetPay ont été retirés). Le seul flux d'onboarding valide est la redirection vers la page d'inscription `/auth/signup?tier={TIER}`.

### Références
- [Source: epics.md#Story-7.2-Mur-des-succès-et-présentation-des-tiers](file:///d:/Code/ivoire-business-club-next/_bmad-output/planning-artifacts/epics.md)
- [Source: ux-spec.md#10.1-Landing-Page-Public-No-Login](file:///d:/Code/ivoire-business-club-next/_bmad-output/planning-artifacts/ux-spec.md)
- [Source: NEW landing page.md#NOS-OFFRES](file:///d:/Code/ivoire-business-club-next/NEW%20landing%20page.md)

## Dev Agent Record

### Agent Model Used
Gemini 3.5 Flash (High)

### Debug Log References
N/A

### Completion Notes List
- Extraits de témoignages dans `src/lib/testimonials-config.ts` pour une meilleure maintenabilité.
- Intégration de `SplitText` et `ShinyText` (reflet or `#D4A847`) sur les titres, sous-titres, badges et statistiques clés de la landing page.
- Ajout d'une option d'interaction par drag-to-scroll sur la section Mur des Succès.
- Modernisation des fiches de témoignages avec `SpotlightCard` incorporant la localisation et les deals clos.
- Intégration des CTAs avec paramètres de tier en majuscules (`/auth/signup?tier=AFFRANCHI|GRAND_FRERE|BOSS`).
- Conception d'un tableau comparatif horizontal desktop pour une meilleure lisibilité.
- Fixation des targets tactiles à un minimum de 44x44px.
- Couverture de tests unitaires via `pricing.test.tsx` et `success-wall.test.tsx`.
- Validation de la conformité du build de production Next.js.

### File List
- [testimonials-config.ts](file:///d:/Code/ivoire-business-club-next/src/lib/testimonials-config.ts)
- [success-wall.tsx](file:///d:/Code/ivoire-business-club-next/src/components/landing/success-wall.tsx)
- [pricing.tsx](file:///d:/Code/ivoire-business-club-next/src/components/landing/pricing.tsx)
- [tier-card.tsx](file:///d:/Code/ivoire-business-club-next/src/components/tier-card.tsx)
- [success-wall.test.tsx](file:///d:/Code/ivoire-business-club-next/src/components/landing/success-wall.test.tsx)
- [pricing.test.tsx](file:///d:/Code/ivoire-business-club-next/src/components/landing/pricing.test.tsx)
- [page.test.tsx](file:///d:/Code/ivoire-business-club-next/src/app/(public)/page.test.tsx)

### Review Findings

- [x] [Review][Patch] Unresolved ARIA Reference in Success Wall [src/components/landing/success-wall.tsx:51]
- [x] [Review][Patch] Low Contrast Gold on Light Amber Badge in Light Theme [src/components/tier-card.tsx:73]
