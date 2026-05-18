---
Story: "3.3"
StoryKey: "3-3-workflow-kanban-de-verification-admin"
Title: "Workflow Kanban de Vérification Admin"
Status: review
Priority: "P0"
Epic: "Epic 3 — Marketplace d'Opportunités et Vérification"
FRs: ["FR17", "FR18", "FR19", "FR35", "FR37", "FR39", "FR44"]
NFRs: ["NFR-P2", "NFR-S5", "NFR-S8", "NFR-A1", "NFR-A3", "NFR-I2", "NFR-I3"]
UXDRs: ["UX-DR34", "UX-DR8", "UX-DR13", "UX-DR19", "UX-DR20", "UX-DR31"]
Created: "2026-05-18"
---

# Story 3.3: Workflow Kanban de Vérification Admin

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

En tant qu'administrateur IBC,
je veux gérer les opportunités en attente via un tableau kanban,
afin de vérifier ou rejeter les deals efficacement.

## Acceptance Criteria

1. **Kanban admin à quatre colonnes**
   - Given l'admin sur `/admin/opportunities`,
   - When il consulte le tableau kanban,
   - Then quatre colonnes s'affichent : `PENDING` | `EN COURS` | `VERIFIED` | `REJECTED` (FR35).

2. **Interaction desktop ≥ 1024px**
   - Given l'admin sur desktop (≥ 1024px),
   - When il interagit avec le kanban,
   - Then il voit un layout grid 4 colonnes avec drag-and-drop ou clic-pour-déplacer entre colonnes.

3. **Interaction mobile**
   - Given l'admin sur mobile,
   - When il consulte le kanban,
   - Then il voit une liste empilée avec des chips de filtre par statut (UX-DR34).

4. **Détail deal avec documents et actions**
   - Given une carte deal dans la colonne `PENDING`,
   - When l'admin clique sur la carte,
   - Then un panneau de détail slide-in (desktop) ou page plein écran (mobile) s'ouvre avec :
     - Titre, description, catégorie, montant ;
     - Auteur (avatar + nom) ;
     - Documents juridiques avec preview inline ;
     - Boutons « Vérifier » (vert) et « Rejeter » (rouge) avec champ de note.

5. **Validation d'un deal**
   - Given l'admin clique sur « Vérifier »,
   - When le deal est validé,
   - Then la carte passe en `VERIFIED`, le promoteur est notifié, et le deal apparaît dans les feeds membres.

6. **Refus d'un deal avec note privée**
   - Given l'admin clique sur « Rejeter » avec une note,
   - When le deal est rejeté,
   - Then la carte passe en `REJECTED`, le promoteur voit la note privativement, et le deal est invisible aux autres membres (FR18).

## Tasks / Subtasks

