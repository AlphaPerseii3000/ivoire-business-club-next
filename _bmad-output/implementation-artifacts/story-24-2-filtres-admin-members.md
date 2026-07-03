# Story 24.2: Filtrage avancé de la page admin members

Status: ready-for-dev

baseline_commit: 51b0fecf9a342976188385e75ec8dd63a433b8e1

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

**En tant qu'** admin,
**je veux** rechercher et filtrer les membres par nom, tier, statut d'abonnement, statut de compte, statut de vérification et date d'inscription,
**afin de** gérer efficacement la base de membres.

## Acceptance Criteria

1. **Search par nom/email** : Un input de recherche filtrant par nom OU email (debounce 300 ms) via `?q=...`.
2. **Filtre par tier** : Dropdown (Tous / Affranchis / Grands Frères / Boss) via `?tier=...`.
3. **Filtre par statut abonnement** : Dropdown (Tous / TRIAL / PENDING / ACTIVE / PAST_DUE / CANCELLED) via `?subscription=...`.
4. **Filtre par statut compte** : Dropdown (Tous / Actif / Suspendu) via `?status=...`.
5. **Filtre par statut vérification** : Dropdown (Tous / PENDING / EN_COURS / VERIFIED / REJECTED) via `?verification=...`.
6. **Tri** : Dropdown de tri (Nom A→Z, Nom Z→A, Plus récents, Plus anciens) via `?sort=...`.
7. **Coexistence avec `?incomplete=1`** : Le filtre "incomplets" existant doit coexister avec les nouveaux filtres (combinable en AND logique).
8. **Pagination** : Si plus de 25 résultats, pagination en bas via `?page=...`.
9. **URL state** : Tous les filtres dans l'URL, combinables entre eux.
10. **Empty state** : "Aucun membre ne correspond à vos critères" avec bouton de réinitialisation.
11. **Tests** : Tests unitaires vérifiant le `whereClause` avec différentes combinaisons de `searchParams`.

## Tasks / Subtasks

