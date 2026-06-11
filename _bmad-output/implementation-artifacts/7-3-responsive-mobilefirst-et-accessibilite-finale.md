---
Story: "7.3"
StoryKey: "7-3-responsive-mobilefirst-et-accessibilite-finale"
Title: "Responsive Mobile-First et Accessibilité Finale"
Status: "ready-for-dev"
Priority: "P1"
Epic: "Epic 7 — Landing Page et Découverte Publique"
FRs: ["FR44", "FR45"]
UX_DRs: ["UX-DR24", "UX-DR25", "UX-DR26", "UX-DR27"]
Created: "2026-06-11"
---

# Story 7.3: Responsive Mobile-First et Accessibilité Finale

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

En tant qu'utilisateur (membre, admin ou visiteur) d'IBC,
Je veux que l'application soit entièrement mobile-first, responsive et conforme aux règles d'accessibilité WCAG 2.1 AA,
Afin d'accéder aux opportunités et d'utiliser le club de manière fluide et autonome sur n'importe quel appareil.

## Acceptance Criteria

1. **Responsive Mobile-First par défaut (AC: 1)**
   - **Given** un utilisateur sur mobile (largeur d'écran 320px–767px),
   - **When** il navigue sur n'importe quelle page d'IBC,
   - **Then** le layout s'affiche sur une seule colonne avec des marges horizontales minimales de `16px` (`px-4`).
   - **And** tous les boutons d'action critiques occupent 100% de la largeur du conteneur parent (`w-full`).
   - **And** la navigation pour les membres s'effectue via une barre d'onglets flottante en bas de l'écran (bottom tab bar).
   - **And** toutes les fenêtres modales s'ouvrent sous forme de tiroirs glissant depuis le bas (bottom sheets).
   - **And** un bouton d'action principal (CTA) de contact ou de validation reste collé (sticky) en bas de l'écran.

2. **Adaptation Tablette et Desktop (AC: 2)**
   - **Given** un utilisateur sur tablette (largeur d'écran 768px–1023px),
   - **When** il consulte le flux de deals,
   - **Then** les cartes s'affichent sur une grille à 2 colonnes (`grid-cols-2`).
   - **And** la navigation d'administration se replie dans une barre latérale réductible (collapsible sidebar).
   - **Given** un utilisateur sur ordinateur (desktop, largeur d'écran ≥ 1024px),
   - **When** il consulte les détails d'un deal,
   - **Then** le layout passe sur 2 colonnes asymétriques : 60% pour les détails de l'opportunité et les documents associés, et 40% pour la carte du promoteur et les boutons d'action collants (sticky sidebar).
   - **And** la barre latérale de navigation de l'administration reste persistante et entièrement déployée.

3. **Cibles Tactiles et Espacements Physiques (AC: 3)**
   - **Given** n'importe quel élément cliquable ou interactif (boutons, liens, icônes, onglets),
   - **When** il est affiché sur mobile,
   - **Then** sa cible tactile minimale mesure `44×44px` pour éviter les erreurs de saisie (NFR-A1).
   - **And** l'espacement physique entre deux éléments interactifs adjacents est d'au moins `8px` (`gap-2` ou `space-x-2` / `space-y-2`).

4. **Accessibilité Numérique WCAG 2.1 AA (AC: 4)**
   - **Given** un utilisateur naviguant à l'aide d'un lecteur d'écran (screen reader),
   - **When** il interagit avec l'application,
   - **Then** chaque image possède un attribut `alt` descriptif (ou `alt=""` s'il s'agit d'un élément purement décoratif).
   - **And** tous les boutons contenant uniquement des icônes possèdent un attribut `aria-label` explicitant l'action associée (ex: `aria-label="Contacter le porteur sur WhatsApp"`).
   - **And** la hiérarchie des balises de titre suit un ordre logique strict sans sauter de niveau (h1 → h2 → h3).
   - **And** les éléments interactifs possèdent un indicateur de focus clavier très visible (ex: `ring-2 ring-primary ring-offset-2`).
   - **And** les annonces dynamiques de notification ou les changements d'état importants utilisent un conteneur avec l'attribut `aria-live="polite"`.

5. **Prise en charge de prefers-reduced-motion (AC: 5)**
   - **Given** un utilisateur ayant activé l'option système « Réduire les animations » (`prefers-reduced-motion: reduce`),
   - **When** l'application s'affiche,
   - **Then** toutes les animations CSS clés (les reflets dorés `ShinyText`, les battements d'état de `TrustBadge`, les glissements de carrousel et les effets de survol de `SpotlightCard`) sont désactivées ou réduites à une durée minimale quasi instantanée (`0.01ms`).

6. **Contrastes Textuels et Mode Sombre (AC: 6)**
   - **Given** l'application en mode sombre (classe `.dark` active),
   - **When** l'interface s'affiche,
   - **Then** les jetons CSS de couleur s'adaptent dynamiquement : arrière-plan principal `#090D16`, texte de premier plan `#F8FAFC`, surfaces de cartes `#1E293B`.
   - **And** le contraste de tous les textes normaux respecte un ratio d'au moins `4.5:1` par rapport à leur arrière-plan immédiat, et les grands textes d'au moins `3:1` (conformité NFR-A1).

7. **Performance & Audits Automatisés (AC: 7)**
   - **Given** n'importe quelle page du parcours d'onboarding, de découverte de deal ou de paiement,
   - **When** elle fait l'objet d'un audit de performance et d'accessibilité automatique (Lighthouse / axe-core),
   - **Then** le score global d'accessibilité est de `≥ 90` (NFR-A1).

## Tasks / Subtasks

- [ ] **Audit et mise en conformité des conteneurs globaux et layouts (AC: 1, 2, 6)**
  - [ ] S'assurer que le fichier root [layout.tsx](file:///d:/Code/ivoire-business-club-next/src/app/layout.tsx) définit correctement la langue avec la balise `<html lang="fr">`.
  - [ ] Auditer [globals.css](file:///d:/Code/ivoire-business-club-next/src/app/globals.css) et vérifier que les variables de couleur pour le mode clair et sombre respectent les normes de contraste.
  - [ ] Confirmer que la media query `@media (prefers-reduced-motion: reduce)` dans `globals.css` neutralise bien toutes les transitions et animations (ex: `pulse`, `shine`).
  
- [ ] **Optimisation de la navigation mobile et adaptabilité des layouts (AC: 1, 2)**
  - [ ] Auditer le layout membre [layout.tsx](file:///d:/Code/ivoire-business-club-next/src/app/(dashboard)/layout.tsx). Vérifier que les boutons et liens de la bottom tab bar mobile ont des cibles d'au moins 44px de hauteur et des icônes avec tags descriptifs.
  - [ ] Auditer le layout d'administration [layout.tsx](file:///d:/Code/ivoire-business-club-next/src/app/(admin)/layout.tsx) sur mobile. L'admin layout actuel utilise un menu sidebar uniquement affiché sur desktop (`hidden md:flex`) sans alternative mobile. Ajouter une navigation mobile pour l'admin (ex: barre de titre supérieure avec un bouton de menu collapsible burger, ou bottom navigation bar dédiée à l'administration).
  
- [ ] **Mise en conformité des composants partagés (AC: 3, 4, 5)**
  - [ ] Auditer tous les composants personnalisés IBC pour garantir la taille des cibles tactiles (≥ 44×44px) et un espacement de protection (≥ 8px) :
    - `TrustBadge` ([trust-badge.tsx](file:///d:/Code/ivoire-business-club-next/src/components/features/deals/trust-badge.tsx))
    - `DealCard` ([deal-card.tsx](file:///d:/Code/ivoire-business-club-next/src/components/features/deals/deal-card.tsx))
    - `WhatsAppCTA` ([whatsapp-cta.tsx](file:///d:/Code/ivoire-business-club-next/src/components/features/deals/whatsapp-cta.tsx))
    - `TierCard` ([tier-card.tsx](file:///d:/Code/ivoire-business-club-next/src/components/tier-card.tsx))
    - `VerificationTimeline` ([verification-timeline.tsx](file:///d:/Code/ivoire-business-club-next/src/components/features/deals/verification-timeline.tsx))
    - `DocumentRow` ([document-row.tsx](file:///d:/Code/ivoire-business-club-next/src/components/features/deals/document-row.tsx))
    - `EmptyState` ([empty-state.tsx](file:///d:/Code/ivoire-business-club-next/src/components/shared/empty-state.tsx))
  - [ ] Pour `DealCard` ([deal-card.tsx](file:///d:/Code/ivoire-business-club-next/src/components/features/deals/deal-card.tsx)), s'assurer qu'aucun composant interactif ne viole la règle anti-nested anchor (par exemple, pas d'ancres imbriquées à l'intérieur du lien parent englobant la carte).
  - [ ] S'assurer que le composant de formulaire d'édition du profil ([profile-edit-form.tsx](file:///d:/Code/ivoire-business-club-next/src/components/features/auth/profile-edit-form.tsx)) ou de validation d'abonnements a des formulaires s'affichant en colonne unique (`flex flex-col` ou `grid grid-cols-1`) sur terminaux mobiles.
  - [ ] Corriger les avertissements d'accessibilité de Base UI (notamment sur `InterestButton` dans [interest-button.tsx](file:///d:/Code/ivoire-business-club-next/src/components/features/deals/interest-button.tsx) lors de l'utilisation du prop `render` avec un `Link` non-bouton, en ajoutant explicitement `nativeButton={false}` pour préserver la sémantique et l'accessibilité au clavier).
  
- [ ] **Application des règles de codage et des garde-fous (AC: 4, 7)**
  - [ ] Veiller au respect strict du **JSX Boolean Guardrail** dans tous les composants modifiés : pré-calculer toutes les conditions booléennes complexes dans des constantes avant le bloc `return` de rendu.
  - [ ] Vérifier que tous les boutons iconiques ou sans texte visible possèdent un `aria-label` descriptif en français (ex: les boutons de navigation du carrousel de témoignages ou les boutons de fermeture de modale).
  - [ ] Associer explicitement des balises `<label>` ou l'attribut `aria-labelledby` à chaque champ de saisie utilisateur dans les formulaires d'authentification ou d'édition de profil.
  - [ ] Configurer `aria-live="polite"` pour les annonces asynchrones, notamment dans les toasters ou les retours d'upload de documents juridiques.
  
- [ ] **Tests automatisés et validation globale (AC: 7)**
  - [ ] Écrire un test unitaire ou d'intégration vérifiant que les éléments critiques (comme `layout.tsx` et `globals.css`) intègrent bien les règles d'accessibilité.
  - [ ] Lancer les tests unitaires via la commande `npx vitest run` pour valider l'absence de régression.
  - [ ] Lancer un build de production (`npm run build`) pour valider la conformité de compilation du bundle standalone final.

## Dev Notes

### Contexte Produit Critique
L'accessibilité et le responsive mobile-first sont des prérequis fondamentaux pour l'Ivoire Business Club. Étant donné que la majeure partie des membres de la diaspora naviguent depuis leur smartphone (souvent sur des connexions mobiles 3G variables), la légèreté des layouts, l'accessibilité au lecteur d'écran et la taille des boutons interactifs sont des facteurs directs de conversion et de confiance.

### Garde-fous d'implémentation (Guardrails)
- **JSX Boolean Guardrail (Next.js 16)** : Ne jamais utiliser d'expressions conditionnelles complexes avec `&&` directement dans le JSX de retour. Toujours pré-calculer les conditions complexes dans des constantes en amont.
- **Pas d'ancres imbriquées (Nested Anchors)** : Veiller à ce que l'utilisation de `Link` ou de boutons cliquables au sein des cartes ne crée pas de structures `<a>` imbriquées invalides.
- **Support reduced-motion** : Utiliser la directive CSS `@media (prefers-reduced-motion: reduce)` pour débrayer les effets interactifs et transitions.

### Références
- [Source: epics.md#Story-7.3-Responsive-mobile-first-et-accessibilité-finale](file:///d:/Code/ivoire-business-club-next/_bmad-output/planning-artifacts/epics.md)
- [Source: ux-spec.md#13-Responsive-Design--Accessibility](file:///d:/Code/ivoire-business-club-next/_bmad-output/planning-artifacts/ux-spec.md)
- [Source: architecture.md#Decision-Priority-Analysis](file:///d:/Code/ivoire-business-club-next/_bmad-output/planning-artifacts/architecture.md)

## Dev Agent Record

### Agent Model Used
Gemini 3.5 Flash (High)

### Debug Log References
N/A

### Completion Notes List
N/A

### File List
- [7-3-responsive-mobilefirst-et-accessibilite-finale.md](file:///d:/Code/ivoire-business-club-next/_bmad-output/implementation-artifacts/7-3-responsive-mobilefirst-et-accessibilite-finale.md)
