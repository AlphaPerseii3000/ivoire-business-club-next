---
Story: "4.3"
StoryKey: "4-3-matching-basique-par-tags"
Title: "Matching Basique par Tags"
Status: "review"
Priority: "P1"
Epic: "Epic 4 — Networking, Matching et WhatsApp"
FRs: ["FR28"]
UXDRs: ["UX-DR15", "UX-DR18"]
NFRs: ["NFR-P2", "NFR-A1", "NFR-A2", "NFR-A3"]
Created: "2026-05-20"
---

# Story 4.3: Matching Basique par Tags

Status: review

## Story

En tant que membre,
je veux recevoir des suggestions d'opportunités correspondant à mes tags,
afin de découvrir rapidement les deals pertinents pour mon profil.

## Acceptance Criteria

1. **Tri matching par tags communs — FR28**
   - Given un membre avec des tags sur son profil
   - When il consulte le feed « Matching » ou « Opportunités »
   - Then le système affiche en priorité les deals ayant au moins un tag en commun, triés par nombre de tags communs.

2. **Notification de nouvelle opportunité matchée**
   - Given un membre sur le feed matching
   - When un nouveau deal correspondant à ses tags est publié
   - Then une notification in-app ou email, selon préférences disponibles, s'affiche avec le message exact : « Nouvelle opportunité matchée : [Titre] ».

3. **Badge de match mobile**
   - Given un membre sur mobile
   - When il consulte le feed matching
   - Then les deals matchés affichent un badge subtil « 95% match » ou « 2 tags communs ».

4. **EmptyState sans match**
   - Given aucun deal ne correspond aux tags du membre
   - When il consulte le feed matching
   - Then le composant `EmptyState` s'affiche avec : « Aucun deal ne correspond à vos critères actuels » + CTA « Modifier mes tags ».

## Tasks / Subtasks

- [x] **Auditer et réutiliser l'infrastructure tags existante — ne pas reconstruire Story 4.2** (AC: #1, #3, #4)
  - [x] Confirmer que `prisma/schema.prisma` contient déjà `TagCategory`, `UserTag`, `OpportunityTag`, `User.tags`, `Opportunity.tags`, contraintes uniques et index `[category, value]`.
  - [x] Réutiliser `src/lib/tags.ts` (`SelectedTag`, `getTagLabel`, `dedupeTags`, `isValidTagOption`, `getTagFilterHref`) comme source unique des valeurs/labels de tags.
  - [x] Réutiliser `src/components/features/tags/tag-chips.tsx` et `src/components/features/tags/tag-input.tsx` pour rendu/édition; ne pas créer un second système de chips.
  - [x] Préserver les tags déjà affichés dans `DealCard`, les pages opportunités, la page détail, les profils membres et `/profile/edit`.

