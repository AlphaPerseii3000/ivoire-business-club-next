---
baseline_commit: 0f07b0dcb8dc54bbb37b0a2cc4b96be9ab5e31ad
---

# Story 13.4: Page publique liste des entreprises agréées

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a visiteur,
I want consulter la liste des entreprises agréées IBC,
so that identifier des partenaires de confiance pour mes projets (travaux, communication, services).

## Acceptance Criteria

1. **Visiteur anonyme sur la liste des entreprises**
   - **Given** un visiteur non connecté sur `/partners`
   - **When** la page se charge
   - **Then** les entreprises publiées (`isPublished: true`) sont affichées sous forme de cartes (composant `CompanyCard` avec logo, nom, description courte, secteurs) triés par date de création récente.
   - **And** des filtres par secteur (chips horizontaux scrollables) sont disponibles.

2. **Filtrage par secteur**
   - **Given** la liste des entreprises sur `/partners`
   - **When** l'utilisateur clique sur un filtre de secteur (ex: "BTP" ou "Tous")
   - **Then** seules les entreprises publiées dont les secteurs contiennent ce tag sont affichées.
   - **And** le filtre est persistant via le paramètre de requête URL `?sector=...`.

3. **Accès au détail d'une entreprise**
   - **Given** un visiteur (connecté ou non)
   - **When** il accède à `/partners/[slug]`
   - **Then** la page affiche toutes ses informations : logo (ou fallback), nom, description complète (supportant le rendu Markdown ou texte brut), secteurs d'activité, certifications/agréments, informations de contact (nom du contact, téléphone, email si renseignés) avec liens directs (`tel:`, `mailto:`), et lien vers le site web externe (si renseigné) s'ouvrant dans un nouvel onglet avec `rel="noopener noreferrer"`.

4. **Entreprise inexistante ou brouillon**
   - **Given** un utilisateur accédant à `/partners/entreprise-inconnue`
   - **When** l'entreprise n'existe pas en base de données ou n'est pas publiée (`isPublished: false`)
   - **Then** une page 404 standard (via `notFound()`) est affichée (les administrateurs contournent la restriction de publication).

5. **État vide (Empty State)**
   - **Given** aucune entreprise publiée (ou aucune ne correspondant au secteur sélectionné)
   - **When** la page se charge
   - **Then** le composant `EmptyState` s'affiche avec un message adéquat : "Aucune entreprise trouvée."

6. **Navigation & SEO**
   - **Given** la landing page ou le catalogue
   - **When** l'utilisateur navigue dans le header ou le mobile nav
   - **Then** des liens "Partenaires" pointent vers `/partners`.
   - **And** la page de détail `/partners/[slug]` configure des meta tags SEO dynamiques (titre, description) ainsi qu'un Structured Data JSON-LD de type `LocalBusiness` ou `Organization`.

## Tasks / Subtasks

