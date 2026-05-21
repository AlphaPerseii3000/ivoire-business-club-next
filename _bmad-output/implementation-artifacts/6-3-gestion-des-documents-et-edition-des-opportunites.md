---
Story: "6.3"
StoryKey: "6-3-gestion-des-documents-et-edition-des-opportunites"
Title: "Gestion des Documents et Édition des Opportunités"
Status: "review"
Priority: "P1"
Epic: "Epic 6 — Administration et Back-office"
FRs: ["FR37", "FR38", "FR44"]
NFRs: ["NFR-P2", "NFR-S5", "NFR-S8", "NFR-I3", "NFR-A1", "NFR-A3"]
UXDRs: ["UX-DR8", "UX-DR13", "UX-DR14", "UX-DR16", "UX-DR17", "UX-DR34"]
Created: "2026-05-21"
---

# Story 6.3: Gestion des Documents et Édition des Opportunités

Status: review

<!-- Note: Ultimate context engine analysis completed - comprehensive developer guide created. Brownfield/delta story: Story 3.2 already delivered R2 document upload/preview/delete endpoints and reusable DocumentRow/DocumentUploadSection. Story 3.3/6.1 already delivered the admin opportunity kanban and detail sheet. Implement only the admin-management deltas below. -->

## Story

En tant qu'administrateur IBC,
je veux gérer les documents juridiques et éditer/supprimer les opportunités publiées,
afin de maintenir la qualité et la conformité du catalogue.

## Acceptance Criteria

1. **Gestion documentaire admin depuis le panneau détail**
   - Given un admin authentifié avec rôle `ADMIN` sur `/admin/opportunities`,
   - When il ouvre le panneau détail d'un deal,
   - Then la section « Documents juridiques » affiche les documents existants avec `DocumentRow`, compteur, aperçu PDF/image inline, téléchargement, et état vide en français.
   - And l'admin peut uploader des documents supplémentaires via URL signée R2 en réutilisant le flux Story 3.2 (`presign-url` puis `POST /api/opportunities/[id]/documents`).
   - And l'admin peut supprimer un document incorrect après confirmation explicite.
   - And les URLs signées, clés R2, noms de documents et métadonnées sensibles ne sont jamais loggés.

2. **Sécurité du flux documents préservée**
   - Given l'admin upload un document,
   - When le serveur génère la clé et complète l'upload,
   - Then la validation deux phases existante est conservée : clé générée côté serveur sous `opportunities/{opportunityId}/documents/{uuid}.{ext}` et endpoint de completion validant pattern + scope `opportunities/${id}/documents/`.
   - And seuls l'auteur du deal et les admins peuvent obtenir les métadonnées complètes, preview/download/delete.
   - And les autres membres ne reçoivent jamais `initialDocuments` ou métadonnées complètes dans les pages dashboard; ils ne peuvent recevoir qu'un `documentCount`.
   - And aucun nouveau endpoint public ne doit exposer les documents.

3. **Édition inline des opportunités publiées et non publiées**
   - Given l'admin sur le panneau détail d'un deal publié (`VERIFIED`) ou en cours de revue,
   - When il clique sur « Éditer »,
   - Then un formulaire inline ou une section repliable s'ouvre dans le panneau pour modifier `title`, `description`, `amount`, `category`, et `requiredTier` si le champ est déjà affiché dans l'UI admin.
   - And le formulaire utilise React Hook Form + Zod, libellés français, erreurs inline, état loading, et boutons « Enregistrer » / « Annuler ».
   - And la validation réutilise `opportunityCreateSchema` quand possible ou un schéma dédié `opportunityAdminUpdateSchema` dans `src/lib/validations.ts`; ne pas dupliquer des règles divergentes.
   - And l'enregistrement met à jour la carte kanban et le panneau détail sans refonte complète du kanban.

4. **Recalcul automatique de la double vérification lors d'une édition de montant**
   - Given l'admin édite le montant d'une opportunité,
   - When le nouveau montant est strictement supérieur à `50000`,
   - Then `requiresDoubleVerification` est positionné à `true`.
   - And si le montant passe à `50000` ou moins, ne repasser `requiresDoubleVerification` à `false` que si le deal n'a pas déjà deux approvals et n'est pas déjà `VERIFIED`; sinon préserver le contexte de conformité existant pour éviter une régression de confiance.
   - And toute logique de transition ou notification éventuelle vérifie `current !== next` avant d'exécuter des effets secondaires.

