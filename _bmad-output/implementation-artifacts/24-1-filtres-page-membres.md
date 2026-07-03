# Story 24.1: Filtrage de la page membres (espace membre)

Status: ready-for-dev

## Story

**En tant que** membre connecté,
**je veux** rechercher et filtrer les membres par nom et tier,
**afin de** trouver rapidement des membres selon des critères pertinents.

## Acceptance Criteria

1. **Search par nom** : Un input de recherche filtre les membres par nom (debounce 300 ms) et met à jour l'URL via `searchParams` (`?q=...`).
2. **Filtre par tier** : Filter chips horizontaux scrollables (Tous / Affranchis / Grands Frères / Boss), sélection mutuellement exclusive, via `?tier=...`.
3. **Tri** : Dropdown de tri (Nom A→Z, Nom Z→A, Plus récents, Plus anciens), via `?sort=...`.
4. **Pagination** : Si plus de 20 résultats, pagination en bas (page précédente / suivante), via `?page=...`.
5. **URL state** : Tous les filtres sont dans l'URL (partageable, bookmarkable, SSR-friendly).
6. **Empty state** : Si aucun résultat, afficher "Aucun membre ne correspond à vos critères" avec un bouton "Réinitialiser les filtres".
7. **Accessibilité** : Champ de recherche avec `aria-label`, chips avec `role="group"`, tri avec `aria-label`.
8. **Tests** : Tests unitaires vérifiant le rendu avec différents `searchParams`, y compris l'empty state.

## Tasks / Subtasks

