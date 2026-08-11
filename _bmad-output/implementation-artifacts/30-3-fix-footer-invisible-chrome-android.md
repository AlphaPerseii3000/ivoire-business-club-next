---
baseline_commit: "25e6410b2c2b5fdafcb374179d29cf5583610957"
status: ready-for-dev
---

# Story 30-3: Réparer le footer invisible sur Chrome Android

## Status: ready-for-dev

## Story

As a visiteur mobile sur Chrome Android (Samsung),
I want voir le footer (pied de page) en bas de la landing page,
so that je puisse accéder aux informations de contact, mentions légales et newsletter comme sur desktop.

## Contexte

### Bug

Le footer de la landing page n'apparaît pas à l'écran sur Chrome Android (Samsung), bien qu'il existe dans le code et le DOM.

### Faits établis (diagnostic via Playwright Chromium — profil Galaxy S20)

- **Footer présent dans le DOM** : `footerFound: true`, `footerTextVisible: true`, occupe le bas de la page (`footerRect top:-34 → bottom:664`, `scrollY: 14407 = bottom`).
- **Hit-testing OK** (`elementFromPoint`) : lit « © 2026 Ivoire Business Club » à `y=648`.
- **MAIS le screenshot ne le peint pas** : à la place on voit le bloc « Guide gratuit » + le mot géant « CLUB » (le fond vidéo fixe). Le footer est dans le DOM mais n'est pas rasterisé à l'écran.
- **Signature** : bug de composition GPU — l'élément existe (hit-testing OK) mais n'est pas peint.

### Cause identifiée (hypothèse forte) — combinaison de couches fixed/sticky + will-change/translate3d créant des couches GPU sur Chrome Android

1. **HeroShutter** (`src/components/landing/hero-shutter.tsx`) :
   - Container `h-[480vh]` (ligne 250) avec un viewport sticky (`sticky top-0 h-screen`).
   - `moverRef` avec `will-change-transform` (ligne 292) et `style.transform = translate3d(...)` (ligne 153) — crée une couche 3D.
   - Cette couche 480vh peut ne pas être correctement « fermée », laissant un contexte GPU qui ne libère pas le painting du contenu suivant.

2. **ScrollLoopBackground** (`src/components/landing/scroll-loop-background.tsx`) :
   - `<div className="fixed inset-0 z-0 ... bg-[#090D16]">` (ligne 50) + vidéo de fond — une couche fixe opaque couvrant tout l'écran à toutes les positions de scroll. Bien que `z-0` et `pointer-events-none`, son `background-color: #090D16` opaque peut participer au problème de composition.

3. **CTA sticky mobile** (`src/app/(public)/page.tsx` ligne 176) :
   - `fixed bottom-0 z-50` + `backdrop-blur` + `bg-[#090D16]/90`.

### Hypothèse

Sur Chrome Android, l'interaction de ces couches (un `will-change-transform` dans une section sticky de 480vh + un fond fixe opaque) empêche le GPU de rasteriser le footer qui suit en flux normal.

### Bug pré-existant (important)

`git diff 292ad69..HEAD` sur `footer.tsx`, `(public)/layout.tsx`, `layout.tsx`, `hero-shutter.tsx`, `scroll-loop-background.tsx`, `page.tsx` = **vide**. Le déploiement 30-1 (canonicalisation www → non-www) n'a touché que `src/lib/site-config.ts` + 2 fichiers de test. Ce bug **n'est pas causé** par le déploiement 30-1 — il existait avant.

## Objective

Rendre le footer effectivement peint (visible) en bas de la landing page sur Chrome Android / mobile, **sans régresser** le rendu desktop ni les animations du hero.

## Approches candidates à investiguer / corriger

### 1. Confinement de la couche GPU du HeroShutter

- Vérifier si `will-change-transform` (ligne 292) + `translate3d` du mover doivent être retirés ou remplacés par une technique moins agressive (ex. `will-change: auto`, ou appliquer le transform sur un wrapper isolé, ou `contain: layout style` sur le container sticky).
- Ajouter potentiellement `isolation: isolate` ou un `z-index` approprié sur la section hero pour fermer le contexte de paint et empêcher qu'il « avale » le footer.
- Tester si retirer `position: sticky` (ou le rendre non-sticky sur mobile) résout le problème.

### 2. Fond fixe ScrollLoopBackground

- Vérifier si le `fixed inset-0 bg-[#090D16]` opaque doit être à un `z-index` inférieur ou basculé en non-fixed sur mobile, ou recevoir `contain: paint`.