5. **Suppression d'opportunité avec confirmation et nettoyage cohérent**
   - Given l'admin sur le panneau détail,
   - When il clique sur « Supprimer »,
   - Then une modale `Dialog` de confirmation s'affiche avec le titre du deal, un avertissement clair, boutons « Annuler » et « Supprimer définitivement ».
   - And après confirmation, l'API supprime l'opportunité en base en s'appuyant sur les cascades Prisma existantes pour `documents`, `tags`, `interests`, `reviews`, `verificationApprovals`, puis tente de supprimer les objets R2 associés.
   - And si la suppression R2 échoue après suppression DB, l'erreur est journalisée uniquement comme message générique/ID sans clé ni nom de fichier et la réponse utilisateur reste claire.
   - And la carte disparaît du kanban, le panneau se ferme, et un toast succès français s'affiche.

6. **API admin robuste pour update/delete**
   - Given `PATCH /api/admin/opportunities/[id]` ou une route admin équivalente,
   - When la requête est non authentifiée,
   - Then elle retourne `401` JSON français.
   - When la requête vient d'un non-admin,
   - Then elle retourne `403` JSON français.
   - When le JSON est invalide,
   - Then elle retourne `400` sans tomber en erreur interne.
   - When les champs sont invalides,
   - Then elle retourne `400` avec un message Zod français.
   - When l'opportunité n'existe pas,
   - Then elle retourne `404`.
   - And `DELETE /api/admin/opportunities/[id]` ou route équivalente suit les mêmes règles d'auth, validation, erreurs et logs sobres.

7. **UX responsive, accessible et cohérente admin**
   - Given l'admin sur desktop ≥1024px,
   - When il gère documents ou édition,
   - Then l'expérience reste dans le panneau `Sheet` existant, lisible, avec actions groupées et sans casser les quatre colonnes kanban.
   - Given l'admin sur mobile,
   - When il utilise les mêmes actions,
   - Then le panneau reste plein écran/mobile-friendly, les boutons ont des cibles ≥44px, la confirmation de suppression est utilisable au clavier et au toucher.
   - And tous les textes visibles sont en français, les focus rings restent visibles, les icônes ont `aria-hidden` ou `aria-label` approprié, et les erreurs/toasts sont compréhensibles.

8. **Tests et validation de non-régression**
   - Given cette story touche une zone admin et documentaire sensible,
   - When l'implémentation est terminée,
   - Then les tests couvrent : upload admin dans panneau détail, suppression document avec confirmation, édition réussie, montant > 50k, JSON invalide → 400, non-admin → 403, suppression opportunité, rollback UI en cas d'erreur, et absence d'exposition documentaire aux non-auteurs.
   - And `./node_modules/.bin/prisma validate`, tests ciblés, `npx vitest run`, et `npm run build` passent ou les échecs préexistants hors scope sont documentés.
   - And tout nouveau JSX conditionnel utilise des ternaires, jamais `&&`, avec booléens composés pré-calculés avant le `return`.
   - And aucun fichier binaire DB (`dev.db`, `*.sqlite3`) n'est ajouté au commit.

## Tasks / Subtasks

- [x] **AC1/AC2: Réutiliser et intégrer la gestion documentaire existante dans le panneau admin**
  - [x] Auditer avant modification : `src/components/features/admin/opportunity-detail-sheet.tsx`, `src/components/features/deals/document-upload-section.tsx`, `src/components/features/deals/document-row.tsx`, `src/app/api/opportunities/[id]/documents/**`.
  - [x] Remplacer ou compléter la section documents actuelle du `OpportunityDetailSheet` pour réutiliser `DocumentUploadSection` en mode admin (`canUpload=true`, `canPreview=true`) ou extraire une variante admin qui appelle les mêmes endpoints.
  - [x] Ajouter une confirmation avant suppression de document si l'implémentation actuelle supprime immédiatement.
  - [x] Préserver les endpoints existants : `presign-url`, `POST /documents`, `GET /documents/[documentId]/preview`, `download`, `DELETE /documents/[documentId]`; ne pas créer un second système R2.
  - [x] Vérifier que `DocumentUploadSection` ne reçoit des métadonnées complètes que dans les contextes auteur/admin.

