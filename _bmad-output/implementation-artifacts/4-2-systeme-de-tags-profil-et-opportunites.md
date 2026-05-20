---
Story: "4.2"
StoryKey: "4-2-systeme-de-tags-profil-et-opportunites"
Title: "Système de Tags Profil et Opportunités"
Status: "done"
Priority: "P1"
Epic: "Epic 4 — Networking, Matching et WhatsApp"
FRs: ["FR26", "FR27"]
UXDRs: ["UX-DR18"]
NFRs: ["NFR-A2", "NFR-A3"]
Created: "2026-05-20"
---

# Story 4.2: Système de Tags Profil et Opportunités

Status: done

## Story

En tant que membre,
je veux ajouter des tags à mon profil et voir les tags des opportunités,
afin d'améliorer la pertinence de ma découverte.

## Acceptance Criteria

1. **Tags profil — FR26**
   - Given un membre sur `/profile/edit`
   - When il consulte la section Tags
   - Then il peut ajouter des chips pour :
     - Secteur : Immobilier, Business, Investissement, Partenariat, Agriculture, Tech
     - Montant recherché : 10k-50k€, 50k-100k€, 100k€+
     - Localisation : Abidjan, Cocody, Marcory, etc.

2. **Ajout de tag responsive**
   - Given un membre ajoutant un tag
   - When il clique sur « + Ajouter un tag »
   - Then une bottom sheet mobile ou un Select desktop s'ouvre avec les options disponibles

3. **Tags opportunité — FR27**
   - Given un porteur de projet créant un deal
   - When il remplit le formulaire
   - Then il peut taguer l'opportunité avec les mêmes catégories : secteur, montant, localisation

4. **Affichage et filtrage par chips — UX-DR18**
   - Given un membre ou un deal avec des tags
   - When ils sont affichés
   - Then les tags apparaissent sous forme de chips horizontaux scrollables, cliquables pour filtrer

## Tasks / Subtasks

