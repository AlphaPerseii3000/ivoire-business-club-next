---
baseline_commit: a0601ac
---
# Story 9.5: Réactions et Engagement sur les Articles

Status: done

## Story

**En tant que** membre de l'Ivoire Business Club,  
**Je veux** pouvoir réagir aux articles publiés en choisissant parmi plusieurs émotions interactives (J'aime, Bravo, Inspirant),  
**Afin de** partager mon intérêt et de dynamiser l'engagement communautaire autour du contenu éditorial.

## Acceptance Criteria

1. **Choix et type des réactions**
   - **Given** un article sur la page de détail
   - **When** un membre connecté consulte l'article
   - **Then** il a accès à 3 types de réactions : `LIKE` (J'aime), `CLAP` (Bravo / Cœur), et `INSIGHTFUL` (Inspirant / Sparkles).

2. **Toggle et exclusivité de réaction**
   - **Given** un utilisateur connecté ayant déjà réagi à un article
   - **When** il clique à nouveau sur la même réaction
   - **Then** sa réaction est retirée (toggle off) et le compteur décrémente.
   - **When** il clique sur une autre réaction
   - **Then** sa réaction précédente est automatiquement remplacée par la nouvelle et les compteurs se mettent à jour (une seule réaction active par utilisateur et par article).

3. **Mises à jour dynamiques et UI/UX Premium**
   - **Given** le composant de réactions
   - **When** un utilisateur réagit
   - **Then** l'interface effectue une mise à jour optimiste (optimistic update) instantanée, affiche les compteurs mis à jour avec une micro-animation fluide (Framer Motion) et persiste le choix via une API.

4. **Restriction des visiteurs anonymes**
   - **Given** un visiteur non connecté
   - **When** il tente de réagir à un article
   - **Then** les boutons sont inactifs et un message d'erreur/toast l'invite à s'authentifier.

5. **Tests de validation unitaires et E2E**
   - **Given** la suite de tests Vitest et Playwright
   - **When** elle est exécutée
   - **Then** tous les tests unitaires de l'API de réactions et les tests E2E Playwright de comportement passent avec succès.

## Tasks / Subtasks

- [x] **Mise à jour du schéma de base de données (AC: 1, 2)**
  - [x] Ajouter l'enum `ReactionType` (`LIKE`, `CLAP`, `INSIGHTFUL`) et le modèle `ArticleReaction` dans `prisma/schema.prisma` et `prisma/schema.dev.prisma` avec une contrainte unique sur `(userId, articleId)`.
  - [x] Exécuter la migration Prisma et mettre à jour le client généré.
  - [x] Mettre à jour `prisma/seed.ts` pour y inclure des utilisateurs de test E2E avec abonnements actifs.

- [x] **Création des API Routes (AC: 2, 4)**
  - [x] Créer la route GET `src/app/api/articles/[id]/reactions/route.ts` pour récupérer le décompte global de chaque réaction et l'éventuelle réaction de l'utilisateur connecté.
  - [x] Créer la route POST `src/app/api/articles/[id]/reactions/route.ts` pour enregistrer/basculer/modifier la réaction de l'utilisateur avec validation de session (NextAuth).

- [x] **Composant UI interactif et Premium (AC: 1, 2, 3, 4)**
  - [x] Créer le composant client `src/components/features/articles/ArticleReactions.tsx` avec Framer Motion (animations de survol, transition tween ease-in-out stable pour éviter le bug des keyframes multiples Spring de Framer Motion 12).
  - [x] Intégrer la logique d'optimistic updates pour rendre l'interaction instantanée.
  - [x] Gérer les toasts Sonner pour avertir les visiteurs non connectés.
  - [x] Intégrer le composant dans la page détail `src/app/(public)/articles/[slug]/page.tsx` dans la zone de lecture autorisée.

- [x] **Tests et robustesse (AC: 5)**
  - [x] Écrire les tests unitaires pour la route d'API dans `src/app/api/articles/[id]/reactions/route.test.ts`.
  - [x] Ajouter les scénarios de test E2E dans `e2e/articles.spec.ts` pour valider l'affichage, le clic de réaction et le basculement (toggle).
  - [x] Fiabiliser le test de seeding asynchrone dans `src/app/api/articles/route.test.ts` en ajoutant un délai de synchronisation de 50 ms.
  - [x] Augmenter le timeout Playwright à 15 000 ms pour l'apparition du composant sur `articles.spec.ts` afin de tolérer les temps de compilation à la volée de Next.js en dev.

## Dev Notes

### Architecture & Intégration
- **Prisma & Relations** : Une relation un-à-plusieurs lie `User` et `Article` à `ArticleReaction`. La contrainte unique composite `@@unique([userId, articleId])` assure qu'un utilisateur ne peut poser qu'une seule réaction par article à la fois.
- **Framer Motion 12** : Les animations Spring à plus de 2 keyframes (ex: `scale: [1, 1.3, 1]`) lèvent des erreurs internes dans la version 12 de Framer Motion. Nous avons utilisé des transitions de type `tween` avec un easing `easeInOut` pour contourner ce comportement et garantir la fluidité.
- **Micro-tâches asynchrones dans Vitest** : Le fichier `seed.ts` exécutant `main()` de manière asynchrone à l'import dynamique, l'event-loop de test a besoin d'être relâchée temporairement (via un `setTimeout` de 50 ms) pour que les mocks de Prisma enregistrent l'intégralité des appels de création d'articles avant les assertions.

### Fichiers impactés ou créés
- `prisma/schema.prisma` (MODIFIED)
- `prisma/schema.dev.prisma` (MODIFIED)
- `prisma/seed.ts` (MODIFIED)
- `src/app/(public)/articles/[slug]/page.tsx` (MODIFIED)
- `src/components/features/articles/ArticleReactions.tsx` (NEW)
- `src/app/api/articles/[id]/reactions/route.ts` (NEW)
- `src/app/api/articles/[id]/reactions/route.test.ts` (NEW)
- `src/app/api/articles/route.test.ts` (MODIFIED)
- `e2e/articles.spec.ts` (MODIFIED)
- `e2e/fixtures/auth.ts` (MODIFIED)
- `playwright.config.ts` (MODIFIED)

## Dev Agent Record

### Agent Model Used

Gemini 3.5 Flash (Medium) & Antigravity pair-programming framework.

### Debug Log References
- `task-826` : Exécution réussie et validée à 100 % de la suite de tests unitaires `route.test.ts` après l'application du fix asynchrone.
- `task-834` : Exécution et validation à 100 % des tests E2E Playwright sur Chromium avec le timeout de compilation ajusté à 15s.
- `task-851` : Succès total de l'exécution séquentielle globale des 97 fichiers de tests unitaires Vitest (577/577 tests passés).

### Completion Notes List
- Intégration d'un modèle de réactions relationnel avec Prisma.
- Création d'une API propre avec gestion des permissions et de la session utilisateur.
- Développement d'un composant de réactions haut de gamme avec optimistic updates et animations fluides compatibles Framer Motion 12.
- Couverture de test complète (unitaires et E2E) avec résolution des faux-positifs et des conditions de concurrence asynchrones.

### File List
- src/components/features/articles/ArticleReactions.tsx
- src/app/api/articles/[id]/reactions/route.ts
- src/app/api/articles/[id]/reactions/route.test.ts
- src/app/(public)/articles/[slug]/page.tsx
- e2e/articles.spec.ts

### Review Findings

- [x] [Review][Patch] Conflits d'asynchronisme dans les assertions Vitest pour `seed.ts` résolus par temporisation de l'event loop.
- [x] [Review][Patch] Timeout de 5s dépassé sous Playwright à cause de la compilation webpack à la volée, résolu par l'élévation du timeout d'attente à 15s pour le composant.
- [x] [Review][Patch] Erreur d'animation Framer Motion 12 sur les keyframes multiples spring résolue par l'usage d'une transition tween.
