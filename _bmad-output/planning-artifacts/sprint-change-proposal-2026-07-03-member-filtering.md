# Sprint Change Proposal — Filtrage des Membres

**Date :** 2026-07-03  
**Auteur :** Hermes (session CC)  
**PO :** Jonathan  
**Projet :** IBC  

---

## 1. Contexte et Déclencheur

Le PO demande la possibilité de filtrer les membres — par nom, date d'ajout, abonnement, etc. Actuellement :

- **Page `/members` (espace membres)** : grille statique des membres vérifiés, tri fixe `createdAt desc`. Aucun filtre, aucune recherche.
- **Page `/admin/members` (admin)** : tableau complet mais avec un seul filtre binaire (`?incomplete=1`). Pas de recherche texte, pas de filtre par tier/abonnement/statut.

Le **UX-DR18** du PRD prévoit explicitement : *"Recherche et filtrage (search debounced 300ms, filter chips horizontaux scrollables, tri dropdown)"* — ce requirement n'a jamais été implémenté pour la liste des membres.

## 2. Analyse : Ce qui existe vs Ce qui manque

| Aspect | Existant | Manquant |
|--------|----------|----------|
| Recherche par nom | ❌ | Search input debounced 300ms |
| Filtre par tier | ❌ | Filter chips (Affranchi / Grand Frère / Boss) |
| Filtre par statut abonnement | ❌ (admin) | Dropdown (TRIAL / ACTIVE / PAST_DUE / CANCELLED) |
| Filtre par statut compte | ❌ (admin) | Dropdown (ACTIVE / SUSPENDED) |
| Filtre par statut vérification | ❌ (admin) | Dropdown (PENDING / EN_COURS / VERIFIED / REJECTED) |
| Filtre par date d'inscription | ❌ | Tri asc/desc sur createdAt |
| Tri | Fixe `createdAt desc` | Dropdown de tri (nom A-Z, date récent/ancien) |
| Pagination | ❌ | Nécessaire si > 50 membres (NFR-SC1: 500 membres cible) |

## 3. Impact sur les artefacts existants

### PRD Impact
- **UX-DR18** est déjà dans le PRD mais non implémenté pour `/members`. Ce proposal active ce requirement.
- Nouveaux FR : **FR77** (recherche et filtrage membres côté espace membre), **FR78** (filtrage avancé admin members).

### Architecture Impact
- Aucun changement d'architecture — brownfield, extension de pages existantes.
- Les filtres se font via `searchParams` (URL state) → query Prisma côté serveur. Pas de nouvelle API route nécessaire pour `/members` (Server Component).
- Pour `/admin/members` : même pattern, étendre le `whereClause` existant.
- Pagination : `take` + `skip` ou curseur selon volume.

### Epics Impact
- Nouvel **Epic 24** : "Filtrage et Recherche des Membres"
- 2 stories : 24-1 (filtres page membres) + 24-2 (filtres admin members)

## 4. Proposition : Nouvel Epic 24

### Epic 24: Filtrage et Recherche des Membres

**Objectif :** Permettre aux membres et aux admins de rechercher et filtrer la liste des membres par nom, tier, statut d'abonnement, statut de compte, statut de vérification et date d'inscription, avec tri et pagination.

**FRs couverts :** FR77, FR78  
**UX-DRs couverts :** UX-DR18 (recherche debounced, filter chips, tri dropdown)  
**NFRs couverts :** NFR-P2 (temps réponse < 500ms), NFR-A1 (accessibilité)

---

### Story 24-1: Filtrage de la page membres (espace membre)

**En tant que** membre connecté,  
**Je veux** rechercher et filtrer les membres par nom et tier,  
**Afin de** trouver rapidement des membres selon des critères pertinents.

**Acceptance Criteria :**

