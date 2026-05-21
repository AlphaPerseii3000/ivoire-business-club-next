---
Story: "6.1"
StoryKey: "6-1-tableau-de-bord-kanban-des-opportunites"
Title: "Tableau de Bord Kanban des Opportunités"
Status: "done"
Priority: "P1"
Epic: "Epic 6 — Administration et Back-office"
FRs: ["FR35", "FR44"]
NFRs: ["NFR-P2", "NFR-S5", "NFR-S8", "NFR-A1", "NFR-A3"]
UXDRs: ["UX-DR24", "UX-DR25", "UX-DR26", "UX-DR34"]
Created: "2026-05-21"
---

# Story 6.1: Tableau de Bord Kanban des Opportunités

Status: done

<!-- Note: DELTA story. Story 3.3 already delivered most of the admin opportunity kanban. Implement only the gaps and regression hardening listed below. -->

## Story

En tant qu'administrateur IBC,
je veux visualiser toutes les opportunités dans un tableau kanban par statut,
afin de prioriser et traiter les vérifications efficacement.

## Acceptance Criteria

1. **Kanban opportunités à quatre statuts**
   - Given l'admin authentifié avec rôle `ADMIN` sur `/admin/opportunities`,
   - When il consulte le tableau de bord,
   - Then quatre colonnes desktop s'affichent dans cet ordre : `PENDING`, `EN COURS`, `VERIFIED`, `REJECTED` (FR35), avec libellés français.
   - And les cartes sont alimentées par toutes les opportunités existantes, triées par date de création décroissante.

2. **Passage d'une carte de `PENDING` à `EN COURS`**
   - Given une carte dans la colonne `PENDING`,
   - When l'admin utilise l'action accessible de déplacement vers `EN COURS` (bouton « En cours » ou équivalent drag-and-drop si déjà choisi),
   - Then `PATCH /api/admin/opportunities/[id]/verify` persiste le statut Prisma `EN_COURS` en base.
   - And l'admin voit un toast de confirmation.
   - And la carte passe optimistiquement puis définitivement dans la colonne `EN COURS`.
   - And l'action est idempotente : si le statut cible est déjà le statut courant, aucune note de revue, email, notification ou autre effet secondaire n'est dupliqué.

3. **Responsive mobile avec liste empilée et chips de filtre**
   - Given l'admin sur mobile,
   - When il consulte le kanban,
   - Then il voit une liste empilée avec des chips de filtre par statut en haut (UX-DR34).
   - And chaque chip affiche le libellé du statut et son compteur.
   - And les cibles tactiles des chips/actions sont au moins `44px` de hauteur ou largeur utile.
   - And aucune interaction drag-and-drop n'est requise sur mobile.

4. **Compteurs et scroll vertical par colonne**
   - Given le kanban desktop,
   - When une colonne contient plus de 20 deals,
   - Then un compteur visible reste en haut de la colonne.
   - And la liste de cartes de la colonne est scrollable verticalement sans faire disparaître les autres colonnes.
   - And l'état vide reste visible pour les colonnes sans deal.

5. **Navigation admin cohérente avec abonnements sans élargir le scope**
   - Given l'objectif d'Epic 6 mentionne opportunités et abonnements,
   - When l'admin utilise `/admin/opportunities`,
   - Then la story ne recrée pas un kanban abonnements hors scope.
   - And elle préserve `/admin/subscriptions` et la navigation admin existante vers « Abonnements ».
   - And si un switcher local « Opportunités | Abonnements » est ajouté pour respecter l'UX spec, il doit être un simple lien/onglet de navigation vers la page abonnements existante, pas une nouvelle implémentation de workflow abonnements.

6. **Regression et validation**
   - Given cette story complète une fonctionnalité brownfield déjà livrée en Story 3.3,
   - When l'implémentation est terminée,
   - Then les tests ciblés du kanban et de l'endpoint admin couvrent les deltas ci-dessus.
   - And `./node_modules/.bin/prisma validate`, les tests ciblés, `npx vitest run`, et `npm run build` passent ou les échecs préexistants hors scope sont documentés.
   - And tout nouveau JSX conditionnel utilise des ternaires, jamais `&&`, avec les booléens composés pré-calculés avant le `return`.

## Tasks / Subtasks

- [ ] **AC1: Auditer et préserver le kanban existant**
  - [ ] Confirmer que `src/app/(admin)/admin/opportunities/page.tsx` garde le contrôle d'accès admin : `auth()`, redirect signin si non authentifié, lookup Prisma `role === "ADMIN"`, redirect `/dashboard` si non admin.
  - [ ] Préserver le chargement server-side de toutes les opportunités avec `author`, `documents`, `verificationApprovals`, `_count`, et la sérialisation ISO des dates.
  - [ ] Préserver l'ordre des statuts dans `src/components/features/admin/opportunity-kanban-board.tsx` : `PENDING`, `EN_COURS`, `VERIFIED`, `REJECTED`.
  - [ ] Ne pas renommer l'enum DB en `IN_REVIEW`; dans ce codebase le statut persistant requis est `EN_COURS`, même si l'AC source dit `IN_REVIEW`.

