---
baseline_commit: 73e66145e3c4af28b3b6da6822704e1ffb55aab5
---
# Story 9.2: Interface Admin CRUD Articles

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

**En tant qu'** administrateur IBC,  
**Je veux** une interface de gestion des articles avec un éditeur Markdown interactif (barre d'outils et prévisualisation en temps réel) et un sélecteur d'opportunité,  
**Afin de** rédiger confortablement le contenu éditorial et de le lier aux opportunités d'investissement pour maximiser les conversions.

## Acceptance Criteria

1. **Liste des articles (`/admin/articles`)**
   - **Given** un admin sur `/admin/articles`
   - **When** la page se charge
   - **Then** un tableau affiche tous les articles avec : Titre, Catégorie, Badge de visibilité par tier, Statut de publication (`published`), Opportunité associée (si présente), et Date de création.
   - **And** des boutons d'action permettent de modifier, supprimer, et publier/dépublier chaque article.

2. **Éditeur Markdown interactif (Formulaire de création & édition)**
   - **Given** l'admin sur le formulaire de création `/admin/articles/new` ou d'édition `/admin/articles/[id]/edit`
   - **When** il rédige l'article
   - **Then** il dispose d'une barre d'outils de formatage rapide insérant les balises Markdown appropriées (Titres `#`, Gras `**`, Italique `*`, Listes à puces `-`).
   - **And** un mode de prévisualisation en temps réel (côte à côte ou via un onglet "Prévisualiser") affiche le contenu rendu en HTML à l'aide de `marked` et sécurisé avec `isomorphic-dompurify`.

3. **Association avec une opportunité**
   - **Given** l'admin sur le formulaire de création ou d'édition d'article
   - **When** le formulaire est affiché
   - **Then** un sélecteur déroulant (Select ou Combobox) permet d'associer facultativement l'article à une opportunité existante (filtrée sur le statut `VERIFIED`).
   - **And** cette opportunité est persistée via le champ `opportunityId` en base de données.

4. **Action Publier / Dépublier**
   - **Given** un admin sur la page de liste des articles
   - **When** il clique sur "Publier" sur un article en brouillon
   - **Then** l'article passe à `published: true`, `publishedAt` est initialisé à la date courante, et un log d'audit `ARTICLE_PUBLISH` est créé.
   - **Given** un admin sur la liste des articles
   - **When** il clique sur "Dépublier" sur un article publié
   - **Then** l'article passe à `published: false`, `publishedAt` repasse à `null`, et un log d'audit `ARTICLE_UNPUBLISH` est créé.

5. **Action Supprimer**
   - **Given** un admin sur la liste des articles
   - **When** il clique sur "Supprimer" sur un article
   - **Then** une boîte de dialogue de confirmation (Radix Dialog) s'affiche.
   - **When** il confirme la suppression
   - **Then** l'article est supprimé définitivement de la base de données et un log d'audit `ARTICLE_DELETE` est créé.

6. **Indicateurs visuels et badges de visibilité**
   - **Given** le sélecteur de visibilité dans le formulaire et l'affichage dans le tableau
   - **When** une visibilité est sélectionnée ou affichée
   - **Then** un badge de visibilité stylisé s'affiche avec des couleurs adaptées au tier (PUBLIC = gris/neutral, AFFRANCHI = teal, GRAND_FRERE = amber, BOSS = violet).

7. **Logs d'audit CRUD**
   - **Given** une action d'administration effectuée sur un article
   - **When** l'action réussit (Création, Modification, Publication, Dépublication, Suppression)
   - **Then** un enregistrement d'audit log est créé dans la table `AuditLog` avec l'acteur, le type d'action approprié (`ARTICLE_CREATE`, `ARTICLE_UPDATE`, `ARTICLE_PUBLISH`, `ARTICLE_UNPUBLISH`, `ARTICLE_DELETE`) et l'identifiant de l'entité.

## Tasks / Subtasks

- [x] **Mise à jour des API routes d'articles (AC: 3, 7)**
  - [x] Dans [src/app/api/articles/route.ts](file:///D:/Code/ivoire-business-club-next/src/app/api/articles/route.ts) (`POST`) : Extraire `opportunityId` de `parsed.data` et l'enregistrer dans `prisma.article.create`.
  - [x] Dans [src/app/api/articles/[id]/route.ts](file:///D:/Code/ivoire-business-club-next/src/app/api/articles/[id]/route.ts) (`PUT`) : S'assurer que `opportunityId` est correctement mis à jour en base de données (si changé).

- [x] **Chargement des opportunités dans les pages Admin (AC: 3)**
  - [x] Dans [src/app/(admin)/admin/articles/new/page.tsx](file:///D:/Code/ivoire-business-club-next/src/app/(admin)/admin/articles/new/page.tsx) : Récupérer toutes les opportunités vérifiées (`verificationStatus: "VERIFIED"`) triées par titre, et les passer au composant `ArticleForm`.
  - [x] Dans [src/app/(admin)/admin/articles/[id]/edit/page.tsx](file:///D:/Code/ivoire-business-club-next/src/app/(admin)/admin/articles/[id]/edit/page.tsx) : Récupérer toutes les opportunités vérifiées et les passer au composant `ArticleForm`.

- [x] **Amélioration du Formulaire d'Articles (AC: 2, 3)**
  - [x] Dans [src/components/features/admin/article-form.tsx](file:///D:/Code/ivoire-business-club-next/src/components/features/admin/article-form.tsx) :
    - [x] Ajouter une prop `opportunities` contenant la liste des opportunités `{ id: string, title: string }[]`.
    - [x] Intégrer un sélecteur (`Select` de shadcn/ui) pour le champ `opportunityId`, permettant de lier l'article à une opportunité ou de laisser vide (option "Aucune opportunité").
    - [x] Remplacer le `Textarea` de contenu par un éditeur Markdown enrichi :
      - [x] Ajouter une barre d'outils au-dessus du textarea avec des boutons (Titres, Gras, Italique, Liste à puces).
      - [x] Implémenter des fonctions utilitaires pour insérer le formatage Markdown au niveau de la sélection du curseur dans le textarea et mettre à jour la valeur du formulaire.
      - [x] Ajouter un onglet ou un panneau de prévisualisation en direct utilisant `marked` pour le parsing HTML et `isomorphic-dompurify` pour la désinfection.

- [x] **Mise à jour de la table de liste des articles (AC: 1)**
  - [x] Dans [src/app/(admin)/admin/articles/page.tsx](file:///D:/Code/ivoire-business-club-next/src/app/(admin)/admin/articles/page.tsx) : Inclure la relation `opportunity` dans `prisma.article.findMany` pour récupérer l'opportunité associée (titre).
  - [x] Mettre à jour `ArticlesListTable` pour afficher le titre de l'opportunité associée dans une nouvelle colonne "Opportunité liée", avec un fallback stylisé (ex: "Aucune" ou tiret) si absent.

- [x] **Tests Unitaires et d'Intégration (AC: 1, 2, 3)**
  - [x] Mettre à jour les tests dans [src/components/features/admin/article-form.test.tsx](file:///D:/Code/ivoire-business-club-next/src/components/features/admin/article-form.test.tsx) pour vérifier :
    - [x] Le rendu et le bon fonctionnement du sélecteur d'opportunité.
    - [x] L'insertion de balises Markdown via les boutons de la barre d'outils.
    - [x] Le bon rendu de la prévisualisation Markdown.
  - [x] Mettre à jour les tests d'API routes d'articles pour valider le traitement de `opportunityId`.

- [x] **Vérification de Non-Régression**
  - [x] Lancer les tests unitaires via `npx vitest run` et s'assurer que tous les tests passent.
  - [x] Lancer le build de production `npm run build` pour s'assurer qu'aucune erreur de compilation n'est présente.

## Dev Notes

### Décisions d'implémentation et contraintes

- **Rendu Markdown** : Utiliser la bibliothèque `marked` pour convertir le Markdown en HTML côté client dans le composant de prévisualisation, et le désinfecter impérativement avec `DOMPurify` (via `isomorphic-dompurify`) pour éviter les vulnérabilités XSS.
- **Next.js 16/React 19 / JSX Booleans Guardrail** : Utiliser uniquement des ternaires `condition ? <Component /> : null` dans le code JSX et éviter le court-circuit `&&`.
- **Prisma & Singleton** : Veiller à importer `prisma` depuis `@/lib/prisma` et non pas de `@prisma/client`.
- **Idempotence des transactions d'état** : L'écriture d'un log d'audit ou l'envoi d'une notification lors d'un changement d'état d'un article doit être idempotent. S'assurer de comparer l'ancienne valeur `published` avec la nouvelle avant d'écrire l'audit log correspondant.

### Fichiers impactés ou créés

- [src/app/api/articles/route.ts](file:///D:/Code/ivoire-business-club-next/src/app/api/articles/route.ts) (MODIFIED) - Prise en compte de `opportunityId` à la création.
- [src/app/api/articles/[id]/route.ts](file:///D:/Code/ivoire-business-club-next/src/app/api/articles/[id]/route.ts) (MODIFIED) - Prise en compte de `opportunityId` à la mise à jour.
- [src/app/(admin)/admin/articles/page.tsx](file:///D:/Code/ivoire-business-club-next/src/app/(admin)/admin/articles/page.tsx) (MODIFIED) - Jointure avec Opportunity et sérialisation.
- [src/app/(admin)/admin/articles/new/page.tsx](file:///D:/Code/ivoire-business-club-next/src/app/(admin)/admin/articles/new/page.tsx) (MODIFIED) - Chargement des opportunités vérifiées.
- [src/app/(admin)/admin/articles/[id]/edit/page.tsx](file:///D:/Code/ivoire-business-club-next/src/app/(admin)/admin/articles/[id]/edit/page.tsx) (MODIFIED) - Chargement des opportunités vérifiées.
- [src/components/features/admin/article-form.tsx](file:///D:/Code/ivoire-business-club-next/src/components/features/admin/article-form.tsx) (MODIFIED) - Intégration de la barre d'outils Markdown, de l'onglet de prévisualisation, et du sélecteur d'opportunité.
- [src/components/features/admin/articles-list-table.tsx](file:///D:/Code/ivoire-business-club-next/src/components/features/admin/articles-list-table.tsx) (MODIFIED) - Affichage de la colonne de l'opportunité associée.

### Références

- Proposition de Sprint : [sprint-change-proposal-2026-06-16.md](file:///D:/Code/ivoire-business-club-next/_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-16.md)
- Modèle de données Prisma : [prisma/schema.prisma](file:///D:/Code/ivoire-business-club-next/prisma/schema.prisma)
- Exigences PRD (FR54, FR56) : [prd.md](file:///D:/Code/ivoire-business-club-next/_bmad-output/planning-artifacts/prd.md)

## Dev Agent Record

### Agent Model Used

Gemini 3.5 Flash (Medium)

### Debug Log References

### Completion Notes List

- Ajout de la gestion de l'association d'opportunité d'investissement (`opportunityId`) à la création et à la mise à jour d'un article dans les routes d'API (POST/PUT).
- Récupération des opportunités validées (`VERIFIED`) pour les passer au formulaire d'article dans les pages de création et d'édition d'article admin.
- Formulaire d'article admin enrichi avec un sélecteur d'opportunité et un éditeur Markdown avec barre d'outils (Titre, Gras, Italique, Liste à puces) et prévisualisation sécurisée en temps réel (via `marked` et `isomorphic-dompurify`).
- Ajout de la colonne 'Opportunité liée' dans le tableau de la liste des articles admin avec fallback stylisé.
- Écriture de tests unitaires et d'intégration validant le formulaire (sélecteur, insertion markdown, onglet de prévisualisation) et les routes d'API.
- Lancement complet des tests (655 tests passés) et validation du build de production Next.js avec Webpack.

### File List

- src/app/api/articles/route.ts
- src/app/api/articles/[id]/route.ts
- src/app/(admin)/admin/articles/page.tsx
- src/app/(admin)/admin/articles/new/page.tsx
- src/app/(admin)/admin/articles/[id]/edit/page.tsx
- src/components/features/admin/article-form.tsx
- src/components/features/admin/articles-list-table.tsx
- src/components/features/admin/article-form.test.tsx
- src/app/api/articles/route.test.ts
- src/app/api/articles/[id]/route.test.ts