- [x] **AC3/AC4: Ajouter l'édition admin inline**
  - [x] Créer `opportunityAdminUpdateSchema` dans `src/lib/validations.ts` ou réutiliser `opportunityCreateSchema` avec champs adaptés (`title`, `description`, `category`, `amount`, éventuellement `requiredTier`).
  - [x] Ajouter un mode édition dans `OpportunityDetailSheet` avec React Hook Form + `zodResolver`, valeurs initiales depuis l'opportunité sélectionnée, bouton « Éditer », « Enregistrer », « Annuler ».
  - [x] Préserver l'affichage lecture seule actuel quand `isEditing === false`.
  - [x] À la sauvegarde, appeler l'endpoint admin update, mettre à jour l'état local du kanban (`items`) et conserver `router.refresh()` comme dans les actions de statut.
  - [x] Recalculer `requiresDoubleVerification` côté serveur, pas côté client seulement.
  - [x] Si `requiredTier` est inclus, utiliser l'enum Prisma `AFFRANCHI | GRAND_FRERE | BOSS` et des labels français cohérents.

- [x] **AC5/AC6: Créer les endpoints admin update/delete**
  - [x] Ajouter `src/app/api/admin/opportunities/[id]/route.ts` avec `PATCH` et `DELETE` ou justifier explicitement une extension de route existante si choisie.
  - [x] Utiliser `auth()` depuis `@/lib/auth`, vérifier le rôle `ADMIN` via Prisma, retourner `401/403/404/400` structurés en français.
  - [x] Pour `PATCH`, parser `await req.json()` dans un `try/catch` dédié pour retourner `400` sur JSON invalide avant Zod.
  - [x] Mettre à jour uniquement les champs autorisés; ne jamais permettre la modification de `authorId`, `verifiedById`, `verifiedAt`, `reviewNotes`, `rejectionNote`, `createdAt`, ou relations via ce endpoint.
  - [x] Pour `DELETE`, charger les documents avant suppression pour connaître les objets R2 à supprimer après la mutation DB; ne pas exposer les clés R2 dans la réponse.
  - [x] Après suppression DB, tenter `deleteR2Object` pour chaque document si la config R2 est présente; gérer les erreurs sans annuler la suppression DB déjà faite.

- [x] **AC5/AC7: Ajouter la confirmation de suppression d'opportunité côté UI**
  - [x] Utiliser le `Dialog` shadcn existant (`src/components/ui/dialog` si disponible) ou l'ajouter selon les conventions shadcn du projet.
  - [x] Afficher clairement le titre du deal et un message de risque : « Cette action supprimera le deal et ses documents attachés. »
  - [x] Garder le bouton destructif désactivé pendant la mutation et afficher un spinner accessible.
  - [x] Après succès, retirer l'opportunité de `items`, fermer le `Sheet`, fermer le `Dialog`, afficher `toast.success("Opportunité supprimée.")`.
  - [x] En cas d'erreur, conserver le panneau ouvert, rollback l'état local et afficher un toast d'erreur français.

- [x] **AC7: UX/accessibilité et règle JSX**
  - [x] Desktop : conserver le layout `Sheet` existant, sections arrondies, `max-w-2xl`, boutons groupés, aucun débordement horizontal.
  - [x] Mobile : boutons pleine largeur si nécessaire, `min-h-11`, formulaire lisible, Dialog focus-trapped, fermeture possible par « Annuler ».
  - [x] Tous les nouveaux textes UI en français; pas de jargon technique exposé.
  - [x] Pré-calculer les booléens composés (`canShowEditForm`, `shouldShowDeleteDialog`, etc.) avant le JSX.
  - [x] Remplacer tout `condition && <Component />` touché par des ternaires.

