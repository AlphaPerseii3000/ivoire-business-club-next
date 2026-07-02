---
title: 'Refonte Premium de la Landing Page'
type: 'feature'
created: '2026-07-01'
status: 'done'
baseline_commit: '1f5133eea2530e1af49be208af027abf29c72ebb'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** La landing page actuelle d'Ivoire Business Club manque de l'effet d'immersion premium, haut de gamme et d'interactivité asymétrique caractéristique des meilleures vitrines modernes, notamment celle inspirée par Skeleton Rebuild.

**Approach:** Intégration d'un grain de film global, de styles glassmorphismes, d'un Hero asymétrique à double rail vertical coulissant (Shutter Hero), d'un contrôleur de scroll combinant la vidéo de croissance (`Ivoire_business_club_growing_tree_compressed.mp4`) en phase 1 et la boucle fluide (`Ivoire_business_club_loop_compressed.mp4`) en phase 2, d'une refonte des prix sous forme de grille Bento interactive, et d'un simulateur de réseautage et mises en relation en direct.

## Boundaries & Constraints

**Always:**
- Utiliser la typographie *DM Sans* avec un interlettrage très resserré `tracking-[-0.04em]` pour les titres majeurs.
- Utiliser le fond sombre global `#090D16` d'IBC.
- Utiliser Framer Motion ou GSAP (déjà installés) pour gérer les parallaxes et les transitions fluides.
- Conserver le support pour l'accessibilité (attributs ARIA, contrastes suffisants) et la performance mobile (fallback statique sur connexions lentes).

**Ask First:**
- S'il faut masquer complètement l'ancien composant `ScrollVideoPlayer` au milieu de la page maintenant que nous gérons le système de scroll vidéo dans le Hero. (Nous allons le conserver et l'adapter ou le remplacer par la nouvelle structure si nécessaire).

**Never:**
- Ne pas introduire de bibliothèques tierces additionnelles non listées dans `package.json` pour le scroll ou le graphisme (rester sur Framer Motion/GSAP et CSS natif).
- Ne pas utiliser d'images ou d'icônes génériques à basse résolution.

</frozen-after-approval>

## Code Map

- `src/app/globals.css` -- Ajout du grain de film SVG global, des classes glassmorphismes `.glass-ibc-*` et de la police premium.
- `src/components/landing/hero-shutter.tsx` -- Nouveau composant Hero double rail asymétrique avec scroll-scrub et loop vidéo synchronisés.
- `src/components/landing/live-simulator.tsx` -- Nouveau widget simulant des mises en relation en direct au sein de la communauté IBC.
- `src/components/landing/pricing.tsx` -- Refonte Bento Grid des abonnements avec SpotlightCard et ShinyText.
- `src/app/(public)/page.tsx` -- Remplacement du composant Hero d'origine par `HeroShutter`, et coordination générale de la page.

## Tasks & Acceptance

**Execution:**
- [x] `src/app/globals.css` -- Ajouter le calque de grain SVG et les utilitaires `.glass-ibc-dark` / `.glass-ibc-gold`.
- [x] `src/components/landing/live-simulator.tsx` -- Créer le composant de simulation interactive des mises en relation.
- [x] `src/components/landing/hero-shutter.tsx` -- Implémenter le composant Hero asymétrique avec double rail vertical et la gestion multi-vidéo (scrubbing phase 1 et boucle phase 2).
- [x] `src/components/landing/pricing.tsx` -- Transformer la section Pricing en Bento Grid premium.
- [x] `src/app/(public)/page.tsx` -- Remplacer `Hero` par `HeroShutter` et réorganiser les sections pour un flux visuel premium continu.

**Acceptance Criteria:**
- **Given** un défilement vertical, **when** l'utilisateur scroll de 0 à 800px, **then** le rail gauche se translate vers le haut (translateY de 0% à -30%) tandis que le rail droit descend (translateY de 0% à 15%), et la vidéo de croissance effectue un scrub temporel de 0s à 2.4s avec une réduction d'échelle de 1.3 à 1.0.
- **Given** un défilement entre 800px et 2600px, **when** l'utilisateur poursuit sa lecture, **then** la vidéo boucle fluidement sur `Ivoire_business_club_loop_compressed.mp4` tandis que les sections défilent de manière stable.
- **Given** le survol des cartes Bento d'offres de prix, **when** l'utilisateur déplace son curseur, **then** un effet spotlight suit le curseur et le bouton de paiement affiche une animation de texte métallique brillante (ShinyText).

## Spec Change Log

### 2026-07-02 — Ajustements Premium et Scroll Video
- **Déclencheur :** Demandes d'ajustements utilisateur pour le contraste textuel, l'allongement du scroll, l'ajout de sections dans le rail gauche du Hero, la boucle vidéo globale et la suppression de la section finale.
- **Modifications :**
  - Allongement du Hero Shutter à `h-[500vh]` et lecture de la vidéo de 24s sur une plage de 0-3200px.
  - Ajout de 2 nouvelles sections dans le rail gauche du Hero ("Deals & Investissements" et "Réseau & Mentorat").
  - Intégration du composant global `ScrollLoopBackground` jouant la boucle vidéo sous les sections transparentes et glassmorphic ("Comment ça marche ?", "Aperçu des opportunités").
  - Remplacement du paragraphe de description par un texte contrasté noir en gras sur fond de carte blanc translucide.
  - Masque dégradé de 64 unités de hauteur en bas du Hero.
  - Suppression de la section "Découvrir IBC".
- **Préservation :** Les styles Bento Grid des tarifs et le simulateur live de mise en relation restent pleinement opérationnels.

## Design Notes

### Layout Bento Grid de la Tarification
La grille Bento aura 3 colonnes sur desktop :
1. **Les Affranchis (Gauche) :** Largeur 1 col. Glassmorphic sombre.
2. **Les Grands Frères (Centre - Recommandé) :** Largeur 1 col mais avec bordure dorée animée ou plus visible, badge brillant, effet spotlight plus marqué.
3. **Les Boss (Droite) :** Largeur 1 col. Glassmorphic sombre.

### Simulateur Live (Mise en Relation)
Le widget simule des messages de mise en relation :
- "Investisseur X. connecté avec Projet Y (Immobilier Abidjan)"
- "Entrepreneur Z. recherche un mentor Agri-Tech"
- Effet de dactylographie ("typing...") et apparition progressive.

## Verification

**Commands:**
- `npm run build` -- expected: Compilation réussie sans erreurs TypeScript ou Next.js.
- `npm run lint` -- expected: Aucun warning/erreur de linter.
