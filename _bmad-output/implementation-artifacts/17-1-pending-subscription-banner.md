---
story_key: 17-1-pending-subscription-banner
title: "Bannière dashboard — abonnement en attente d'activation"
epic: 17
status: done
priority: medium
assignee: DS-agent
---

# Story 17-1: Bannière dashboard — abonnement en attente d'activation

## Contexte

Des membres s'inscrivent, complètent l'onboarding en choisissant un tier (AFFRANCHI / GRAND_FRERE / BOSS), mais ne finalisent jamais le paiement. Résultat : ils ont un tier sur leur profil User mais aucune Subscription active. Ils se retrouvent sur le dashboard sans reminder visuel les incitant à payer, et découvrent le blocage premium seulement en cliquant sur Opportunités ou Matching.

## Objectif

Afficher une bannière discrète mais visible sur la page dashboard principale (/dashboard) quand l'utilisateur a complété son onboarding mais n'a pas d'abonnement actif.

## Acceptance Criteria

### AC1 — Création du composant PendingSubscriptionBanner

- Le fichier `src/components/pending-subscription-banner.tsx` existe.
- C'est un server component (pas de "use client").
- Props : `tier: string` (le tier du User, ex: "BOSS", "AFFRANCHI", "GRAND_FRERE").
- Le composant affiche :
  - Un titre : "Votre offre [tier label] est en attente d'activation"
  - Un texte : "Finalisez votre paiement pour débloquer les opportunités business, le matching et les profils membres."
  - Un CTA bouton (Link) vers `/pricing/virement?tier=[tier]` avec le libellé "Finaliser mon paiement"
- Le tier label utilise la même map que le dashboard : `AFFRANCHI → "Les Affranchis"`, `GRAND_FRERE → "Les Grands Frères"`, `BOSS → "Les Boss"`
- Style : border amber, bg amber-50, similaire à PremiumAccessBlockedPanel (classes Tailwind : `rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100`)
- Pas de H1 dans le composant (le dashboard gère déjà le titre de page).
- `data-testid="pending-subscription-banner"` sur le conteneur.
- `data-testid="pending-subscription-cta"` sur le lien CTA.

### AC2 — Intégration dans la page dashboard

- La page `src/app/(dashboard)/dashboard/page.tsx` importe et affiche conditionnellement le composant `PendingSubscriptionBanner`.
- La bannière s'affiche SI ET SEULEMENT SI :
  - `user.onboardingCompletedAt !== null` (onboarding complété)
  - ET `user.role !== "ADMIN"` (pas admin)
  - ET `hasActiveSubscription(user.id) === false` (pas de subscription ACTIVE)
- La bannière s'affiche AVANT la section "Mon abonnement" (avant le div `mt-8 rounded-xl border bg-card p-6`).
- La bannière ne s'affiche pas si l'utilisateur est admin.
- La bannière ne s'affiche pas si l'utilisateur n'a pas complété l'onboarding.

### AC3 — Tests unitaires

- Le fichier `src/components/pending-subscription-banner.test.tsx` existe.
- Tests requis :
  1. Admin user → bannière non affichée
  2. User avec subscription ACTIVE → bannière non affichée
  3. User onboarding incomplet → bannière non affichée
  4. User BOSS sans subscription active + onboarding complété → bannière affichée avec tier label "Les Boss" et lien `/pricing/virement?tier=BOSS`
  5. User AFFRANCHI sans subscription active + onboarding complété → bannière affichée avec tier label "Les Affranchis" et lien `/pricing/virement?tier=AFFRANCHI`
- Les tests mockent `@/lib/subscription-access` (hasActiveSubscription) et `@/lib/prisma` selon le pattern établi dans le projet.

### AC4 — Build et tests passent

- `npm run build` passe sans erreur.
- `npx vitest run` passe pour les nouveaux tests.

## Technical Notes

### Fichiers à créer

1. `src/components/pending-subscription-banner.tsx` — le composant server-side
2. `src/components/pending-subscription-banner.test.tsx` — les tests unitaires

### Fichiers à modifier

1. `src/app/(dashboard)/dashboard/page.tsx` — ajouter l'import et l'affichage conditionnel

### Dépendances existantes à utiliser

- `src/lib/subscription-access.ts` — `hasActiveSubscription(userId: string): Promise<boolean>` (déjà gère le cas admin → retourne true)
- `src/components/premium-access-blocked-panel.tsx` — référence visuelle pour le style
- `src/lib/auth.ts` — `auth()` pour récupérer la session
- `src/lib/prisma.ts` — `prisma` pour récupérer le User

### Pattern de test

Suivre le pattern de `src/app/(dashboard)/dashboard/opportunities/page.test.tsx` :
- `vi.hoisted()` pour les mocks
- `vi.mock("@/lib/auth", ...)` 
- `vi.mock("@/lib/subscription-access", ...)`
- `vi.mock("@/lib/prisma", ...)`
- `render()` + `screen.getByTestId()` / `screen.getByText()` / `screen.queryByTestId()`

### Contraintes Next.js 16

- PAS de `&&` dans JSX pour le rendu conditionnel (pitfall 22.5). Utiliser des ternaires : `{condition ? <JSX> : null}`
- Le composant est un server component (pas de "use client")

## Dev Agent Record

### Steps Completed

- [ ] Step 1: Create PendingSubscriptionBanner component
- [ ] Step 2: Integrate into dashboard page
- [ ] Step 3: Create unit tests
- [ ] Step 4: Build passes
- [ ] Step 5: Tests pass

### File List

_To be filled by DS agent_

### Test Results

_To be filled by DS agent_

Status: done