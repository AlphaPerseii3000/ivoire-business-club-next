---
baseline_commit: "581fdc4672f1c26bfd1ddae50a59dabeae62b37d"
status: done
---

# Story 30-2: Réparer les tests events date-sensibles + réconcilier les docs de déploiement

## Status: done

## Source

Deux findings defer du CR de la story **30-1** (canonicalisation www / non-www), hors scope de celle-ci mais à traiter : (1) deux tests « S'inscrire » de la page événement cassés à cause d'une date de fixture passée, (2) des docs de déploiement documentant encore `www` comme canonique, à l'inverse de la réalité de production.

## Contexte

### Tâche 1 — Tests events date-sensibles cassés

Le fichier `src/app/(public)/events/[slug]/page.test.tsx` utilise un fixture `baseEvent` avec `startDate: new Date("2026-07-15T10:00:00Z")` (lignes 36-37). Cette date est maintenant **dans le passé** (aujourd'hui : 2026-08-11). En conséquence, le composant `EventRegisterButton` rend « Événement terminé » au lieu de « S'inscrire à l'événement » (logique lignes ~131-134 du composant). Les 2 tests qui vérifient le rendu du bouton d'inscription échouent.

La cause n'est pas un bug de code mais un **fixture devenu obsolète** : la date doit être avancée vers le futur.

### Tâche 2 — Docs de déploiement contradictoires (canonical non-www)

`scripts/DEPLOY.md` et `docs/cron-setup.md` documentent encore `www.ivoire-business-club.com` comme **canonique**, avec non-www redirigeant vers www — l'inverse de la réalité : la production sert **non-www** (`https://ivoire-business-club.com` → 200) et `www` → 301 → non-www (alignement fait dans la Story 30-1 via le défaut de `SITE_URL`). Les deux fichiers contiennent de nombreuses occurrences de `www.ivoire-business-club.com` à corriger pour refléter que **non-www est le canonique** et que **www redirige vers non-www**.

## Correction proposée

### Tâche 1 — Fixture de date future

Dans `src/app/(public)/events/[slug]/page.test.tsx` :
- Bumper `startDate` et `endDate` du fixture `baseEvent` vers une date **future** (ex. `2027-01-15`).
- Mettre à jour en cohérence les assertions de date des tests (ex. `getByText("15 juillet 2026")` → `"15 janvier 2027"`, `getByText("Jusqu\u2019au 15 juillet 2026")` → `"Jusqu\u2019au 15 janvier 2027"`).

### Tâche 2 — Réconcilier les docs de déploiement

Dans `scripts/DEPLOY.md` et `docs/cron-setup.md` :
- Mettre à jour pour refléter que **non-www** est le canonique et que **www redirige vers non-www**.
- Corriger toutes les occurrences de `www.ivoire-business-club.com` dans ces 2 fichiers selon la réalité de production (non-www canonique).

## Acceptance Criteria

### AC1 — Les 2 tests events « S'inscrire » passent (fixture date future)

- `npx vitest run "src/app/(public)/events/[slug]/page.test.tsx"` → les 2 tests « S'inscrire » passent (fixture `baseEvent` avec date future `2027-01-15`).
- Les assertions de date (`15 juillet 2026`, `Jusqu'au 15 juillet 2026`) sont mises à jour en cohérence (`15 janvier 2027`, `Jusqu'au 15 janvier 2027`).

### AC2 — Suite complète verte (pas de régression)

- `npx vitest run` passe sans régression.

### AC3 — Plus de référence `www` comme canonique dans les docs

- `scripts/DEPLOY.md` ne contient plus de référence à `www` comme canonique (non-www est le canonique, `www` → 301 → non-www).
- `docs/cron-setup.md` ne contient plus de référence à `www` comme canonique (même logique).

### AC4 — Build passe

- `npm run build` passe sans erreur.

## Guardrails

- Workflow BMAD normal : CS → DS → CR, commit + push après chaque étape.
- **Ne pas toucher** à `src/lib/site-config.ts` ni aux autres fichiers (hors `src/app/(public)/events/[slug]/page.test.tsx`, `scripts/DEPLOY.md`, `docs/cron-setup.md`).

## Dev Agent Record

- **Date de découverte** : 2026-08-11 (CR de la Story 30-1).
- **Tâche 1** : fixture `baseEvent` avec `startDate/endDate = 2026-07-15` (passé) → 2 tests « S'inscrire » cassés (« Événement terminé » au lieu de « S'inscrire à l'événement »). Correction : date future `2027-01-15` + assertions de date alignées.
- **Tâche 2** : `scripts/DEPLOY.md` (42 occurrences de `www`) et `docs/cron-setup.md` (3 occurrences) documentent `www` comme canonique — inverse de la prod (non-www canonique, `www` → 301 → non-www). Correction des 2 fichiers.

## Verification (2026-08-11)

- **Baseline commit DS** : `581fdc4` (CS commit), commit d'implémentation : `fe62810`.
- **Fichiers modifiés** (3, conformes guardrails) : `src/app/(public)/events/[slug]/page.test.tsx`, `scripts/DEPLOY.md`, `docs/cron-setup.md`. `src/lib/site-config.ts` NON touché.
- **AC1** ✅ : `npx vitest run "src/app/(public)/events/[slug]/page.test.tsx"` → 23/23 passed.
- **AC2** ✅ : `npx vitest run` → 185 files, 1374 tests passed, aucune régression.
- **AC3** ✅ : plus aucune occurrence de `www` comme canonique dans les 2 docs — les occurrences restantes sont des références légitimes à la redirection `www` → 301 → non-www.
- **AC4** ✅ : `npm run build` passe (exit 0).
- **Statut** : story marquée `done` (frontmatter + corps + sprint-status.yaml).
