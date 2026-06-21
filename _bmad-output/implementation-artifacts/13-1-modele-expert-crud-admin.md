---
baseline_commit: 4bf6a0519d470d6c9f89b1040d185569a9c97a3b
---
# Story 13.1 : Modèle Expert + CRUD admin

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

**En tant qu'** admin,  
**Je veux** créer et gérer des fiches expert,  
**Afin de** présenter les consultants directs du club.

## Acceptance Criteria

1. **Création d'un expert (DRAFT par défaut)**
   - **Given** l'admin sur la page `/admin/experts/new`
   - **When** il remplit le formulaire avec : `name` (nom), `title` (titre/fonction), `bio` (biographie), `photoUrl` (image optionnelle), `phone` (téléphone optionnel), `email` (email optionnel), `whatsapp` (WhatsApp optionnel), `specialties` (spécialités sous forme de tags/chaîne), `requiredTier` (niveau d'abonnement minimum requis : AFFRANCHI, GRAND_FRERE, BOSS), et soumet le formulaire
   - **Then** la fiche expert est enregistrée en base de données avec un `slug` auto-généré et unique à partir du nom, `isPublished` défini par défaut sur `false`, et `requiredTier` enregistré avec la valeur choisie (par défaut `AFFRANCHI`)
   - **And** l'admin est redirigé vers la liste des experts avec un toast de confirmation en français : "Expert créé avec succès."

2. **Visualisation & Publication d'un expert**
   - **Given** un expert enregistré avec `isPublished = false`
   - **When** l'admin consulte la page publique `/experts` (qui sera implémentée dans la Story 13.2)
   - **Then** cet expert non publié n'apparaît pas dans la liste
   - **When** l'admin change le statut sur la liste admin ou modifie l'expert pour cocher "Publier" (`isPublished = true`)
   - **Then** l'expert devient instantanément visible sur la page publique `/experts` (quand la page sera opérationnelle)

3. **Modification & Mise à jour d'un expert**
   - **Given** l'admin sur `/admin/experts/[id]/edit`
   - **When** il modifie des champs de l'expert (par exemple son nom ou ses coordonnées) et enregistre
   - **Then** les modifications sont persistées en base, le `updatedAt` est mis à jour, et si le nom a été changé, un nouveau `slug` unique est calculé
   - **And** l'admin reçoit un toast de confirmation : "Expert mis à jour avec succès."

4. **Suppression d'un expert**
   - **Given** l'admin sur la liste admin `/admin/experts`
   - **When** il clique sur "Supprimer" sur la ligne d'un expert et confirme son choix dans la modale
   - **Then** l'expert est définitivement supprimé de la base de données
   - **And** l'admin reçoit un toast de confirmation : "Expert supprimé avec succès."

5. **Liste admin des experts**
   - **Given** l'admin sur `/admin/experts`
   - **When** il accède à la page
   - **Then** il voit un tableau listant tous les experts enregistrés (publiés et non publiés) triés par `createdAt desc` avec leur photo, nom, titre, spécialités, niveau d'abonnement requis (badge `requiredTier`), statut (badge publié/brouillon) et des boutons d'actions (Modifier, Supprimer, Publier/Retirer)

## Tasks / Subtasks

- [ ] **Modélisation Prisma**
  - [ ] Ajouter le modèle `Expert` dans [prisma/schema.prisma](file:///D:/Code/ivoire-business-club-next/prisma/schema.prisma) et [prisma/schema.dev.prisma](file:///D:/Code/ivoire-business-club-next/prisma/schema.dev.prisma).
  - [ ] Les champs à inclure : `id` (String, @id, cuid), `name` (String), `slug` (String, @unique), `title` (String), `bio` (String, @db.Text / Text), `photoUrl` (String, optionnel), `phone` (String, optionnel), `email` (String, optionnel), `whatsapp` (String, optionnel), `specialties` (String, optionnel, stocké sous forme de chaîne séparée par des virgules pour compatibilité SQLite), `requiredTier` (Tier enum, default `AFFRANCHI`), `isPublished` (Boolean, default `false`), `createdAt` (DateTime, default `now`), `updatedAt` (DateTime, @updatedAt).
  - [ ] Ajouter un index sur `[isPublished]`.
  - [ ] Exécuter `npx prisma migrate dev --name add_expert_model` et s'assurer que le client est généré dans `src/generated/prisma`.

- [ ] **Schémas de validation Zod**
  - [ ] Ajouter `expertCreateSchema` et `expertUpdateSchema` dans [src/lib/validations.ts](file:///D:/Code/ivoire-business-club-next/src/lib/validations.ts).
  - [ ] Valider : `name` (min 2), `title` (min 2), `bio` (min 10), `photoUrl` (optionnel ou format URL/relatif), `phone` (optionnel), `email` (optionnel ou format email), `whatsapp` (optionnel), `specialties` (optionnel), `requiredTier` (z.enum(["AFFRANCHI", "GRAND_FRERE", "BOSS"])), `isPublished` (boolean optionnel).
  - [ ] Exporter les types TypeScript associés.

- [ ] **Utilitaire de slug**
  - [ ] Créer `src/lib/expert-utils.ts` et implémenter `generateUniqueSlug(name: string, currentId?: string)` en réutilisant la fonction `slugify` de [src/lib/utils.ts](file:///D:/Code/ivoire-business-club-next/src/lib/utils.ts). Assurer la résolution de collision de slug en ajoutant un compteur suffixé (ex: `expert-nom-1`).

- [ ] **API routes REST admin/public**
  - [ ] Créer `src/app/api/experts/route.ts` :
    - [ ] `GET` : Route publique qui renvoie uniquement les experts publiés (`isPublished: true`), triés par `createdAt desc`.
    - [ ] `POST` : Route admin (protégée par `auth()` + `role === "ADMIN"`), qui valide le corps via `expertCreateSchema`, génère le slug unique, crée l'expert en base, génère un audit log `EXPERT_CREATE`, et renvoie l'expert créé avec le statut `201`.
  - [ ] Créer `src/app/api/experts/[id]/route.ts` :
    - [ ] `GET` : Route publique qui renvoie l'expert par son `id` ou son `slug` s'il est publié, sinon retourne un statut `404` (les admins contournent la restriction de publication). Awaiter le paramètre `params`.
    - [ ] `PUT` : Route admin (protégée) qui met à jour l'expert, écrit un audit log `EXPERT_UPDATE` (et `EXPERT_PUBLISH`/`EXPERT_UNPUBLISH` si le statut `isPublished` a changé), et renvoie l'expert mis à jour. Awaiter le paramètre `params`.
    - [ ] `DELETE` : Route admin (protégée) qui supprime définitivement l'expert de la base, écrit un audit log `EXPERT_DELETE`, et renvoie un statut de succès. Awaiter le paramètre `params`.

- [ ] **Interface d'administration CRUD**
  - [ ] Créer la page liste [src/app/(admin)/admin/experts/page.tsx](file:///D:/Code/ivoire-business-club-next/src/app/(admin)/admin/experts/page.tsx) qui récupère tous les experts (publiés et non publiés) et les affiche. Protéger l'accès via `auth()` + `promoteConfiguredAdminUser`.
  - [ ] Créer la page de création [src/app/(admin)/admin/experts/new/page.tsx](file:///D:/Code/ivoire-business-club-next/src/app/(admin)/admin/experts/new/page.tsx).
  - [ ] Créer la page d'édition [src/app/(admin)/admin/experts/[id]/edit/page.tsx](file:///D:/Code/ivoire-business-club-next/src/app/(admin)/admin/experts/[id]/edit/page.tsx) (gérer `params` de manière asynchrone).
  - [ ] Créer le formulaire [src/components/features/admin/expert-form.tsx](file:///D:/Code/ivoire-business-club-next/src/components/features/admin/expert-form.tsx) en utilisant `react-hook-form` + résolveur Zod. Inclure un sélecteur (`Select` shadcn/ui) pour choisir le niveau d'abonnement requis (`requiredTier`). Formulaire responsive, mobile-friendly, avec des messages d'erreur clairs en français.
  - [ ] Créer la table [src/components/features/admin/experts-list-table.tsx](file:///D:/Code/ivoire-business-club-next/src/components/features/admin/experts-list-table.tsx) affichant les experts avec des boutons d'action rapide pour modifier, supprimer et basculer l'état de publication en un clic, ainsi qu'un badge indiquant le tier d'abonnement requis (`requiredTier`).

- [ ] **Sécurité & navigation admin**
  - [ ] Ajouter l'entrée "Experts" dans le tableau `ADMIN_NAV` du layout admin [src/app/(admin)/layout.tsx](file:///D:/Code/ivoire-business-club-next/src/app/(admin)/layout.tsx) avec l'icône `🎓` et l'URL `/admin/experts`.

- [ ] **Audit logs**
  - [ ] Ajouter les constantes `EXPERT_CREATE`, `EXPERT_UPDATE`, `EXPERT_PUBLISH`, `EXPERT_UNPUBLISH`, et `EXPERT_DELETE` dans `AUDIT_ACTIONS` de [src/lib/audit-log.ts](file:///D:/Code/ivoire-business-club-next/src/lib/audit-log.ts).
  - [ ] Appeler `safeCreateAuditLog` lors de chaque mutation dans les routes API.

- [ ] **Seeding des données**
  - [ ] Mettre à jour `prisma/seed.ts` pour insérer 3 fiches expert de test (par exemple : un expert en immobilier, un expert juridique, et un mentor/coach business) dont au moins un est non publié. Rendre le seed idempotent.

- [ ] **Tests unitaires et d'intégration**
  - [ ] Créer `src/app/api/experts/route.test.ts` et `src/app/api/experts/[id]/route.test.ts` pour tester :
    - Le filtrage des experts publiés (GET public).
    - Les restrictions d'accès admin sur POST, PUT, DELETE.
    - La gestion des collisions de slugs.
    - Les transitions d'états de publication et leur audit.
  - [ ] Créer `src/components/features/admin/expert-form.test.tsx` et `src/components/features/admin/experts-list-table.test.tsx` pour valider l'UI et les soumissions.
  - [ ] Exécuter `npx vitest run` pour s'assurer que tous les tests passent sans régression.

## Dev Notes

- **Langue du projet** : Toutes les UI, messages de validation, toasts, logs d'audit et commentaires doivent être rédigés en **français**.
- **Next.js 16 / React 19 App Router** : Les paramètres dynamiques de chemins (ex: `params` dans les Route Handlers et les pages serveur d'édition) doivent être explicitement attendus asynchronement : `const { id } = await params;`.
- **Prisma Client Singleton** : Importer le client généré depuis `@/generated/prisma/client` et passer par l'instance unique de `@/lib/prisma`.
- **SQLite vs PostgreSQL (String Array)** : SQLite ne supportant pas les listes scalaires (`specialties String[]`), nous définissons le champ comme `specialties String?` dans les deux schémas (`schema.prisma` et `schema.dev.prisma`), en stockant les spécialités sous forme de tags séparés par des virgules (ex: `"immobilier, finance, juridique"`). Cela garantit une compatibilité parfaite entre le développement local et la production.
- **Sécurité et protection des routes** : Utiliser le helper `promoteConfiguredAdminUser(session.user.id)` pour les vérifications de droits administrateurs dans les pages d'administration.
- **JSX Booleans Guardrail** : Ne pas utiliser de double esperluette `&&` pour les rendus conditionnels dans JSX, préférer le format `{condition ? <Component /> : null}` et pré-calculer les conditions complexes.
- **Idempotence des side-effects** : Lors de la modification du statut de publication, vérifier que la nouvelle valeur est différente de l'ancienne avant d'émettre des logs d'audit spécifiques ou d'autres side-effects (`EVENT_PUBLISH` vs `EVENT_UPDATE`).

### Project Structure Notes

- Respecter le layout admin existant dans `(admin)`.
- Reutiliser les styles et composants shadcn/ui (Button, Input, Form, Card, Dialog, Toast).

### References

- Contexte Epic 13 & Story 13.1 : [sprint-change-proposal-2026-06-18.md](file:///D:/Code/ivoire-business-club-next/_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-18.md#L501-L532)
- Structure de référence pour CRUD admin : [12-1-modele-event-crud-admin.md](file:///D:/Code/ivoire-business-club-next/_bmad-output/implementation-artifacts/12-1-modele-event-crud-admin.md)
- Code de référence API : [src/app/api/events/route.ts](file:///D:/Code/ivoire-business-club-next/src/app/api/events/route.ts) et [src/app/api/events/[id]/route.ts](file:///D:/Code/ivoire-business-club-next/src/app/api/events/[id]/route.ts)

## Dev Agent Record

### Agent Model Used

Gemini 3.5 Flash (Medium)

### Debug Log References

None

### Completion Notes List

- Added the Expert database model mapping for PostgreSQL (schema.prisma) and SQLite (schema.dev.prisma) with database migration and regenerated Prisma Client.
- Configured Zod schemas and type exports for Expert creation and modification inside validations.ts.
- Designed unique slug generation logic inside expert-utils.ts.
- Built collection REST endpoint /api/experts and resource REST endpoint /api/experts/[id] enforcing authorization and audit logging.
- Created Admin CRUD components <ExpertForm /> and <ExpertsListTable /> with inline state publish/unpublish toggles.
- Created Admin pages under /admin/experts/ (list, new, edit) and updated Admin navigation.
- Maintained database seeding logic inside seed.ts.
- Created and executed 35 unit/integration tests matching 100% pass rate.

### File List

- prisma/schema.prisma
- prisma/schema.dev.prisma
- src/lib/validations.ts
- src/lib/expert-utils.ts
- src/app/api/experts/route.ts
- src/app/api/experts/[id]/route.ts
- src/components/features/admin/expert-form.tsx
- src/components/features/admin/experts-list-table.tsx
- src/app/(admin)/admin/experts/page.tsx
- src/app/(admin)/admin/experts/new/page.tsx
- src/app/(admin)/admin/experts/[id]/edit/page.tsx
- src/app/(admin)/layout.tsx
- src/lib/audit-log.ts
- prisma/seed.ts
- src/app/api/experts/route.test.ts
- src/app/api/experts/[id]/route.test.ts
- src/components/features/admin/expert-form.test.tsx
- src/components/features/admin/experts-list-table.test.tsx
- src/app/api/articles/route.test.ts