### 3. CTA sticky mobile (page.tsx ligne 176)

- Évaluer si la couche `fixed bottom-0` + `backdrop-blur` contribue au problème et nécessite un confinement.

## Acceptance Criteria

### AC1 — Footer visible sur Chrome Android (Gherkin)

```gherkin
Feature: Footer visible sur Chrome Android

  Scenario: Le footer est peint en bas de la landing page sur mobile Chrome Android
    Given un visiteur sur Chrome Android (Samsung Galaxy S20 profile)
    When le visiteur scroll jusqu'en bas de la landing page
    Then le footer est visiblement peint à l'écran (rasterisé)
    And le screenshot montre le contenu du footer ("© 2026 Ivoire Business Club", liens Contact, Légal, Newsletter)
    And le hit-testing elementFromPoint confirme le footer peint (pas seulement présent dans le DOM)
```

### AC2 — Pas de régression sur desktop (Gherkin)

```gherkin
  Scenario: Le footer reste visible sur desktop
    Given un visiteur sur desktop (Chromium 1440x900)
    When le visiteur scroll jusqu'en bas de la landing page
    Then le footer est visiblement peint à l'écran
    And le rendu desktop n'est pas altéré (pas de changement visuel inattendu)
```

### AC3 — Animations du hero préservées (Gherkin)

```gherkin
  Scenario: Les animations HeroShutter fonctionnent toujours
    Given un visiteur sur mobile ou desktop
    When le visiteur scroll dans la section hero
    Then l'animation de scrub vidéo (growing tree → loop) fonctionne
    And le mouvement du mover (slides de texte) fonctionne
    And la parallaxe du simulateur fonctionne (desktop)
```

### AC4 — Build passe

```gherkin
  Scenario: Le build n'est pas cassé
    When on lance `npm run build`
    Then le build se termine avec exit code 0
    And il n'y a pas d'erreur de compilation
```

### AC5 — Tests existants non régressés

```gherkin
  Scenario: La suite de tests n'est pas régressée
    When on lance `npx vitest run`
    Then tous les tests existants passent (pas de nouvelle régression)
```

## Tasks / Subtasks

