---
story_id: 18.2
story_key: 18-2-beta-chat-widget-ui
epic: 18 - Chat de Support Beta & Feedback Membres
status: done
baseline_commit: c021940306bb7cca9119db89796293e008a7e5f6
created: 2026-06-29
updated: 2026-06-29T09:16:30+02:00
language: fr
---

# Story 18.2 : Widget UI de Chat de Support Bêta

## Story

**En tant que** membre connecté de la plateforme IBC en phase bêta,
**je veux** disposer d'un bouton flottant ouvrant une fenêtre de chat,
**afin de** signaler un bug, remonter un problème d'accessibilité, soumettre une demande d'intégration ou envoyer un feedback sans quitter la plateforme.

## Contexte

Cette story est la **couche UI** de l'Epic 18. Elle consomme exclusivement les APIs créées dans la Story 18-1 :

- `POST /api/chat/messages` — soumettre un message membre.
- `GET /api/chat/messages` — récupérer l'historique paginé.
- `GET /api/chat/unread` — compteur de réponses non lues.

Aucun travail backend n'est attendu ici. Ne pas modifier `prisma/schema.prisma`, ne pas toucher aux routes `/api/chat/*`, ne pas créer de nouvelle route ou table.

Le composant `BetaChatWidget` doit être visible sur **toutes les pages** pour les membres authentifiés uniquement. L'intégration s'effectue dans `src/app/layout.tsx` (root) et `src/app/(dashboard)/layout.tsx` afin de couvrir les zones publiques et le dashboard.

## Acceptance Criteria

### AC1 — Bouton flottant visible pour les membres connectés

**Given** un membre connecté naviguant sur l'application  
**When** le layout principal est rendu  
**Then** un bouton flottant `BetaChatWidget` est affiché en bas à gauche (`position: fixed; bottom: 1.5rem; left: 1.5rem; z-index: 50`)  
**And** il n'est pas visible pour les utilisateurs non authentifiés

### AC2 — Ouverture du panneau de chat avec bannière bêta

**Given** le widget de chat  
**When** le membre clique sur le bouton flottant  
**Then** un panneau (Sheet) ou une fenêtre (Dialog) s'ouvre avec une bannière claire :  
> « 🚧 Plateforme en phase bêta — Votre feedback nous aide à nous améliorer »

### AC3 — Formulaire de message avec catégorie

**Given** le formulaire de chat  
**When** le membre sélectionne une catégorie (Bogue, Accessibilité, Intégration, Autre), écrit un message (max 5000 caractères) et clique sur envoyer  
**Then** le message est POSTé sur `/api/chat/messages` avec `{ category, content }`  
**And** le message s'affiche instantanément dans l'historique  
**And** l'auto-acknowledgement système retourné par l'API s'affiche immédiatement en dessous  
**And** le compteur de caractères est visible

### AC4 — Historique des messages et réponses

**Given** le widget ouvert  
**When** il est rendu  
**Then** l'interface charge `GET /api/chat/messages` et affiche :
- les messages du membre (auteur MEMBER)
- l'auto-acknowledgement (auteur SYSTEM)
- les réponses de l'équipe (auteur HERMES)

Les messages sont triés du plus ancien au plus récent dans la vue.

### AC5 — Indicateur de statut en ligne/hors ligne

**Given** le widget de chat  
**When** le membre le consulte  
**Then** il voit un indicateur de statut :
- « En ligne » si la dernière réponse HERMES date de moins de 30 minutes
- « Hors ligne » si pas de réponse HERMES depuis plus de 30 minutes (ou aucune réponse)

### AC6 — Badge de messages non lus

**Given** le bouton flottant fermé  
**When** des réponses HERMES ou des messages SYSTEM n'ont pas été lus  
**Then** un badge numérique rouge apparaît sur le bouton flottant indiquant le nombre de non-lus  
**And** ce compteur provient de `GET /api/chat/unread`