- [x] **AC8: Tests ciblés et validation complète**
  - [x] Ajouter `src/app/api/admin/opportunities/[id]/route.test.ts` couvrant auth, role, JSON invalide, validation Zod, update montant/double vérification, delete avec documents.
  - [x] Ajouter/mettre à jour `src/components/features/admin/opportunity-detail-sheet.test.tsx` pour édition, annulation, sauvegarde, suppression document confirmée, suppression opportunité confirmée.
  - [x] Ajouter/mettre à jour `src/components/features/admin/opportunity-kanban-board.test.tsx` pour propagation de l'update/delete dans l'état local.
  - [x] Garder ou ajouter des tests documents (`document-access`, routes documents) pour vérifier qu'un non-auteur non-admin ne reçoit que le compteur côté dashboard.
  - [x] Exécuter `./node_modules/.bin/prisma validate`.
  - [x] Exécuter les tests ciblés ajoutés/modifiés.
  - [x] Exécuter `npx vitest run`.
  - [x] Exécuter `npm run build`.
  - [x] Avant commit dev-story, utiliser `git add -A -- . ':!dev.db' ':!*.sqlite3'` ou ajouter explicitement les fichiers, jamais `git add -A` seul.

## Dev Notes

### Delta scope — ne pas réinventer les documents ni le kanban

Cette story étend des fonctionnalités déjà livrées, elle ne démarre pas from-scratch.

État actuel vérifié dans le codebase :

- `src/app/(admin)/admin/opportunities/page.tsx` charge toutes les opportunités pour admin avec `author`, `verifiedBy`, `documents`, `verificationApprovals`, `_count`, sérialise les dates en ISO et rend `AdminOpportunityKanban`.
- `src/components/features/admin/opportunity-kanban-board.tsx` gère l'état local des cartes, l'ouverture du `OpportunityDetailSheet`, les mutations de statut via `PATCH /api/admin/opportunities/[id]/verify`, les toasts et `router.refresh()`.
- `src/components/features/admin/opportunity-detail-sheet.tsx` affiche déjà titre, description, catégorie, montant, auteur, documents via `DocumentRow`, preview inline PDF/image, actions « Marquer en cours », « Vérifier », « Rejeter ».
- `src/components/features/deals/document-upload-section.tsx` sait déjà uploader via `presign-url`, compléter l'upload, afficher progression, preview/download/delete et respecter `canUpload`/`canPreview`.
- `src/app/api/opportunities/[id]/documents/route.ts` liste/complète les documents pour auteur/admin, valide `r2Key` par pattern UUID + scope opportunity, et sérialise les documents.
- `src/app/api/opportunities/[id]/documents/[documentId]/route.ts` supprime un document DB puis tente de supprimer l'objet R2; `GET` renvoie une URL signée courte durée.
- `src/app/api/opportunities/[id]/documents/presign-url/route.ts` génère la clé R2 côté serveur et l'URL signée PUT.

Implication : la majorité de FR37 est déjà satisfaite techniquement. Le delta principal est de rendre la gestion complète utilisable dans le panneau admin : upload additionnel, suppression confirmée, tests de non-régression, et UX propre.

### Story foundation from Epic 6

Source story 6.3 couvre :

- Admin peut uploader des documents supplémentaires ou supprimer des documents incorrects depuis le panneau détail d'un deal.
- Admin peut éditer titre, description, montant, catégorie.
- Montant > 50 000 € déclenche `requiresDoubleVerification`.
- Admin peut supprimer une opportunité après confirmation.

Cette story couvre FR37 et FR38. FR39 audit logs est explicitement Story 6.4; ne pas inventer une grande infrastructure d'audit ici. Si une trace minimale existe déjà, l'utiliser sans élargir le schéma. Sinon, garder les logs serveur sobres et documenter qu'un audit durable arrive en 6.4.

### Architecture / security guardrails