- [x] Mettre à jour le modèle Prisma et migrer les statuts de vérification (AC: #1, #5, #6)
  - [x] Ajouter `EN_COURS` à l'enum Prisma `VerificationStatus` dans `prisma/schema.prisma` entre `PENDING` et `VERIFIED`.
  - [x] Ajouter un champ `rejectionNote String?` sur `Opportunity` pour stocker la note privée du refus.
  - [x] Vérifier l'impact du partage actuel de `VerificationStatus` entre `User.verificationStatus` et `Opportunity.verificationStatus`; ne pas afficher `EN_COURS` comme statut utilisateur dans les pages profil/membres.
  - [x] Créer et appliquer une migration Prisma, puis exécuter `npx prisma generate`.
  - [x] Mettre à jour tous les mappings UI de statut (`PENDING`, `EN_COURS`, `VERIFIED`, `REJECTED`) avec labels français : « En attente », « En cours », « Vérifié », « Refusé ».

- [x] Corriger la visibilité membre pour ne publier que les deals vérifiés (AC: #5, #6)
  - [x] Modifier `src/app/(dashboard)/opportunities/page.tsx` pour lister uniquement les opportunités `VERIFIED` pour les membres non auteurs.
  - [x] Autoriser l'auteur à voir ses propres opportunités `PENDING`, `EN_COURS` et `REJECTED` dans son espace privé, avec la note de refus uniquement pour lui.
  - [x] Modifier `src/app/(dashboard)/opportunities/[id]/page.tsx` pour empêcher un membre non auteur de consulter un deal non `VERIFIED` (`notFound()` ou panneau d'accès refusé en français).
  - [x] Afficher `rejectionNote` uniquement si `session.user.id === opportunity.author.id` ou si l'utilisateur est `ADMIN`; ne jamais la rendre dans les feeds publics/membres.

- [x] Remplacer la liste admin plate par un Kanban responsive (AC: #1, #2, #3)
  - [x] Remplacer `src/app/(admin)/admin/opportunities/page.tsx` par une page serveur qui charge les opportunités avec `author`, `_count.documents`, `documents`, `verifiedBy` si nécessaire, puis passe des données sérialisées à un composant client.
  - [x] Créer `src/components/features/admin/opportunity-kanban-board.tsx` ou `src/components/features/admin/admin-opportunity-kanban.tsx` (client component) pour l'UI interactive.
  - [x] Desktop `lg:` : utiliser un grid 4 colonnes (`lg:grid-cols-4`) avec colonnes verticalement scrollables, cartes compactes : titre, auteur/avatar, montant, catégorie, date soumission, nombre de documents, badge statut.
  - [x] Mobile : afficher des chips de filtre statut en haut, puis une liste empilée de cartes du statut actif. Les chips doivent être focusables, avoir un état actif visible, et des labels français.
  - [x] Prévoir un état vide par colonne : « Aucun deal en attente », « Aucun deal en cours », etc.
  - [x] Respecter la règle projet Next.js 16 strict : en JSX, utiliser `condition ? <Comp /> : null`, jamais `condition && <Comp />`.

- [x] Implémenter le déplacement de statut depuis le Kanban (AC: #2, #5, #6)
  - [x] Mettre à jour `src/app/api/admin/opportunities/[id]/verify/route.ts` pour accepter `PATCH` JSON avec Zod :
    - `{ action: "move", status: "PENDING" | "EN_COURS" | "VERIFIED" | "REJECTED", note?: string }`, ou
    - `{ action: "verify" }`, `{ action: "reject", note: string }`.
  - [x] Conserver temporairement le `POST` form actuel uniquement si nécessaire pour compatibilité, mais la nouvelle UI doit utiliser `PATCH` JSON.
  - [x] Vérifier session avec `auth()` depuis `@/lib/auth`, vérifier rôle `ADMIN` via Prisma, retourner `401/403` en français.
  - [x] Valider les transitions : `PENDING ↔ EN_COURS`, `EN_COURS → VERIFIED`, `EN_COURS → REJECTED`, et permettre `PENDING → VERIFIED/REJECTED` depuis le panneau d'action. Refuser les transitions incohérentes avec `409 INVALID_TRANSITION`.
  - [x] Pour `VERIFIED` : renseigner `verifiedAt = new Date()`, `verifiedById = session.user.id`, vider `rejectionNote`, notifier l'auteur, et rendre le deal éligible aux feeds membres.
  - [x] Pour `REJECTED` : renseigner `verifiedAt = null`, `verifiedById = null`, stocker `rejectionNote` obligatoire, notifier l'auteur, garder le deal invisible aux autres membres.
  - [x] Pour `EN_COURS` : ne pas renseigner `verifiedAt`; conserver l'auteur/verifier si aucune décision finale n'est prise.
  - [x] Logger uniquement des IDs/statuts/action ; ne jamais logger les titres sensibles, documents, notes complètes ou URLs signées (NFR-S8).

- [x] Construire le panneau de détail admin avec documents inline (AC: #4)
  - [x] Utiliser shadcn `Sheet` pour desktop slide-in depuis la droite ; sur mobile, utiliser une vue plein écran dans le même composant (ex. `fixed inset-0` ou Sheet adaptée) avec bouton « Fermer » accessible.
  - [x] Afficher toutes les informations en français : titre, description, catégorie, montant formaté `fr-FR`, date, auteur avec `Avatar` shadcn (fallback initiales), email admin-only si utile.
  - [x] Réutiliser `DocumentRow` et/ou les endpoints Story 3.2 pour preview/téléchargement : `GET /api/opportunities/[id]/documents/[documentId]/preview` et `download` vérifient déjà auteur/admin.
  - [x] Prévoir preview inline : PDF dans `<iframe>`/`object`, image dans `<img>`/`next/image` si approprié, fallback « Télécharger ».
  - [x] Afficher le compteur documents et un état vide « Aucun document juridique joint ».
  - [x] Les actions « Vérifier » et « Rejeter » doivent être visibles dans le panneau ; le champ note est obligatoire avant rejet et peut être optionnel/commentaire interne avant vérification si non stocké.

- [x] Ajouter notifications email promoteur (AC: #5, #6)
  - [x] Étendre `src/lib/email.ts` avec `sendOpportunityVerifiedEmail` et `sendOpportunityRejectedEmail` en réutilisant le client Resend existant, `getSender()`, `APP_URL`, et les conventions françaises.
  - [x] Email vérification : sujet « Votre deal IBC est vérifié », inclure titre du deal et lien vers le dashboard si `APP_URL` est configuré.
  - [x] Email refus : sujet « Votre deal IBC nécessite des corrections », inclure la note privée de l'admin et un lien vers le deal privé/auteur.
  - [x] Si l'email échoue après mutation DB, retourner un code explicite `EMAIL_FAILED` comme le fait l'API abonnements, ou documenter/implémenter une stratégie non bloquante cohérente. Ne pas masquer silencieusement l'échec.

- [x] Validation formulaire avec React Hook Form + Zod pour les actions admin (AC: #4, #6)
  - [x] Ajouter un schéma Zod dans `src/lib/validations.ts` ou localement au composant/API pour `opportunityAdminActionSchema`, avec `note` min 1 pour rejet.
  - [x] Utiliser React Hook Form + `zodResolver` pour le champ de note du panneau de détail.
  - [x] Garder le workaround connu Zod v4 + RHF v7 si TypeScript le demande (`zodResolver(...) as any` accepté dans les histoires précédentes, mais limiter sa portée).
  - [x] Afficher erreurs inline en français et désactiver les boutons pendant la mutation.

- [x] Tests et vérifications (AC: #1-#6)
  - [x] Ajouter tests unitaires/API pour `PATCH /api/admin/opportunities/[id]/verify` : non authentifié, non admin, transition vers `EN_COURS`, validation `VERIFIED`, rejet sans note refusé, rejet avec note stockée, transitions invalides.
  - [x] Ajouter tests de visibilité membre : feed membre ne contient que `VERIFIED`; auteur voit ses propres deals refusés avec note privée; membre non auteur ne voit pas la note.
  - [x] Ajouter tests UI Kanban si l'infrastructure React Testing Library suffit : 4 colonnes desktop, chips mobile, ouverture panneau, validation du champ note.
  - [x] Exécuter `npm run build`, `npx vitest run`, `./node_modules/.bin/prisma validate`, et si possible `npm run lint` (noter les lint préexistants sans les mélanger avec cette story).

## Dev Notes

### Contexte existant à préserver

- `prisma/schema.prisma` contient déjà `Opportunity` avec `verificationStatus`, `verifiedById`, `verifiedAt`, `requiresDoubleVerification`, relation `author`, relation `verifiedBy`, et relation `documents`. Le statut `EN_COURS` et la note privée de rejet n'existent pas encore.
- `VerificationStatus` est actuellement partagé par `User.verificationStatus` et `Opportunity.verificationStatus`. L'ajout de `EN_COURS` est requis pour les opportunités, mais ne doit pas créer d'UX confuse sur les statuts utilisateurs (`profile`, `settings`, `admin/members`).
- `src/app/(admin)/admin/opportunities/page.tsx` est aujourd'hui une liste plate avec des formulaires POST et des rendus conditionnels `&&`. Cette story doit la remplacer par un Kanban responsive et corriger les `&&` touchés.
- `src/app/api/admin/opportunities/[id]/verify/route.ts` est aujourd'hui minimal : `POST`, `formData`, `approve/reject`, pas de note, pas de validation Zod, pas de notifications, pas de transitions `EN_COURS`.
- `src/app/(dashboard)/opportunities/page.tsx` liste actuellement toutes les opportunités aux membres premium. C'est incompatible avec AC5/AC6/FR18/FR19 : après cette story, les membres non auteurs ne doivent voir que les deals `VERIFIED`.
- `src/app/(dashboard)/opportunities/[id]/page.tsx` charge actuellement tout deal par ID pour un membre premium. Il doit bloquer les deals non vérifiés pour les non-auteurs/non-admins, et afficher la note privée seulement aux bons destinataires.
- Story 3.2 a introduit R2, `Document`, `DocumentRow`, `DocumentUploadSection`, preview/download APIs et tests. Réutiliser ces composants/endpoints ; ne pas créer un second système documentaire.
- L'email existe déjà dans `src/lib/email.ts` pour les abonnements, via Resend. Étendre ce fichier plutôt que créer un nouveau client Resend.

### Contraintes architecture / sécurité

- Stack réelle lue : Next.js 16.2.6, React 19.2.4, Prisma 7.8.0, Auth.js v5 beta.31, TailwindCSS 4, shadcn/ui, Vitest, Resend.
- Prisma 7 : importer le client uniquement via `src/lib/prisma.ts`; ce fichier importe `PrismaClient` depuis `@/generated/prisma/client`. Ne pas instancier un second client.
- Auth.js v5 : utiliser `auth()` depuis `@/lib/auth` côté serveur/API. Ne jamais importer Prisma/bcrypt dans `auth.config.ts` ou middleware Edge.
- API protégée admin : session obligatoire (NFR-S5), rôle `ADMIN` obligatoire, erreurs JSON françaises avec codes utiles (`INVALID_TRANSITION`, `EMAIL_FAILED`).
- NFR-S8 : ne pas logger titres, descriptions, noms de fichiers, notes de refus, URLs signées R2, ou payloads complets. Utiliser `sanitizeError` si disponible.
- FR18 : `REJECTED` visible uniquement par auteur et admins. La note de rejet est encore plus sensible : ne jamais la passer dans des props de carte ou feed destiné aux autres membres.
- FR19 : seuls les deals `VERIFIED` apparaissent dans les feeds membres. Cette story doit poser le filtre même si la logique de tier avancée arrive en Story 3.4.
- FR39 audit logs : il n'existe pas encore de modèle AuditLog. Ne pas inventer une grosse infra hors scope ; journaliser sobrement l'action admin (IDs/statuts) ou créer un TODO explicite si un modèle audit est reporté à Epic 6/Story 6.4.

### UX / accessibilité

- Tous les textes UI doivent être en français (FR44/NFR-A3).
- Desktop ≥1024px : Kanban `grid-cols-4`, colonnes `PENDING | EN COURS | VERIFIED | REJECTED`, interaction drag-and-drop ou clic-pour-déplacer. Comme aucune librairie DnD n'est installée, l'option la plus sûre est un clic-pour-déplacer accessible (Select/Menu/Boutons) ; si drag-and-drop est ajouté, utiliser `@dnd-kit/core` (dernière version consultée : 6.3.1) plutôt qu'une librairie obsolète.
- Mobile : liste empilée + chips de filtre statut, pas de drag-and-drop obligatoire. Touch targets ≥44px.
- Panneau de détail : slide-in desktop (`Sheet` shadcn existe), plein écran mobile. Focus trap/fermeture `Escape` si `Sheet`; bouton « Fermer » visible.
- Bouton « Vérifier » : vert/succès ; bouton « Rejeter » : destructif rouge ; note de refus avec label et erreur inline.
- Status pills : ne pas s'appuyer uniquement sur la couleur ; inclure texte + icône ou dot.
- Respecter `prefers-reduced-motion` si animations de transition de statut sont ajoutées.

### Recommandations d'implémentation

- Données Kanban côté serveur : charger une seule fois toutes les opportunités admin avec :
  - `author: { select: { id, name, email, image } }` ;
  - `_count: { select: { documents: true } }` ;
  - pour le panneau, soit inclure documents sérialisés admin-only, soit charger à l'ouverture via API. Si inclus, sérialiser les dates en ISO strings.
- Composant client : garder l'état local des cartes pour déplacement optimiste, puis `router.refresh()` après succès ; rollback en cas d'erreur avec toast `sonner`.
- Ne pas stocker « EN COURS » avec accent dans la DB. L'enum doit être `EN_COURS`; le label UI est « En cours ».
- Montants : `Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })` si devise EUR ; sinon le format existant `toLocaleString('fr-FR') + ' €'` est acceptable.
- Pour le clic-pour-déplacer : une action rapide « Marquer en cours » sur cartes `PENDING`, « Vérifier »/« Rejeter » dans le panneau. Éviter de permettre un déplacement direct vers `REJECTED` sans note.
- Ne pas remplacer les endpoints documents Story 3.2. Le panneau admin peut appeler les mêmes routes preview/download, l'admin est déjà autorisé.

### Project Structure Notes

- Routes admin existantes : `src/app/(admin)/admin/opportunities/page.tsx` et `src/app/api/admin/opportunities/[id]/verify/route.ts`.
- Nouveaux composants recommandés : `src/components/features/admin/opportunity-kanban-board.tsx`, `src/components/features/admin/opportunity-detail-panel.tsx`, `src/components/features/admin/opportunity-status-badge.tsx` si utile.
- Schémas validation : `src/lib/validations.ts` ou fichier dédié proche de l'API si le schéma est purement admin.
- Tests : co-localisés `*.test.ts(x)` comme les histoires précédentes (`src/lib/document-access.test.ts`, `src/app/api/admin/subscriptions/[id]/route.test.ts`).
- Migration Prisma : créer un dossier sous `prisma/migrations/` via Prisma CLI, ne pas modifier seulement le schéma.

### Previous Story Intelligence

- Story 3.1 a établi le modèle de création : opportunités créées avec `verificationStatus = PENDING`; montants > 50 000 € déclenchent `requiresDoubleVerification`. Préserver cette logique.
- Story 3.1 CR a identifié des tests API manquants pour les opportunités. Cette story doit ajouter la couverture API admin au lieu de répéter ce manque.
- Story 3.2 a corrigé deux points sécurité importants : ne pas exposer les métadonnées documents aux non-auteurs, et ne pas faire confiance aux clés R2 client. Ne pas régresser : le panneau admin peut voir les documents, mais les membres non auteurs ne doivent pas recevoir de métadonnées sensibles.
- Story 3.2 a utilisé `DocumentRow`, `DocumentUploadSection`, R2 signed URLs, `sanitizeError`, `sonner`, tests Vitest. Réutiliser ces patterns.
- Build/test récents Story 3.2 : `npm run build` passé, `npx vitest run` passé (209 tests), `./node_modules/.bin/prisma validate` passé ; `npm run lint` a des problèmes préexistants. Re-vérifier après modifications.

### Git Intelligence Summary

- Commits récents :
  - `cd5b9bc chore(story-3.2): CR PASS — mark story 3-2 done, patch review findings, update sprint-status`
  - `ecec258 fix(story-3.2): CR patches — restrict document metadata to authors/admins, validate R2 key pattern on upload ...`
  - `596b583 docs: record review findings for story 3.2`
  - `a336e78 feat: add legal document uploads for opportunities`
  - `f5b906d chore(story-3.2): create document upload story context`
- Pattern à suivre : terminer les corrections de sécurité avant de marquer done ; ne pas laisser les notes ou métadonnées sensibles fuiter dans les pages membre.

### Latest Technical Information

- `npm view` le 2026-05-18 : `next` latest 16.2.6, `prisma` latest 7.8.0, cohérents avec `package.json`.
- Si une librairie DnD est ajoutée, `@dnd-kit/core` latest 6.3.1 et `@dnd-kit/sortable` latest 10.0.0. Cependant l'AC accepte « drag-and-drop ou clic-pour-déplacer » ; privilégier clic-pour-déplacer pour réduire le risque et préserver l'accessibilité mobile.

### References

- `_bmad-output/planning-artifacts/epics.md` lignes 645-648 : objectif Epic 3 marketplace + vérification.
- `_bmad-output/planning-artifacts/epics.md` lignes 705-739 : définition et AC Story 3.3.
- `_bmad-output/planning-artifacts/prd.md` lignes 279-289 : FR15-FR23 marketplace, statuts et visibilité.
- `_bmad-output/planning-artifacts/prd.md` lignes 308-315 : FR35-FR40 administration/back-office.
- `_bmad-output/planning-artifacts/architecture.md` lignes 71-84 : stack et contraintes Next.js/Auth.js/Prisma.
- `_bmad-output/planning-artifacts/architecture.md` lignes 192-216 : patterns API et erreurs.
- `_bmad-output/planning-artifacts/architecture.md` lignes 278-310 et 400-414 : structure route/component admin.
- `_bmad-output/planning-artifacts/architecture.md` lignes 483-500 : Prisma/R2 comme boundaries.
- `_bmad-output/planning-artifacts/ux-spec.md` lignes 480-507 : parcours soumission/vérification.
- `_bmad-output/planning-artifacts/ux-spec.md` lignes 697-716 : layout Admin Kanban desktop/mobile.
- `_bmad-output/planning-artifacts/ux-spec.md` lignes 1003-1116 : responsive/accessibilité, grid admin desktop, stacked mobile.
- `_bmad-output/implementation-artifacts/3-1-creation-et-soumission-dopportunite.md` : contexte création opportunité.
- `_bmad-output/implementation-artifacts/3-2-upload-et-attachement-de-documents-juridiques.md` : documents R2, sécurité, tests et patterns.

## Dev Agent Record

### Agent Model Used

gpt-5.5 (openai-codex)

### Debug Log References

- 2026-05-18: Initial `npm run build` passed before implementation.
- 2026-05-18: `npx prisma migrate dev --name add_en_cours_and_admin_notes` applied migration `20260518044520_add_en_cours_and_admin_notes`.
- 2026-05-18: `npx prisma generate` and `./node_modules/.bin/prisma validate` passed.
- 2026-05-18: Final `npm run build` passed.
- 2026-05-18: Final `npx vitest run` passed (218 tests).
- 2026-05-18: `npm run lint` still reports pre-existing lint issues outside this story scope (public page link, RHF compiler warnings in existing forms, existing unused variables/any, subscription activation effect); new story files are clean.

### Completion Notes List

- Added `EN_COURS` verification status support and private admin note fields (`rejectionNote`, `reviewNotes`, `adminNote`) to Prisma with migration and generated client.
- Replaced the admin opportunities flat list with a responsive French kanban board: four desktop columns, mobile filter chips, compact cards, status colors, empty states, and click-to-move `PENDING → EN_COURS`.
- Added an admin slide-in detail sheet with full deal data, author avatar/email, legal document rows with preview/download actions, RHF + Zod note validation, verify/reject/start-review actions, and French inline errors.
- Extended admin verification API to support JSON `PATCH` actions, admin authorization, validated transitions, rejection notes, review notes, optional admin notes, safe logging, compatibility `POST`, and author email notifications.
- Added opportunity verification/refusal email helpers using the existing Resend utility conventions.
- Restricted member visibility so non-admin/non-author members only list and open `VERIFIED` opportunities; authors/admins can see private rejected/in-review deals and rejection notes.
- Added API tests for admin opportunity status transitions and updated existing opportunity visibility tests.

### File List

- `_bmad-output/implementation-artifacts/3-3-workflow-kanban-de-verification-admin.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `dev.db`
- `prisma/schema.prisma`
- `prisma/migrations/20260518044520_add_en_cours_and_admin_notes/migration.sql`
- `src/app/(admin)/admin/opportunities/page.tsx`
- `src/app/(dashboard)/opportunities/page.tsx`
- `src/app/(dashboard)/opportunities/page.test.tsx`
- `src/app/(dashboard)/opportunities/[id]/page.tsx`
- `src/app/(dashboard)/opportunities/[id]/page.test.tsx`
- `src/app/api/admin/opportunities/[id]/verify/route.ts`
- `src/app/api/admin/opportunities/[id]/verify/route.test.ts`
- `src/app/api/opportunities/route.ts`
- `src/components/features/admin/opportunity-detail-sheet.tsx`
- `src/components/features/admin/opportunity-kanban-board.tsx`
- `src/components/features/admin/opportunity-kanban-board.test.tsx`
- `src/components/features/admin/opportunity-status-badge.tsx`
- `src/lib/email.ts`
- `src/lib/validations.ts`

### Change Log

- 2026-05-18: Implemented Story 3.3 admin kanban verification workflow and marked ready for review.
