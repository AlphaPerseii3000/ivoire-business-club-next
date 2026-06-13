---
baseline_commit: 73e66145e3c4af28b3b6da6822704e1ffb55aab5
---
# Story 9.2: Interface Admin CRUD Articles

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

**En tant qu'** admin IBC,  
**Je veux** une interface de gestion des articles avec sélecteur de visibilité par tier,  
**Afin de** publier et organiser le contenu éditorial selon la stratégie de conversion.

## Acceptance Criteria

1. **Liste des articles (`/admin/articles`)**
   - **Given** un admin sur `/admin/articles`
   - **When** la page se charge
   - **Then** un tableau affiche tous les articles (titre, catégorie, badge de visibilité par tier, statut de publication `published`, date) triés par `createdAt` décroissant, avec des actions pour modifier, supprimer et publier/dépublier.

2. **Formulaire de création (`/admin/articles/new`)**
   - **Given** un admin sur `/admin/articles/new`
   - **When** il remplit le formulaire (titre, excerpt, contenu en Markdown, catégorie, visibilité) et le soumet
   - **Then** l'article est créé en base de données avec `published: false` par défaut, un slug auto-généré unique, et l'admin est redirigé vers la page de liste avec un message de succès (sonner toast).

3. **Formulaire d'édition (`/admin/articles/[id]/edit`)**
   - **Given** un admin sur la page `/admin/articles/[id]/edit`
   - **When** il modifie les champs requis et soumet le formulaire
   - **Then** l'article est mis à jour en base de données, son champ `updatedAt` est actualisé, et l'admin est redirigé vers la liste avec un message de succès.

4. **Action Publier / Dépublier**
   - **Given** un admin sur la page de liste des articles
   - **When** il clique sur "Publier" sur un article en brouillon
   - **Then** l'article passe à `published: true`, `publishedAt` est initialisé à la date courante, et un log d'audit est créé.
   - **Given** un admin sur la liste des articles
   - **When** il clique sur "Dépublier" sur un article publié
   - **Then** l'article passe à `published: false`, `publishedAt` repasse à `null`, et un log d'audit est créé.

5. **Action Supprimer**
   - **Given** un admin sur la liste des articles
   - **When** il clique sur "Supprimer" sur un article
   - **Then** une boîte de dialogue de confirmation (Radix Dialog) s'affiche.
   - **When** il confirme la suppression
   - **Then** l'article est supprimé définitivement de la base de données et un log d'audit est créé.

6. **Indicateurs visuels et badges de visibilité**
   - **Given** le sélecteur de visibilité dans le formulaire et l'affichage dans le tableau
   - **When** une visibilité est sélectionnée ou affichée
   - **Then** un badge de visibilité stylisé s'affiche avec des couleurs adaptées au tier (PUBLIC = gris/neutral, AFFRANCHI = teal, GRAND_FRERE = amber, BOSS = violet).

7. **Logs d'audit CRUD**
   - **Given** une action d'administration effectuée sur un article
   - **When** l'action réussit (Création, Modification, Publication, Dépublication, Suppression)
   - **Then** un enregistrement d'audit log est créé dans la table `AuditLog` avec l'acteur, le type d'action approprié (`ARTICLE_CREATE`, `ARTICLE_UPDATE`, `ARTICLE_PUBLISH`, `ARTICLE_UNPUBLISH`, `ARTICLE_DELETE`) et l'identifiant de l'entité.

## Tasks / Subtasks

