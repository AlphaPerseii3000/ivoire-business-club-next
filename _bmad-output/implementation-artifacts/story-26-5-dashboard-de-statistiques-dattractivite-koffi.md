---
baseline_commit: 2d9ecce8731cc6d4a2d053efc0bae243316503f4
---

# Story 26.5 : Dashboard de Statistiques d'Attractivité (Koffi)

Status: review

## Story

As a **porteur de projet connecté**,  
I want **voir, directement dans la liste de mes opportunités soumises, le nombre de clics WhatsApp et le nombre d'intérêts manifestés pour chaque deal**,  
so that **je puisse mesurer l'attractivité de mes deals sans quitter mon espace personnel**.

## Acceptance Criteria

1. **AC-1 — Récupération des métriques côté serveur**
   - Given un porteur de projet connecté,  
     When la page `/dashboard/opportunities` est chargée,  
     Then le compte des entrées `ContactLog` (clics WhatsApp) et le compte des `OpportunityInterest` (intérêts) liés à chacun de **ses** deals est récupéré en base de données.

2. **AC-2 — Affichage sous forme de cartes d'indicateurs épurées**
   - Given les métriques récupérées,  
     When la liste des opportunités s'affiche,  
     Then chaque `DealCard` présente deux indicateurs visuels discrets : un pour le nombre de clics WhatsApp, un pour le nombre d'intérêts.

3. **AC-3 — Respect du premium access gate**
   - Given un utilisateur sans abonnement actif,  
     When il consulte la page,  
     Then la page affiche le `PremiumAccessBlockedPanel` existant (comportement inchangé) et **aucune métrique n'est récupérée**.

4. **AC-4 — Affichage seulement pour les deals de l'utilisateur connecté**
   - Given un membre connecté,  
     When il fait partie des deals listés (auteur + deals visibles),  
     Then les métriques d'attractivité ne s'affichent **que** sur ses propres opportunités ; les deals des autres membres n'affichent **pas** ces cartes.

5. **AC-5 — Pas de régression sur la liste existante**
   - Given la page actuelle `/dashboard/opportunities`,  
     When les stats sont ajoutées,  
     Then les filtres, le matching, la hiérarchie de visibilité tier et le `PremiumAccessBlockedPanel` continuent de fonctionner exactement comme avant.

## Tasks / Subtasks