- [x] **Créer une couche de matching tag-based côté serveur** (AC: #1, #3, #4)
  - [x] Créer `src/lib/matching.ts` avec des helpers purs et testables :
    - `countCommonTags(userTags, opportunityTags): number`
    - `calculateMatchPercent(commonCount, userTagCount): number` avec règle MVP déterministe : `Math.round((commonCount / userTagCount) * 100)`, bornée à `0..100`, `0` si aucun tag profil.
    - `attachMatchMetadata(opportunities, userTags)` qui ajoute `{ commonTagCount, matchPercent, matchedTags }` sans muter les objets Prisma.
  - [x] Définir un type exporté `OpportunityMatchMetadata` pour éviter des champs ad hoc dispersés.
  - [x] Trier par `commonTagCount desc`, puis `createdAt desc` pour stabilité. Les deals à `commonTagCount = 0` peuvent rester visibles dans « Opportunités » après les matches, mais le feed « Matching » doit afficher uniquement les matches.
  - [x] Ne pas utiliser de ML, score opaque ou librairie externe; le MVP est strictement règles + tags communs.

- [x] **Ajouter le feed Matching dédié** (AC: #1, #3, #4)
  - [x] Créer `src/app/(dashboard)/dashboard/matching/page.tsx` comme Server Component protégé par `auth()`.
  - [x] Charger le membre courant avec ses `tags` triés (`category`, `value`) et son `tier/role`.
  - [x] Charger les opportunités visibles via les mêmes règles que le feed opportunités : `buildOpportunityVisibilityWhere(currentUser.tier)` pour membres, accès admin plus large si nécessaire, et inclure auteurs/téléphones, tags, `_count.documents`, `_count.verificationApprovals`.
  - [x] Filtrer le feed matching aux opportunités avec `commonTagCount > 0`, puis trier par `commonTagCount desc`, `createdAt desc`.
  - [x] Si le membre n'a aucun tag profil, afficher `EmptyState` avec une explication courte et CTA « Modifier mes tags » vers `/profile/edit`.
  - [x] Si aucun deal ne matche, afficher `EmptyState` avec le texte exact « Aucun deal ne correspond à vos critères actuels » et CTA « Modifier mes tags » vers `/profile/edit`.

- [x] **Prioriser les opportunités matchées dans le feed existant** (AC: #1, #3)
  - [x] Modifier `src/app/(dashboard)/dashboard/opportunities/page.tsx` sans casser les filtres `category`, `tagCategory`, `tagValue` existants.
  - [x] Charger les `User.tags`, calculer les métadonnées de match pour chaque opportunité affichée et trier en priorité par `commonTagCount desc` quand le membre a des tags.
  - [x] Conserver le comportement existant pour membres sans tags : tri actuel `createdAt desc` et empty state existant du feed opportunités.
  - [x] Préserver la visibilité premium/tier, les opportunités de l'auteur et les règles admin déjà en place.

- [x] **Afficher le badge de match dans les cartes deals** (AC: #3)
  - [x] Étendre `DealCard` (`src/components/features/deals/deal-card.tsx`) avec des props optionnelles `commonTagCount?: number` et `matchPercent?: number` ou une prop `match?: OpportunityMatchMetadata`.
  - [x] Afficher un badge subtil uniquement si `commonTagCount > 0` : libellé recommandé `2 tags communs` pour lisibilité; `95% match` est acceptable si le pourcentage calculé est utilisé.
  - [x] Style : `Badge`/pill discret, touch-friendly, dark-mode safe (`border`, `bg-primary/10`, `text-primary` ou tokens existants), jamais une couleur fixe non prévue.
  - [x] Important : ne pas réintroduire le bug Story 4.2 des liens imbriqués. Les chips tags restent hors du lien de carte ou non interactives dans `DealCard`.

- [x] **Notification de nouvelle opportunité matchée au moment de la publication** (AC: #2)
  - [x] Étendre le flux qui rend un deal visible/publié, pas seulement la création PENDING : priorité à `src/app/api/admin/opportunities/[id]/verify/route.ts` lorsque le statut passe à `VERIFIED`; si l'application considère aussi les deals auteur/admin comme publiés à la création, couvrir explicitement ce chemin.
  - [x] Après passage à `VERIFIED`, trouver les membres ayant au moins un `UserTag` commun avec les `OpportunityTag` du deal, en excluant l'auteur du deal.
  - [x] Respecter les règles d'accès : ne notifier que les membres qui peuvent voir le deal selon leur tier (`requiredTier`) ou admins si pertinent.
  - [x] Ajouter un modèle minimal `Notification` uniquement s'il n'existe toujours pas, avec champs recommandés : `id`, `userId`, `type`, `title`, `body`, `href`, `readAt`, `createdAt`, relation `User.notifications`, index `userId/readAt/createdAt`. Si l'équipe préfère email-only pour MVP, créer au moins `sendOpportunityMatchedEmail` dans `src/lib/email.ts` et documenter que la préférence utilisateur n'existe pas encore.
  - [x] Message exact à persister/envoyer : `Nouvelle opportunité matchée : ${opportunity.title}`.
  - [x] Ne pas bloquer la vérification ou création du deal si l'envoi email échoue : journaliser une erreur sanitizée et continuer. Ne pas loguer de données sensibles.

- [x] **Navigation mobile/desktop vers Matching** (AC: #1, #3)
  - [x] Ajouter un lien « Matching » dans le layout dashboard existant (`src/app/(dashboard)/layout.tsx`) en respectant le pattern de navigation actuel.
  - [x] Sur mobile, s'aligner avec UX Spec : bottom/tab bar ou lien accessible équivalent vers Accueil/Opportunités, Matching, Profil. Ne pas introduire une navigation complexe.
  - [x] Le lien doit pointer vers `/dashboard/matching` et rester en français.

- [x] **Tests et vérification** (AC: all)
  - [x] Tests unitaires `src/lib/matching.test.ts` : tags communs, aucun tag profil, calcul pourcentage, tri stable, doublons ignorés.
  - [x] Tests `DealCard` : badge match affiché si `commonTagCount > 0`, absent sinon; WhatsAppCTA et tags existants préservés.
  - [x] Tests page matching : membre sans tags, aucun match, matches triés par nombre de tags communs, CTA `/profile/edit`.
  - [x] Tests feed opportunités : matches priorisés sans casser filtre catégorie/tag et règles visibilité tier.
  - [x] Tests notification : vérification d'un deal avec tags crée/envoie une notification aux membres matchés, exclut auteur et non-éligibles tier, tolère erreur email.
  - [x] Exécuter au minimum `npx vitest run` et `npm run build`.

## Dev Notes

### Scope critique — delta sur Story 4.2, pas refonte

Story 4.2 est marquée `done` dans `sprint-status.yaml` et le git récent confirme le correctif/review PASS (`d1272c0 chore(bmad): story 4-2 CR PASS`). Cette story 4.3 doit seulement ajouter la logique de matching, le feed matching, le badge et la notification. Ne pas recréer un modèle `Tag`, ne pas remplacer `TagChips`, ne pas changer la taxonomie sauf besoin explicitement testé. [Source: _bmad-output/implementation-artifacts/sprint-status.yaml#development_status] [Source: git log]

### Infrastructure tags existante auditée

- `prisma/schema.prisma` contient déjà `enum TagCategory { SECTEUR, MONTANT, LOCALISATION }`, `User.tags UserTag[]`, `Opportunity.tags OpportunityTag[]`, `UserTag`, `OpportunityTag`, `@@unique([ownerId, category, value])` et `@@index([category, value])`. Utiliser ces tables pour le matching. [Source: prisma/schema.prisma]
- `src/lib/tags.ts` fournit déjà la source unique des catégories, labels et valeurs (`immobilier`, `business`, `investissement`, `partenariat`, `agriculture`, `tech`, montants et localisations), plus validation/deduplication et liens de filtre. [Source: src/lib/tags.ts]
- `TagChips` et `TagInput` existent dans `src/components/features/tags/`. `TagChips` peut rendre des chips non interactives, interactives ou supprimables. [Source: src/components/features/tags/tag-chips.tsx] [Source: src/components/features/tags/tag-input.tsx]
- `DealCard` affiche déjà tags + WhatsAppCTA et a été corrigé pour éviter les liens imbriqués : les tags sont rendus hors du lien principal et non interactifs dans la carte. Préserver ce pattern. [Source: src/components/features/deals/deal-card.tsx]
- Le feed opportunités inclut déjà les tags, le filtre `tagCategory/tagValue`, `CategoryFilterChips`, `EmptyState`, et `buildOpportunityVisibilityWhere`. Cette story doit étendre ce code, pas le remplacer. [Source: src/app/(dashboard)/dashboard/opportunities/page.tsx]
- L'API `/api/opportunities` inclut déjà les tags dans `GET`, filtre par tag, et crée les tags dans `POST` via transaction + `dedupeTags`. [Source: src/app/api/opportunities/route.ts]
- Le profil charge et édite déjà les tags; `/profile/edit` existe comme redirection/compatibilité vers le profil. Le CTA « Modifier mes tags » peut donc cibler `/profile/edit`. [Source: src/app/(dashboard)/profile/page.tsx] [Source: src/app/(dashboard)/profile/edit/page.tsx]

### Architecture & contraintes obligatoires

- Stack constatée : Next.js 16.2.6, React 19.2.4, Prisma 7.8.0, Auth.js v5 beta.31, TailwindCSS 4, Base UI/shadcn-style components, Vitest 4. [Source: package.json]
- Prisma 7 : datasource sans `url` dans `schema.prisma`; le client généré est sous `src/generated/prisma`; les requêtes applicatives doivent passer par `src/lib/prisma.ts`. [Source: _bmad-output/planning-artifacts/architecture.md#Technical-Constraints]
- Auth.js : utiliser `auth()` depuis `@/lib/auth` dans Server Components et Route Handlers; ne jamais importer Prisma/bcrypt dans `auth.config.ts` ou middleware Edge. [Source: _bmad-output/planning-artifacts/architecture.md#Authentication-Security]
- API : Next.js Route Handlers, succès en `{ data: T }` quand le contrat existant l'utilise, erreurs françaises `{ error, code?, details? }`, statuts adaptés. [Source: _bmad-output/planning-artifacts/architecture.md#API-Communication-Patterns]
- Next.js 16 strict JSX : ne pas utiliser `condition && <Component />`; utiliser ternaires et booléens pré-calculés, surtout dans `DealCard`, pages matching/opportunités et composants de notification. [Source: _bmad-output/planning-artifacts/architecture.md#JSX-Boolean-Guardrail]
- UI en français, mobile-first, WCAG AA; utiliser tokens Tailwind existants (`bg-card`, `border`, `text-muted-foreground`, `primary`, `muted`) pour dark mode. [Source: _bmad-output/planning-artifacts/ux-spec.md#Responsive-Design--Accessibility]
- Pas de Stripe/CinetPay. Les notifications email doivent utiliser l'infrastructure Resend existante si email-only est retenu. [Source: _bmad-output/planning-artifacts/architecture.md#Implementation-Handoff] [Source: src/lib/email.ts]

### Algorithme recommandé

Règle MVP déterministe : deux tags matchent si `category` ET `value` sont identiques. Exemple : `{ category: "SECTEUR", value: "tech" }` matche seulement le même tag sur l'opportunité.

```ts
const userTagKeys = new Set(userTags.map(getTagKey));
const matchedTags = opportunity.tags.filter((tag) => userTagKeys.has(getTagKey(tag)));
const commonTagCount = matchedTags.length;
const matchPercent = userTags.length > 0
  ? Math.min(100, Math.round((commonTagCount / userTags.length) * 100))
  : 0;
```

Tri : `commonTagCount desc`, puis `createdAt desc`. Le pourcentage est un indicateur UI; l'ordre métier doit rester le nombre de tags communs demandé par l'AC.

### Notification — garde-fous de scope

- L'AC parle d'un « nouveau deal correspondant » publié. Dans le code IBC, une opportunité créée est d'abord `PENDING`; elle devient réellement visible après vérification admin (`VERIFIED`). Déclencher la notification lors du passage à `VERIFIED` évite de notifier des deals non validés. [Source: _bmad-output/planning-artifacts/prd.md#FR15-FR19]
- Si un modèle `Notification` est créé, garder le MVP minimal et réutilisable pour Story 4.4 (notifications d'intérêt). Ne pas ajouter WebSockets/SSE/push; l'in-app peut être une table + affichage/liste basique ultérieur si l'AC de cette story se limite à persistance.
- Les « préférences » utilisateur ne sont pas présentes dans le modèle actuel. Ne pas inventer un système complet de préférences; utiliser un fallback explicite : in-app si modèle ajouté, sinon email via Resend, et documenter dans les tests.

### UX attendue

- Matching est une destination de navigation simple : `/dashboard/matching`.
- Badge match sur carte : discret, lisible, non anxiogène. UX Spec autorise « 95% match »; le libellé « 2 tags communs » est plus transparent et directement aligné sur l'AC. [Source: _bmad-output/planning-artifacts/ux-spec.md#Journey-D--Matching--Contact]
- EmptyState exact pour aucun match : titre « Aucun deal ne correspond à vos critères actuels », CTA « Modifier mes tags » vers `/profile/edit`. Utiliser `src/components/shared/empty-state.tsx`. [Source: src/components/shared/empty-state.tsx]
- La carte deal doit conserver TrustBadge, montant/localisation, documents, WhatsAppCTA et tags existants. Le matching enrichit la carte, il ne remplace pas les signaux de confiance. [Source: _bmad-output/planning-artifacts/ux-spec.md#Deal-Feed]

### Points de régression à éviter

- Ne pas casser la visibilité tier/premium de Story 3.4 : les matches doivent être calculés seulement parmi les deals que le membre peut voir, sauf admin.
- Ne pas notifier l'auteur de son propre deal.
- Ne pas exposer tags ou métadonnées sensibles dans `/api/opportunities?public=true`; le matching est membre authentifié.
- Ne pas mélanger `OpportunityCategory` et `TagCategory`. `OpportunityCategory` reste la catégorie historique; le matching utilise `UserTag`/`OpportunityTag` uniquement.
- Ne pas effectuer un `orderBy` Prisma impossible sur un count calculé en JS. Charger les candidats visibles, calculer les counts en mémoire pour le MVP, puis trier.
- Si le volume grossit, optimiser plus tard avec requête SQL/agrégation; Phase 1 vise 500 membres actifs et le matching par règles suffit. [Source: _bmad-output/planning-artifacts/architecture.md#Deferred-Decisions]

### Références

- [Source: _bmad-output/planning-artifacts/epics.md#Story-4.3]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic-4]
- [Source: _bmad-output/planning-artifacts/prd.md#FR28]
- [Source: _bmad-output/planning-artifacts/ux-spec.md#Journey-D--Matching--Contact]
- [Source: _bmad-output/planning-artifacts/ux-spec.md#Component-Strategy]
- [Source: _bmad-output/planning-artifacts/architecture.md#Technical-Constraints]
- [Source: _bmad-output/implementation-artifacts/4-2-systeme-de-tags-profil-et-opportunites.md]
- [Source: prisma/schema.prisma]
- [Source: src/lib/tags.ts]
- [Source: src/components/features/tags/tag-chips.tsx]
- [Source: src/components/features/deals/deal-card.tsx]
- [Source: src/app/(dashboard)/dashboard/opportunities/page.tsx]
- [Source: src/app/api/opportunities/route.ts]
- [Source: src/components/shared/empty-state.tsx]

## Project Structure Notes

- New matching logic belongs in `src/lib/matching.ts` with tests beside it (`src/lib/matching.test.ts`).
- New route belongs in the existing dashboard route group: `src/app/(dashboard)/dashboard/matching/page.tsx`, matching current URL style `/dashboard/opportunities`.
- Existing files likely updated: `DealCard`, dashboard layout navigation, opportunities page, admin verify route, email helper and possibly Prisma schema/migration only if minimal notifications are added.
- No detected architectural conflict. The story is a delta on the existing tag infrastructure and existing feed components.

## Dev Agent Record

### Agent Model Used

GPT-5.5 (OpenAI Codex)

### Debug Log References

- 2026-05-20 — Implemented tag matching helpers and tests (`src/lib/matching.ts`, `src/lib/matching.test.ts`).
- 2026-05-20 — Added `/dashboard/matching` server feed, match badges, opportunities prioritization, nav link, and matched notification flow.
- 2026-05-20 — Validation passed: `npx vitest run` (278 passed), `npm run build` (passed; rate-limit env warnings only), targeted ESLint on modified files (passed). Full `npm run lint` still reports pre-existing issues in unrelated files.

### Completion Notes List

- Reused Story 4.2 tag infrastructure (`UserTag`, `OpportunityTag`, `TagCategory`, `SelectedTag`, `TagChips`) without adding a new tag taxonomy/model.
- Added deterministic MVP matching by exact `category:value`, with common tag count, match percent, matched tags, and stable sorting by `commonTagCount desc` then `createdAt desc`.
- Added protected Matching feed using `auth()`, `buildOpportunityVisibilityWhere(currentUser.tier)`, exact no-match `EmptyState`, and `/profile/edit` CTA.
- Prioritized matched opportunities in the existing opportunities feed while preserving category/tag filters, author visibility, admin behavior, premium gate, and tier visibility.
- Added subtle DealCard match badge while keeping tags outside the card link and non-interactive to avoid nested anchors.
- Added minimal `Notification` persistence plus matched opportunity email helper and non-blocking matched notification dispatch after admin verification.
- Added tests covering matching helpers, DealCard badge, Matching page states/sorting, opportunities prioritization/filters, and matched notification eligibility/error tolerance.

### File List

- _bmad-output/implementation-artifacts/4-3-matching-basique-par-tags.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- prisma/schema.prisma
- prisma/migrations/20260520090000_add_notifications/migration.sql
- src/lib/matching.ts
- src/lib/matching.test.ts
- src/app/(dashboard)/dashboard/matching/page.tsx
- src/app/(dashboard)/dashboard/matching/page.test.tsx
- src/app/(dashboard)/dashboard/opportunities/page.tsx
- src/app/(dashboard)/dashboard/opportunities/page.test.tsx
- src/app/(dashboard)/layout.tsx
- src/components/features/deals/deal-card.tsx
- src/components/features/deals/deal-card.test.tsx
- src/lib/email.ts
- src/app/api/admin/opportunities/[id]/verify/route.ts
- src/app/api/admin/opportunities/[id]/verify/route.test.ts

### Change Log

- 2026-05-20 — Implemented Story 4.3 tag-based matching feed, prioritization, badge, matched notifications, tests, and verification updates.