### AC7 — Animation d'ouverture/fermeture sans flash SSR

**Given** le widget  
**When** le panneau s'ouvre ou se ferme  
**Then** une animation Framer Motion est appliquée  
**And** `initial={false}` est utilisé sur le wrapper motion afin d'éviter le flash d'opacité 0 au SSR/hydratation

## Tasks / Subtasks

- [ ] **T1 — Créer le composant `BetaChatWidget`** (AC1, AC2, AC7)
  - [ ] Créer `src/components/features/chat/beta-chat-widget.tsx` avec `"use client"` en début de fichier
  - [ ] Créer le bouton flottant positionné en bas à gauche avec `z-50`
  - [ ] Créer le panneau chat avec `Sheet` ou `Dialog` (existant shadcn/ui)
  - [ ] Ajouter la bannière bêta avec le texte exact requis
  - [ ] Envelopper le panneau avec `motion.div` de Framer Motion en utilisant `initial={false}`

- [ ] **T2 — Formulaire et sélecteur de catégorie** (AC3)
  - [ ] Ajouter un sélecteur de catégorie : Bogue, Accessibilité, Intégration, Autre
  - [ ] Ajouter un `Textarea` avec limite de 5000 caractères et compteur visuel
  - [ ] Ajouter le bouton d'envoi
  - [ ] Appeler `POST /api/chat/messages` au submit
  - [ ] Afficher le message envoyé et l'acknowledgement SYSTEM immédiatement dans l'historique

- [ ] **T3 — Affichage de l'historique** (AC4)
  - [ ] Appeler `GET /api/chat/messages` au montage du panneau
  - [ ] Différencier visuellement les auteurs MEMBER / SYSTEM / HERMES
  - [ ] Ordonner l'affichage du plus ancien au plus récent
  - [ ] Gérer les états de chargement et d'erreur

- [ ] **T4 — Indicateur de statut et badge unread** (AC5, AC6)
  - [ ] Implémenter la logique « en ligne » si dernière réponse HERMES < 30 min, sinon « hors ligne »
  - [ ] Appeler `GET /api/chat/unread` régulièrement et/ou à l'ouverture
  - [ ] Afficher un badge numérique rouge sur le bouton flottant quand `unreadCount > 0`
  - [ ] Marquer les messages comme lus côté client lors de l'ouverture du widget (PATCH local n'est pas requis ; l'API compte `readAt = null`, voir Dev Notes)

- [ ] **T5 — Intégration dans les layouts** (AC1)
  - [ ] Importer et insérer `<BetaChatWidget />` dans `src/app/layout.tsx`
  - [ ] Importer et insérer `<BetaChatWidget />` dans `src/app/(dashboard)/layout.tsx`
  - [ ] S'assurer que le composant est conditionné à une session authentifiée (membre ou admin)

- [ ] **T6 — Tests et validation** (tous AC)
  - [ ] Ajouter des tests unitaires pour `BetaChatWidget` (mock fetch, mock session)
  - [ ] Exécuter `npm run build`
  - [ ] Exécuter `npx vitest run` (ou `npm test -- --run`)

## Dev Notes

### Architecture et conventions

