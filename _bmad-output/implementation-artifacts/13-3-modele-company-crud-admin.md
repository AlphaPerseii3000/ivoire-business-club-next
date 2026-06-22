---
baseline_commit: 79cd68ac9d0b2c6497ebcfb161d6cf375ec53e75
---
# Story 13.3: Modèle Company + CRUD admin

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

**En tant qu'** admin,  
**Je veux** créer et gérer des fiches entreprise agréée,  
**Afin de** présenter les partenaires engageables du club.

## Acceptance Criteria

1. **Création d'une entreprise (DRAFT par défaut)**
   - **Given** l'admin sur la page `/admin/companies/new`
   - **When** il remplit le formulaire avec : `name` (nom), `description` (description), `logoUrl` (image/logo optionnelle), `contactName` (nom du contact optionnel), `contactPhone` (téléphone du contact optionnel), `contactEmail` (email du contact optionnel), `website` (site web optionnel), `location` (localisation optionnelle), `certifications` (certifications/agréments optionnels), `sectors` (secteurs d'activité sous forme de tags/chaîne), et soumet le formulaire
   - **Then** la fiche entreprise est enregistrée en base de données avec un `slug` auto-généré et unique à partir du nom, `isPublished` défini par défaut sur `false`
   - **And** l'admin est redirigé vers la liste des entreprises avec un toast de confirmation en français : "Entreprise créée avec succès."

2. **Visualisation & Publication d'une entreprise**
   - **Given** une entreprise enregistrée avec `isPublished = false`
   - **When** l'admin consulte la page publique `/partners` (qui sera implémentée dans la Story 13.4)
   - **Then** cette entreprise non publiée n'apparaît pas dans la liste
   - **When** l'admin change le statut sur la liste admin ou modifie l'entreprise pour cocher "Publier" (`isPublished = true`)
   - **Then** l'entreprise devient instantanément visible sur la page publique `/partners` (quand la page sera opérationnelle)

3. **Modification & Mise à jour d'une entreprise**
   - **Given** l'admin sur `/admin/companies/[id]/edit`
   - **When** il modifie des champs de l'entreprise (par exemple son nom ou ses coordonnées) et enregistre
   - **Then** les modifications sont persistées en base, le `updatedAt` est mis à jour, et si le nom a été changé, un nouveau `slug` unique est calculé
   - **And** l'admin reçoit un toast de confirmation : "Entreprise mise à jour avec succès."

4. **Suppression d'une entreprise**
   - **Given** l'admin sur la liste admin `/admin/companies`
   - **When** il clique sur "Supprimer" sur la ligne d'une entreprise et confirme son choix dans la modale
   - **Then** l'entreprise est définitivement supprimée de la base de données
   - **And** l'admin reçoit un toast de confirmation : "Entreprise supprimée avec succès."

5. **Liste admin des entreprises**
   - **Given** l'admin sur `/admin/companies`
   - **When** il accède à la page
   - **Then** il voit un tableau listant toutes les entreprises enregistrées (publiées et non publiées) triés par `createdAt desc` avec leur logo (ou fallback), nom, description courte, secteurs d'activité, statut (badge publié/brouillon) et des boutons d'actions (Modifier, Supprimer, Publier/Retirer)

## Tasks / Subtasks

- [x] **Modélisation Prisma**
  - [x] Ajouter le modèle `Company` dans `prisma/schema.prisma` et `prisma/schema.dev.prisma`.
  - [x] Les champs à inclure : `id` (String, @id, cuid), `name` (String), `slug` (String, @unique), `description` (String, @db.Text / Text), `logoUrl` (String, optionnel), `contactName` (String, optionnel), `contactPhone` (String, optionnel), `contactEmail` (String, optionnel), `website` (String, optionnel), `location` (String, optionnel), `certifications` (String, optionnel), `sectors` (String, optionnel, stocké sous forme de chaîne séparée par des virgules pour compatibilité SQLite), `isPublished` (Boolean, default `false`), `createdAt` (DateTime, default `now`), `updatedAt` (DateTime, @updatedAt).
  - [x] Ajouter un index sur `[isPublished]`.
  - [x] Exécuter `npx prisma migrate dev --name add_company_model` et s'assurer que le client est généré dans `src/generated/prisma`.

- [x] **Schémas de validation Zod**
  - [x] Ajouter `companyCreateSchema` et `companyUpdateSchema` dans `src/lib/validations.ts`.
  - [x] Valider : `name` (min 2), `description` (min 10), `logoUrl` (optionnel ou format URL/relatif), `contactName` (optionnel), `contactPhone` (optionnel), `contactEmail` (optionnel ou format email), `website` (optionnel ou format URL), `location` (optionnel), `certifications` (optionnel), `sectors` (optionnel), `isPublished` (boolean optionnel).
  - [x] Exporter les types TypeScript associés (`CompanyCreateInput`, `CompanyUpdateInput`).

- [x] **Utilitaire de slug**
  - [x] Créer `src/lib/company-utils.ts` et implémenter `generateUniqueCompanySlug(name: string, currentId?: string)` en réutilisant la fonction `slugify` de `src/lib/utils.ts`. Assurer la résolution de collision de slug en effectuant un `findMany` avec `startsWith` et résolvant en mémoire (semblable à `generateUniqueSlug` des experts) pour éviter les requêtes N+1.

- [x] **API routes REST admin/public**
  - [x] Créer `src/app/api/companies/route.ts` :
    - [x] `GET` : Route publique qui renvoie uniquement les entreprises publiées (`isPublished: true`), triées par `createdAt desc`.
    - [x] `POST` : Route admin (protégée par `auth()` + `role === "ADMIN"` + `promoteConfiguredAdminUser`), qui valide le corps via `companyCreateSchema`, génère le slug unique, crée l'entreprise en base, génère un audit log `COMPANY_CREATE`, et renvoie l'entreprise créée avec le statut `201`.
  - [x] Créer `src/app/api/companies/[id]/route.ts` :
    - [x] `GET` : Route publique qui renvoie l'entreprise par son `id` ou son `slug` s'il est publié, sinon retourne un statut `404` (les admins contournent la restriction de publication). Awaiter le paramètre `params` asynchronement.
    - [x] `PUT` : Route admin (protégée) qui met à jour l'entreprise, écrit un audit log `COMPANY_UPDATE` (et `COMPANY_PUBLISH`/`COMPANY_UNPUBLISH` si le statut `isPublished` a changé), et renvoie l'entreprise mise à jour. Awaiter le paramètre `params` asynchronement.
    - [x] `DELETE` : Route admin (protégée) qui supprime définitivement l'entreprise de la base, écrit un audit log `COMPANY_DELETE`, et renvoie un statut de succès. Awaiter le paramètre `params` asynchronement.

- [x] **Interface d'administration CRUD**
  - [x] Créer la page liste `src/app/(admin)/admin/companies/page.tsx` qui récupère toutes les entreprises et les affiche. Protéger l'accès via `auth()` + `promoteConfiguredAdminUser`.
  - [x] Créer la page de création `src/app/(admin)/admin/companies/new/page.tsx`.
  - [x] Créer la page d'édition `src/app/(admin)/admin/companies/[id]/edit/page.tsx` (gérer `params` de manière asynchrone).
  - [x] Créer le formulaire `src/components/features/admin/company-form.tsx` en utilisant `react-hook-form` + résolveur Zod. Formulaire responsive, mobile-friendly, avec des messages d'erreur clairs en français.
  - [x] Créer la table `src/components/features/admin/companies-list-table.tsx` affichant les entreprises avec des boutons d'action rapide pour modifier, supprimer et basculer l'état de publication en un clic.

- [x] **Sécurité & navigation admin**
  - [x] Ajouter l'entrée "Entreprises" dans le tableau `ADMIN_NAV` du layout admin `src/app/(admin)/layout.tsx` avec l'icône `🏢` et l'URL `/admin/companies` juste en dessous de Experts.

- [x] **Audit logs**
  - [x] Ajouter les constantes `COMPANY_CREATE`, `COMPANY_UPDATE`, `COMPANY_PUBLISH`, `COMPANY_UNPUBLISH`, et `COMPANY_DELETE` dans `AUDIT_ACTIONS` de `src/lib/audit-log.ts`.
  - [x] Appeler `safeCreateAuditLog` lors de chaque mutation dans les routes API.

- [x] **Seeding des données**
  - [x] Mettre à jour `prisma/seed.ts` pour insérer 3 fiches entreprise de test (par exemple : KS Construction, Ivoire Digital Agency, et UEMOA Conseil) dont au moins une est non publiée. Rendre le seed idempotent.

- [x] **Tests unitaires et d'intégration**
  - [x] Créer `src/app/api/companies/route.test.ts` et `src/app/api/companies/[id]/route.test.ts` pour tester :
    - Le filtrage des entreprises publiées (GET public).
    - Les restrictions d'accès admin sur POST, PUT, DELETE.
    - La gestion des collisions de slugs.
    - Les transitions d'états de publication et leur audit.
  - [x] Créer `src/components/features/admin/company-form.test.tsx` et `src/components/features/admin/companies-list-table.test.tsx` pour valider l'UI et les soumissions.
  - [x] Exécuter `npx vitest run` pour s'assurer que tous les tests passent sans régression.

## Dev Notes

- **Langue du projet** : Toutes les UI, messages de validation, toasts, logs d'audit et commentaires doivent être rédigés en **français**.
- **Next.js 16 / React 19 App Router** : Les paramètres dynamiques de chemins (ex: `params` dans les Route Handlers et les pages serveur d'édition) doivent être explicitement attendus asynchronement : `const { id } = await params;`.
- **Prisma Client Singleton** : Importer le client généré depuis `@/generated/prisma/client` et passer par l'instance unique de `@/lib/prisma`.
- **SQLite vs PostgreSQL (String Array)** : SQLite ne supportant pas les listes scalaires (`sectors String[]`), nous définissons le champ comme `sectors String?` dans les deux schémas (`schema.prisma` et `schema.dev.prisma`), en stockant les secteurs sous forme de tags séparés par des virgules (ex: `"btp, construction, services"`). Cela garantit une compatibilité parfaite entre le développement local et la production.
- **Sécurité et protection des routes** : Utiliser le helper `promoteConfiguredAdminUser(session.user.id)` pour les vérifications de droits administrateurs dans les pages d'administration.
- **JSX Booleans Guardrail** : Ne pas utiliser de double esperluette `&&` pour les rendus conditionnels dans JSX, préférer le format `{condition ? <Component /> : null}` et pré-calculer les conditions complexes.
- **Idempotence des side-effects** : Lors de la modification du statut de publication, vérifier que la nouvelle valeur est différente de l'ancienne avant d'émettre des logs d'audit spécifiques ou d'autres side-effects (`COMPANY_PUBLISH` vs `COMPANY_UPDATE`).
- **Zéro Nesting d'Ancres (Crucial)** : Veiller à ne pas imbriquer de balise `<Link>` Next.js ou de balises `<a>` HTML les unes dans les autres (par exemple, un bouton de lien à l'intérieur d'une carte déjà enveloppée d'un `<Link>`).

### Project Structure Notes

- Respecter le layout admin existant dans `(admin)`.
- Reutiliser les styles et composants shadcn/ui (Button, Input, Form, Card, Dialog, Toast).

### References

- Contexte Epic 13 & Story 13.3 : [sprint-change-proposal-2026-06-18.md](file:///D:/Code/ivoire-business-club-next/_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-18.md#L557-L578)
- Structure de référence pour CRUD admin : [13-1-modele-expert-crud-admin.md](file:///D:/Code/ivoire-business-club-next/_bmad-output/implementation-artifacts/13-1-modele-expert-crud-admin.md)
- Code de référence API : [src/app/api/experts/route.ts](file:///D:/Code/ivoire-business-club-next/src/app/api/experts/route.ts) et [src/app/api/experts/[id]/route.ts](file:///D:/Code/ivoire-business-club-next/src/app/api/experts/[id]/route.ts)

## Dev Agent Record

### Agent Model Used

Gemini 3.5 Flash (Medium)

### Debug Log References

### Completion Notes List

- Ajout du modèle Company dans les schémas Prisma Postgres (schema.prisma) et SQLite (schema.dev.prisma) avec index sur isPublished.
- Exécution de la migration Prisma et génération du client mis à jour.
- Création des schémas de validation Zod et des types associés (CompanyCreateInput, CompanyUpdateInput) dans src/lib/validations.ts.
- Implémentation du générateur de slug unique generateUniqueCompanySlug dans src/lib/company-utils.ts avec gestion de collisions.
- Création des Route Handlers API REST admin et public (src/app/api/companies/route.ts et [id]/route.ts) sécurisés et journalisés avec les logs d'audit appropriés.
- Développement de l'interface CRUD d'administration responsive : formulaire (company-form.tsx), tableau récapitulatif (companies-list-table.tsx), et pages d'affichage, création et édition.
- Ajout de l'entrée "Entreprises" dans le tableau ADMIN_NAV du layout d'administration.
- Intégration de 3 entreprises de test de façon idempotente dans le script de seeding prisma/seed.ts.
- Écriture de tests unitaires complets pour les routes API et les composants UI avec couverture totale sans régressions.

### File List

- `prisma/schema.prisma`
- `prisma/schema.dev.prisma`
- `src/lib/validations.ts`
- `src/lib/company-utils.ts`
- `src/app/api/companies/route.ts`
- `src/app/api/companies/[id]/route.ts`
- `src/components/features/admin/company-form.tsx`
- `src/components/features/admin/companies-list-table.tsx`
- `src/app/(admin)/admin/companies/page.tsx`
- `src/app/(admin)/admin/companies/new/page.tsx`
- `src/app/(admin)/admin/companies/[id]/edit/page.tsx`
- `src/app/(admin)/layout.tsx`
- `src/lib/audit-log.ts`
- `prisma/seed.ts`
- `src/app/api/companies/route.test.ts`
- `src/app/api/companies/[id]/route.test.ts`
- `src/components/features/admin/company-form.test.tsx`
- `src/components/features/admin/companies-list-table.test.tsx`
- `src/app/api/articles/route.test.ts`

