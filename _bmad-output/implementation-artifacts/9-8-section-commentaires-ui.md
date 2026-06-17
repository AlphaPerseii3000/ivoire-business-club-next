---
baseline_commit: 02a82aa
---

# Story 9.8: Section Commentaires UI

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

**En tant que** membre connecté ayant un abonnement actif,  
**Je veux** voir la liste des commentaires et soumettre mon propre commentaire sous un article,  
**Afin de** participer aux discussions autour des analyses et ressources du club.

## Acceptance Criteria

1. **Section Commentaires pour membres actifs (AC: 1)**
   - **Given** un membre abonné actif (ou admin) sur `/articles/[slug]`.
   - **When** il consulte un article auquel il a accès.
   - **Then** une section "Commentaires" apparaît sous le contenu de l'article, affichant pour chaque commentaire : l'auteur (avatar, nom), la date de création et le contenu.
   - **And** un formulaire permet de rédiger et soumettre un nouveau commentaire, avec un état loading pendant la soumission et une validation de longueur minimale (2 caractères).

2. **Encart d'incitation pour non-abonnés et visiteurs anonymes (AC: 2)**
   - **Given** un visiteur anonyme ou un membre sans abonnement actif sur `/articles/[slug]`.
   - **When** il consulte la page détail de l'article.
   - **Then** la section des commentaires est remplacée par un encart d'incitation : "Devenez membre actif pour consulter et participer aux discussions."

## Contexte & Delta Scoping

Cette story est la **couche UI** du système de commentaires. Le modèle Prisma, la migration et les API routes `GET/POST /api/articles/[id]/comments` ont été implémentés dans la story **9.7** (voir [9-7-systeme-de-commentaires-modele-migration-et-api.md](9-7-systeme-de-commentaires-modele-migration-et-api.md)).

La page de détail d'article existe déjà :
- `src/app/(public)/articles/[slug]/page.tsx` — Server Component, gère le gate premium via `hasActiveSubscription` et affiche le contenu, les réactions, le partage et une `DealCard` optionnelle.

**Ce qui existe déjà et ne doit pas être recréé :**
- Route API `/api/articles/[id]/comments` (GET/POST, auth + subscription + sanitisation + audit log).
- Schéma `commentCreateSchema` dans `src/lib/validations.ts`.
- Composant `Avatar`, `Button`, `Card`, `Textarea`, `Label` dans `src/components/ui/`.
- Composant `EmptyState` dans `src/components/shared/empty-state.tsx`.
- Composant `ArticleReactions` dans `src/components/features/articles/ArticleReactions.tsx` (modèle client avec fetch optimiste).

**Ce qui doit être créé / modifié :**
- `src/components/features/articles/ArticleCommentsSection.tsx` — **NEW** composant client affichant la liste et le formulaire.
- `src/app/(public)/articles/[slug]/page.tsx` — **UPDATE** pour intégrer la section Commentaires dans la zone de contenu accessible.
- `src/components/features/articles/ArticleCommentsSection.test.tsx` — **NEW** tests unitaires du composant.
- `src/app/(public)/articles/[slug]/page.test.tsx` — **UPDATE** pour couvrir l'affichage de la section ou de l'encart d'incitation.

## Tasks / Subtasks

- [x] **Composant Commentaires client (AC: 1, 2)**
  - [x] Créer `src/components/features/articles/ArticleCommentsSection.tsx` avec directive `"use client"`.
  - [x] Implémenter le fetch initial `GET /api/articles/{articleId}/comments` via `useEffect` ; gérer les états loading, error, liste vide.
  - [x] Afficher la liste des commentaires : avatar (`Avatar`, `AvatarImage`, `AvatarFallback`), nom d'auteur, date de création formatée `fr-FR`, contenu. Utiliser `whitespace-pre-wrap` pour préserver les retours à la ligne.
  - [x] Implémenter le formulaire avec un `Textarea`, un `Label` "Votre commentaire", un compteur de caractères, et un `Button` de soumission.
  - [x] Valider la longueur minimale (2 caractères après trim) et maximale (1000) côté client avant envoi ; afficher un message d'erreur inline.
  - [x] Gérer l'état `isSubmitting` (bouton désactivé + texte "Envoi en cours...").
  - [x] Après soumission réussie (POST 201), réinitialiser le textarea et rafraîchir la liste (soit par mutation optimiste en ajoutant le commentaire retourné, soit par re-fetch).
  - [x] Afficher un état vide avec `EmptyState` lorsqu'il n'y a aucun commentaire.
  - [x] En cas d'erreur réseau ou d'erreur serveur, afficher un message clair et permettre une nouvelle tentative.