- Stack réelle : Next.js `16.2.6`, React `19.2.4`, Prisma `7.8.0`, Auth.js `5.0.0-beta.31`, TailwindCSS 4, shadcn/ui, Vitest.
- Prisma 7 : utiliser uniquement le singleton `src/lib/prisma.ts`; ne pas instancier un nouveau PrismaClient.
- Auth.js v5 : utiliser `auth()` depuis `@/lib/auth` côté serveur/API. Ne jamais importer Prisma/bcrypt dans `auth.config.ts` ou middleware Edge.
- Admin routes : rôle `ADMIN`, pas `getUserPremiumAccess()` ni `PremiumAccessBlockedPanel`. Ces derniers concernent les pages membre sous `(dashboard)`.
- Dashboard member premium gate : si une page sous `src/app/(dashboard)/` est touchée, elle doit appeler `getUserPremiumAccess(session.user.id)` et rendre `PremiumAccessBlockedPanel` pour non-abonnés. Ne touchez ces pages que pour corriger une régression documentaire nécessaire.
- Presigned URL security : conserver la validation deux phases (clé serveur + completion validant format et scope). Ne jamais accepter une clé R2 arbitraire du client.
- Conditional metadata exposure : non-auteur non-admin = `documentCount` seulement, jamais tableaux de métadonnées documents.
- Admin PATCH endpoints : input validé avant mutation; JSON invalide → 400; action inconnue → 400 si endpoint à actions.
- State transition side effects : tout effet lié à changement de statut, notification ou email doit vérifier `current !== next`.
- NFR-S8 : ne pas logger titres, descriptions, notes, noms de documents, URLs signées, clés R2, emails complets ou payloads complets. Logs autorisés : IDs/statuts/actions et messages d'erreur génériques.
- Next.js 16 strict JSX : ne jamais utiliser `&&` en position JSX. Utiliser ternaires; pré-calculer les expressions booléennes composées avant `return`.
- Aucun binaire DB en git : ne pas ajouter `dev.db` ou `*.sqlite3`.

### Data model notes

Prisma actuel :

- `Opportunity`: `id`, `authorId`, `title`, `description`, `category`, `amount`, `requiredTier`, `requiresDoubleVerification`, `verificationStatus`, `verifiedAt`, `verifiedById`, `rejectionNote`, `reviewNotes`, `adminNote`, timestamps.
- `VerificationStatus`: `PENDING | EN_COURS | VERIFIED | REJECTED`. Ne pas introduire `IN_REVIEW`; utiliser `EN_COURS` et label UI « En cours ».
- `Document`: `id`, `opportunityId`, `uploadedById`, `fileName`, `originalName`, `mimeType`, `size`, `r2Key @unique`, `publicUrl`, timestamps; relation opportunity avec `onDelete: Cascade`.
- `OpportunityTag`, `OpportunityInterest`, `Review`, `OpportunityVerificationApproval` ont des relations cascade vers `Opportunity`.

Suppression policy pour cette story : utiliser suppression définitive après confirmation admin, car le schéma ne contient pas `deletedAt`. Ne pas ajouter un soft-delete global sauf décision PO explicite; cela toucherait feeds, visibilité, analytics, documents et tests hors scope.

### Existing API and UI contracts to preserve

- Document upload client expects `POST /api/opportunities/[id]/documents/presign-url` response `{ data: { signedUrl, r2Key, fileName, expiresIn } }`.
- Document completion expects `POST /api/opportunities/[id]/documents` with `{ r2Key, fileName, originalName, mimeType, size }` and response `{ data: LegalDocument }`.
- Document preview/download endpoints return signed URL JSON; do not change response shape unless all callers/tests are updated.
- Kanban `patchOpportunity` currently expects admin verify endpoint response `{ data: AdminOpportunity }`. New update/delete handlers should return predictable JSON (`{ data: updatedOpportunity }`, `{ data: { ok: true } }`) and the UI should handle errors consistently.

### UX / accessibility requirements

- UI text in French. Recommended labels: « Éditer », « Enregistrer », « Annuler », « Supprimer », « Supprimer définitivement », « Ajouter un document », « Document supprimé. », « Opportunité mise à jour. », « Opportunité supprimée. ».
- Use existing shadcn `Button`, `Card`, `Sheet`, `Textarea`, and add/reuse `Dialog`, `Input`, `Select` if needed.
- Destructive actions must use destructive styling and confirmation; never immediate irreversible delete from a small icon button.
- Empty state for no documents: « Aucun document juridique joint. » with optional CTA « Ajouter un document » for admin.
- Loading states: disable submit/delete buttons, show `Loader2`, preserve button dimensions.
- Color is never the only status indicator; keep labels visible.
- Mobile: cibles tactiles ≥44px (`min-h-11`), no horizontal overflow, form fields full width.