- [ ] **Mise à jour des logs d'audit (AC: 7)**
  - [ ] Ajouter les nouvelles actions d'audit dans `AUDIT_ACTIONS` au sein de [src/lib/audit-log.ts](file:///D:/Code/ivoire-business-club-next/src/lib/audit-log.ts) :
    - `ARTICLE_CREATE: "ARTICLE_CREATE"`
    - `ARTICLE_UPDATE: "ARTICLE_UPDATE"`
    - `ARTICLE_PUBLISH: "ARTICLE_PUBLISH"`
    - `ARTICLE_UNPUBLISH: "ARTICLE_UNPUBLISH"`
    - `ARTICLE_DELETE: "ARTICLE_DELETE"`
  - [ ] Mettre à jour les routes d'API existantes pour écrire dans l'audit log :
    - Dans [src/app/api/articles/route.ts](file:///D:/Code/ivoire-business-club-next/src/app/api/articles/route.ts) (`POST`) : appeler `safeCreateAuditLog` après la création réussie de l'article avec l'action `ARTICLE_CREATE`.
    - Dans [src/app/api/articles/[id]/route.ts](file:///D:/Code/ivoire-business-club-next/src/app/api/articles/[id]/route.ts) (`PUT`) : appeler `safeCreateAuditLog` avec l'action `ARTICLE_UPDATE` lors de la modification. Si le statut de publication change (`published`), enregistrer également l'action `ARTICLE_PUBLISH` ou `ARTICLE_UNPUBLISH` correspondante.
    - Dans [src/app/api/articles/[id]/route.ts](file:///D:/Code/ivoire-business-club-next/src/app/api/articles/[id]/route.ts) (`DELETE`) : appeler `safeCreateAuditLog` avec l'action `ARTICLE_DELETE` avant la suppression définitive.

- [ ] **Navigation Admin (AC: 1)**
  - [ ] Ajouter un lien pour les articles dans la navigation desktop/mobile admin de [src/app/(admin)/layout.tsx](file:///D:/Code/ivoire-business-club-next/src/app/(admin)/layout.tsx) : `{ href: "/admin/articles", label: "Articles", icon: "✍️" }`.

- [ ] **Composants d'interface Admin (AC: 1, 2, 3, 5, 6)**
  - [ ] Créer `src/components/features/admin/articles-list-table.tsx` (Composant Client) :
    - Utiliser le composant table de shadcn `src/components/ui/table.tsx` pour lister les articles.
    - Afficher des colonnes claires : Titre, Catégorie, Visibilité, Statut (Brouillon/Publié) et Date.
    - Utiliser des icônes et classes de badge standard de `src/lib/tier-config.ts` ou adaptées pour la visibilité (PUBLIC, AFFRANCHI, GRAND_FRERE, BOSS).
    - Ajouter les boutons Modifier (lien vers `/admin/articles/[id]/edit`), Supprimer (avec dialogue de confirmation), et Publier/Dépublier.
    - Utiliser `src/components/ui/dialog.tsx` pour le modal de confirmation de suppression.
    - Gérer les états de chargement (disabled) lors du clic sur les actions asynchrones (publication, suppression) et utiliser `sonner` pour notifier l'admin.
  - [ ] Créer `src/components/features/admin/article-form.tsx` (Composant Client) :
    - Gérer la création et la modification d'un article avec React Hook Form et le résolveur Zod (`articleCreateSchema` / `articleUpdateSchema` depuis `src/lib/validations.ts`).
    - Utiliser les composants UI de base : `Input`, `Textarea`, `Select`, `Label`, `Button`.
    - Fournir un sélecteur (`Select`) pour la visibilité avec un aperçu en temps réel du badge correspondant au tier sélectionné.
    - Le champ catégorie doit proposer en priorité un sélecteur avec les catégories standard (`conseil`, `guide`, `témoignage`, `actu`) ou un champ de saisie propre.
    - Intégrer un toggle ou une checkbox pour le statut initial de publication (facultatif ou draft par défaut).
    - Désactiver les boutons de soumission pendant le chargement.

- [ ] **Pages et Routes Admin (AC: 1, 2, 3)**
  - [ ] Créer `src/app/(admin)/admin/articles/page.tsx` (Page de liste Server Component) :
    - Récupérer tous les articles via `prisma.article.findMany` triés par `createdAt desc` avec l'auteur associé.
    - Passer les données sérialisées au composant `ArticlesListTable`.
  - [ ] Créer `src/app/(admin)/admin/articles/new/page.tsx` (Page de création) :
    - Rendre le formulaire `ArticleForm` configuré pour la création.
  - [ ] Créer `src/app/(admin)/admin/articles/[id]/edit/page.tsx` (Page d'édition) :
    - Charger l'article via l'ID fourni par `params` (destructuré de manière asynchrone).
    - Si l'article n'existe pas, appeler `notFound()`.
    - Passer les données de l'article au formulaire `ArticleForm` en mode édition.

- [ ] **Tests Unitaires et d'Intégration (AC: 1, 2, 3, 4, 5, 7)**
  - [ ] Créer `src/app/(admin)/admin/articles/page.test.tsx` pour tester :
    - La redirection des utilisateurs non authentifiés et non administrateurs.
    - Le bon chargement des articles et leur rendu.
  - [ ] Créer `src/components/features/admin/articles-list-table.test.tsx` pour tester l'affichage et l'état des actions (boutons Publier/Dépublier, ouverture du modal de suppression).
  - [ ] Créer `src/components/features/admin/article-form.test.tsx` pour valider :
    - La validation des champs requis par Zod.
    - La soumission du formulaire et l'affichage des erreurs.
  - [ ] Mettre à jour les tests existants des API routes d'articles pour valider l'écriture correcte dans les logs d'audit.

- [ ] **Vérification finale**
  - [ ] Lancer les tests unitaires via `npx vitest run` et s'assurer que tous les tests passent.
  - [ ] Lancer `npm run build` pour valider l'absence d'erreurs TypeScript et d'incompatibilités Next.js 16 / React 19 (guardrail JSX).

## Dev Notes

### Décisions d'implémentation et contraintes

- **Prisma & Types** : Les imports doivent provenir de `@/generated/prisma/client` et non `@prisma/client`. Utiliser le singleton `prisma` importé de `@/lib/prisma`.
- **Next.js 16/React 19** : Les API routes et les pages avec paramètres dynamiques (`[id]`) doivent destructurer `params` de manière asynchrone (ex: `const { id } = await params;`).
- **JSX Booleans Guardrail** : Dans tout le code JSX inséré ou modifié, utiliser des ternaires `condition ? <Component /> : null` et éviter le court-circuit logique `condition && <Component />` pour des raisons de stabilité sous React 19.
- **Sécurisation & Logs** : Toutes les erreurs attrapées dans les `try/catch` doivent être passées à `sanitizeError` provenant de `@/lib/sanitize-log` avant d'être journalisées pour éviter toute fuite d'informations d'infrastructure ou d'accès SMTP.
- **Formulaire de saisie markdown** : Pour le champ `content`, utiliser un composant `Textarea` standard de bonne taille avec prévisualisation basique ou simple éditeur texte. Pas besoin d'installer de lourdes bibliothèques tierces d'édition riche WYSIWYG complexes sauf demande explicite.

### Fichiers impactés ou créés

- [src/lib/audit-log.ts](file:///D:/Code/ivoire-business-club-next/src/lib/audit-log.ts) (MODIFIED) - Ajout des enums/types d'audit pour articles.
- [src/app/api/articles/route.ts](file:///D:/Code/ivoire-business-club-next/src/app/api/articles/route.ts) (MODIFIED) - Intégration de l'audit log sur la création.
- [src/app/api/articles/[id]/route.ts](file:///D:/Code/ivoire-business-club-next/src/app/api/articles/[id]/route.ts) (MODIFIED) - Intégration de l'audit log sur la modification, publication et suppression.
- [src/app/(admin)/layout.tsx](file:///D:/Code/ivoire-business-club-next/src/app/(admin)/layout.tsx) (MODIFIED) - Ajout du lien vers l'admin articles.
- `src/app/(admin)/admin/articles/page.tsx` (NEW) - Liste admin des articles.
- `src/app/(admin)/admin/articles/new/page.tsx` (NEW) - Page création article.
- `src/app/(admin)/admin/articles/[id]/edit/page.tsx` (NEW) - Page édition article.
- `src/components/features/admin/articles-list-table.tsx` (NEW) - Composant de table admin.
- `src/components/features/admin/article-form.tsx` (NEW) - Composant formulaire CRUD.
- `src/app/(admin)/admin/articles/page.test.tsx` (NEW) - Test d'intégration de la page.
- `src/components/features/admin/articles-list-table.test.tsx` (NEW) - Test de la table articles admin.
- `src/components/features/admin/article-form.test.tsx` (NEW) - Test du formulaire CRUD.

### Références

- Définition d'Epic 9 : [epics.md#L1339-L1371](file:///D:/Code/ivoire-business-club-next/_bmad-output/planning-artifacts/epics.md#L1339-L1371)
- Schéma de données de l'opportunité (pour référence sur l'audit log) : [prisma/schema.prisma](file:///D:/Code/ivoire-business-club-next/prisma/schema.prisma)
- Tiers de visibilité : [src/lib/tier-config.ts](file:///D:/Code/ivoire-business-club-next/src/lib/tier-config.ts)
- Proposition de Sprint : [sprint-change-proposal-2026-06-13.md](file:///D:/Code/ivoire-business-club-next/_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-13.md)
- Code de Story 9.1 : [9-1-modele-article-migration-et-api-routes.md](file:///D:/Code/ivoire-business-club-next/_bmad-output/implementation-artifacts/9-1-modele-article-migration-et-api-routes.md)

## Dev Agent Record

### Agent Model Used

Gemini 3.5 Flash (Medium)

### Debug Log References

### Completion Notes List

### File List