- [ ] **AC2: Durcir l'action accessible `PENDING → EN_COURS`**
  - [ ] Garder l'approche bouton/clic-pour-déplacer comme implémentation acceptable et plus accessible que le drag-and-drop obligatoire ; n'ajouter une librairie DnD que si le Product Owner exige explicitement un geste de drag littéral.
  - [ ] Vérifier que le bouton « En cours » sur une carte `PENDING` appelle `runAction(item, "start_review")`, puis `PATCH` avec `{ action: "start_review" }`.
  - [ ] Ajouter ou ajuster les tests pour garantir que la réponse API persiste `verificationStatus: "EN_COURS"` et que le toast succès est déclenché côté UI.
  - [ ] Corriger l'idempotence dans `src/app/api/admin/opportunities/[id]/verify/route.ts` si nécessaire : lorsque `currentStatus === effectiveNextStatus`, ne pas appeler `appendReviewNote`, `appendDoubleVerificationNote`, email, notifications ou autre effet secondaire.
  - [ ] Garder la validation Zod via `opportunityAdminActionSchema` avant mutation et les erreurs françaises structurées.

- [ ] **AC3: Vérifier et compléter le mobile responsive**
  - [ ] Confirmer que la vue `lg:hidden` affiche bien les chips horizontales scrollables et la liste empilée du statut actif.
  - [ ] Ajouter/renforcer tests UI pour : chips `PENDING`, `EN COURS`, `VERIFIED`, `REJECTED`; compteur par chip; changement de filtre; état vide mobile.
  - [ ] Vérifier les classes `min-h-11`/espacements sur chips et actions pour respecter les cibles tactiles.
  - [ ] Préserver le panneau détail mobile existant via `OpportunityDetailSheet`; ne pas réécrire le panneau sauf bug bloquant découvert.

- [ ] **AC4: Vérifier et tester compteurs + scroll de colonnes**
  - [ ] Confirmer que chaque colonne desktop affiche un compteur près du titre.
  - [ ] Confirmer que la liste de cartes utilise un conteneur scrollable (`overflow-y-auto`) avec hauteur contrainte.
  - [ ] Ajouter un test avec plus de 20 opportunités dans un même statut pour vérifier que le compteur affiche le bon total et que la classe scrollable est présente.
  - [ ] Préserver les états vides par colonne : « Aucun deal en attente », « Aucun deal en cours », « Aucun deal vérifié », « Aucun deal refusé ».

- [ ] **AC5: Clarifier la relation avec les abonnements sans scope creep**
  - [ ] Préserver `src/app/(admin)/admin/layout.tsx` qui contient déjà le lien `/admin/subscriptions`.
  - [ ] Vérifier que `/admin/subscriptions` continue d'assurer le traitement des virements bancaires via `AdminSubscriptionActions` et `PATCH /api/admin/subscriptions/[id]`.
  - [ ] Si la page opportunités reçoit un switcher local, implémenter uniquement des liens accessibles vers `/admin/opportunities` et `/admin/subscriptions` ; ne pas créer de nouveau modèle, nouveau statut, ou kanban abonnements dans cette story.

- [ ] **AC6: Tests et validation**
  - [ ] Ajouter/mettre à jour `src/components/features/admin/opportunity-kanban-board.test.tsx` pour les colonnes desktop, chips mobile, compteur, scroll, état vide, et action `PENDING → EN_COURS`.
  - [ ] Ajouter/mettre à jour `src/app/api/admin/opportunities/[id]/verify/route.test.ts` pour l'idempotence et la transition `start_review`.
  - [ ] Exécuter `./node_modules/.bin/prisma validate`.
  - [ ] Exécuter les tests ciblés du kanban et de l'API admin.
  - [ ] Exécuter `npx vitest run`.
  - [ ] Exécuter `npm run build`.
  - [ ] Documenter dans le Dev Agent Record tout échec préexistant sans l'inclure dans le scope de correction.

## Dev Notes

### Delta scope — Story 3.3 existe déjà

Cette story n'est pas une implémentation from-scratch. Story 3.3 a déjà livré le workflow kanban de vérification admin et son fichier est marqué `done`. Le code actuel inclut déjà :

