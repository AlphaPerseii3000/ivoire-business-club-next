---
baseline_commit: fea14b1
---

# Story 12.3 : Composant "prochain événement" sur landing + pop-up

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

**En tant que** visiteur de la landing page,  
**Je veux** voir le prochain événement IBC,  
**Afin d'être** informé et incité à participer.

## Acceptance Criteria

1. **Affichage du prochain événement dans le flux de la landing page**
   - **Given** au moins un événement publié avec `startDate > now()`
   - **When** la landing page se charge
   - **Then** le composant `NextEventCard` s'affiche dans le flux de la page avec : titre, date, lieu, bouton "En savoir plus"

2. **Pop-up de premier visite**
   - **Given** la configuration admin "pop-up événement" activée
   - **When** un visiteur arrive sur la landing page pour la première fois (pas de cookie/localStorage)
   - **Then** un pop-up (Dialog) s'affiche avec le prochain événement et un bouton "Fermer" qui set un cookie/localStorage pour ne plus réapparaître

3. **État sans événement à venir**
   - **Given** aucun événement publié à venir
   - **When** la landing page se charge
   - **Then** le composant `NextEventCard` ne s'affiche pas (pas de placeholder vide)

## Tasks / Subtasks

- [x] **API GET /api/events/next (AC: 1, 2, 3)**
  - [x] Créer `src/app/api/events/next/route.ts`.
  - [x] Endpoint `GET` public, sans authentification : retourne le prochain événement `PUBLISHED` avec `startDate >= now()`, trié par `startDate asc`.
  - [x] Réponse `200` avec `{ data: event | null }` (null si aucun événement futur publié).
  - [x] Utiliser `getNextPublishedEvent()` de `src/lib/event-utils.ts`.
  - [x] Gestion d'erreur : logger avec `sanitizeError`, retourner `{ error: "Erreur interne" }` en 500.

- [x] **Configuration admin "pop-up événement" (AC: 2)**
  - [x] Choisir et implémenter le mécanisme de stockage le plus simple et maintenable :
    - [x] **Option A (recommandée)** : variable d'environnement `NEXT_PUBLIC_SHOW_EVENT_POPUP=true`.
    - [ ] **Option B** : nouvelle ligne dans une table `SiteConfig` (si un modèle de configuration a été ajouté ailleurs dans le projet).
    - [ ] **Option C** : champ dédié dans le modèle `Event` (ex. `showInPopup`) activable par l'admin lors de la création/édition.
  - [x] Documenter le choix dans les Dev Notes et dans le fichier de configuration si nécessaire.
  - [x] L'implémentation par défaut doit permettre d'activer/désactiver globalement le pop-up sans migration lourde.

- [x] **Composant `NextEventCard` (AC: 1, 3)**
  - [x] Créer `src/components/features/events/NextEventCard.tsx` (Server Component par défaut).
  - [x] Props : `{ event: { id, slug, title, startDate, endDate?, location, imageUrl? } }`.
  - [x] Afficher une section stylisée cohérente avec la landing page (fond sombre `#090D16`, accents or `#D4A847`) :
    - [x] Titre de section ex. "Prochain événement".
    - [x] Carte ou bloc avec image fallback, titre, date formatée en français, lieu.
    - [x] Bouton "En savoir plus" pointant vers `/events/${slug}`.
  - [x] Utiliser le `Button` shadcn existant (`src/components/ui/button.tsx`) et `Link` de Next.js.
  - [x] Formater la date avec `toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })`.
  - [x] Si `imageUrl` est absente, afficher un fallback gradient ou un placeholder IBC (pattern identique à `EventCard`).
  - [x] Le composant ne s'affiche que si `event` est fourni (pas de placeholder vide).

- [x] **Intégration dans la landing page (AC: 1, 3)**
  - [x] Modifier `src/app/(public)/page.tsx`.
  - [x] En Server Component, appeler `getNextPublishedEvent()` directement via Prisma (comme pour `latestArticles` et `teasers`).
  - [x] Insérer `<NextEventCard event={nextEvent} />` dans le flux de la page, par exemple entre `<HowItWorks />` et `<ScrollVideoPlayer />` ou juste avant `<OpportunityTeasers />`.
  - [x] Ne pas afficher le composant si `nextEvent` est null (AC 3).

