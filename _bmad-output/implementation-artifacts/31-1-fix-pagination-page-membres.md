# Story 31.1: Fix pagination page membres (reste sur page 1)

Status: done

baseline_commit: 68dd350

## Story

**En tant que** membre connecté,
**je veux** naviguer vers la page 2 (et suivantes) de la liste des membres,
**afin de** parcourir tous les membres vérifiés du club.

## Bug

Quand un membre clique sur « Page suivante » (ou « Page précédente ») sur `/members`, l'URL devient `/members?page=2` mais la page revient immédiatement à la page 1. La pagination est inopérante.

## Root Cause

Le composant client `src/app/(dashboard)/members/_components/member-search-input.tsx` a un `useEffect` dont les dépendances incluent `searchParams`. Ce `useEffect` se déclenche **à chaque changement d'URL** — y compris quand l'utilisateur clique sur un lien de pagination (qui change `?page=`). À chaque déclenchement, il reconstruit l'URL et **supprime systématiquement le paramètre `page`** :

```ts
useEffect(() => {
  const timeoutId = setTimeout(() => {
    const trimmed = value.trim();
    const nextParams = new URLSearchParams(searchParams.toString());
    if (trimmed) { nextParams.set("q", trimmed); } else { nextParams.delete("q"); }
    nextParams.delete("page");   // ← BUG : supprime toujours "page"
    router.replace(`${pathname}?${nextParams.toString()}`);
  }, 300);
  return () => clearTimeout(timeoutId);
}, [value, searchParams, pathname, router]);
```

**Séquence du bug :**
1. L'utilisateur clique « Page suivante » → URL `/members?page=2`.
2. `searchParams` change → le `useEffect` du champ de recherche se déclenche.
3. Il reconstruit l'URL, supprime `page`, et fait `router.replace("/members")` après 300 ms.
4. Retour à la page 1.

Le champ de recherche est monté sur la page membres, donc **toute navigation qui change l'URL (pagination, tri, filtre tier) est annulée** par ce composant.

## Acceptance Criteria

1. **Pagination fonctionnelle** : Cliquer « Page suivante » sur `/members?page=1` navigue vers `/members?page=2` et affiche les membres de la page 2 (pas de retour à la page 1).
2. **Recherche intacte** : Taper dans le champ de recherche met toujours à jour `?q=...` avec debounce 300 ms et réinitialise `page=1` (comportement existant conservé).
3. **Pas de régression** : Le `useEffect` du champ de recherche ne doit PAS se déclencher quand seul `page` change (pagination, tri, filtre tier). Il ne doit se déclencher que quand la valeur de recherche (`value`) change réellement.
4. **Tests** : Un test unitaire vérifie que le `MemberSearchInput` ne supprime pas `page` quand `searchParams` change sans que la valeur de recherche ne change.

## Tasks / Subtasks

- [x] Corriger `src/app/(dashboard)/members/_components/member-search-input.tsx` pour que le `useEffect` ne supprime `page` que lorsque la valeur de recherche change réellement (pas à chaque changement de `searchParams`).
  - [x] Approche recommandée : comparer la valeur de recherche actuelle (`value`) au paramètre `q` courant. Ne déclencher `router.replace` que si `value` diffère de `q` (ou si `q` est absent et `value` non vide, ou inversement). Ne pas supprimer `page` quand la recherche n'a pas changé.
  - [x] Alternative : retirer `searchParams` des dépendances du `useEffect` et ne dépendre que de `value` (en lisant `q` via une ref ou en ne supprimant `page` que si `value` a changé).
- [x] Écrire un test unitaire pour `member-search-input.tsx` (créer `member-search-input.test.tsx` s'il n'existe pas) qui vérifie que la pagination n'est pas annulée.
- [x] Vérifier le build (`npm run build`) et les tests (`npx vitest run`).

## Dev Notes

### Contrainte critique (Next.js 16 strict)

Ne jamais utiliser `&&` dans le JSX — toujours des ternaires. Voir `architecture.md` § « JSX Boolean Guardrail ».

### Pattern de test

Le test de `member-search-input.tsx` doit mocker `next/navigation` (`useRouter`, `usePathname`, `useSearchParams`) et vérifier que `router.replace` n'est PAS appelé quand `searchParams` change sans changement de `value`. Utiliser `@testing-library/user-event` pour simuler la saisie si nécessaire.

### Fichiers concernés

- `src/app/(dashboard)/members/_components/member-search-input.tsx` — le composant à corriger.
- `src/app/(dashboard)/members/_components/member-search-input.test.tsx` — test à créer.
- `src/app/(dashboard)/members/page.tsx` — page (ne devrait pas nécessiter de changement).

## Dev Agent Record

### Agent Model Used

kimi-k2.7-code (via Hermes delegate_task)

### Debug Log References

- Root cause: `useEffect` du `MemberSearchInput` dépendant de `searchParams` supprimait `page` à chaque changement d'URL (pagination/tri/filtre), annulant la navigation.

### Completion Notes List

- Fix: le `useEffect` lit `q` courant via `searchParams.get("q") ?? ""` et compare `value.trim()`. Si la recherche est inchangée (ex: seul `page` a changé), il retourne immédiatement — sans timeout, sans `nextParams.delete("page")`, sans `router.replace`. Le debounce 300ms + reset `page=1` est conservé quand la recherche change réellement.
- Test créé: `member-search-input.test.tsx` (3 tests) — vérifie que `router.replace` n'est PAS appelé quand seul `page` change, et qu'il est appelé avec `?q=...` + `page` supprimé quand l'utilisateur tape.
- Vérifié: 3 tests search-input passent, 11 tests page membres passent (régression), `npm run build` passe.
- Commit: `d2d8bc9` (fix(members): pagination annulée par le search input (story 31-1)).

### File List

- `src/app/(dashboard)/members/_components/member-search-input.tsx` — fix du `useEffect`.
- `src/app/(dashboard)/members/_components/member-search-input.test.tsx` — test créé.

## References

- `src/app/(dashboard)/members/page.tsx` — page membres avec pagination.
- `src/app/(dashboard)/members/page.test.tsx` — tests de la page (mock du search input).
- `_bmad-output/implementation-artifacts/24-1-filtres-page-membres.md` — story d'origine du filtrage/pagination.

## Story Completion Status

- Status: **done**
- Completion note: Story 31-1 implemented: MemberSearchInput ne supprime plus `page` quand la recherche n'a pas changé. Pagination fonctionnelle. 3 tests search-input + 11 tests page membres passent, build OK. Commit d2d8bc9.