- [ ] **Étendre le Server Component `src/app/(admin)/admin/members/page.tsx` — parsing `searchParams`** (AC #1–#9)
  - [ ] Étendre le type `searchParams` pour accepter `q`, `tier`, `subscription`, `status`, `verification`, `sort`, `page`, `incomplete` (tous `string | string[]`).
  - [ ] Implémenter un helper `parseStringParam(value: string | string[] | undefined)` (réutiliser le pattern de story 24-1).
  - [ ] Parser et valider chaque paramètre contre des allow-lists :
    - `q` : trim + slice(0, 100) (limite anti-abus, identique à 24-1).
    - `tier` : valider contre `["AFFRANCHI", "GRAND_FRERE", "BOSS"]`.
    - `subscription` : valider contre `["TRIAL", "PENDING", "ACTIVE", "PAST_DUE", "CANCELLED"]`.
    - `status` : valider contre `["ACTIVE", "SUSPENDED"]`.
    - `verification` : valider contre `["PENDING", "EN_COURS", "VERIFIED", "REJECTED"]`.
    - `sort` : valider contre `["name_asc", "name_desc", "recent", "oldest"]`.
    - `page` : `Math.max(1, parseInt(pageRaw ?? "1", 10) || 1)`.
    - `incomplete` : conserver la logique existante (`=== "1"`).
  - [ ] Valeur invalide → ignorer (fallback à undefined), jamais crasher.

- [ ] **Construire le `whereClause` Prisma combinable** (AC #1–#7, #9)
  - [ ] Rechercher par nom OU email (AC #1) :
    ```ts
    ...(q ? { OR: [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ]} : {})
    ```
  - [ ] Filtre tier : `...(tier ? { tier } : {})` (AC #2).
  - [ ] Filtre statut compte : `...(status ? { status } : {})` (AC #4).
  - [ ] Filtre statut vérification : `...(verification ? { verificationStatus: verification } : {})` (AC #5).
  - [ ] Filtre statut abonnement (AC #3) — filtrer via la relation `subscriptions` :
    ```ts
    ...(subscription ? {
      subscriptions: { some: { status: subscription } }
    } : {})
    ```
  - [ ] Préserver le filtre `incomplete=1` existant (AC #7) : la condition `OR: [{ emailVerified: false }, { onboardingCompletedAt: null }]` s'ajoute en AND avec les autres filtres.
  - [ ] Construire le `whereClause` final en mergeant toutes les conditions avec l'opérateur spread (AND logique par défaut en Prisma).

- [ ] **Construire l'`orderBy`** (AC #6)
  - [ ] Définir un mapping `sortOrder` (identique à 24-1) :
    ```ts
    const sortOrder: Record<string, Prisma.UserOrderByWithRelationInput> = {
      name_asc: { name: "asc" },
      name_desc: { name: "desc" },
      recent: { createdAt: "desc" },
      oldest: { createdAt: "asc" },
    };
    const orderBy = sortOrder[sort ?? ""] ?? { createdAt: "desc" };
    ```

- [ ] **Implémenter la pagination** (AC #8)
  - [ ] `PAGE_SIZE = 25` (différent de 24-1 qui utilise 20).
  - [ ] Ajouter `prisma.user.count({ where })` pour le total.
  - [ ] `skip = (page - 1) * PAGE_SIZE`, `take = PAGE_SIZE`.
  - [ ] Calculer `totalPages`, `hasPreviousPage`, `hasNextPage`.

- [ ] **Créer un Client Component pour le search input avec debounce 300 ms** (AC #1, #9)
  - [ ] Créer `src/app/(admin)/admin/members/_components/admin-member-search-input.tsx` ("use client").
  - [ ] Réutiliser le pattern du `MemberSearchInput` de 24-1 (`src/app/(dashboard)/members/_components/member-search-input.tsx`) : `useSearchParams`, `useRouter`, `usePathname`, `useTransition`, `setTimeout(300)`.
  - [ ] Placeholder : "Rechercher par nom ou email..."
  - [ ] `aria-label="Rechercher un membre par nom ou email"`.
  - [ ] Conserver les autres paramètres (`tier`, `subscription`, `status`, `verification`, `sort`, `incomplete`) lors de la mise à jour de `q`.
  - [ ] Réinitialiser `page` quand `q` change.

- [ ] **Implémenter les dropdowns de filtres côté serveur** (AC #2–#6, #9)
  - [ ] Utiliser le composant `Select` existant (`@/components/ui/select`) ou des `Link` avec `searchParams` reconstruits (comme 24-1 pour les chips de tri).
  - [ ] **Dropdown tier** (AC #2) : Tous / Affranchi / Grand Frère / Boss, via `?tier=...`.
  - [ ] **Dropdown statut abonnement** (AC #3) : Tous / TRIAL / PENDING / ACTIVE / PAST_DUE / CANCELLED. Utiliser les labels existants `subscriptionStatusLabels` déjà définis dans `page.tsx`.
  - [ ] **Dropdown statut compte** (AC #4) : Tous / Actif / Suspendu. Utiliser `accountStatusLabels` existant.
  - [ ] **Dropdown statut vérification** (AC #5) : Tous / PENDING / EN_COURS / VERIFIED / REJECTED. Utiliser `verificationStatusLabels` existant.
  - [ ] **Dropdown tri** (AC #6) : Nom A→Z, Nom Z→A, Plus récents, Plus anciens. Identique à 24-1.
  - [ ] Chaque changement de filtre réinitialise `page=1`.
  - [ ] Helper `buildSearchParams(params)` pour reconstruire l'URL en conservant tous les filtres actifs (réutiliser le pattern de 24-1).

- [ ] **Préserver le filtre `?incomplete=1` dans l'UI** (AC #7)
  - [ ] Conserver le badge "Incomplets uniquement" + le lien "Voir tous" quand `incomplete=1` est actif.
  - [ ] Conserver le lien "Afficher les incomplèts" quand aucun filtre n'est actif.
  - [ ] Le lien "Afficher les incomplèts" doit conserver les autres filtres actifs (ex: `?incomplete=1&tier=BOSS`).
  - [ ] Le lien "Voir tous" doit conserver les autres filtres mais retirer `incomplete=1`.

- [ ] **Implémenter la pagination UI** (AC #8)
  - [ ] Afficher "Page précédente" / "Page suivante" en bas de page quand `totalPages > 1`.
  - [ ] Utiliser des `Link` avec `searchParams` reconstruits (conservant tous les filtres).
  - [ ] Afficher "Page X / Y".
  - [ ] `aria-label="Pagination des membres"` sur le `<nav>`.

- [ ] **Implémenter l'empty state** (AC #10)
  - [ ] Remplacer le message existant "Aucun utilisateur à afficher pour le moment." par "Aucun membre ne correspond à vos critères" quand des filtres sont actifs.
  - [ ] Ajouter un bouton "Réinitialiser les filtres" pointant vers `/admin/members` (retire tous les query params).
  - [ ] Si aucun filtre n'est actif et aucun membre → conserver un message générique ("Aucun utilisateur à afficher pour le moment.").

- [ ] **Accessibilité** (UX-DR18, NFR-A1)
  - [ ] `aria-label` sur le search input.
  - [ ] `aria-label` sur chaque dropdown de filtre.
  - [ ] Touch targets ≥ 44 px sur tous les éléments interactifs (NFR-A1, UX-DR25).

- [ ] **Écrire les tests unitaires** (AC #11)
  - [ ] Étendre `src/app/(admin)/admin/members/page.test.tsx` en s'appuyant sur le pattern existant.
  - [ ] Tester le `whereClause` avec différentes combinaisons de `searchParams` :
    - `?q=awa` → filtre par nom OU email (`OR: [{ name: { contains: "awa" } }, { email: { contains: "awa" } }]`).
    - `?tier=BOSS` → filtre par tier.
    - `?subscription=ACTIVE` → filtre via `subscriptions: { some: { status: "ACTIVE" } }`.
    - `?status=SUSPENDED` → filtre par statut compte.
    - `?verification=VERIFIED` → filtre par statut vérification.
    - `?sort=name_asc` → `orderBy: { name: "asc" }`.
    - `?page=2` → `skip: 25, take: 25`.
    - `?incomplete=1` → `OR: [{ emailVerified: false }, { onboardingCompletedAt: null }]`.
    - `?incomplete=1&tier=BOSS` → combinaison AND (incomplete + tier).
    - `?q=awa&subscription=ACTIVE&status=ACTIVE` → combinaison multiple.
    - Paramètres invalides (`?tier=INVALID`, `?subscription=FAKE`, `?page=abc`) → ignorés, pas de crash.
  - [ ] Tester l'empty state avec bouton de réinitialisation.
  - [ ] Tester la pagination (plus de 25 résultats).
  - [ ] Conserver les tests existants (redirect non auth, redirect non admin, rendu des membres, badges onboarding, filtre incomplete=1).
  - [ ] Mocker `MemberSearchInput` (ou `AdminMemberSearchInput`) dans les tests, comme 24-1 moque `MemberSearchInput`.
  - [ ] Ajouter `mockUserCount` au mock Prisma (actuellement seul `findUnique` et `findMany` sont mockés).

- [ ] **Vérifier le build et les tests**
  - [ ] `npm run build` passe sans erreur.
  - [ ] `npx vitest run` passe (tests existants + nouveaux).

## Dev Notes

### Delta sur code existant — NE PAS réinventer

La page cible est `src/app/(admin)/admin/members/page.tsx` — un **Server Component** de 265 lignes. Elle effectue déjà :

- Vérification de session via `auth()` et redirection si non connecté.
- Vérification `role === "ADMIN"` via `promoteConfiguredAdminUser`.
- Parsing du paramètre `incomplete` (`const { incomplete } = (await searchParams) ?? {}`).
- Construction d'un `whereClause` : `{ OR: [{ emailVerified: false }, { onboardingCompletedAt: null }] }` quand `incomplete === "1"`, sinon `{}`.
- Requête Prisma `prisma.user.findMany({ where: whereClause, orderBy: { createdAt: "desc" }, select: { ... } })` avec une sélection riche (id, image, name, email, tier, status, verificationStatus, emailVerified, onboardingCompletedAt, bio, location, country, createdAt, subscriptions).
- Affichage d'un tableau HTML avec colonnes : Membre, Email, Tier, Abonnement, Statut compte, Vérification, Onboarding, Inscription, Actions.
- Badge "Incomplets uniquement" + lien "Voir tous" / "Afficher les incomplèts".
- Empty state simple : "Aucun utilisateur à afficher pour le moment.".
- Composant `AdminMemberActions` pour les actions par membre.

**Cette story est une delta sur cette page**, pas une réécriture. Il faut :

1. Étendre la signature `searchParams` pour accepter les nouveaux paramètres.
2. Étendre le `whereClause` avec les nouveaux filtres (en AND avec `incomplete` existant).
3. Ajouter `skip` / `take` pour la pagination + `prisma.user.count` pour le total.
4. Ajouter l'UI des dropdowns de filtres et de tri.
5. Ajouter la pagination UI en bas de page.
6. Améliorer l'empty state avec bouton de réinitialisation.
7. Créer un Client Component pour le search input debounced.
8. **Conserver l'affichage existant du tableau** (colonnes, badges, `AdminMemberActions`).

### Patterns réutilisables de Story 24-1 (DONE)

Story 24-1 a implémenté les filtres pour la page `/members` (espace membre). Les patterns suivants sont directement réutilisables :

1. **`parseStringParam`** : helper pour parser `string | string[] | undefined` — copier depuis `src/app/(dashboard)/members/page.tsx:44-47`.
2. **`buildSearchParams`** : helper pour reconstruire l'URL en conservant les filtres — copier depuis `src/app/(dashboard)/members/page.tsx:49-55`.
3. **`sortOrder` mapping** : identique (name_asc, name_desc, recent, oldest) — copier depuis `page.tsx:35-42`.
4. **`validTierValues` / `validSortValues`** : allow-lists — même pattern, étendre avec les nouvelles allow-lists.
5. **`MemberSearchInput`** : Client Component debounced 300 ms — cloner et adapter pour la recherche nom + email à `src/app/(admin)/admin/members/_components/admin-member-search-input.tsx`.
6. **Pagination via `Link`** : pattern avec `previousSearch` / `nextSearch` + `buildSearchParams` — copier et adapter.
7. **Empty state** : message + bouton "Réinitialiser les filtres" — copier le pattern.
8. **Tests** : pattern de mock (`mockAuth`, `mockUserFindMany`, `mockUserCount`, mock du search input) — copier depuis `src/app/(dashboard)/members/page.test.tsx`.

### Différences clés avec 24-1

| Aspect | 24-1 (page membres) | 24-2 (page admin members) |
|--------|---------------------|---------------------------|
| Recherche | Nom seulement | Nom **OU** email (`OR` Prisma) |
| Filtre tier | Chips horizontaux (scrollables) | **Dropdown** (Select) |
| Filtre abonnement | N/A | Dropdown (TRIAL / PENDING / ACTIVE / PAST_DUE / CANCELLED) |
| Filtre statut compte | N/A | Dropdown (Actif / Suspendu) |
| Filtre vérification | N/A | Dropdown (PENDING / EN_COURS / VERIFIED / REJECTED) |
| Filtre `incomplete=1` | N/A | **Existant, à préserver** (combinaison AND) |
| Page size | 20 | **25** |
| Affichage | Grille de cards | Tableau HTML (existant) |
| Accès | Membre vérifié + onboarding | **Admin** (`role === "ADMIN"`) |
| Filtre abonnement — implémentation | N/A | Via relation `subscriptions: { some: { status } }` |

### Schéma de données pertinent

```prisma
model User {
  id                  String              @id @default(cuid())
  email               String              @unique
  name                String
  tier                Tier                @default(AFFRANCHI)
  status              UserStatus          @default(ACTIVE)
  verificationStatus  VerificationStatus  @default(PENDING)
  emailVerified       Boolean             @default(false)
  onboardingCompletedAt DateTime?
  createdAt           DateTime            @default(now())
  subscriptions       Subscription[]
  @@index([status, createdAt])
  @@map("users")
}

enum Tier { AFFRANCHI; GRAND_FRERE; BOSS }
enum UserStatus { ACTIVE; SUSPENDED }
enum VerificationStatus { PENDING; EN_COURS; VERIFIED; REJECTED }
enum SubscriptionStatus { TRIAL; PENDING; ACTIVE; PAST_DUE; CANCELLED }

model Subscription {
  id        String             @id @default(cuid())
  userId    String
  tier      Tier
  status    SubscriptionStatus @default(TRIAL)
  createdAt DateTime           @default(now())
  user      User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@map("subscriptions")
}
```

### Filtre par statut d'abonnement — attention

Le statut d'abonnement n'est pas un champ direct sur `User` : il faut filtrer via la relation `subscriptions`. La page existante récupère déjà `subscriptions` (take: 1, orderBy: createdAt desc) dans le `select`. Pour le filtre `?subscription=...`, utiliser :

```ts
...(subscription ? { subscriptions: { some: { status: subscription } } } : {})
```

Cela filtre les utilisateurs qui ont **au moins une** subscription avec ce statut. C'est le comportement attendu pour un admin qui veut voir tous les membres en TRIAL, ACTIVE, etc.

### Filtre `incomplete=1` — coexistence

Le `whereClause` actuel pour `incomplete=1` est :
```ts
{ OR: [{ emailVerified: false }, { onboardingCompletedAt: null }] }
```

Avec les nouveaux filtres, le `whereClause` devient ( exemple `?incomplete=1&tier=BOSS` ) :
```ts
{
  OR: [{ emailVerified: false }, { onboardingCompletedAt: null }],
  tier: "BOSS",
}
```

Prisma applique les clés au niveau racine en AND logique. Donc `incomplete` (OR) + `tier` (AND) = users incomplets ET de tier BOSS. C'est le comportement attendu (AC #7).

### Labels existants à réutiliser

Le fichier `page.tsx` définit déjà ces maps — les réutiliser pour les dropdowns :

```ts
const tierLabels = { AFFRANCHI: "Affranchi", GRAND_FRERE: "Grand Frère", BOSS: "Boss" };
const accountStatusLabels = { ACTIVE: "Actif", SUSPENDED: "Suspendu" };
const verificationStatusLabels = { PENDING: "En attente", EN_COURS: "En cours", VERIFIED: "Vérifié ✓", REJECTED: "Rejeté" };
const subscriptionStatusLabels = { TRIAL: "TRIAL", PENDING: "PENDING", ACTIVE: "ACTIVE", PAST_DUE: "PAST_DUE", CANCELLED: "CANCELLED" };
```

### Architecture et patterns à suivre

- **Next.js 16, App Router, Server Component par défaut.** Le data fetching reste côté serveur.
- **URL state via `searchParams`.** Pas de nouvelle API route ; les filtres passent directement au `where` Prisma.
- **Client Component minimal** : seul l'input de recherche a besoin d'interactivité (debounce + update URL). Le reste (dropdowns, pagination, empty state) peut être rendu côté serveur via `Link` ou `<Select>` natif HTML.
- **JSX Boolean Guardrail (Next.js 16 strict)** : ne jamais utiliser `&&` dans le JSX. Pré-calculer les booléens composés en `const` avant le return et utiliser des ternaires (`condition ? <X /> : null`). Voir `architecture.md` § "JSX Boolean Guardrail".
- **Composants UI existants** : `Input` (`@/components/ui/input`), `Select` (`@/components/ui/select`), `Button` (`@/components/ui/button`), `Badge` (`@/components/ui/badge`), `Link` de Next.js.
- **Accessibilité** : `aria-label` sur le search input et chaque select de filtre. Respecter NFR-A1 (WCAG 2.1 AA) et NFR-A3 (français non technique).
- **Mobile-first / UX** : touch targets ≥ 44 px (UX-DR25). Textes en français non technique.
- **Dev Agent Git Safety** : ne pas utiliser `git add -A` ; utiliser `git add -A -- . ':!dev.db' ':!*.sqlite3'` ou ajouter les fichiers explicitement.

### Parsing des `searchParams` recommandé

```ts
const query = await searchParams ?? {};

function parseStringParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

const MAX_QUERY_LENGTH = 100;
const q = parseStringParam(query.q)?.trim().slice(0, MAX_QUERY_LENGTH);
const tierRaw = parseStringParam(query.tier);
const subscriptionRaw = parseStringParam(query.subscription);
const statusRaw = parseStringParam(query.status);
const verificationRaw = parseStringParam(query.verification);
const sortRaw = parseStringParam(query.sort);
const pageRaw = parseStringParam(query.page);
const incomplete = parseStringParam(query.incomplete);
const showIncompleteOnly = incomplete === "1";

const validTierValues = ["AFFRANCHI", "GRAND_FRERE", "BOSS"];
const validSubscriptionValues = ["TRIAL", "PENDING", "ACTIVE", "PAST_DUE", "CANCELLED"];
const validStatusValues = ["ACTIVE", "SUSPENDED"];
const validVerificationValues = ["PENDING", "EN_COURS", "VERIFIED", "REJECTED"];
const validSortValues = ["name_asc", "name_desc", "recent", "oldest"];

const tier = validTierValues.includes(tierRaw ?? "") ? tierRaw : undefined;
const subscription = validSubscriptionValues.includes(subscriptionRaw ?? "") ? subscriptionRaw : undefined;
const status = validStatusValues.includes(statusRaw ?? "") ? statusRaw : undefined;
const verification = validVerificationValues.includes(verificationRaw ?? "") ? verificationRaw : undefined;
const sort = validSortValues.includes(sortRaw ?? "") ? sortRaw : undefined;
```

### Construction du whereClause

```ts
const whereClause: Prisma.UserWhereInput = {
  ...(showIncompleteOnly ? { OR: [{ emailVerified: false }, { onboardingCompletedAt: null }] } : {}),
  ...(tier ? { tier } : {}),
  ...(status ? { status } : {}),
  ...(verification ? { verificationStatus: verification } : {}),
  ...(subscription ? { subscriptions: { some: { status: subscription } } } : {}),
  ...(q ? { OR: [
    { name: { contains: q, mode: "insensitive" } },
    { email: { contains: q, mode: "insensitive" } },
  ]} : {}),
};
```

> ⚠️ **Attention** : si `showIncompleteOnly` et `q` sont tous deux actifs, il y aura deux clés `OR` au niveau racine — impossible en JS (les clés d'objet doivent être uniques). Il faut imbriquer correctement. Solution : utiliser un tableau `andConditions` puis `Prisma.UserWhereInput` avec `AND` :

```ts
const andConditions: Prisma.UserWhereInput[] = [];

if (showIncompleteOnly) {
  andConditions.push({ OR: [{ emailVerified: false }, { onboardingCompletedAt: null }] });
}
if (tier) andConditions.push({ tier });
if (status) andConditions.push({ status });
if (verification) andConditions.push({ verificationStatus: verification });
if (subscription) andConditions.push({ subscriptions: { some: { status: subscription } } });
if (q) {
  andConditions.push({
    OR: [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ],
  });
}

const whereClause: Prisma.UserWhereInput = andConditions.length > 0
  ? { AND: andConditions }
  : {};
```

### Pagination

```ts
const PAGE_SIZE = 25;
const page = Math.max(1, Number.parseInt(pageRaw ?? "1", 10) || 1);
const skip = (page - 1) * PAGE_SIZE;

const [members, totalCount] = await Promise.all([
  prisma.user.findMany({ where: whereClause, orderBy, skip, take: PAGE_SIZE, select: { ... } }),
  prisma.user.count({ where: whereClause }),
]);

const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
const hasPreviousPage = page > 1 && totalPages > 1;
const hasNextPage = page < totalPages;
```

### Tests — étendre le fichier existant

Le fichier `src/app/(admin)/admin/members/page.test.tsx` existe déjà avec 6 tests. Étendre en :

1. Ajoutant `mockUserCount` au mock Prisma (actuellement seul `findUnique` et `findMany` sont mockés).
2. Mockant le nouveau `AdminMemberSearchInput` (comme 24-1 moque `MemberSearchInput`).
3. Ajoutant des tests pour chaque filtre + combinaisons (voir AC #11).
4. Conserver tous les tests existants (redirect, rendu, badges, incomplete=1).

### Project Structure Notes

- La page admin members est dans le route group `(admin)` protégé par middleware (`role === "ADMIN"`).
- Le Client Component de recherche va dans `src/app/(admin)/admin/members/_components/` ( dossier local à la route, comme 24-1).
- Aucun changement d'architecture — brownfield, extension de page existante.

## References

- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-07-03-member-filtering.md` — scope de la story 24-2 (11 ACs).
- `_bmad-output/planning-artifacts/epics.md` lignes 1945-1988 — Epic 24 et Story 24-2.
- `_bmad-output/implementation-artifacts/24-1-filtres-page-membres.md` — story 24-1 (DONE), patterns à réutiliser.
- `_bmad-output/planning-artifacts/architecture.md` — JSX Boolean Guardrail (§407), Server Component pattern, App Router.
- `src/app/(admin)/admin/members/page.tsx` — page existante (delta, 265 lignes).
- `src/app/(admin)/admin/members/page.test.tsx` — tests existants (6 tests, à étendre).
- `src/app/(dashboard)/members/page.tsx` — référence 24-1 (patterns de parsing, whereClause, pagination).
- `src/app/(dashboard)/members/_components/member-search-input.tsx` — référence 24-1 (Client Component debounced).
- `src/app/(dashboard)/members/page.test.tsx` — référence 24-1 (pattern de tests avec mockUserCount).
- `prisma/schema.prisma` — modèle `User` (ligne 73), `Subscription` (ligne 176), enums.

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List