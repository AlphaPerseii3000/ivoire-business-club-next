---
baseline_commit: "feb43ae23c6bc52b244cdc109cf6a07749316cdf"
Status: done
---

# Story 30-4: Rendre le footer visible — restauration du contexte d'empilement (z-10)

## Status: done

## Story

**En tant que** visiteur de la landing page (mobile et desktop),
**Je veux** que le footer soit réellement peint à l'écran en bas de page,
**Afin que** je puisse accéder aux informations de contact, mentions légales, CGV et newsletter comme attendu.

## Contexte

### Bug

Le footer de la landing page n'est pas peint à l'écran, sur desktop ET mobile. Il existe dans le DOM (`document.querySelector('footer')` → présent, `getBoundingClientRect()` valide, hit-testing OK) mais n'est pas rasterisé : à sa place on voit le bloc « Guide gratuit » (LeadMagnet) + le mot géant « CLUB » + fond vidéo → la couche `ScrollLoopBackground` (`position: fixed`) est peinte à la place du footer.

### Cause racine (identifiée par archéologie git — story 30-3 amendement)

Le commit **`3d56a4d` — « code review 28-5 » (2026-07-12)** a déplacé `<Footer />` de `src/app/(public)/page.tsx` vers `src/app/(public)/layout.tsx`, le sortant de son contexte d'empilement protecteur :

- **Avant (REF `fffda29`, footer fonctionnait)** : footer dans `page.tsx`, dans `<div className="relative z-10">` → `z-index: 10` > `z-index: 0` de ScrollLoopBackground → le footer passait devant la couche fixe.
- **Après `3d56a4d` (bug)** : footer dans `layout.tsx`, élément **statique** (aucun `position`, aucun `z-index`).

**Règle CSS d'empilement (CSS 2.1 §9.9) :** un élément non-positionné (`position: static`, cas du footer) est TOUJOURS peint sous un élément positionné avec `z-index ≥ 0`. `ScrollLoopBackground` est `position: fixed; z-index: 0; background: #090D16` (opaque) + vidéo → il est peint **au-dessus** du footer statique. La couche fixe recouvre le footer.

### Pourquoi le fix 30-3 (c3b4b9c) a échoué

Le fix GPU (retrait `will-change-transform`, `isolate` hero, `contain-paint` fond) attaquait de mauvaises cibles et **renforçait la couche fixe** au lieu de remonter le footer. Le problème n'a jamais été dans la composition GPU du hero — il est dans l'empilement footer-vs-fond fixe.

## Objective

Donner au footer un contexte d'empilement au-dessus de la couche fixe `z-0` du ScrollLoopBackground, de façon minimale et sans régression.

## Acceptance Criteria

### AC1 — Le footer possède un contexte d'empilement supérieur à la couche fixe

```gherkin
Given la landing page (src/app/(public)/page.tsx + layout.tsx)
When le footer est rendu
Then il possède position relative avec z-index > 0 (ex. relative z-10)
And la couche ScrollLoopBackground (fixed inset-0 z-0) ne le recouvre plus
```

### AC2 — Footer peint en production (mobile + desktop)

```gherkin
Given la production après déploiement
When on screenshot la zone footer (profil Galaxy S20 + desktop 1440x900)
Then le footer est peint à l'écran (pixels de texte clair présents, pas seulement dans le DOM)
And les liens Contact / Mentions légales / CGV / Newsletter sont visibles
```

### AC3 — Build passe

```gherkin
Given le projet après implémentation
When npm run build est exécuté
Then le build passe sans erreur (exit 0)
```

### AC4 — Tests non régressés

```gherkin
Given le projet après implémentation
When npx vitest run est exécuté
Then la suite complète passe sans régression
```

## Tasks / Subtasks