- [x] **Intégration dans la page détail d'article (AC: 1, 2)**
  - [x] Modifier `src/app/(public)/articles/[slug]/page.tsx`.
  - [x] Dans le bloc `hasAccess ? (...) : (...)`, ajouter `<ArticleCommentsSection articleId={article.id} userId={userId} isAuthorized={hasAccess} />` sous la `DealCard` associée (ou après les réactions si pas de deal), dans la colonne principale.
  - [x] Dans le bloc `else` (non abonné / anonyme), remplacer la section commentaires par un encart d'incitation affichant le texte exact : "Devenez membre actif pour consulter et participer aux discussions." avec un CTA vers `/pricing`.
  - [x] S'assurer que le composant ne reçoit `userId` que si l'utilisateur est connecté (sinon `undefined`).

- [x] **Tests (AC: 1, 2)**
  - [x] Créer `src/components/features/articles/ArticleCommentsSection.test.tsx` :
    - [x] Affichage de la liste de commentaires.
    - [x] Affichage de l'état vide.
    - [x] Soumission d'un commentaire valide.
    - [x] Validation de longueur minimale.
    - [x] Gestion des erreurs API.
  - [x] Mettre à jour `src/app/(public)/articles/[slug]/page.test.tsx` :
    - [x] Vérifier que la section commentaires est affichée pour un abonné actif.
    - [x] Vérifier que l'encart d'incitation est affiché pour un visiteur anonyme ou un membre inactif.
  - [x] Exécuter `npx vitest run` et s'assurer que tous les tests passent.

- [x] **Vérification manuelle / E2E (AC: 1, 2)**
  - [x] Lancer `npm run dev`, consulter un article public/premium accessible en tant que membre actif et vérifier l'affichage de la section Commentaires.
  - [x] Vérifier la soumission d'un commentaire et son apparition immédiate dans la liste.
  - [x] Se déconnecter ou utiliser un compte inactif et vérifier l'affichage de l'encart d'incitation.

## Dev Notes

### Architecture & Patterns

- **Next.js 16 strict JSX** : ne jamais utiliser `&&` dans le JSX. Toujours utiliser des ternaires `condition ? <Component /> : null` et pré-calculer les expressions booléennes complexes en constantes avant le `return`.
- **Composants clients** : tout composant avec des gestionnaires d'événements (`onSubmit`, `onClick`, `onChange`) doit avoir la directive `"use client"` en première ligne. Le composant `ArticleCommentsSection` est donc un Client Component.
- **Framer Motion** : si un wrapper de layout est utilisé, mettre `initial={false}` pour éviter le blocage SSR `opacity:0`.
- **Route publique** : la page `/articles/[slug]` est dans le route group `(public)`. Elle doit donc continuer à fonctionner sans session. Le gate existant (`hasActiveSubscription`) doit être réutilisé ; il n'est pas nécessaire d'importer `getUserPremiumAccess` ni `PremiumAccessBlockedPanel` (réservés aux pages dashboard).
- **Sécurité** : l'API `/api/articles/[id]/comments` vérifie déjà l'authentification (401), l'abonnement actif (403) et la publication de l'article (404). L'UI doit simplement afficher les états correspondants sans contourner ces vérifications.
- **Sanitisation** : le contenu retourné par l'API est déjà sanitizé via `DOMPurify` côté serveur. L'affichage peut être fait en texte simple (pas besoin de `dangerouslySetInnerHTML`). Utiliser `whitespace-pre-wrap` pour conserver la mise en forme.

### Composants à réutiliser