- `src/app/(admin)/admin/opportunities/page.tsx` : Server Component admin qui charge toutes les opportunités avec `author`, `documents`, `verificationApprovals`, `_count`, sérialise les dates et rend `<AdminOpportunityKanban>`.
- `src/components/features/admin/opportunity-kanban-board.tsx` : Client Component avec les quatre statuts, cartes, action « En cours », mise à jour optimiste, `toast.success`, rollback en cas d'erreur, vue mobile avec chips, vue desktop en 4 colonnes.
- `src/components/features/admin/opportunity-detail-sheet.tsx` : panneau de détail et actions de vérification/refus.
- `src/app/api/admin/opportunities/[id]/verify/route.ts` : endpoint `PATCH` validé par Zod avec `normalizeAction`, `isAllowedTransition`, support `start_review`, `move`, `verify`, `reject`, et double vérification.
- `src/lib/validations.ts` : `opportunityAdminActionSchema` et `VerificationStatusInput`.
- `src/components/features/admin/opportunity-status-badge.tsx` : badges de statut français.
- `src/app/(admin)/admin/layout.tsx` : navigation admin avec lien `/admin/opportunities` et `/admin/subscriptions`.
- Prisma `Opportunity.verificationStatus` : enum `PENDING | EN_COURS | VERIFIED | REJECTED`.

Les tâches de développement doivent donc cibler uniquement les écarts : tests/régression mobile, test compteur/scroll, clarification `EN_COURS` vs `IN_REVIEW`, idempotence de transition, et navigation/scope abonnements.

### Décisions produit à respecter

- **Drag-and-drop littéral non obligatoire par défaut.** L'UX spec autorise « Drag-and-drop or click-to-move between columns ». Le bouton « En cours » est plus accessible, testable, et mobile-friendly. N'ajouter `@dnd-kit/*` que sur demande PO explicite.
- **Statut DB : `EN_COURS`, pas `IN_REVIEW`.** Les AC source utilisent `IN_REVIEW`, mais le modèle Prisma réel et Story 3.3 utilisent `EN_COURS`. Le libellé UI reste « En cours ».
- **Abonnements hors scope d'implémentation kanban.** Epic 6 mentionne opportunités et abonnements ; Story 6.1 est nommée et rédigée pour les opportunités. La page `/admin/subscriptions` existe déjà pour abonnements. Éviter tout redesign majeur des abonnements dans cette story.

### Contraintes architecture / sécurité

- Admin pages utilisent le rôle `ADMIN`; elles ne doivent pas appeler `getUserPremiumAccess()` ni `PremiumAccessBlockedPanel`, contrairement aux routes dashboard membres.
- Auth.js v5 : utiliser `auth()` depuis `@/lib/auth` côté serveur/API ; ne pas importer Prisma/bcrypt dans middleware ou `auth.config.ts`.
- Prisma 7 : utiliser le singleton `src/lib/prisma.ts`; ne pas instancier un second client.
- API protégée admin : session obligatoire, rôle `ADMIN`, validation Zod avant mutation, erreurs JSON françaises.
- NFR-S8 : ne pas logger titres, descriptions, notes, URLs signées, documents ou payloads complets. Logs autorisés : IDs/statuts/actions.
- Idempotence : les effets secondaires de transition doivent tester l'ancien statut vs le nouveau statut (`currentStatus !== effectiveNextStatus`) avant notification/email/note/audit enrichi.

### UX / accessibilité

- Tous les textes visibles doivent rester en français.
- Desktop ≥1024px : `lg:grid-cols-4`, quatre colonnes, compteur en haut, liste scrollable, cartes compactes.
- Mobile : chips de filtre statut, liste empilée, pas de drag obligatoire, touch targets ≥44px.
- Status badges : ne pas dépendre uniquement de la couleur ; garder le texte visible.
- Nouveaux rendus JSX : pas de `&&`; utiliser des ternaires et pré-calculer les booléens composés.

### Project Structure Notes

- Page admin opportunités : `src/app/(admin)/admin/opportunities/page.tsx`.
- Kanban : `src/components/features/admin/opportunity-kanban-board.tsx`.
- Panneau détail : `src/components/features/admin/opportunity-detail-sheet.tsx`.
- Badges : `src/components/features/admin/opportunity-status-badge.tsx`.
- Endpoint transitions : `src/app/api/admin/opportunities/[id]/verify/route.ts`.
- Tests existants attendus : `src/components/features/admin/opportunity-kanban-board.test.tsx`, `src/app/api/admin/opportunities/[id]/verify/route.test.ts`.
- Page abonnements à préserver : `src/app/(admin)/admin/subscriptions/page.tsx`.
- Actions abonnements à préserver : `src/components/admin-subscription-actions.tsx`, `src/app/api/admin/subscriptions/[id]/route.ts`.

### References