- [x] **Composant pop-up `EventPopup` client (AC: 2)**
  - [x] Créer `src/components/features/events/EventPopup.tsx` (Client Component, `"use client"`).
  - [x] Lire la configuration "pop-up activée" côté serveur dans `page.tsx` et passer un boolean au Client Component (ou utiliser une variable d'environnement `NEXT_PUBLIC_*` lisible côté client).
  - [x] Utiliser `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter` de `src/components/ui/dialog.tsx`.
  - [x] Props : `{ event: NextEventCardEvent | null; enabled: boolean }`.
  - [x] Au montage, vérifier `localStorage.getItem('ibc-event-popup-closed')` (ou `sessionStorage` selon le choix) ; ne pas ouvrir si présent.
  - [x] Si `enabled === true` et `event !== null` et pas de marqueur de fermeture, ouvrir le Dialog.
  - [x] Bouton "Fermer" qui ferme le Dialog et persiste `localStorage.setItem('ibc-event-popup-closed', event.slug || 'closed')`.
  - [x] Afficher dans le pop-up : titre, date, lieu, bouton "En savoir plus" vers `/events/${slug}`.
  - [x] Ne pas ouvrir de pop-up si aucun événement à venir.

- [x] **Tests**
  - [x] Créer `src/app/api/events/next/route.test.ts` : vérifier le retour du prochain événement PUBLISHED futur, l'exclusion des événements CANCELLED/PASSÉS, et le `null` quand aucun événement.
  - [x] Créer `src/components/features/events/NextEventCard.test.tsx` : vérifier le rendu des champs (titre, date, lieu, bouton), le fallback image, et l'absence de rendu si `event` est null.
  - [x] Créer `src/components/features/events/EventPopup.test.tsx` : vérifier l'ouverture conditionnelle selon `enabled`/`localStorage`, le fermeture et la persistance du marqueur, et le non-affichage sans événement.
  - [x] Ajouter un test dans `src/app/(public)/page.test.tsx` ou créer `src/app/(public)/page.test.tsx` si absent : vérifier l'affichage conditionnel de `NextEventCard` sur la landing page en fonction de la présence d'un événement.
  - [x] Lancer `npx vitest run` et vérifier la non-régression.

## Dev Notes

### Patterns d'Architecture & Contraintes

- **Langue du projet** : Tous les artefacts (stories, UI, commentaires de code, messages d'erreur, logs) doivent être en **français**.
- **Next.js 16 / React 19 / App Router** : les paramètres dynamiques de route (`params`, `searchParams`) sont asynchrones et doivent être `await`és. Les Server Components sont la valeur par défaut ; ajouter `"use client"` uniquement pour l'interactivité du pop-up.
- **Prisma 7.8.0** : importer le client généré depuis `@/generated/prisma/client`, jamais directement `@prisma/client`. Utiliser le singleton `prisma` de `@/lib/prisma`.
- **API publique** : l'endpoint `/api/events/next` ne requiert pas d'authentification. Conserver le format de réponse `{ data: event | null }` pour cohérence avec l'API events existante.
- **UX / JSX** : préférer les ternaires `condition ? <X /> : null` au court-circuit `&&`. Pré-computer les booléens composés avant le JSX.
- **Anti-pattern nested anchors** : `NextEventCard` doit avoir un seul `Link` racine (vers `/events/${slug}`). Le bouton "En savoir plus" peut être un `Button` stylisé contenant un `Link` ou directement un `Link` stylisé comme bouton — ne pas créer de lien imbriqué dans un autre.
- **Images** : utiliser `next/image` avec `unoptimized` pour supporter les URLs externes. Fallback gradient si `imageUrl` manquante.
- **Dates** : format d'affichage en français via `toLocaleDateString('fr-FR')`.
- **localStorage** : le marqueur de fermeture du pop-up doit être simple et robuste (`ibc-event-popup-closed`). Attention à l'hydratation côté client : lire `localStorage` uniquement dans `useEffect` pour éviter les erreurs SSR.
- **Configuration admin** : faute de table `SiteConfig` existante, l'usage d'une variable d'environnement `NEXT_PUBLIC_SHOW_EVENT_POPUP=true` est le choix minimal viable. Si un mécanisme de configuration admin est introduit plus tard, le migrer à ce moment.

### Choix de la configuration pop-up

**Décision retenue : Option A.** La variable d'environnement publique `NEXT_PUBLIC_SHOW_EVENT_POPUP` est utilisée pour activer/désactiver globalement le pop-up. Elle est documentée dans `.env.example` avec la valeur par défaut `false` afin de ne pas afficher de pop-up pendant le développement local. Ce choix évite toute migration Prisma et toute interface admin supplémentaire.

Recommandation par ordre de simplicité croissante :

1. **Variable d'environnement** `NEXT_PUBLIC_SHOW_EVENT_POPUP=true` : activable par l'admin/dev via le déploiement, aucune migration, aucune interface admin supplémentaire.
2. **Champ `showInPopup` sur le modèle `Event`** : permet à l'admin de choisir par événement s'il apparaît en pop-up. Nécessite une migration Prisma et la mise à jour du formulaire admin.
3. **Table `SiteConfig` générique** : la plus évolutive mais la plus lourde ; ne pas créer de table générique uniquement pour ce booléen.

Le dev agent doit **documenter son choix final** dans les Dev Notes et s'assurer que la valeur par défaut en local est `false` (pas de pop-up envahissant pendant le développement).

### Filtre du prochain événement

Requête Prisma à utiliser (encapsulée dans `getNextPublishedEvent`) :

```typescript
const now = new Date();
const event = await prisma.event.findFirst({
  where: {
    status: "PUBLISHED",
    startDate: { gte: now },
  },
  orderBy: { startDate: "asc" },
});
```

Cette requête exclut naturellement les `CANCELLED` et les événements passés.

### Composants & Chemins à créer / modifier

| Fichier | Action | Raison |
|---------|--------|--------|
| `src/app/api/events/next/route.ts` | NEW | Endpoint public prochain événement |
| `src/app/api/events/next/route.test.ts` | NEW | Tests endpoint |
| `src/components/features/events/NextEventCard.tsx` | NEW | Composant encart landing |
| `src/components/features/events/NextEventCard.test.tsx` | NEW | Tests composant |
| `src/components/features/events/EventPopup.tsx` | NEW | Pop-up client |
| `src/components/features/events/EventPopup.test.tsx` | NEW | Tests pop-up |
| `src/app/(public)/page.tsx` | UPDATE | Intégrer `NextEventCard` + `EventPopup` |
| `src/lib/event-utils.ts` | UPDATE (si besoin) | Ajuster le type retour ou ajouter une fonction sérielle si nécessaire |
| `prisma/schema.prisma` | UPDATE (optionnel) | Si option B ou C choisie pour la config admin |
| `prisma/schema.dev.prisma` | UPDATE (optionnel) | Synchronisation SQLite si migration |
| `src/components/features/admin/event-form.tsx` | UPDATE (optionnel) | Si champ `showInPopup` choisi |

### Références

- SCP Story 12.3 : `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-18.md` lignes 479-497
- FR67 et modification Epic 7 : lignes 156-160 et 292-296
- API events existante : `src/app/api/events/route.ts`
- Modèle Event existant : `prisma/schema.prisma` (modèle `Event`)
- Helper prochain événement : `src/lib/event-utils.ts`
- Composant EventCard existant : `src/components/features/events/EventCard.tsx`
- Landing page : `src/app/(public)/page.tsx`
- Composant Dialog shadcn : `src/components/ui/dialog.tsx`
- Guardrail JSX : `_bmad-output/planning-artifacts/architecture.md` section "JSX Boolean Guardrail"
- Anti-pattern nested anchors : `_bmad-output/planning-artifacts/architecture.md` section "Card Component Anti-Pattern: Nested Anchors"

## Dev Agent Record

### Agent Model Used

kimi-k2.7-code

### Debug Log References

### Completion Notes List

- Implémentation de l'endpoint public `GET /api/events/next` réutilisant `getNextPublishedEvent()`.
- Création du composant Server `NextEventCard` avec un seul lien racine, sans ancrage imbriqué, et fallback image cohérent avec `EventCard`.
- Création du composant Client `EventPopup` utilisant le Dialog shadcn, la clé `localStorage` `ibc-event-popup-closed` et une lecture côté serveur de `NEXT_PUBLIC_SHOW_EVENT_POPUP`.
- Intégration conditionnelle dans la landing page : le composant et le pop-up ne s'affichent que si un événement futur publié existe.
- Choix de la configuration pop-up : variable d'environnement `NEXT_PUBLIC_SHOW_EVENT_POPUP` (Option A), documentée dans `.env.example` avec la valeur par défaut `false`.
- Ajout des tests unitaires pour l'API, `NextEventCard`, `EventPopup` et la landing page.
- `npx vitest run` : 821 tests passés, 121 fichiers de test, aucune régression.
- `npm run build` : compilation réussie.

### File List

- `src/app/api/events/next/route.ts` (NEW)
- `src/app/api/events/next/route.test.ts` (NEW)
- `src/components/features/events/NextEventCard.tsx` (NEW)
- `src/components/features/events/NextEventCard.test.tsx` (NEW)
- `src/components/features/events/EventPopup.tsx` (NEW)
- `src/components/features/events/EventPopup.test.tsx` (NEW)
- `src/app/(public)/page.tsx` (UPDATE)
- `src/app/(public)/page.test.tsx` (UPDATE)
- `.env.example` (UPDATE)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (UPDATE)
- `_bmad-output/implementation-artifacts/12-3-composant-prochain-evenement-landing-popup.md` (UPDATE)

### Change Log

- Story 12-3 : composant "prochain événement" sur landing + pop-up
- Date : 2026-06-19

## Status

review