- [x] **Modèle de données tags + migration Prisma** (AC: #1, #3, #4)
  - [x] Confirmer qu'aucun modèle Tag n'existe déjà dans `prisma/schema.prisma` avant modification : l'audit actuel ne trouve aucun `Tag`, `UserTag` ou `OpportunityTag`.
  - [x] Ajouter un enum Prisma `TagCategory` avec `SECTEUR`, `MONTANT`, `LOCALISATION`.
  - [x] Ajouter `UserTag` et `OpportunityTag` avec relations `User.tags` et `Opportunity.tags`, suppression cascade, `category`, `value`, `createdAt`, contraintes uniques et index :
    - `@@unique([userId, category, value])`, `@@index([category, value])`, `@@map("user_tags")`
    - `@@unique([opportunityId, category, value])`, `@@index([category, value])`, `@@map("opportunity_tags")`
  - [x] Générer une migration Prisma dans `prisma/migrations/` et régénérer le client Prisma.
  - [x] Ne pas réutiliser `OpportunityCategory` comme système de tags : il ne contient pas `AGRICULTURE`/`TECH` et représente la catégorie historique du deal.

- [x] **Source unique des options de tags** (AC: #1, #2, #3)
  - [x] Créer `src/lib/tags.ts` avec une liste typée et stable des options disponibles.
  - [x] Inclure les valeurs minimales requises :
    - Secteur : `immobilier`, `business`, `investissement`, `partenariat`, `agriculture`, `tech`
    - Montant : `10k-50k`, `50k-100k`, `100k-plus`
    - Localisation : `abidjan`, `cocody`, `marcory` et quelques communes courantes d'Abidjan si utile (`plateau`, `yopougon`, `treichville`, `bingerville`, etc.)
  - [x] Exporter des helpers pour validation et rendu (`getTagLabel`, `isValidTagOption`, regroupement par catégorie) afin d'éviter les duplications entre formulaire profil, formulaire opportunité et chips.

- [x] **Validation Zod + API profil** (AC: #1, #2)
  - [x] Étendre `profileUpdateSchema` dans `src/lib/validations.ts` avec `tags` comme tableau optionnel d'objets `{ category, value }`, validé contre `src/lib/tags.ts`.
  - [x] Étendre `src/app/api/user/profile/route.ts` :
    - `GET` doit sélectionner `tags` triés par catégorie/valeur pour préremplir le formulaire.
    - `POST` doit remplacer transactionnellement les tags du membre (`deleteMany` puis `createMany`) avec déduplication.
    - Préserver le comportement existant : auth obligatoire, messages d'erreur français, normalisation des chaînes vides en `null`, réponse `NextResponse.json({ data })`.
  - [x] Ajouter/mettre à jour les tests `src/app/api/user/profile/route.test.ts` pour vérifier sauvegarde, déduplication, rejet des tags invalides et conservation des champs profil existants.

- [x] **UI tags dans le profil** (AC: #1, #2, #4)
  - [x] Adapter `ProfileEditForm` dans `src/components/features/auth/profile-edit-form.tsx` pour recevoir et gérer les tags initiaux.
  - [x] Ajouter une section française « Tags » avec chips horizontaux scrollables et bouton « + Ajouter un tag ».
  - [x] Sur mobile, ouvrir `src/components/ui/sheet.tsx` avec `side="bottom"`; sur desktop, utiliser le `Select` existant (`src/components/ui/select.tsx`). Une implémentation acceptable : afficher le bouton/sheet sur `<sm` et le Select sur `sm+` via classes Tailwind responsive.
  - [x] Permettre le retrait d'un tag via bouton accessible (`aria-label="Retirer le tag …"`).
  - [x] Conserver le style dark mode (`bg-card`, `border`, `text-muted-foreground`, `dark:*` déjà utilisés dans le projet) et éviter tout texte anglais.
  - [x] Important Next.js 16 : ne pas ajouter de rendu conditionnel en `&&` dans JSX ; utiliser des ternaires (`condition ? <Comp /> : null`) ou des booléens pré-calculés.

- [x] **Route `/profile/edit` ou compatibilité avec le profil existant** (AC: #1)
  - [x] Le code existant expose l'édition sur `src/app/(dashboard)/profile/page.tsx`, pas sur `/profile/edit`.
  - [x] Pour satisfaire l'AC explicitement, créer `src/app/(dashboard)/profile/edit/page.tsx` qui réutilise la même expérience d'édition ou redirige proprement vers `/profile` si l'équipe décide que `/profile` est la route canonique.
  - [x] Si redirection, documenter dans le code/test que `/profile/edit` reste une URL valide pour l'AC et les futurs liens « Modifier mes tags » de Story 4.3.

- [x] **Tags dans création d'opportunité** (AC: #3)
  - [x] Étendre `opportunityCreateSchema` avec `tags` validés par la même source `src/lib/tags.ts`.
  - [x] Adapter `src/app/(dashboard)/dashboard/opportunities/new/page.tsx` pour sélectionner les tags du deal avec la même UI (chips + bottom sheet mobile / Select desktop).
  - [x] Adapter `src/app/api/opportunities/route.ts` `POST` pour créer l'opportunité et ses `OpportunityTag` dans une transaction Prisma.
  - [x] Préserver le comportement existant : création de documents juridiques après création, calcul `requiresDoubleVerification`, catégorie historique `category`, montant optionnel, redirection après succès.
  - [x] Ajouter/mettre à jour tests API création d'opportunité pour vérifier persistance des tags et rejet des tags invalides.

- [x] **Affichage chips et filtres opportunités** (AC: #4)
  - [x] Créer un composant réutilisable `TagChips` ou `TagFilterChips` (emplacement recommandé : `src/components/features/tags/` ou `src/components/shared/`) pour rendre les chips scrollables horizontalement.
  - [x] Les chips affichées sur un deal ou profil doivent être cliquables et pointer vers `/dashboard/opportunities?tagCategory=<category>&tagValue=<value>` ou une convention équivalente documentée et testée.
  - [x] Étendre `DealCard` (`src/components/features/deals/deal-card.tsx`) pour accepter `tags` et les rendre sans casser le CTA WhatsApp ajouté en Story 4.1.
  - [x] Étendre les requêtes d'opportunités (`src/app/(dashboard)/dashboard/opportunities/page.tsx` et `src/app/api/opportunities/route.ts` si utilisé par clients) pour inclure `tags` et filtrer lorsque `tagCategory` + `tagValue` sont présents.
  - [x] Préserver le filtre `category` existant dans `CategoryFilterChips` et composer les filtres au lieu de le remplacer.
  - [x] Optionnel mais recommandé : afficher les tags sur la page détail opportunité `src/app/(dashboard)/dashboard/opportunities/[id]/page.tsx` et sur profil public membre `/members/[id]`.

- [x] **Tests et vérification** (AC: all)
  - [x] Tests unitaires du composant tags : affichage par catégorie, ajout, retrait, deduplication, liens de filtre.
  - [x] Tests `ProfileEditForm` pour section Tags et payload envoyé à `/api/user/profile`.
  - [x] Tests `DealCard` pour rendu chips + conservation WhatsAppCTA.
  - [x] Tests route/page opportunités pour filtrage `tagCategory/tagValue` et coexistence avec filtre `category`.
  - [x] Exécuter au minimum `npx vitest run` et `npm run build`.

## Dev Notes

### État actuel du code — lu avant conception

- `prisma/schema.prisma` ne contient actuellement aucun modèle de tags. Les modèles pertinents sont `User` (profil, `location`, `country`, `phone`) et `Opportunity` (`title`, `description`, `category`, `amount`, `requiredTier`, vérification, documents). [Source: prisma/schema.prisma]
- `/profile/edit` n'existe pas dans `src/app`; l'édition est actuellement dans `src/app/(dashboard)/profile/page.tsx` via `ProfileEditForm`. [Source: src/app/(dashboard)/profile/page.tsx]
- Le formulaire profil existant (`ProfileEditForm`) utilise React Hook Form + Zod, POST `/api/user/profile`, `toast` Sonner, `Select` shadcn/Base UI pour pays, et contient déjà `name`, `bio`, `phone`, `location`, `country`. [Source: src/components/features/auth/profile-edit-form.tsx]
- L'API profil (`src/app/api/user/profile/route.ts`) fait auth obligatoire, `GET`/`POST`, validation Zod, et renvoie `NextResponse.json({ data })`. Elle devra être étendue sans changer le contrat existant. [Source: src/app/api/user/profile/route.ts]
- Le formulaire création deal (`src/app/(dashboard)/dashboard/opportunities/new/page.tsx`) est un client component RHF/Zod avec `title`, `description`, `category`, `amount` et upload de documents après création. [Source: src/app/(dashboard)/dashboard/opportunities/new/page.tsx]
- L'API opportunités (`src/app/api/opportunities/route.ts`) gère le mode public teaser, la visibilité premium/tier, le POST de création, et le calcul `requiresDoubleVerification`. [Source: src/app/api/opportunities/route.ts]
- `DealCard` existe déjà, affiche localisation/montant/trust/documents, et inclut `WhatsAppCTA`. Ne pas le remplacer. Étendre ses props avec `tags` seulement. [Source: src/components/features/deals/deal-card.tsx]
- `CategoryFilterChips` existe déjà pour filtre par catégorie avec nav horizontale scrollable. Réutiliser le pattern visuel pour les chips de tags. [Source: src/components/features/deals/category-filter-chips.tsx]
- `src/components/ui/sheet.tsx` existe et supporte `side="bottom"`; `src/components/ui/select.tsx` existe. Ne pas installer de nouvelle librairie pour la bottom sheet ou le Select. [Source: src/components/ui/sheet.tsx, src/components/ui/select.tsx]

### Architecture & contraintes obligatoires

- Stack constatée : Next.js 16.2.6, React 19.2.4, Prisma 7.8.0, Auth.js v5 beta.31, TailwindCSS 4, shadcn/Base UI, Vitest 4. [Source: package.json]
- Prisma 7 : le datasource n'a pas d'URL dans `schema.prisma`; `prisma.config.ts` lit `DATABASE_URL`. Le client généré vit dans `src/generated/prisma`; passer par `src/lib/prisma.ts` pour les requêtes applicatives. [Source: prisma/schema.prisma, prisma.config.ts]
- Auth.js : utiliser `auth()` depuis `@/lib/auth` en Server Components et Route Handlers. Ne jamais importer Prisma/bcrypt dans `auth.config.ts` ou middleware Edge. [Source: architecture.md]
- Next.js 16 strict : ne pas utiliser `condition && <Comp />` dans JSX. Le code récent a migré vers ternaires (`condition ? <Comp /> : null`). Continuer ce pattern. [Source: Story 4.1 Dev Notes]
- API : succès sous `{ data }` pour les endpoints existants quand c'est déjà leur contrat, erreurs françaises `{ error, code? }`, statuts HTTP adaptés. [Source: architecture.md]
- French UI : toutes les chaînes visibles doivent être en français. [Source: NFR-A3]
- Dark mode : utiliser les tokens existants (`bg-card`, `bg-background`, `text-muted-foreground`, `border`, `primary`, `popover`) plutôt que des couleurs fixes sauf exceptions déjà définies. [Source: NFR-A2]

### Recommandation de modèle de données

Implémentation recommandée, optimisée pour Story 4.3 (matching par tags) et SQLite/PostgreSQL futur :

```prisma
enum TagCategory {
  SECTEUR
  MONTANT
  LOCALISATION
}

model UserTag {
  id        String      @id @default(cuid())
  userId    String
  category  TagCategory
  value     String
  createdAt DateTime    @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, category, value])
  @@index([category, value])
  @@map("user_tags")
}

model OpportunityTag {
  id            String      @id @default(cuid())
  opportunityId String
  category      TagCategory
  value         String
  createdAt     DateTime    @default(now())

  opportunity Opportunity @relation(fields: [opportunityId], references: [id], onDelete: Cascade)

  @@unique([opportunityId, category, value])
  @@index([category, value])
  @@map("opportunity_tags")
}
```

Ajouter dans `User` : `tags UserTag[]`. Ajouter dans `Opportunity` : `tags OpportunityTag[]`.

Raison : les options sont contrôlées par code, donc pas besoin de table `Tag` administrable pour le MVP. Les tables séparées simplifient les contraintes uniques par propriétaire et les requêtes de matching futures (`OpportunityTag` vs `UserTag`). Si l'équipe préfère une table `Tag` normalisée, ne l'introduire que si cela reste compatible avec FR26/FR27 et la future Story 4.3.

### Contrat tags recommandé côté TypeScript

Créer un contrat unique dans `src/lib/tags.ts` :

```ts
export const TAG_CATEGORIES = ["SECTEUR", "MONTANT", "LOCALISATION"] as const;
export type TagCategory = (typeof TAG_CATEGORIES)[number];

export type TagOption = {
  category: TagCategory;
  value: string;
  label: string;
};

export type SelectedTag = {
  category: TagCategory;
  value: string;
};
```

La valeur `value` doit être stable et lowercase/slug pour URLs et stockage; le `label` est affiché en français. Les query params peuvent rester simples (`tagCategory=SECTEUR&tagValue=tech`). Valider strictement les deux paramètres avant de les injecter dans Prisma.

### UI attendue

- Chips : `inline-flex`, `rounded-full`, `border`, `min-h-11` ou équivalent touch-friendly, horizontal scroll via `overflow-x-auto`, `min-w-max`, `gap-2`, comme `CategoryFilterChips`.
- Tag ajouté : chip visible immédiatement, bouton de retrait accessible.
- Tag cliquable en affichage lecture : lien de filtre vers le feed opportunités.
- Bouton ajout : libellé exact « + Ajouter un tag ».
- Mobile : `Sheet` `side="bottom"`, titre « Ajouter un tag », options groupées par catégorie.
- Desktop : `Select` existant, idéalement précédé d'un Select catégorie ou options groupées par label (`Secteur — Tech`).

### Points de régression à éviter

- Ne pas casser Story 4.1 : `DealCard` doit conserver `WhatsAppCTA` et son comportement tooltip/désactivé.
- Ne pas exposer de nouveaux champs sensibles dans le mode public de `/api/opportunities?public=true`; les tags publics teaser ne sont pas demandés par cette story. Si ajout public, limiter à `title/location/tags` seulement et tester explicitement.
- Ne pas remplacer le filtre catégorie existant; les nouveaux filtres tags doivent se composer avec `category`.
- Ne pas faire de matching ou scoring dans cette story : Story 4.3 fera le tri par tags communs. Cette story fournit stockage, édition, affichage et filtrage direct par chip.
- Ne pas créer de doublons de composants Select/Sheet/Badge; réutiliser les composants UI existants.

### Références

- [Source: _bmad-output/planning-artifacts/epics.md#Story-4.2]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic-4]
- [Source: _bmad-output/planning-artifacts/prd.md#FR26-FR27]
- [Source: _bmad-output/planning-artifacts/ux-spec.md#UX-DR18]
- [Source: _bmad-output/planning-artifacts/architecture.md#Technical-Constraints]
- [Source: prisma/schema.prisma]
- [Source: src/components/features/auth/profile-edit-form.tsx]
- [Source: src/app/api/user/profile/route.ts]
- [Source: src/app/(dashboard)/dashboard/opportunities/new/page.tsx]
- [Source: src/app/api/opportunities/route.ts]
- [Source: src/components/features/deals/deal-card.tsx]
- [Source: src/components/features/deals/category-filter-chips.tsx]
- [Source: src/components/ui/sheet.tsx]
- [Source: src/components/ui/select.tsx]
- [Source: _bmad-output/implementation-artifacts/4-1-deep-links-whatsapp-sur-profils-et-deals.md]

## Dev Agent Record

### Agent Model Used

GPT-5.5 (OpenAI Codex)

### Debug Log References

- 2026-05-20: Confirmed no existing `Tag`, `UserTag`, or `OpportunityTag` models before schema changes.
- 2026-05-20: Ran `npx prisma migrate dev --name add-tags-system` and `npx prisma generate`.
- 2026-05-20: Ran `npx vitest run` — PASS (265), FAIL (0).
- 2026-05-20: Ran `npm run build` — PASS.

### Completion Notes List

- Implemented tag persistence with `TagCategory`, `UserTag`, and `OpportunityTag`, including cascade relations, uniqueness constraints, and category/value indexes.
- Added a single typed tag catalogue with validation, labels, grouping, deduplication, and filter URL helpers.
- Extended profile GET/POST and opportunity GET/POST APIs to load, validate, deduplicate, persist, and filter tags while preserving existing contracts and French errors.
- Added reusable `TagInput` and `TagChips` components with mobile bottom sheet, desktop select, horizontal chips, accessible removal, and filter links.
- Extended profile editing, opportunity creation, opportunity list/detail, and `DealCard` rendering without breaking WhatsApp CTA behavior.
- Added `/profile/edit` compatibility redirect to canonical `/profile`.
- Added and updated tests for tag helpers/components, profile API, opportunity API/page filtering, and DealCard WhatsApp preservation.

### File List

- `prisma/schema.prisma`
- `prisma/migrations/20260520075749_add_tags_system/migration.sql`
- `src/lib/tags.ts`
- `src/lib/validations.ts`
- `src/app/api/user/profile/route.ts`
- `src/app/api/user/profile/route.test.ts`
- `src/app/api/opportunities/route.ts`
- `src/app/api/opportunities/route.test.ts`
- `src/app/(dashboard)/profile/page.tsx`
- `src/app/(dashboard)/profile/edit/page.tsx`
- `src/components/features/auth/profile-edit-form.tsx`
- `src/app/(dashboard)/dashboard/opportunities/new/page.tsx`
- `src/app/(dashboard)/dashboard/opportunities/page.tsx`
- `src/app/(dashboard)/dashboard/opportunities/[id]/page.tsx`
- `src/components/features/tags/tag-input.tsx`
- `src/components/features/tags/tag-chips.tsx`
- `src/components/features/tags/tag-chips.test.tsx`
- `src/components/features/deals/deal-card.tsx`
- `src/components/features/deals/deal-card.test.tsx`

### Change Log

- 2026-05-20: Implemented Story 4.2 tags system for profiles and opportunities; validated with full Vitest suite and production build.

## Review Findings

### Review Summary (2026-05-20)

**Verdict: FAIL**

Review executed against `git diff HEAD~1` for commit `d986268 feat(story-4.2): système de tags profil et opportunités`.

Validation commands:
- `npm run build` — PASS.
- `npx vitest run` — PASS (265), FAIL (0).
- `grep -rn '&&' src/ --include='*.tsx'` — existing project-wide JSX `&&` occurrences still present; the Story 4.2 additions use ternaries in JSX, with only non-JSX `&&` additions in guard/helper logic.

### Blocking Findings

- [ ] [Review][Patch][P1] `DealCard` now renders clickable tag links inside the card-level `<Link>`, creating nested anchors. Evidence: `src/components/features/deals/deal-card.tsx:46-69` wraps the card body in a Next `<Link>` to `/dashboard/opportunities/${deal.id}`, and the new `<TagChips tags={deal.tags ?? []} />` renders each chip as its own `<Link>` in `src/components/features/tags/tag-chips.tsx:29-32`. This violates valid HTML/React composition and can break hydration, click behavior, and accessibility. Fix by restructuring `DealCard` so tag chips are outside the enclosing deal link, or by making only non-chip card sections link to the deal while preserving chip filter links.

### Non-blocking Observations

- [ ] [Review][Defer] Project-wide pre-existing JSX `&&` patterns remain outside the Story 4.2 diff. They should be cleaned in a separate hardening pass, but they are not newly introduced by this story.
- [ ] [Review][Defer] `POST /api/user/profile` deletes and recreates tags even when the optional `tags` field is omitted. The current UI always sends tags, so AC1 is covered, but API clients that omit `tags` during profile updates would clear existing tags. Consider preserving existing tags when `tags` is absent in a future API robustness pass.

### Acceptance Criteria Audit

- AC1 Tags profil: Implemented via `TagInput`, `/profile/edit` redirect to `/profile`, profile GET/POST persistence.
- AC2 Ajout responsive: Implemented mobile bottom sheet and desktop select.
- AC3 Tags opportunité: Implemented in opportunity form and POST route with strict tag validation.
- AC4 Affichage/filtrage chips: Partially implemented, but blocked by nested link composition in `DealCard` tag chips.

### Status

Story moved back to `in-progress`; do not mark `done` until the blocking `DealCard` nested-link issue is fixed and re-reviewed.