- [x] **Développement du composant `CompanyCard`**
  - [x] Créer le composant `CompanyCard` dans `src/components/features/partners/CompanyCard.tsx`.
  - [x] Afficher le logo (ou un fallback élégant aux couleurs de l'IBC en utilisant des initiales ou une icône de bâtiment s'il n'y a pas de logo).
  - [x] Afficher le nom, la description courte et les secteurs d'activité sous forme de petits tags.
  - [x] Ajouter un lien vers `/partners/[slug]` sans imbrication d'ancres (zéro nesting de `<Link>` ou `<a>`).

- [x] **Développement de la page liste `/partners`**
  - [x] Créer la page serveur `src/app/(public)/partners/page.tsx` (marquée `export const dynamic = "force-dynamic"`).
  - [x] Récupérer les entreprises publiées (`isPublished: true`) triées par `createdAt desc` via Prisma.
  - [x] Extraire tous les secteurs uniques pour alimenter les filtres. Étant donné que les secteurs sont stockés sous forme de chaîne de caractères séparées par des virgules (ex: `"btp, communication, services"`), split les chaînes, trim les valeurs, et filtrer pour obtenir une liste plate unique (ex: `["BTP", "Communication", "Services"]`).
  - [x] Sécuriser la lecture de `searchParams.sector` pour éviter les crashs si le paramètre contient un tableau de chaînes ou est indéfini.
  - [x] Implémenter le filtrage par secteur en vérifiant si le secteur sélectionné (depuis `searchParams`) est inclus dans le champ `sectors` de l'entreprise (sans distinction de casse).
  - [x] Rendre la grille des entreprises et le composant `EmptyState` en cas de liste vide.

- [x] **Développement de la page de détail `/partners/[slug]`**
  - [x] Créer la page serveur `src/app/(public)/partners/[slug]/page.tsx` (gérer les paramètres de chemin dynamiques de manière asynchrone : `const { slug } = await params;`).
  - [x] Implémenter une fonction cache d'accès DB `getCompanyBySlug(slug: string)` pour charger l'entreprise.
  - [x] Gérer les cas non trouvés ou non publiés : appeler `notFound()` et retourner immédiatement `null` (pour empêcher la poursuite du rendu sous vitest) sauf si l'utilisateur connecté est administrateur (`role === "ADMIN"`).
  - [x] Rendre les informations de l'entreprise : logo, nom, description complète, secteurs d'activité, certifications, informations de contact (nom, téléphone, email), site web externe.
  - [x] Gérer le rendu Markdown de la description si le composant de rendu markdown du projet est disponible, ou fallback sur un rendu de texte avec sauts de lignes conservés.
  - [x] Ajouter du code JSON-LD de type `LocalBusiness` ou `Organization` pour l'indexation et l'optimisation SEO.
  - [x] Gérer les métadonnées SEO dynamiques dans `generateMetadata` de la page.

- [x] **Intégration de la navigation**
  - [x] Mettre à jour les en-têtes et menus de navigation pour inclure l'annuaire des partenaires :
    - [x] Ajouter un lien "Partenaires" pointant vers `/partners` dans le header desktop de `src/app/(public)/page.tsx`, `src/app/(public)/articles/page.tsx`, `src/app/(public)/events/page.tsx`, `src/app/(public)/experts/page.tsx` et sur les nouvelles pages `/partners` et `/partners/[slug]`.
    - [x] Ajouter l'entrée "Partenaires" dans le menu staggered de la navigation mobile de `src/components/landing/mobile-nav.tsx` (entre "Experts" et "Événements").

- [x] **Écriture des Tests Unitaires et d'Intégration**
  - [x] Créer le fichier `src/app/(public)/partners/page.test.tsx` pour tester :
    - [x] L'affichage de la liste des entreprises publiées.
    - [x] L'application correcte du filtre de secteur.
    - [x] L'état vide (`EmptyState`) lorsqu'aucune entreprise n'est trouvée.
  - [x] Créer le fichier `src/app/(public)/partners/[slug]/page.test.tsx` pour tester :
    - [x] Le chargement correct d'une entreprise par son slug.
    - [x] Le retour d'une page 404 (via `notFound()`) si l'entreprise est un brouillon.
    - [x] L'affichage complet des informations de contact et liens de site externe.
  - [x] Exécuter la suite de tests unitaires via `npx vitest run` et valider que tout est vert.

## Dev Notes

- **Langue du projet** : Toutes les UI, messages de validation, toasts, logs d'audit et commentaires doivent être rédigés en **français**.
- **Next.js 16 / React 19 App Router** : Les paramètres dynamiques de chemins (ex: `params` dans les Route Handlers et les pages serveur) doivent être attendus asynchronement : `const { slug } = await params;`.
- **Garde-fous JSX** : Ne pas utiliser de double esperluette `&&` pour les rendus conditionnels dans JSX, préférer le format `{condition ? <Component /> : null}` et pré-calculer les conditions complexes.
- **Sécurisation des logs** : Passer toutes les erreurs capturées dans les blocs `try/catch` à `sanitizeError` de `@/lib/sanitize-log` avant de faire un `console.error`.
- **Zéro Nesting d'Ancres (Crucial)** : Veiller à ne pas imbriquer de balise `<Link>` Next.js ou de balises `<a>` HTML les unes dans les autres (par exemple, un bouton de lien à l'intérieur d'une carte déjà enveloppée d'un `<Link>`).
- **SQLite vs PostgreSQL (String Array)** : SQLite ne supportant pas les listes scalaires (`sectors String[]`), le champ `sectors` is défini comme `sectors String?` dans la base, en stockant les secteurs sous forme de tags séparés par des virgules (ex: `"btp, communication, services"`).