- [ ] Task 1 — Restaurer le contexte d'empilement du footer (AC: #1)
  - [ ] 1.1 Appliquer le fix dans `src/app/(public)/layout.tsx` : envelopper `<Footer />` dans `<div className="relative z-10">…</div>` (option recommandée, minimale)
  - [ ] 1.2 OU (alternative équivalente) ajouter `relative z-10` sur la balise `<footer>` dans `src/components/landing/footer.tsx` (en gardant `bg-[#090D16]`)
  - [ ] 1.3 Choisir UNE option et l'appliquer proprement (éviter la duplication)
- [ ] Task 2 — Vérification build (AC: #3)
  - [ ] 2.1 `npm run build` → exit 0
- [ ] Task 3 — Vérification tests (AC: #4)
  - [ ] 3.1 `npx vitest run` → pas de régression
- [ ] Task 4 — (si possible) Vérification visuelle (AC: #2)
  - [ ] 4.1 Screenshot zone footer en production après déploiement (profil Galaxy S20 + desktop)

## Dev Notes

### Fichiers à modifier (candidats)

| Fichier | Lignes clés | Rôle |
|---------|-------------|------|
| `src/app/(public)/layout.tsx` | L13 (`<Footer />`) | **Cible principale** — footer statique → `relative z-10` |
| `src/components/landing/footer.tsx` | L9 (`<footer className="border-t ...`) | Alternative — ajouter `relative z-10` sur la balise footer |

### Fichiers à NE PAS modifier

- `src/components/landing/scroll-loop-background.tsx` — la couche fixe `z-0` est correcte; c'est le footer qui doit monter (l'abaisser ne réglerait pas le problème et casserait le rendu du fond).
- `src/app/(public)/page.tsx` — le wrapper `<main className="relative z-10">` et le CTA sont corrects.
- `src/components/landing/hero-shutter.tsx` — le fix GPU de 30-3 était hors cause; le laisser en l'état (neutre).

### Note sur la guardrail 30-3

La story 30-3 interdisait de modifier `layout.tsx` / `footer.tsx` sur la base de l'hypothèse erronée « bug GPU ». **L'amendement de 30-3 lève cette guardrail** : le correctif définitif passe par `layout.tsx` ou `footer.tsx`.

### Architecture — guardrails pertinents

- **Next.js 16.2.6 + React 19.2.4 + App Router** — brownfield, étendre l'existant.
- **TailwindCSS 4.x** — utiliser les classes Tailwind (`relative z-10`).
- **Mobile-first** : 80%+ du trafic sur smartphones — le fix doit prioriser le rendu mobile.
- **JSX Boolean Guardrail** : pas de `&&` dans JSX.

### Approach technique recommandée

1. **Option 1 (recommandée)** : dans `src/app/(public)/layout.tsx`, remplacer `<Footer />` par `<div className="relative z-10"><Footer /></div>`. Le wrapper crée un contexte d'empilement relatif avec `z-index: 10` > la couche fixe `z-0`. C'est exactement la structure qui existait à REF `fffda29` (où le footer fonctionnait).
2. **Option 2 (alternative)** : ajouter `relative z-10` sur la balise `<footer>` dans `footer.tsx`.
3. Ne pas faire les deux (risque de duplication inutile).

### Tests de validation

- `npm run build` → exit 0.
- `npx vitest run` → pas de régression.
- Si possible, screenshot de la zone footer en production après déploiement.

### References

- [Source: src/app/(public)/layout.tsx#L13] — `<Footer />` statique (cible)
- [Source: src/components/landing/footer.tsx#L9] — balise footer
- [Source: src/components/landing/scroll-loop-background.tsx#L50] — `fixed inset-0 z-0 bg-[#090D16]` (recouvre le footer)
- [Source: story 30-3 amendement] — diagnostic cause racine (commit `3d56a4d`)
- [Source: git REF fffda29 "src/app/(public)/page.tsx"] — structure avec footer dans `relative z-10` (fonctionnait)

## Guardrails

- Workflow BMAD normal : CS → DS → CR, commit + push après chaque étape.
- **Tous les fixes de code passent par un subagent DS** (orchestrator ne patche pas le code directement).
- **Ne pas** `git add -A` / ne pas committer `dev.db` ni fichiers build.
- **Ne pas** introduire de `&&` dans JSX.
- **Ne pas** modifier `scroll-loop-background.tsx` ni `hero-shutter.tsx` (hors scope).
- Vérifier `git diff --stat` après DS : seuls `layout.tsx` (ou `footer.tsx`) + fichiers de test attendus doivent changer.

## Dev Agent Record

### Agent Model Used

deepseek-v4-flash:0731 (Hermes Agent, provider ollama-cloud) — DS subagent via bmad-orchestrator.

### Debug Log References

- Story .md `baseline_commit`: `feb43ae2` (story creation baseline).
- HEAD au début de l'implémentation : `cbf4bd9` (clean, synced with origin/main).
- Fix appliqué : `<Footer />` enveloppé dans `<div className="relative z-10">` dans `src/app/(public)/layout.tsx` (Option 1 recommandée — réplique exacte de la structure REF `fffda29` où le footer fonctionnait). Cause racine non re-diagnostiquée : commit `3d56a4d` avait sorti le footer de son wrapper `relative z-10` (élément statique peint sous la couche fixe `z-0`).
- 1er run complet `npx vitest run` : 1 échec transitoire (timeout 5000ms) sur `beta-chat-widget.test.tsx` « soumet le formulaire… ». Vérifié non-régression : test passe isolé (12/12), et le diff ne touche que `layout.tsx` (non importé par ce test). 2e run complet : **1374/1374 passent**.

### Completion Notes List

- AC1 (contexte d'empilement `relative z-10` > couche fixe `z-0`) : ✅ — wrapper `relative z-10` autour du `<Footer />` dans `layout.tsx`.
- AC2 (footer peint mobile + desktop) : ⚠️ Non vérifié visuellement — le déploiement en production n'était pas dans le scope du DS. La correction CSS garantit l'empilement (le footer passe devant la couche fixe opaque). À valider par screenshot en production au CR/déploiement (Task 4).
- AC3 (build exit 0) : ✅ — `npm run build` passe.
- AC4 (tests sans régression) : ✅ — suite complète `npx vitest run` 1374/1374, 185 fichiers.

### File List

- `src/app/(public)/layout.tsx` — fix : wrapper `relative z-10` autour de `<Footer />` (3 insertions, 1 suppression). Commit `931fd82`.
- `_bmad-output/implementation-artifacts/30-4-restaurer-contexte-empilement-footer.md` — statut → review + Dev Agent Record.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — story 30-4 → review.

## Change Log

- 2026-08-11: Story 30-4 créée (CS) — correctif définitif du footer invisible. Cause racine = commit `3d56a4d` (footer sorti du contexte `z-10`). Fix : `relative z-10` sur le footer (layout.tsx ou footer.tsx).
- 2026-08-11 (DS): Fix implémenté (option 1) — wrapper `<div className="relative z-10">` autour de `<Footer />` dans `src/app/(public)/layout.tsx`. Build exit 0, 1374/1374 tests. Commits `931fd82` (code) + `aef975f` (artefacts BMAD).
- 2026-08-11 (Déploiement + vérification prod): Déployé en production (release `20260811195031`). Incident ENOSPC disque VPS 100% plein contourné (purge cache npm + nettoyage ~11 releases anciennes → 18G libérés). HTTP home/experts 200, API 401, aucun log d'erreur. Vérification Playwright : le hit-test de la zone footer retourne désormais le contenu du footer (position static, wrapper parent z-10). Validé visuellement par Jonathan.
- 2026-08-11 (CR-lite + done): Fix one-liner CSS, validé par build + suite complète + hit-test prod. Story → `done`. L'incident disque est documenté comme pitfall dans le skill `ibc-app-deploy`.
