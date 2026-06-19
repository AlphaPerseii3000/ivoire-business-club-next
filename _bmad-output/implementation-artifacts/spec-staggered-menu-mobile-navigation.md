---
title: 'Staggered Menu Mobile Navigation'
type: 'feature'
created: '2026-06-19T20:45:00+02:00'
status: 'done'
route: 'one-shot'
---

# Staggered Menu Mobile Navigation

## Intent

**Problem:** Le menu de navigation mobile à travers les différentes zones de l'application Ivoire Business Club (landing page publique, dashboard membre, et dashboard admin) était incohérent et manquait d'une esthétique haut de gamme. Le dashboard membre utilisait une barre d'onglets basique en bas, et le dashboard admin utilisait un menu Sheet standard, ce qui ne correspondait pas à la philosophie de design premium du club.

**Approach:** Remplacer les différents composants de navigation mobile par un composant unique `StaggeredMenu` hautement esthétique, animé avec GSAP pour assurer des transitions fluides et des micro-animations de qualité. Intégrer ce menu sur la page d'accueil publique, le dashboard membre, et les layouts d'administration pour garantir l'uniformité visuelle, tout en adaptant les liens, logos et palettes de couleurs à chaque zone.

## Boundaries & Constraints

**Always:**
- Utiliser GSAP pour les couches de transition de navigation, le décalage (stagger) des éléments et les animations de cycle de texte.
- S'assurer que l'en-tête et le panneau du menu se superposent correctement et gèrent les clics de manière appropriée via un positionnement relatif au viewport.
- Ajuster le padding supérieur des layouts (`pt-16`) sur mobile pour éviter que le contenu ne soit masqué sous l'en-tête mobile fixe.
- Fournir des contrôles de navigation accessibles, incluant des attributs `aria-label` corrects et le support de la fermeture lors d'un clic en dehors du menu.

**Ask First:**
- (Aucune décision supplémentaire requise, le plan initial a été validé et appliqué).

**Never:**
- Permettre au conteneur du menu fermé ou à ses couches invisibles de bloquer l'interaction du curseur avec les éléments de la page en dessous.
- Introduire des erreurs d'incohérence de réhydratation (Hydration Mismatch) en maintenant l'exécution de GSAP uniquement côté client.

## Code Map

- `src/components/StaggeredMenu.tsx` -- Le composant réutilisable de menu mobile animé avec GSAP, configuré avec un en-tête aligné en colonne pour centrer le logo et le bouton d'activation.
- `src/components/features/admin/admin-mobile-nav.tsx` -- Barre de navigation mobile de l'administration avec logo `/logo-ibc-landing.webp` et fond transparent `bg-[#090D16]/80 backdrop-blur-sm`.
- `src/components/features/dashboard/dashboard-mobile-nav.tsx` -- Barre de navigation mobile du dashboard membre avec logo `/logo-ibc-landing.webp` et fond transparent `bg-[#090D16]/80 backdrop-blur-sm`.
- `src/components/landing/mobile-nav.tsx` -- Barre de navigation mobile publique avec logo `/logo-ibc-landing.webp` et fond transparent `bg-[#090D16]/80 backdrop-blur-sm`.
- `src/app/(admin)/layout.tsx` -- Intégration de la navigation mobile admin et ajustement de l'espacement.
- `src/app/(dashboard)/layout.tsx` -- Remplacement de la navigation mobile d'origine par DashboardMobileNav et ajustement de l'espacement.
- `src/app/(public)/page.tsx` -- Masquage du header desktop sur mobile au profit de LandingMobileNav.

## Tasks & Acceptance

**Execution:**
- [x] Créer le composant réutilisable `StaggeredMenu.tsx` personnalisable au niveau des items, couleurs de couches et logo.
- [x] Implémenter les timelines GSAP pour les transitions de calques, le décalage d'apparition des liens, l'animation de cycle de texte du bouton ("Menu" <-> "Fermer"), et la transformation de l'icône.
- [x] Positionner et aligner en colonne centrée le logo `/logo-ibc-landing.webp` et le bouton d'ouverture "Menu" horizontalement au sein de la barre de navigation.
- [x] Rendre l'en-tête de navigation mobile plus transparent en appliquant la classe `bg-[#090D16]/80` avec un effet de flou arrière (`backdrop-blur-sm`).
- [x] Ajouter un bouton de fermeture explicite "Fermer" absolute en haut à droite du panneau mobile pour faciliter le retour utilisateur.
- [x] Réduire la taille de police des liens du menu (`text-[1.8rem] md:text-[2.8rem]`) pour une apparence plus épurée et équilibrée.
- [x] Refactoriser `admin-mobile-nav.tsx` pour monter le `StaggeredMenu` avec les liens d'administration, un lien de retour au site et le callback de déconnexion NextAuth.
- [x] Implémenter `dashboard-mobile-nav.tsx` pour mapper les liens du tableau de bord membre et de déconnexion.
- [x] Créer `landing/mobile-nav.tsx` contenant les liens vers les routes publiques (`/articles`, `/events`) et les ancres de section (`#mission`, `#pricing`).
- [x] Mettre à jour les layouts pour inclure la classe `pt-16 md:pt-0` afin de décaler le contenu sous l'en-tête de navigation mobile collant.
- [x] Masquer le header desktop par défaut sur mobile pour monter `LandingMobileNav`.

**Acceptance Criteria:**
- Given un visiteur ou utilisateur connecté sur mobile, when la page se charge, then le logo et le bouton "Menu" s'affichent centrés horizontalement et alignés verticalement dans la barre de navigation translucide (`bg-[#090D16]/80 backdrop-blur-sm`).
- Given le menu mobile ouvert, when l'utilisateur clique sur un lien, then l'animation inverse se joue et le navigateur redirige vers la page ou l'ancre ciblée.
- Given le menu mobile ouvert, when l'utilisateur clique en dehors du panneau ou sur le bouton "Fermer" (header ou panneau interne), then le panneau se ferme et l'interactivité globale de la page est restaurée.
- Given un membre ou administrateur connecté, when il clique sur "Déconnexion", then sa session prend fin et il est redirigé vers la page d'accueil.

## Spec Change Log

(Aucune modification post-approbation).

## Design Notes

- L'alignement centré du logo et du bouton dans la barre de hauteur fixe `h-16` est réalisé via une disposition `flex-direction: column` avec alignements horizontaux et verticaux centrés, et un espacement de `0.25rem`.
- Le texte d'activation du menu alterne entre "Menu" et "Fermer" en décalant l'axe vertical `yPercent` d'une liste d'états dans un conteneur à débordement masqué à l'aide d'une timeline GSAP.
- Les calques de navigation fermés appliquent la propriété CSS `pointer-events-none` sur leurs conteneurs afin de s'assurer qu'ils ne bloquent pas les clics utilisateur sur le contenu de page sous-jacent.

## Verification

**Commands:**
- `npm run build` -- expected: build de production Next.js réussi sans erreurs de compilation TypeScript ou de linting.