### Previous Story Learnings (Story 13.2 / Experts)

1. **Crash sur `searchParams` multi-valeurs** : S'assurer de valider le type de `searchParams.sector` pour éviter les crashs TypeScript ou d'exécution si l'utilisateur saisit des requêtes avec des paramètres dupliqués (ex: `?sector=BTP&sector=Tech`). Utiliser une validation stricte comme celle implémentée pour `specialty` dans la Story 13.2.
2. **Fuites SEO sur les brouillons** : S'assurer que `generateMetadata` renvoie une erreur ou des données vides si l'entreprise demandée n'est pas publiée et que l'utilisateur n'est pas Admin.
3. **Initials Parsing robuste** : Lors de la génération des initiales pour le logo de remplacement, gérer correctement les espaces multiples, les caractères spéciaux et les noms vides pour éviter les crashs.
4. **Mock de `notFound()` dans les tests** : Sous `vitest`, mock `notFound` pour qu'il jette une erreur spéciale. Mais dans le composant réel, s'assurer d'ajouter `return null;` immédiatement après l'appel à `notFound()` pour stopper proprement l'exécution.

### Project Structure Notes

- Placer les pages publiques dans `src/app/(public)/partners/`.
- Placer les composants de présentation dans `src/components/features/partners/`.
- Respecter le design dark / premium de la landing page et des autres pages publiques (bg-[#090D16] avec accents dorés/teal).

### References

- Contexte Epic 13 & Story 13.4 : [sprint-change-proposal-2026-06-18.md](file:///D:/Code/ivoire-business-club-next/_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-18.md#L579-L600)
- Code de référence experts publique : [src/app/(public)/experts/page.tsx](file:///D:/Code/ivoire-business-club-next/src/app/(public)/experts/page.tsx)
- Code de référence Experts Detail : [src/app/(public)/experts/[slug]/page.tsx](file:///D:/Code/ivoire-business-club-next/src/app/(public)/experts/[slug]/page.tsx)
- Modèle Company CRUD admin : [13-3-modele-company-crud-admin.md](file:///D:/Code/ivoire-business-club-next/_bmad-output/implementation-artifacts/13-3-modele-company-crud-admin.md)

## Dev Agent Record

### Agent Model Used

Gemini 3.5 Flash (Medium)

### Debug Log References
- Vitest run task: `c93da145-84f2-4c39-a250-0bdba5adba21/task-29`
- Partners tests: `c93da145-84f2-4c39-a250-0bdba5adba21/task-111`

### Completion Notes List
- Created `CompanyCard` with dynamic initials/building icon fallbacks, sector tags, and a neat clean design.
- Created `src/app/(public)/partners/page.tsx` with robust type safety for `searchParams.sector` handling, filtering, and empty state rendering.
- Created `src/app/(public)/partners/[slug]/page.tsx` with dynamic metadata generation, schema.org JSON-LD LocalBusiness markup, markdown parsing of descriptions via `marked` and `DOMPurify`, and admin draft bypass.
- Linked "Partenaires" in desktop and mobile staggered menus.
- Wrote full unit test files covering all acceptance criteria, and ran full vitest regression tests (877/877 tests passing).

### File List
- Created [CompanyCard.tsx](file:///d:/Code/ivoire-business-club-next/src/components/features/partners/CompanyCard.tsx)
- Created [page.tsx](file:///d:/Code/ivoire-business-club-next/src/app/(public)/partners/page.tsx)
- Created [page.tsx](file:///d:/Code/ivoire-business-club-next/src/app/(public)/partners/[slug]/page.tsx)
- Created [page.test.tsx](file:///d:/Code/ivoire-business-club-next/src/app/(public)/partners/page.test.tsx)
- Created [page.test.tsx](file:///d:/Code/ivoire-business-club-next/src/app/(public)/partners/[slug]/page.test.tsx)
- Modified [page.tsx](file:///d:/Code/ivoire-business-club-next/src/app/(public)/page.tsx)
- Modified [page.tsx](file:///d:/Code/ivoire-business-club-next/src/app/(public)/articles/page.tsx)
- Modified [page.tsx](file:///d:/Code/ivoire-business-club-next/src/app/(public)/events/page.tsx)
- Modified [page.tsx](file:///d:/Code/ivoire-business-club-next/src/app/(public)/experts/page.tsx)
- Modified [page.tsx](file:///d:/Code/ivoire-business-club-next/src/app/(public)/experts/[slug]/page.tsx)
- Modified [mobile-nav.tsx](file:///d:/Code/ivoire-business-club-next/src/components/landing/mobile-nav.tsx)

### Change Log
- **2026-06-22**: Initialized implementation of Story 13.4: public directory of companies, markdown detail page, menu integration, and tests. Everything validated 100% green.

### Review Findings

- [x] [Review][Patch] Vulnerabilité XSS potentielle lors de l'échec de parsing Markdown [src/app/(public)/partners/[slug]/page.tsx:325-328]
- [x] [Review][Patch] Protocoles absents dans les liens de sites externes de l'entreprise [src/app/(public)/partners/[slug]/page.tsx:505]
- [x] [Review][Patch] Problème de concaténation de l'URL du logo sans slash initial [src/app/(public)/partners/[slug]/page.tsx:230-232]
- [x] [Review][Patch] Commentaires en anglais dans les fichiers de code [multiple files]
- [x] [Review][Patch] Métadonnées SEO contenant de la syntaxe Markdown brute [src/app/(public)/partners/[slug]/page.tsx:233-239]
- [x] [Review][Patch] Formatage destructif des acronymes de secteurs (ex: BTP -> Btp) [src/app/(public)/partners/page.tsx]
- [x] [Review][Patch] Rembourrage (padding) redondant et bogué sur les images avec fill [multiple files]
- [x] [Review][Patch] Requête de base de données inefficace (sur-récupération de colonnes) [src/app/(public)/partners/page.tsx]
- [x] [Review][Patch] Attribut sizes inutile sur des images marquées unoptimized [src/components/features/partners/CompanyCard.tsx]
- [x] [Review][Patch] Contraste insuffisant sous le thème clair (Accessibilité WCAG) [src/app/(public)/partners/[slug]/page.tsx]
- [x] [Review][Patch] Déclaration redondante de siteUrl [src/app/(public)/partners/[slug]/page.tsx]
- [x] [Review][Patch] Navigation clavier redondante et inaccessible sur les cartes d'entreprise [src/components/features/partners/CompanyCard.tsx]
- [x] [Review][Patch] Appel obsolète à marked.setOptions à portée globale [src/app/(public)/partners/[slug]/page.tsx]
- [x] [Review][Patch] Contournement du typage TypeScript avec any[] [src/app/(public)/partners/page.tsx]
- [x] [Review][Defer] Lien d'ancre brisé pour "Tarifs" dans la navigation mobile sur les pages secondaires [src/components/landing/mobile-nav.tsx:7] — deferred, pre-existing