- [ ] Task 1 — Diagnostic de composition GPU sur HeroShutter (AC: #1, #3)
  - [ ] 1.1 Analyser l'impact de `will-change-transform` (ligne 292) et `translate3d` (ligne 153) sur la composition Chrome Android
  - [ ] 1.2 Tester le retrait ou remplacement de `will-change-transform` par une approche moins agressive (`will-change: auto`, wrapper isolé, `contain: layout style`)
  - [ ] 1.3 Tester l'ajout de `isolation: isolate` ou un `z-index` approprié sur la section hero pour fermer le contexte de paint
  - [ ] 1.4 Évaluer si `position: sticky` doit être désactivé sur mobile
- [ ] Task 2 — Diagnostic de ScrollLoopBackground (AC: #1)
  - [ ] 2.1 Vérifier si le `fixed inset-0 bg-[#090D16]` opaque participe au problème de composition
  - [ ] 2.2 Tester `contain: paint` ou un `z-index` différent sur le conteneur fixe
  - [ ] 2.3 Évaluer le basculement en non-fixed sur mobile
- [ ] Task 3 — Diagnostic du CTA sticky mobile (AC: #1)
  - [ ] 3.1 Évaluer si `fixed bottom-0 z-50` + `backdrop-blur` contribue au problème
  - [ ] 3.2 Ajouter un confinement si nécessaire
- [ ] Task 4 — Vérification visuelle (AC: #1, #2, #3)
  - [ ] 4.1 Test Playwright Chromium profil Galaxy S20 — screenshot en bas de page montre le footer
  - [ ] 4.2 Test Playwright Chromium desktop 1440x900 — screenshot en bas de page montre le footer
  - [ ] 4.3 Test des animations hero (scrub vidéo, mover, parallaxe) — pas de régression
- [ ] Task 5 — Build et tests (AC: #4, #5)
  - [ ] 5.1 `npm run build` → exit 0
  - [ ] 5.2 `npx vitest run` → pas de régression

## Dev Notes

### Fichiers à modifier (candidats)

| Fichier | Lignes clés | Rôle dans le bug |
|---------|-------------|------------------|
| `src/components/landing/hero-shutter.tsx` | 250 (`h-[480vh]`), 253 (`sticky top-0`), 292 (`will-change-transform`), 153 (`translate3d`) | Contexte GPU non fermé — primaire suspect |
| `src/components/landing/scroll-loop-background.tsx` | 50 (`fixed inset-0 z-0 ... bg-[#090D16]`) | Couche fixe opaque — suspect secondaire |
| `src/app/(public)/page.tsx` | 176 (`fixed bottom-0 z-50 ... backdrop-blur`) | CTA sticky mobile — suspect tertiaire |

### Fichiers à NE PAS modifier

- `src/components/landing/footer.tsx` — le footer lui-même est correct (DOM présent, hit-testing OK). Le bug est en amont dans la composition des couches.
- `src/app/(public)/layout.tsx` — structure layout correcte (Footer rendu après main).
- `src/app/layout.tsx` — root layout non concerné.

### Architecture — guardrails pertinents

- **Next.js 16.2.6 + React 19.2.4 + App Router** — le projet est brownfield, étendre l'existant.
- **TailwindCSS 4.x** — utiliser les classes Tailwind pour les propriétés CSS (`isolate`, `contain-*` si disponibles, sinon inline style).
- **Performance** : Landing < 2s sur 3G — ne pas ajouter de couches GPU supplémentaires; viser à en retirer ou confiner.
- **JSX Boolean Guardrail** : pré-calculer les booléens composés avant le JSX return (ne pas utiliser `&&` dans JSX).
- **Mobile-first** : 80%+ trafic sur smartphones — le fix doit prioriser le rendu mobile sans sacrifier desktop.

### Approach technique recommandée

1. **Commençer par HeroShutter** (suspect primaire) :
   - Tester d'abord le retrait de `will-change-transform` → si le footer réapparaît, c'est la cause.
   - Si oui, remplacer par une technique alternative (ex. appliquer `will-change` seulement pendant l'animation active, ou `contain: layout style paint` sur le container sticky).
   - Ajouter `isolation: isolate` sur le container `h-[480vh]` pour créer un nouveau contexte d'empilement et « fermer » la couche GPU.
2. **Puis ScrollLoopBackground** (suspect secondaire) :
   - Ajouter `contain: paint` sur le div `fixed inset-0` ou tester un `z-index` négatif.
3. **Puis CTA sticky mobile** (suspect tertiaire) :
   - Ajouter `isolation: isolate` ou `contain: paint` si les deux premiers ne suffisent pas.

### Tests de validation

- **Playwright Chromium — profil Galaxy S20** : screenshot en bas de page, vérifier que le footer est peint (pas juste présent dans le DOM). Comparer avec le baseline (footer invisible — bloc « Guide gratuit » + « CLUB » visibles au lieu du footer).
- **Playwright Chromium — desktop 1440x900** : screenshot en bas de page, vérifier que le footer est toujours visible et que le rendu n'est pas altéré.
- **Tests des animations hero** : scrub vidéo (growing → loop), mover (slides de texte), parallaxe simulateur (desktop) — pas de régression.

### References

- [Source: src/components/landing/hero-shutter.tsx#L250-L253] — container 480vh + sticky viewport
- [Source: src/components/landing/hero-shutter.tsx#L292] — `will-change-transform` sur moverRef
- [Source: src/components/landing/hero-shutter.tsx#L153] — `translate3d(0, ${-currentMoverY}px, 0)`
- [Source: src/components/landing/scroll-loop-background.tsx#L50] — `fixed inset-0 z-0 ... bg-[#090D16]`
- [Source: src/app/(public)/page.tsx#L176] — CTA sticky mobile `fixed bottom-0 z-50 ... backdrop-blur`
- [Source: src/components/landing/footer.tsx#L7-L87] — footer component (correct, pas à modifier)
- [Source: src/app/(public)/layout.tsx#L5-L16] — public layout (Footer après main, correct)
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns] — guardrails architecture

## Guardrails

- Workflow BMAD normal : CS → DS → CR, commit + push après chaque étape.
- **Ne pas modifier** `src/components/landing/footer.tsx`, `src/app/(public)/layout.tsx`, `src/app/layout.tsx` — le bug est dans la composition des couches en amont, pas dans le footer lui-même.
- **Ne pas toucher** à `src/lib/site-config.ts` (scope du déploiement 30-1, non concerné).
- Bug pré-existant : ne pas attribuer au déploiement 30-1 (git diff confirme — les fichiers concernés n'ont pas changé entre 292ad69 et HEAD).

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