- `Avatar`, `AvatarImage`, `AvatarFallback` — `src/components/ui/avatar.tsx`.
- `Button` — `src/components/ui/button.tsx`.
- `Card`, `CardHeader`, `CardContent` — `src/components/ui/card.tsx` (optionnel, peut être utilisé pour encadrer les commentaires).
- `Textarea` — `src/components/ui/textarea.tsx`.
- `Label` — `src/components/ui/label.tsx`.
- `EmptyState` — `src/components/shared/empty-state.tsx`.

### Format des données

Réponse GET :
```json
{
  "comments": [
    {
      "id": "...",
      "content": "...",
      "createdAt": "2026-06-17T...",
      "updatedAt": "2026-06-17T...",
      "articleId": "...",
      "userId": "...",
      "user": {
        "id": "...",
        "name": "...",
        "image": "/path/avatar.png"
      }
    }
  ]
}
```

### Conventions de style

- Utiliser les classes existantes du projet : fond `bg-[#090D16]`, texte blanc/slate, bordures `border-white/10`, titres `text-lg font-bold tracking-tight`.
- Les commentaires doivent s'inscrire dans le thème sombre de la page article. Utiliser `bg-white/5`, `rounded-xl`, `p-4`, etc.
- Avatar fallback : initiale du nom de l'auteur en majuscule.
- Date : `new Date(createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })`.

### Gestion des erreurs

- 401 / 403 → afficher l'encart d'incitation (l'API ne devrait pas renvoyer cela pour un utilisateur autorisé, mais gérer défensivement).
- 500 / réseau → message "Impossible de charger les commentaires. Veuillez réessayer." avec un bouton de retry.
- POST 400 → afficher le message d'erreur retourné par l'API (validation Zod).

Status: review

## Dev Agent Record

### Agent Model Used

kimi-k2.7-code

### Debug Log References

### Completion Notes List

- Created `ArticleCommentsSection` client component with useEffect fetch, loading/error/empty states, avatar+date display, textarea form with inline validation (min 2, max 1000 chars), submit loading state, and optimistic list update on successful POST.
- Integrated the section into `src/app/(public)/articles/[slug]/page.tsx` for both access-granted path and gated (non-member/anonymous) path. The gated path displays the exact CTA text: "Devenez membre actif pour consulter et participer aux discussions." with a link to `/pricing`.
- Added comprehensive unit tests for the component covering list, empty, validation, submission, loading, retry, and error flows.
- Updated article detail page tests to assert comment section visibility for active subscribers and the guest CTA for anonymous/unsubscribed visitors.
- Regenerated Prisma client after confirming schema includes the new `Comment` model and `Article.opportunity` relation.
- Ran full test suite: 104 test files, 684 tests passed. Production build also succeeded.

### File List

- `src/components/features/articles/ArticleCommentsSection.tsx` — NEW
- `src/components/features/articles/ArticleCommentsSection.test.tsx` — NEW
- `src/app/(public)/articles/[slug]/page.tsx` — UPDATE
- `src/app/(public)/articles/[slug]/page.test.tsx` — UPDATE

### Review Findings

- [x] [Review][Check] Aucun usage de `&&` dans le JSX des nouveaux fichiers et de la page modifiée.
- [x] [Review][Check] Directive `"use client"` présente sur le composant formulaire/liste.
- [x] [Review][Check] Encart d'incitation textuel exact conforme à l'AC2.
- [x] [Review][Check] Tests unitaires couvrant au minimum les cas actif, inactif/anonyme, vide, erreur et validation.

## References

- Story prérequis API/Modèle : [9-7-systeme-de-commentaires-modele-migration-et-api.md](9-7-systeme-de-commentaires-modele-migration-et-api.md)
- Page détail article existante : `src/app/(public)/articles/[slug]/page.tsx`
- API commentaires existante : `src/app/api/articles/[id]/comments/route.ts`
- API tests existants : `src/app/api/articles/[id]/comments/route.test.ts`
- Schéma de validation : `src/lib/validations.ts`
- Helper d'accès abonnement : `src/lib/subscription-access.ts`
- Définition Story 9.8 dans les epics : [epics.md#L1526-L1542](../planning-artifacts/epics.md#L1526-L1542)
- Proposition de sprint : [sprint-change-proposal-2026-06-16.md](../planning-artifacts/sprint-change-proposal-2026-06-16.md)