### Previous Story Intelligence

From Story 6.2:

- Admin dashboard now uses `/admin/dashboard`; `/admin` is an alias/redirect. Preserve existing navigation links to `/admin/opportunities`, `/admin/subscriptions`, `/admin/dashboard`.
- Admin pages do not use premium access gates; they use `auth()` + Prisma role check.
- Tests should use pure helpers where useful and avoid brittle UI assertions.
- Existing validation results: `prisma validate`, targeted tests, full `npx vitest run`, and `npm run build` passed; `npm run lint` had pre-existing unrelated issues. Do not broaden lint cleanup unless a new issue is introduced.

From Story 6.1:

- Kanban is a delta over Story 3.3; prefer targeted regression hardening over redesign.
- The status enum is `EN_COURS`, not `IN_REVIEW`.
- Idempotence guard was added to status transition side effects. Do not regress it.
- `/admin/subscriptions` is out of scope and must remain accessible.

From Stories 3.2/3.3:

- Story 3.2 review found and patched sensitive document metadata exposure and client-trusted R2 keys. This story must not reintroduce either issue.
- Story 3.3 review found and patched invalid JSON handling and unknown action behavior on admin PATCH. Mirror that robustness in any new endpoint.
- `DocumentRow`, `DocumentUploadSection`, R2 utilities, and document access helpers are the source of truth. Reuse them.
- Do not include `dev.db` in commits; prior review had to revert it.

### Git Intelligence Summary

Recent commits before this story:

- `6d1c98b chore: complete review for story 6.2`
- `2ecac03 chore(bmad): mark story 6-2 ready for review`
- `4cb28d7 feat(admin): add analytics dashboard metrics`
- `e3e73fe docs(bmad): create story 6-2 métriques clés et analytics admin`
- `d92e424 chore(bmad): mark story 6-1 done — review PASS`

Pattern to follow: story context commit first, implementation commit later, review/status commit after validation. Keep BMAD artifacts and code changes scoped; avoid broad refactors.

### Latest Tech Information

`npm view` on 2026-05-21 returned: Next `16.2.6`, React latest `19.2.6`, Prisma `7.8.0`, next-auth stable query returns v4 `4.24.14` while this project intentionally uses Auth.js v5 beta `5.0.0-beta.31`, Zod `4.4.3`, React Hook Form `7.76.0` while project uses `^7.75.0`.

Do not upgrade dependencies in this story. Follow `package.json` and existing patterns to reduce brownfield risk.

### Project Structure Notes

Files likely to touch:

- `src/components/features/admin/opportunity-detail-sheet.tsx` — primary UI delta for documents/edit/delete.
- `src/components/features/admin/opportunity-kanban-board.tsx` — update local state handling for update/delete and pass callbacks.
- `src/app/api/admin/opportunities/[id]/route.ts` — likely new admin update/delete endpoint.
- `src/lib/validations.ts` — add admin update schema if needed.
- `src/components/features/deals/document-upload-section.tsx` — only if confirmation/behavior extension is needed; preserve existing public contract.
- `src/app/api/opportunities/[id]/documents/[documentId]/route.ts` — only if confirmation semantics or tests reveal a server gap; client-side confirmation is preferred.
- Tests: `src/app/api/admin/opportunities/[id]/route.test.ts`, `src/components/features/admin/opportunity-detail-sheet.test.tsx`, `src/components/features/admin/opportunity-kanban-board.test.tsx`, existing document tests as needed.

Files to avoid unless strictly necessary:

- `src/app/(dashboard)/**` member pages, except to fix metadata exposure regressions.
- `prisma/schema.prisma`, unless a schema gap is discovered and approved by story requirements. Soft delete is not required.
- `src/app/api/admin/opportunities/[id]/verify/route.ts`, unless update/delete can safely share helpers without changing status workflow behavior.

### Testing Requirements

Minimum validation expected before dev-story completion:

- `./node_modules/.bin/prisma validate`
- Targeted API tests for new admin update/delete route.
- Targeted component tests for `OpportunityDetailSheet` edit/delete/document actions.
- Existing kanban tests if state behavior changes.
- Relevant document access/security tests.
- `npx vitest run`
- `npm run build`