- [ ] Étendre le Server Component `src/app/(dashboard)/members/page.tsx` pour accepter et parser `searchParams` (AC #1, #3, #4, #5).
  - [ ] Parser `q`, `tier`, `sort`, `page` de manière robuste (tableaux, valeurs invalides).
  - [ ] Valider `tier` contre l'enum Prisma `Tier`.
  - [ ] Valider `sort` contre les 4 valeurs supportées.
  - [ ] Construire le `where` Prisma et l'`orderBy` correspondants.
- [ ] Créer un petit Client Component pour le search input avec debounce 300 ms (AC #1, #5, #7).
  - [ ] Utiliser `useSearchParams` + `useRouter` + `useTransition` si pertinent.
  - [ ] Ne pas perdre les autres paramètres (`tier`, `sort`, `page`) lors de la mise à jour de `q`.
- [ ] Implémenter les filter chips de tier (AC #2, #5, #7).
  - [ ] Remplacer ou étendre l'affichage existant des labels/couleurs de tier.
  - [ ] Gérer l'état "Tous" (pas de `tier` dans l'URL).
- [ ] Implémenter le dropdown de tri (AC #3, #5, #7).
  - [ ] Utiliser le composant `Select` existant (`@/components/ui/select`).
- [ ] Implémenter la pagination (AC #4, #5).
  - [ ] `PAGE_SIZE = 20`.
  - [ ] Calculer `totalPages`, `hasPreviousPage`, `hasNextPage`.
  - [ ] Conserver les filtres actifs dans les liens de pagination.
- [ ] Implémenter l'empty state (AC #6).
  - [ ] Afficher le message + bouton de réinitialisation.
  - [ ] Le bouton réinitialise tous les filtres (`/members`).
- [ ] Écrire les tests unitaires (AC #8).
  - [ ] Tester le rendu avec différentes combinaisons de `searchParams`.
  - [ ] Tester l'empty state.
  - [ ] S'appuyer sur le pattern de mock de `src/app/(dashboard)/members/[id]/page.test.tsx`.
- [ ] Vérifier le build (`npm run build`) et les tests (`npx vitest run`).

## Dev Notes

### Delta sur code existant — NE PAS réinventer

La page cible est aujourd'hui un **Server Component** de 73 lignes : `src/app/(dashboard)/members/page.tsx`. Elle effectue déjà :

- Vérification de session via `auth()` et redirection si non connecté.
- Vérification `emailVerified` et `onboardingCompleted` avant affichage.
- Requête Prisma `prisma.user.findMany({ where: { verificationStatus: "VERIFIED" }, orderBy: { createdAt: "desc" } })`.
- Affichage grille de cards membres avec labels/couleurs de tier.
- Empty state simple quand `members.length === 0`.

**Cette story est une delta sur cette page**, pas une réécriture. Il faut :

1. Ajouter `searchParams?: Promise<...>` à la signature du Server Component.
2. Parser les paramètres et ajuster le `where` / `orderBy` / `skip` / `take`.
3. Conserver l'affichage existant des cards, labels tiers et couleurs.
4. Conserver la logique d'accès (auth, vérification email/onboarding).

### Gestion de l'accès premium

La page `/members` est dans le groupe `(dashboard)` protégé par middleware. Contrairement à `/members/[id]` qui appelle `getUserPremiumAccess` et bloque les non-actifs, **la page liste `/members` actuelle n'appelle pas `getUserPremiumAccess`** — elle est accessible à tout membre connecté et vérifié-onboarding. **Ne pas ajouter de gate premium** sur cette page pour cette story ; rester cohérent avec le comportement existant. Voir `src/lib/subscription-access.ts` pour contexte.

### Architecture et patterns à suivre

- **Next.js 16, App Router, Server Component par défaut.** Le data fetching reste côté serveur.
- **URL state via `searchParams`.** Pas de nouvelle API route ; les filtres passent directement au `where` Prisma.
- **Client Component minimal** : seul l'input de recherche a besoin d'interactivité (debounce + update URL). Le reste (chips, tri, pagination, empty state) peut être rendu côté serveur via `Link`.
- **Composants UI existants** : `Input` (`@/components/ui/input`), `Select` (`@/components/ui/select`), `Button` (`@/components/ui/button`), `Badge` (`@/components/ui/badge`), `Link` de Next.js.
- **JSX Boolean Guardrail (Next.js 16 strict)** : ne jamais utiliser `&&` dans le JSX. Toujours pré-calculer les booléens composés en `const` avant le return et utiliser des ternaires (`condition ? <X /> : null`). Voir `architecture.md` § "JSX Boolean Guardrail".
- **Accessibilité** : `aria-label` sur le search input et le select de tri ; `role="group"` + `aria-label` sur le groupe de chips de tier. Respecter NFR-A1 (WCAG 2.1 AA) et NFR-A3 (français non technique).
- **Mobile-first / UX** : chips horizontaux scrollables (`overflow-x-auto`) avec touch targets ≥ 44 px. Textes en français non technique.

### Schéma de données pertinent

```prisma
model User {
  id                   String    @id @default(cuid())
  email                String    @unique
  name                 String
  bio                  String?
  image                String?   @map("avatarUrl")
  phone                String?
  location             String?
  country              String?
  tier                 Tier      @default(AFFRANCHI)
  role                 UserRole  @default(MEMBER)
  status               UserStatus @default(ACTIVE)
  verificationStatus   VerificationStatus @default(PENDING)
  ...
  createdAt            DateTime  @default(now())

  @@index([status, createdAt])
  @@map("users")
}

enum Tier {
  AFFRANCHI
  GRAND_FRERE
  BOSS
}
```

**Note performance** : actuellement pas d'index sur `name`. Pour 500 membres cible (NFR-SC1), SQLite (dev) s'en accommode ; en production PostgreSQL il faudra éventuellement ajouter un index si volume élevé. Cela est hors scope de cette story (voir SCP §6).

### Parsing des `searchParams` recommandé

```ts
const query = await searchParams ?? {};

function parseStringParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

const q = parseStringParam(query.q)?.trim();
const tierRaw = parseStringParam(query.tier);
const sortRaw = parseStringParam(query.sort);
const pageRaw = parseStringParam(query.page);
```

### Construction du where / orderBy

```ts
const validTierValues: string[] = ["AFFRANCHI", "GRAND_FRERE", "BOSS"];
const tier = validTierValues.includes(tierRaw ?? "") ? (tierRaw as Tier) : undefined;

const sortOrder: Record<string, Prisma.UserOrderByWithRelationInput> = {
  name_asc: { name: "asc" },
  name_desc: { name: "desc" },
  recent: { createdAt: "desc" },
  oldest: { createdAt: "asc" },
};
const orderBy = sortOrder[sortRaw ?? ""] ?? { createdAt: "desc" };

const where: Prisma.UserWhereInput = {
  verificationStatus: "VERIFIED",
  ...(tier ? { tier } : {}),
  ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
};
```

> Note : `mode: "insensitive"` fonctionne sur PostgreSQL mais peut être ignoré/fallback sur SQLite selon Prisma. Sous SQLite, `contains` est case-sensitive par défaut ; c'est acceptable pour le MVP. Si la sensibilité à la casse devient un problème, documenter comme future amélioration.

### Pagination

```ts
const PAGE_SIZE = 20;
const page = Math.max(1, Number.parseInt(pageRaw ?? "1", 10) || 1);
const skip = (page - 1) * PAGE_SIZE;

const [members, totalCount] = await Promise.all([
  prisma.user.findMany({ where, orderBy, skip, take: PAGE_SIZE, select: { ... } }),
  prisma.user.count({ where }),
]);

const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
const hasPreviousPage = page > 1 && totalPages > 1;
const hasNextPage = page < totalPages;
```

### Recherche debounce — Client Component minimal

Créer par exemple `src/components/features/members/member-search-input.tsx` ("use client") :

- Utiliser `useSearchParams`, `useRouter`, `usePathname`.
- `useEffect` avec `setTimeout(300)` pour remplacer `?q=...` dans l'URL via `router.replace(`${pathname}?${nextParams.toString()}`)`.
- Conserver les paramètres existants (`tier`, `sort`, `page`).
- Réinitialiser `page=1` quand `q` change.
- `aria-label="Rechercher un membre par nom"`.

### URL state et liens

- Les chips de tier et le select de tri peuvent utiliser des `Link` de Next.js avec `href` reconstruit.
- Lorsqu'un filtre change, réinitialiser `page=1`.
- Le bouton "Réinitialiser les filtres" pointe vers `/members` (pas de query params).

### Tests

Créer `src/app/(dashboard)/members/page.test.tsx` en s'inspirant de `src/app/(dashboard)/members/[id]/page.test.tsx` :

- Mocker `@/lib/auth`, `@/lib/prisma`, `next/navigation`.
- Tester le rendu par défaut (liste de membres vérifiés).
- Tester `?q=nom` filtre par nom.
- Tester `?tier=BOSS` filtre par tier.
- Tester `?sort=name_asc` tri.
- Tester `?page=2` pagination.
- Tester l'empty state avec `?q=xyzinconnu`.
- Vérifier que les redirections (non connecté, onboarding incomplet) restent actives.

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

- `src/app/(dashboard)/members/page.tsx` — Server Component à étendre.
- `src/components/features/members/member-search-input.tsx` — Client Component de recherche debounced (à créer).
- `src/app/(dashboard)/members/page.test.tsx` — Tests unitaires (à créer).

## References

- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-07-03-member-filtering.md` — scope de la story 24-1.
- `_bmad-output/planning-artifacts/epics.md` lignes 1901-1942 — Epic 24 et Story 24-1.
- `_bmad-output/planning-artifacts/prd.md` — FR77, UX-DR18, NFR-P2, NFR-A1, NFR-A2, NFR-A3.
- `_bmad-output/planning-artifacts/architecture.md` — JSX Boolean Guardrail, Server Component pattern, structure du projet.
- `src/app/(dashboard)/members/page.tsx` — page existante (delta).
- `src/app/(dashboard)/members/[id]/reviews/page.tsx` — exemple de pagination avec URL params.
- `src/app/(dashboard)/members/[id]/page.test.tsx` — pattern de tests pour pages dashboard.
- `prisma/schema.prisma` — modèle `User`, enum `Tier`.

## Story Completion Status

- Status: **ready-for-dev**
- Completion note: Ultimate context engine analysis completed - comprehensive developer guide created for Story 24-1.