1. **Search par nom** : Un input de recherche filtrant les membres par nom (debounce 300ms), avec mise à jour de l'URL via `searchParams` (`?q=...`).
2. **Filtre par tier** : Filter chips horizontaux scrollables (Tous / Affranchis / Grands Frères / Boss), sélection mutuellement exclusive, via `?tier=...`.
3. **Tri** : Dropdown de tri (Nom A→Z, Nom Z→A, Plus récents, Plus anciens), via `?sort=...`.
4. **Pagination** : Si > 20 résultats, pagination en bas (page précédente / suivante), via `?page=...`.
5. **URL state** : Tous les filtres sont dans l'URL (partageable, bookmarkable, SSR-friendly).
6. **Empty state** : Si aucun résultat, afficher "Aucun membre ne correspond à vos critères" avec bouton "Réinitialiser les filtres".
7. **Accessibilité** : Champs de recherche avec `aria-label`, chips avec `role="group"`, tri avec `aria-label`.
8. **Tests** : Tests unitaires vérifiant le rendu avec différents `searchParams`, test empty state.

---

### Story 24-2: Filtrage avancé de la page admin members

**En tant qu'** admin,  
**Je veux** rechercher et filtrer les membres par nom, tier, statut d'abonnement, statut de compte, statut de vérification et date d'inscription,  
**Afin de** gérer efficacement la base de membres.

**Acceptance Criteria :**

1. **Search par nom/email** : Un input de recherche filtrant par nom OU email (debounce 300ms), via `?q=...`.
2. **Filtre par tier** : Dropdown (Tous / Affranchis / Grands Frères / Boss), via `?tier=...`.
3. **Filtre par statut abonnement** : Dropdown (Tous / TRIAL / PENDING / ACTIVE / PAST_DUE / CANCELLED), via `?subscription=...`.
4. **Filtre par statut compte** : Dropdown (Tous / Actif / Suspendu), via `?status=...`.
5. **Filtre par statut vérification** : Dropdown (Tous / PENDING / EN_COURS / VERIFIED / REJECTED), via `?verification=...`.
6. **Tri** : Dropdown de tri (Nom A→Z, Nom Z→A, Plus récents, Plus anciens), via `?sort=...`.
7. **Coexistence avec `?incomplete=1`** : Le filtre "incomplets" existant doit coexister avec les nouveaux filtres (combinable).
8. **Pagination** : Si > 25 résultats, pagination en bas, via `?page=...`.
9. **URL state** : Tous les filtres dans l'URL, combinables entre eux.
10. **Empty state** : "Aucun membre ne correspond à vos critères" avec bouton de réinitialisation.
11. **Tests** : Tests unitaires vérifiant le `whereClause` avec différentes combinaisons de `searchParams`.

---

## 5. Handoff / Séquence d'exécution

1. **CS** : Créer les stories 24-1 et 24-2 (fichiers .md + entrées sprint-status.yaml)
2. **DS** : Implémenter 24-1 (page membres)
3. **CR** : Review 24-1
4. **DS** : Implémenter 24-2 (page admin)
5. **CR** : Review 24-2
6. **ER** : Rétrospective Epic 24 (optionnelle)

**Recommandation :** Déléguer le cycle CS→DS→CR à `bmad-orchestrator` via subagents. Lancer dans une nouvelle session chat pour préserver le contexte.

## 6. Risques et Contraintes

- **Performance** : La recherche par nom sur 500+ membres nécessite un index DB. Le schéma actuel a `@@index([status, createdAt])` mais pas d'index sur `name`. Pour SQLite (dev) c'est négligeable ; pour PostgreSQL (prod), un index sera nécessaire si volume élevé.
- **Server Component vs Client** : La page `/members` est un Server Component. Les filtres via `searchParams` restent SSR. Le search input aura besoin d'un petit client component pour le debounce qui update l'URL.
- **Pas de `prisma` en Edge Runtime** : Les pages `/members` et `/admin/members` sont déjà en Node.js Runtime, pas de changement.

## 7. Sprint Status Update (après validation)

```yaml
  epic-24: backlog
  24-1-filtres-page-membres: backlog
  24-2-filtres-admin-members: backlog
  epic-24-retrospective: optional
```