- **Client-only** : `BetaChatWidget` et tous ses sous-composants interactifs doivent commencer par `"use client"`. Ne pas placer de logique interactive dans un Server Component.
- **Auth gating** : le widget doit être conditionné à l'existence d'une session utilisateur. Utiliser `useSession()` de `next-auth/react` (déjà utilisé par `AuthProvider` dans le root layout) ou un pattern équivalent. Le widget n'apparaît pas pour les visiteurs non connectés.
- **Framer Motion SSR** : utiliser `initial={false}` sur le wrapper motion du panneau pour éviter le flash `opacity: 0` lors du SSR/hydratation. Si un accès à `localStorage` est nécessaire (ex. persistance de l'état ouvert/fermé), utiliser le pattern monté (`useState(false)` + `useEffect(() => setMounted(true), [])`) et ne lire `localStorage` que dans l'effet.
- **JSX Boolean Guardrail (Next.js 16 strict)** : ne JAMAIS utiliser `&&` dans une expression JSX, y compris à l'intérieur de conditions ternaires. Pré-calculer chaque booléen composé dans une `const` avant le `return`. Exemple incorrect : `{!isLoading && !error ? <Form /> : null}`. Correct : `const showForm = !isLoading && !error; return {showForm ? <Form /> : null}`.
- **API Response Format** : attendre les réponses `{ data: T }` pour les succès et `{ error: string, code?: string }` pour les erreurs. Voir [Source: `_bmad-output/planning-artifacts/architecture.md` § API Response Format].
- **Route handlers à consommer** (implémentés par Story 18-1) :
  - `POST /api/chat/messages` — payload `{ category, content }`, retourne `201 { data: { message, ack } }`.
  - `GET /api/chat/messages?page=&limit=` — retourne `200 { data: { messages, total, page, limit } }`.
  - `GET /api/chat/unread` — retourne `200 { data: { unreadCount } }`.
- **Catégories** : les valeurs exactes attendues par l'API sont `bug_technique`, `accessibilite`, `demande_integration`, `autre` (minuscules, snake_case). Labels d'affichage : Bogue, Accessibilité, Intégration, Autre.
- **Auteurs** : valeurs Prisma `MEMBER`, `SYSTEM`, `HERMES`. L'acknowledgement est `SYSTEM`. Les réponses de l'équipe sont `HERMES`.
- **Statut en ligne/hors ligne** : comparer `createdAt` du dernier message `author === "HERMES"` avec `Date.now() - 30 * 60 * 1000`.
- **Marquage comme lu** : l'API `/api/chat/unread` compte les messages `author IN [HERMES, SYSTEM]` dont `readAt` est `null`. Pour cette story, l'ouverture du widget peut simplement réinitialiser le badge local via l'état React sans implémenter de route PATCH ; l'indicateur visuel de non-lu est suffisant pour la V1. Si un appel de marquage est ajouté, il doit être strictement frontal (ex. POST `/api/chat/mark-read`) — à discuter avec le PO avant tout ajout backend.

### Structure de fichiers attendue

| Fichier | Type | Changement |
|---------|------|------------|
| `src/components/features/chat/beta-chat-widget.tsx` | NEW | Composant principal du widget |
| `src/components/features/chat/beta-chat-widget.test.tsx` | NEW | Tests du widget |
| `src/app/layout.tsx` | UPDATE | Insérer `<BetaChatWidget />` après les providers |
| `src/app/(dashboard)/layout.tsx` | UPDATE | Insérer `<BetaChatWidget />` dans le layout dashboard |

### Librairies et versions

- **Framer Motion** : `^12.40.0` déjà présent dans `package.json`.
- **shadcn/ui** : réutiliser les composants existants dans `src/components/ui` :
  - `Sheet`, `SheetTrigger`, `SheetContent`, `SheetHeader`, `SheetTitle` (ou `Dialog` équivalent)
  - `Button`
  - `Textarea`
  - `Badge`
  - `Select` pour la catégorie (optionnel : boutons radio ou segments)
- **Lucide icons** : `lucide-react` déjà installé (icônes `MessageCircle`, `Send`, `X`, etc.).
- **next-auth/react** : `useSession()` disponible via `AuthProvider` dans le root layout.

### Garde-fous spécifiques

1. **Ne pas réimplémenter le backend** : Story 18-1 a déjà créé les routes, le modèle Prisma, le rate limiting et l'auto-ack. Se limiter aux appels API.
2. **Pas de WebSocket/SSE** : le chat est asynchrone par design. Pas de temps réel requis.
3. **Pas de polling agressif** : rafraîchir l'historique à l'ouverture et à l'envoi. Le badge unread peut être rechargé à l'ouverture et éventuellement toutes les 60 s si le widget est fermé.
4. **Accessibilité** : assurer un focus visible, un label ARIA sur le bouton flottant, et une zone de texte avec `aria-describedby` pour le compteur de caractères.
5. **Git safety** : ne jamais utiliser `git add -A`. Toujours exclure `dev.db` et les fichiers `.sqlite3` : `git add -A -- . ':!dev.db' ':!*.sqlite3'`.

### Anti-patterns à éviter

- Ne pas utiliser `&&` dans JSX.
- Ne pas appeler `auth()` ou `prisma` directement dans un composant client.
- Ne pas importer `@/generated/prisma/client` côté client.
- Ne pas ajouter de route API, de schéma Zod, de modèle Prisma ou de migration dans cette story.
- Ne pas rendre le widget visible pour les non-connectés.
- Ne pas oublier `initial={false}` sur le wrapper Framer Motion.

## References

- [Source: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-28-beta-chat.md`], sections 3.3, 4.1 — scope frontend, positionnement, animation, layout integration.
- [Source: `_bmad-output/planning-artifacts/epics.md`], lignes 1610-1634 — Story 18-2 et ses acceptance criteria.
- [Source: `_bmad-output/planning-artifacts/architecture.md`], sections Frontend Architecture, API & Communication Patterns, Support Chat & Hermes Integration, JSX Boolean Guardrail — patterns à respecter.
- [Source: `_bmad-output/implementation-artifacts/18-1-chat-message-model-api.md`] — routes API, modèle Prisma, schémas Zod, auto-acknowledgement, rate limiting.
- [Source: `src/app/layout.tsx`] — root layout avec `AuthProvider` et `ThemeProvider`.
- [Source: `src/app/(dashboard)/layout.tsx`] — layout membre.
- [Source: `src/components/ui/sheet.tsx`] — composant Sheet shadcn/ui existant.
- [Source: `src/components/ui/dialog.tsx`] — composant Dialog shadcn/ui existant.
- [Source: `src/lib/validations.ts`] — `chatMessageCreateSchema` et `chatCategory`.
- [Source: `src/lib/rate-limit.ts`] — rate limiting existant côté API.

## Dev Agent Record

### Agent Model Used

À compléter par le dev agent.

### Debug Log References

À compléter par le dev agent.

### Completion Notes List

À compléter par le dev agent.

### File List

À compléter par le dev agent.

### Change Log

- 2026-06-29 : Story créée par `bmad-create-story` — status `ready-for-dev`.
- 2026-06-29 : Story implémentée — widget UI, polling unread, historique, ack. Status → `done`.
- 2026-06-30 : **Hotfix post-déploiement** — ajout d'un polling de l'historique toutes les 5 secondes quand le chat est ouvert. Sans ce polling, les réponses d'Hermes (Epic 18 webhook temps réel) n'apparaissaient pas sans rafraîchir la page. Commit `7ecc97d`. Déployé dans la release `20260630055116`.

## Post-Deployment Hotfix (2026-06-30)

### Problème

Après l'activation du webhook temps réel (Story 18-4), les réponses d'Hermes arrivent en DB dans les secondes qui suivent le message du membre. Mais le widget `BetaChatWidget` ne rafraîchissait l'historique qu'à l'ouverture — pas pendant que le chat était ouvert. Le membre devait rafraîchir la page pour voir la réponse.

### Solution

Ajout d'un `setInterval` de 5 secondes dans le `useEffect` déclenché par `open`. Le polling appelle `fetchHistory()` et `fetchUnread()` en continu tant que le chat est ouvert, et se nettoie avec `clearInterval` à la fermeture.

### Fichiers modifiés

- `src/components/features/chat/beta-chat-widget.tsx` — +8 lignes (useEffect polling)

### Commit

`7ecc97d` — `fix(18-2): add 5s polling interval for real-time chat updates while widget is open`