- `_bmad-output/planning-artifacts/epics.md` lignes 1015-1041 : objectif Epic 6 et AC Story 6.1.
- `_bmad-output/planning-artifacts/prd.md` lignes 308-315 : FR35-FR40 Administration & Back-office.
- `_bmad-output/planning-artifacts/architecture.md` lignes 71-87 : stack brownfield et contraintes Auth.js/Prisma/Next.js.
- `_bmad-output/planning-artifacts/architecture.md` lignes 180-216 : autorisation admin et patterns API.
- `_bmad-output/planning-artifacts/architecture.md` lignes 369-390 : guardrail JSX et idempotence des transitions.
- `_bmad-output/planning-artifacts/ux-spec.md` lignes 697-716 : Admin Kanban Dashboard desktop/mobile, click-to-move accepté.
- `_bmad-output/implementation-artifacts/3-3-workflow-kanban-de-verification-admin.md` : story antérieure déjà livrée, code et tests à préserver.
- `_bmad-output/implementation-artifacts/deferred-work.md` : éléments différés hors scope.

## Dev Agent Record

### Agent Model Used

Hermes Agent (gpt-5.5)

### Debug Log References

- `./node_modules/.bin/prisma validate` — PASS
- `npx vitest run src/components/features/admin/opportunity-kanban-board.test.tsx src/app/api/admin/opportunities/[id]/verify/route.test.ts` — PASS (20)
- `npx vitest run` — PASS (374)
- `npm run build` — PASS

### Completion Notes List

- Added an idempotence guard in the admin opportunity verification PATCH route so same-status transitions return without update, review-note append, approval creation, email, or notification side effects.
- Verified the existing kanban mobile chips/list and desktop column counter/scroll implementation; added stable test IDs for counter/scroll assertions without changing UX.
- Expanded targeted UI/API tests for mobile chips, counters, scroll containers, empty states, `PENDING → EN_COURS`, success toast, and idempotent transition side-effect prevention.
- Confirmed admin page preserves role-based access and server-side opportunity loading; subscriptions remain out of scope and available through existing admin navigation.

### File List

- `src/app/api/admin/opportunities/[id]/verify/route.ts`
- `src/app/api/admin/opportunities/[id]/verify/route.test.ts`
- `src/components/features/admin/opportunity-kanban-board.tsx`
- `src/components/features/admin/opportunity-kanban-board.test.tsx`
- `_bmad-output/implementation-artifacts/6-1-tableau-de-bord-kanban-des-opportunites.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Change Log

- 2026-05-21: Story created as ready-for-dev with delta scope focused on existing Story 3.3 kanban hardening.
- 2026-05-21: Implemented delta hardening for idempotent transitions, kanban regression tests, validation/build verification; status moved to review.

### Review Findings

**Verdict: PASS**

- **AC1 — PASS:** `/admin/opportunities` preserves ADMIN role gating, redirects unauthenticated/non-admin users appropriately, loads all opportunities server-side with required relations/counts, serializes dates, and preserves status order `PENDING`, `EN_COURS`, `VERIFIED`, `REJECTED`.
- **AC2 — PASS:** The `PENDING → EN_COURS` button path still sends `PATCH /api/admin/opportunities/[id]/verify` with `{ action: "start_review" }`; the API validates input, persists `EN_COURS`, and now returns early for `currentStatus === nextStatus` without update, review-note append, approval creation, email, notification, or matched-member side effects.
- **AC3 — PASS:** Mobile chips/list are preserved with French labels, counters, `min-h-11` touch target class, filter switching coverage, and no drag-and-drop requirement.
- **AC4 — PASS:** Desktop columns preserve visible counters, per-column scroll containers with constrained height and `overflow-y-auto`, and empty states; the new test covers 21 pending deals.
- **AC5 — PASS:** Admin subscriptions navigation remains a link in the existing admin layout; no subscription kanban or out-of-scope workflow was introduced.
- **AC6 — PASS:** Targeted and full validation passed. New JSX in the reviewed diff does not introduce JSX `&&`; no binary DB files are included in `ed964fd..9336eec`; code and BMAD status changes follow the expected two-commit pattern (`e9f8459` code, `9336eec` status).

Validation run during review:

- `./node_modules/.bin/prisma validate` — PASS.
- `npx vitest run src/components/features/admin/opportunity-kanban-board.test.tsx src/app/api/admin/opportunities/[id]/verify/route.test.ts` — PASS (20 tests).
- `npx vitest run` — PASS (374 tests).
- `npm run build` — PASS (Next.js build completed; only existing informational warnings about middleware convention and missing rate-limit env vars).

Blockers: none.

Next BMAD step: Story 6.1 is done; proceed to Story 6.2.