- [x] **T1 — Auditer et adapter la requête Prisma de la page existante** (AC: #1, #3, #5)
  - [x] T1.1 Lire l'état actuel de `src/app/(dashboard)/dashboard/opportunities/page.tsx` (déjà chargé dans ce contexte).
  - [x] T1.2 Dans le `prisma.opportunity.findMany`, enrichir `_count` avec `contactLogs: true` et `interests: true`.
  - [x] T1.3 Ne **pas** modifier la clause `where` ni la logique de visibilité existante.

- [x] **T2 — Créer le composant `DealStats`** (AC: #2, #4)
  - [x] T2.1 Créer `src/components/features/deals/deal-stats.tsx`.
  - [x] T2.2 Accepter en props `{ contactLogCount: number; interestCount: number; isOwnDeal: boolean }`.
  - [x] T2.3 Si `isOwnDeal` est `false`, retourner `null` (ne pas afficher de stat sur les deals des autres).
  - [x] T2.4 Afficher deux indicateurs : icône message + compteur WhatsApp, icône cœur/intérêt + compteur d'intérêts.
  - [x] T2.5 Gérer les cas `0` avec un style atténué (pas de "undefined" ou de "—").

- [x] **T3 — Intégrer `DealStats` dans `DealCard`** (AC: #2, #4, #5)
  - [x] T3.1 Étendre le type `DealCardDeal` pour inclure `contactLogCount?: number` et `interestCount?: number`.
  - [x] T3.2 Ajouter une prop optionnelle `isOwnDeal?: boolean` au `DealCard` (défaut `false`).
  - [x] T3.3 Dans le rendu principal (non `isTeaser`), afficher `<DealStats />` uniquement si `isOwnDeal === true`.
  - [x] T3.4 Utiliser le pattern `condition ? <Component /> : null` (interdit `&&` en JSX — pitfall #31).

- [x] **T4 — Faire passer les données depuis la page vers `DealCard`** (AC: #1, #2, #4, #5)
  - [x] T4.1 Mapper `opportunity._count.contactLogs` et `opportunity._count.interests` dans l'objet passé à `DealCard`.
  - [x] T4.2 Calculer `isOwnDeal` par `opportunity.authorId === session.user.id`.
  - [x] T4.3 Passer `isOwnDeal` au `DealCard`.

- [x] **T5 — Tests et vérifications** (AC: #3, #5)
  - [x] T5.1 Mettre à jour `src/app/(dashboard)/dashboard/opportunities/page.test.tsx` pour vérifier que `_count` inclut bien `contactLogs` et `interests`.
  - [x] T5.2 Ajouter un test unitaire co-localisé `deal-stats.test.tsx` pour valider le rendu `null` quand `isOwnDeal` est `false` et l'affichage des deux compteurs quand `isOwnDeal` est `true`.
  - [x] T5.3 Lancer `npx vitest run src/app/(dashboard)/dashboard/opportunities/page.test.tsx` et `npx vitest run src/components/features/deals/deal-stats.test.tsx`.

## Dev Notes

### Contexte métier

Koffi est le persona représentatif du porteur de projet local. Cette story est la suite directe de la Story 26.4 (tracking WhatsApp via `/api/opportunities/[id]/contact`) et repose sur le modèle `OpportunityInterest` déjà en place dans `prisma/schema.prisma`. L'objectif est de donner au porteur une **rétroaction immédiate** sur l'attrait de ses deals, mesurée par :
- les **clics WhatsApp** (`ContactLog.opportunityId`) ;
- les **intérêts manifestés** (`OpportunityInterest.opportunityId`).

### Architecture / Guardrails

- **Next.js 16 App Router / RSC :** la page `/dashboard/opportunities/page.tsx` est un Server Component. Toute requête Prisma et toute logique conditionnelle au premium doivent rester côté serveur.
- **Premium access gate :** la page appelle déjà `getUserPremiumAccess(session.user.id)`. Si `hasAccess === false`, elle retourne `PremiumAccessBlockedPanel` et n'exécute **pas** la requête `prisma.opportunity.findMany`. Le nouveau code doit respecter strictement ce comportement (pitfall #47).
- **JSX boolean guardrail :** le projet est en Next.js 16 strict mode. Il est interdit d'utiliser `condition && <Component />`. Toujours préférer `condition ? <Component /> : null` et, pour les expressions composées, pré-calculer un `const` avant le `return` (pitfall #31).
- **Card nested anchors :** `DealCard` est déjà wrappé par `<Link>`. Ne pas ajouter de `<a>` ou `<Link>` internes dans `DealStats`. `DealStats` doit rester purement informatif (pas d'interaction).
- **Prisma import :** utiliser `import { prisma } from "@/lib/prisma";` — jamais `new PrismaClient()`.

### Fichiers impactés

| Fichier | Action | Raison |
|--------|--------|--------|
| `src/app/(dashboard)/dashboard/opportunities/page.tsx` | UPDATE | Récupérer `_count` `contactLogs` + `interests` et mapper `isOwnDeal` |
| `src/components/features/deals/deal-stats.tsx` | NEW | Composant d'affichage des deux indicateurs |
| `src/components/features/deals/deal-card.tsx` | UPDATE | Intégrer `DealStats`, prop `isOwnDeal`, types |
| `src/app/(dashboard)/dashboard/opportunities/page.test.tsx` | UPDATE | Vérifier la requête enrichie |
| `src/components/features/deals/deal-stats.test.tsx` | NEW | Tests du nouveau composant |

### Détails techniques

#### 1. Enrichissement de la requête Prisma

Dans `src/app/(dashboard)/dashboard/opportunities/page.tsx`, remplacer :

```prisma
_count: { select: { documents: true, verificationApprovals: true } },
```

par :

```prisma
_count: { select: { documents: true, verificationApprovals: true, contactLogs: true, interests: true } },
```

Cela donne accès à `opportunity._count.contactLogs` et `opportunity._count.interests`.

#### 2. Type `DealCardDeal`

Dans `src/components/features/deals/deal-card.tsx`, ajouter au type :

```typescript
contactLogCount?: number;
interestCount?: number;
```

et à la prop du composant :

```typescript
type DealCardProps = {
  deal: DealCardDeal;
  match?: OpportunityMatchMetadata;
  isTeaser?: boolean;
  isOwnDeal?: boolean;
};
```

#### 3. Composant `DealStats`

Comportement attendu :
- `isOwnDeal === false` → retourne `null`.
- Affiche deux badges/pills horizontaux :
  - **WhatsApp** : icône `MessageCircle` (Lucide), label "X" ou "0".
  - **Intérêts** : icône `Heart` (Lucide), label "X" ou "0".
- Style : utiliser les couleurs existantes de la palette IBC (teal/amber), texte petit, pas de fond trop lourd pour garder les cartes épurées.
- Exemple de rendu visuel :
  - fond transparent ou `bg-muted/50`, bords arrondis, `inline-flex`, `gap-2`.
  - Les compteurs à zéro restent affichés mais en couleur atténuée.

Implémentation type :

```tsx
"use client"; // inutile — composant statique, peut rester Server Component
import { MessageCircle, Heart } from "lucide-react";

export type DealStatsProps = {
  contactLogCount: number;
  interestCount: number;
  isOwnDeal: boolean;
};

export function DealStats({ contactLogCount, interestCount, isOwnDeal }: DealStatsProps) {
  if (!isOwnDeal) return null;

  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-2 py-1" title="Clics WhatsApp">
        <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
        {contactLogCount}
      </span>
      <span className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-2 py-1" title="Intérêts manifestés">
        <Heart className="h-3.5 w-3.5" aria-hidden="true" />
        {interestCount}
      </span>
    </div>
  );
}
```

#### 4. Intégration dans `DealCard`

Avant le rendu final, pré-calculer :

```typescript
const contactLogCount = deal.contactLogCount ?? 0;
const interestCount = deal.interestCount ?? 0;
const shouldShowStats = isOwnDeal === true;
```

Puis, dans le JSX principal (après le bloc de tags), ajouter :

```tsx
{shouldShowStats ? (
  <div className="px-4 pb-4 pt-2">
    <DealStats contactLogCount={contactLogCount} interestCount={interestCount} isOwnDeal={shouldShowStats} />
  </div>
) : null}
```

⚠️ **Important :** dans `isTeaser === true`, `DealStats` ne doit pas s'afficher (les teasers sont publics et ne représentent pas un deal appartenant au porteur connecté).

#### 5. Mapping depuis la page

Dans `/dashboard/opportunities/page.tsx`, enrichir l'objet passé à `DealCard` :

```typescript
<DealCard
  key={opportunity.id}
  match={{ ... }}
  isOwnDeal={opportunity.authorId === session.user.id}
  deal={{
    ... // champs existants
    contactLogCount: opportunity._count.contactLogs,
    interestCount: opportunity._count.interests,
  }}
/>
```

### Anti-patterns à éviter

- ❌ Faire un appel Prisma supplémentaire par deal pour compter (`N+1`).
- ❌ Modifier `WhatsAppCTA` pour afficher un compteur — le CTA reste un bouton d'action, pas un indicateur.
- ❌ Ajouter un `<Link>` ou `<a>` dans `DealStats` (nested anchors).
- ❌ Utiliser `&&` en JSX.
- ❌ Afficher les stats sur les deals d'autres membres ou dans le mode teaser.

### Références

- [Source: `_bmad-output/planning-artifacts/epic-26-consolidation-spec.md` — Story 26.5]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — JSX Boolean Guardrail, Card Nested Anchors, Idempotent State-Transition Side Effects, Upload Security]
- [Source: `_bmad-output/planning-artifacts/prd.md` — FR84, FR29, FR30, FR85, FR86]
- [Source: `src/app/(dashboard)/dashboard/opportunities/page.tsx` — logique existante premium + liste]
- [Source: `src/components/features/deals/deal-card.tsx` — composant à étendre]
- [Source: `prisma/schema.prisma` — modèles `ContactLog` et `OpportunityInterest`]
- [Source: `src/app/api/opportunities/[id]/contact/route.ts` — tracking WhatsApp / ContactLog]
### Agent Model Used

- kimi-k2.7-code (via Hermes Agent).

### Debug Log References

- Aucune erreur bloquante ; les tests Prisma `event.coverImagePath` non liés à la story ont émis un avertissement lors du build mais n'ont pas interrompu la compilation.

### Completion Notes List

- Enrichi la requête Prisma de `/dashboard/opportunities` avec `_count: { select: { documents, verificationApprovals, contactLogs, interests } }`, récupéré après le contrôle d'accès premium.
- Créé `DealStats` en Server Component (composant statique sans interaction) affichant deux badges : WhatsApp (`MessageCircle`) et intérêts (`Heart`), avec style atténué à zéro.
- Intégré `DealStats` dans `DealCard` uniquement hors mode `isTeaser` et lorsque `isOwnDeal === true`, en respectant le JSX guardrail `condition ? <Component /> : null`.
- Mappé `contactLogCount`, `interestCount` et `isOwnDeal` depuis la page vers `DealCard`.
- Ajouté/mis à jour les tests : `deal-stats.test.tsx` (4 tests) et `page.test.tsx` (9 tests) ; `npx vitest run` : 181 fichiers / 1278 tests passés.
- `npm run build` passe (un avertissement Prisma `events.coverImagePath` existe en dehors de la story).

### File List

- `src/app/(dashboard)/dashboard/opportunities/page.tsx` (UPDATE)
- `src/components/features/deals/deal-card.tsx` (UPDATE)
- `src/components/features/deals/deal-stats.tsx` (NEW)
- `src/app/(dashboard)/dashboard/opportunities/page.test.tsx` (UPDATE)
- `src/components/features/deals/deal-stats.test.tsx` (NEW)
- `_bmad-output/implementation-artifacts/story-26-5-dashboard-de-statistiques-dattractivite-koffi.md` (UPDATE : statut + Dev Agent Record)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (UPDATE : statut 26-5 → review)

### Change Log

- 2026-07-09 — Implémentation de la story 26-5 : dashboard de statistiques d'attractivité.