If `npm run lint` is run, document pre-existing unrelated lint warnings separately and fix any lint introduced by this story.

### References

- `_bmad-output/planning-artifacts/epics.md` lines 1013-1094: Epic 6 objective and Story 6.3 AC.
- `_bmad-output/planning-artifacts/prd.md` lines 308-315: FR37/FR38 admin document management and opportunity editing/deletion.
- `_bmad-output/planning-artifacts/architecture.md` lines 71-87: brownfield stack and Auth.js/Prisma/Next.js constraints.
- `_bmad-output/planning-artifacts/architecture.md` lines 192-216: API response/error patterns.
- `_bmad-output/planning-artifacts/architecture.md` lines 369-400: JSX guardrail, idempotent state-transition side effects, upload security patterns.
- `_bmad-output/planning-artifacts/architecture.md` lines 520-537: Prisma-only data boundary and R2 integration.
- `_bmad-output/planning-artifacts/ux-spec.md` lines 697-716: admin kanban detail panel and document viewer expectations.
- `_bmad-output/planning-artifacts/ux-spec.md` lines 948-967: Dialog/Sheet/modal patterns.
- `_bmad-output/planning-artifacts/ux-spec.md` lines 1003-1116: responsive and accessibility strategy.
- `_bmad-output/implementation-artifacts/3-2-upload-et-attachement-de-documents-juridiques.md`: existing document upload/R2 implementation and review learnings.
- `_bmad-output/implementation-artifacts/3-3-workflow-kanban-de-verification-admin.md`: existing admin kanban/detail sheet implementation.
- `_bmad-output/implementation-artifacts/6-1-tableau-de-bord-kanban-des-opportunites.md`: Epic 6 kanban hardening and idempotence patterns.
- `_bmad-output/implementation-artifacts/6-2-metriques-cles-et-analytics-admin.md`: latest admin dashboard/navigation and validation learnings.

## Dev Agent Record

### Agent Model Used

Hermes Agent (gpt-5.5)

### Debug Log References

- 2026-05-21: Loaded BMAD workflow, story, architecture, sprint status, and audited existing admin/detail/document code before implementation.
- 2026-05-21: Validations run: `./node_modules/.bin/prisma validate`; targeted `npx vitest run src/app/api/admin/opportunities/[id]/route.test.ts src/components/features/admin/opportunity-kanban-board.test.tsx`; full `npx vitest run`; `npm run build`.

### Completion Notes List

- Integrated admin document management in the opportunity detail Sheet by reusing `DocumentUploadSection` with upload, preview, download, and confirmed deletion via existing Story 3.2 document endpoints.
- Added admin inline edit flow using React Hook Form + Zod, French labels/errors, loading states, local kanban update propagation, and server-side double-verification recalculation.
- Added `PATCH`/`DELETE /api/admin/opportunities/[id]` with auth/admin checks, malformed JSON handling, Zod validation, scoped field updates, hard delete, cascade reliance, and generic R2 cleanup logging.
- Added destructive confirmation dialog for opportunity deletion with optimistic local removal, rollback on error, Sheet close on success, and French toasts.
- Preserved document metadata security boundaries: no new public document endpoint; admin uses existing authorized document endpoints, dashboard files untouched.
- Added/expanded tests for admin route auth/validation/update/delete, amount threshold/compliance preservation, inline editing success/error, opportunity deletion, and document deletion confirmation true/false paths.

### File List

- _bmad-output/implementation-artifacts/6-3-gestion-des-documents-et-edition-des-opportunites.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- src/app/(admin)/admin/opportunities/page.tsx
- src/app/api/admin/opportunities/[id]/route.ts
- src/app/api/admin/opportunities/[id]/route.test.ts
- src/components/features/admin/opportunity-detail-sheet.tsx
- src/components/features/admin/opportunity-kanban-board.tsx
- src/components/features/admin/opportunity-kanban-board.test.tsx
- src/components/features/deals/document-upload-section.tsx
- src/lib/validations.ts

### Change Log

- 2026-05-21: Implemented Story 6.3 admin document management, opportunity edit/delete endpoints and UI, regression tests, and validation updates.
