---
baseline_commit: d8b4f47
---
# Story 10.2: Data Room Sécurisée — Accès conditionnel aux documents juridiques sensibles

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a membre IBC,
I want que l'accès aux documents juridiques sensibles (RCCM, Articles of Organization, KYC, etc.) attachés aux opportunités soit conditionné par une demande explicite et une validation manuelle par le porteur de projet ou un admin,
so that ces documents confidentiels ne soient jamais accessibles publiquement et que chaque consultation soit tracée pour la conformité.

## Acceptance Criteria

1. **Modèle DocumentAccessRequest**
   - **Given** le schéma Prisma, **when** un nouveau modèle `DocumentAccessRequest` est ajouté avec les champs `requesterId`, `documentId`, `status` (enum `PENDING/APPROVED/DENIED`), `reviewedById`, `reviewedAt`, `createdAt`, `updatedAt`, **then** la migration s'exécute sans erreur et les index nécessaires sont créés.
   - **Given** un utilisateur, **when** il demande l'accès au même document deux fois, **then** une contrainte `@@unique([requesterId, documentId])` empêche le doublon.

2. **Demande d'accès — POST /api/opportunities/[id]/documents/[docId]/request-access**
   - **Given** un membre authentifié avec abonnement actif sur un document d'une opportunité VERIFIED accessible à son tier, **when** il appelle `POST /api/opportunities/[id]/documents/[docId]/request-access`, **then** une `DocumentAccessRequest` est créée avec `status: PENDING`, `requesterId: session.userId`, et un audit log `DOCUMENT_ACCESS_REQUESTED` est enregistré.
   - **Given** un membre ayant déjà une demande PENDING ou APPROVED pour ce document, **when** il appelle la même route, **then** la route retourne une erreur `409` avec message clair (« Vous avez déjà demandé l'accès à ce document »).
   - **Given** un membre non authentifié ou sans abonnement actif, **when** il appelle cette route, **then** la route retourne `401` ou `403` selon le cas.
   - **Given** un document introuvable ou n'appartenant pas à l'opportunité, **when** la route est appelée, **then** la route retourne `404`.
   - **Given** l'auteur du document ou un admin, **when** il appelle cette route, **then** la route retourne une erreur `400` (« Vous avez déjà accès à ce document ») — pas besoin de demander l'accès.

3. **Validation de l'accès — PATCH /api/opportunities/[id]/documents/[docId]/grant-access**
   - **Given** un porteur de projet (auteur de l'opportunité) ou un admin authentifié, **when** il appelle `PATCH /api/opportunities/[id]/documents/[docId]/grant-access` avec `{ requestIds, action: "approve" | "deny" }`, **then** les demandes spécifiées passent à `APPROVED` ou `DENIED`, `reviewedById` et `reviewedAt` sont renseignés, et un audit log `DOCUMENT_ACCESS_APPROVED` ou `DOCUMENT_ACCESS_DENIED` est créé pour chaque changement de statut.
   - **Given** un utilisateur qui n'est ni auteur ni admin, **when** il appelle cette route, **then** la route retourne `403`.
   - **Given** une demande déjà traitée (APPROVED ou DENIED), **when** l'auteur/admin tente de la traiter à nouveau, **then** la route ignore la demande (idempotent) et ne crée pas d'audit log supplémentaire.
   - **Given** un auteur/admin avec `status === SUSPENDED`, **when** il tente d'approuver/refuser, **then** la route retourne `403` (« Compte suspendu »).

4. **Accès conditionnel aux documents**
   - **Given** un membre sans demande APPROVED pour un document, **when** il tente de consulter ou télécharger ce document via les routes existantes (`GET /api/opportunities/[id]/documents/[docId]`, `GET .../preview`, `GET .../download`), **then** la route retourne `403` (« Accès refusé — demandez l'accès à ce document »).
   - **Given** l'auteur de l'opportunité ou un admin, **when** ils accèdent aux documents, **then** l'accès est toujours autorisé sans condition (comportement actuel préservé).
   - **Given** un membre avec une demande APPROVED pour un document, **when** il consulte ou télécharge ce document, **then** l'accès est accordé et un audit log `DOCUMENT_VIEWED` ou `DOCUMENT_DOWNLOADED` est enregistré avec `{ requesterId, documentId, opportunityId }`.

5. **Audit logging des consultations**
   - **Given** chaque consultation ou téléchargement d'un document par un membre non-auteur/non-admin, **when** l'action se produit, **then** `safeCreateAuditLog()` est appelé avec l'action `DOCUMENT_VIEWED` ou `DOCUMENT_DOWNLOADED`, `entityType: "Document"`, `entityId: documentId`, et metadata incluant `requesterId` et `opportunityId`.
   - **Given** une consultation par l'auteur ou un admin, **when** l'action se produit, **then** aucun audit log de consultation n'est créé (leur accès est inhérent).

6. **UI — Bouton « Demander l'accès » sur les documents**
   - **Given** un membre sans accès à un document sur la page détail de l'opportunité, **when** la section documents s'affiche, **then** chaque document inacessible affiche un bouton « Demander l'accès » au lieu du bouton de preview/download.
   - **Given** un membre ayant une demande PENDING, **when** la section documents s'affiche, **then** le document affiche un badge « En attente de validation » à la place du bouton.
   - **Given** un membre ayant une demande APPROVED, **when** la section documents s'affiche, **then** le document affiche les boutons preview/download normaux.
   - **Given** un membre ayant une demande DENIED, **when** la section documents s'affiche, **then** le document affiche un badge « Accès refusé » et un bouton « Demander à nouveau » (qui crée une nouvelle demande si l'ancienne est DENIED).

7. **UI — Section « Demandes d'accès » pour l'auteur/admin**
   - **Given** l'auteur de l'opportunité ou un admin sur la page détail, **when** il y a des demandes d'accès PENDING, **then** une section « Demandes d'accès aux documents » affiche chaque demande avec le nom du demandeur, le nom du document, et des boutons « Approuver » / « Refuser ».
   - **Given** l'auteur/admin approuve une demande, **when** le bouton est cliqué, **then** la demande passe à APPROVED, la section se met à jour, et un toast confirme l'action.
   - **Given** l'auteur/admin refuse une demande, **when** le bouton est cliqué, **then** la demande passe à DENIED et un toast confirme l'action.
   - **Given** aucune demande PENDING, **when** la page s'affiche, **then** la section n'apparaît pas ou affiche un état vide.

8. **Tests et régressions**
   - **Given** les nouvelles routes, modèle et guards, **when** `npx vitest run` est exécuté, **then** les tests couvrent les succès, erreurs, guards, doublons, idempotence, audit logs, et non-régression des accès existants (auteur/admin).
   - **Given** Next.js 16 strict JSX, **when** `npm run build` est exécuté, **then** le build passe sans `&&` dans le JSX ajouté/modifié.

## Tasks / Subtasks

- [ ] Ajouter le modèle DocumentAccessRequest au schéma Prisma (AC: 1)
  - [ ] Créer l'enum `DocumentAccessRequestStatus` avec valeurs `PENDING`, `APPROVED`, `DENIED`
  - [ ] Créer le modèle `DocumentAccessRequest` avec champs : `id`, `requesterId`, `documentId`, `status`, `reviewedById?`, `reviewedAt?`, `createdAt`, `updatedAt`
  - [ ] Ajouter relations : `requester User`, `document Document`, `reviewedBy User?`
  - [ ] Ajouter contrainte `@@unique([requesterId, documentId])` pour empêcher les doublons
  - [ ] Ajouter index sur `[documentId, status]` et `[requesterId, status]`
  - [ ] Ajouter `documentAccessRequests DocumentAccessRequest[]` aux modèles `User` et `Document`
  - [ ] Exécuter `npx prisma migrate dev` et `npx prisma generate`

- [ ] Ajouter les actions d'audit dans `src/lib/audit-log.ts` (AC: 2, 3, 4, 5)
  - [ ] Ajouter `DOCUMENT_ACCESS_REQUESTED`, `DOCUMENT_ACCESS_APPROVED`, `DOCUMENT_ACCESS_DENIED`, `DOCUMENT_VIEWED`, `DOCUMENT_DOWNLOADED` à `AUDIT_ACTIONS`

- [ ] Créer le helper d'accès documents dans `src/lib/document-access.ts` (AC: 4, 5)
  - [ ] Étendre `canManageDocuments` existant ou créer `canViewDocument(session, document)` qui vérifie : auteur de l'opportunité OU admin OU demande APPROVED existante pour ce requesterId + documentId
  - [ ] Créer `hasApprovedAccess(requesterId, documentId)` : query Prisma vérifiant existence d'une DocumentAccessRequest APPROVED
  - [ ] Créer `getPendingAccessRequests(opportunityId)` : retourne toutes les demandes PENDING pour les documents d'une opportunité
  - [ ] Créer `getAccessStatusForDocuments(userId, documentIds)` : retourne un Map<documentId, status> pour affichage UI batch

- [ ] Implémenter `POST /api/opportunities/[id]/documents/[docId]/request-access` (AC: 2)
  - [ ] Vérifier session authentifiée, abonnement actif (`getUserPremiumAccess`), tier access (`canUserAccessOpportunity`)
  - [ ] Vérifier que le document appartient à l'opportunité
  - [ ] Refuser si l'utilisateur est l'auteur ou admin (pas besoin de demande)
  - [ ] Refuser si demande existante (PENDING ou APPROVED) → `409`
  - [ ] Créer la demande PENDING + audit log `DOCUMENT_ACCESS_REQUESTED`
  - [ ] Retourner `{ data: { id, status, createdAt } }` avec `201`

- [ ] Implémenter `PATCH /api/opportunities/[id]/documents/[docId]/grant-access` (AC: 3)
  - [ ] Vérifier session authentifiée + auteur de l'opportunité OU admin + admin non suspendu
  - [ ] Valider `requestIds` (array de strings) et `action` ("approve" | "deny")
  - [ ] Pour chaque requestId : si déjà traitée (APPROVED/DENIED), ignorer (idempotent) ; si PENDING, mettre à jour status, reviewedById, reviewedAt
  - [ ] Créer audit log `DOCUMENT_ACCESS_APPROVED` ou `DOCUMENT_ACCESS_DENIED` uniquement pour les changements réels
  - [ ] Retourner `{ data: { processed: number } }`

- [ ] Modifier les routes existantes de consultation/téléchargement pour l'accès conditionnel (AC: 4, 5)
  - [ ] Modifier `src/app/api/opportunities/[id]/documents/[documentId]/route.ts` (GET) : ajouter vérification `hasApprovedAccess` si non auteur/admin → `403`
  - [ ] Modifier `src/app/api/opportunities/[id]/documents/route.ts` (GET) : filtrer les documents retournés — seuls les documents où l'utilisateur a accès (auteur/admin/approved) sont listés ; pour les autres, retourner uniquement `id`, `originalName` et un indicateur `accessStatus: "locked" | "pending" | "denied" | "approved"`
  - [ ] Ajouter audit log `DOCUMENT_VIEWED` ou `DOCUMENT_DOWNLOADED` quand un membre non-auteur/non-admin accède à un document

- [ ] Mettre à jour la page détail opportunité pour la UI Data Room (AC: 6)
  - [ ] Modifier `src/app/(dashboard)/dashboard/opportunities/[id]/page.tsx` : pour les membres non-auteur/non-admin, calculer le statut d'accès par document via `getAccessStatusForDocuments`
  - [ ] Passer les statuts d'accès au composant `DocumentUploadSection` via de nouvelles props
  - [ ] Mettre à jour `DocumentUploadSection` : afficher bouton « Demander l'accès » / badge « En attente » / badge « Accès refusé » / bouton « Demander à nouveau » selon le statut

- [ ] Créer la section « Demandes d'accès » pour l'auteur/admin (AC: 7)
  - [ ] Créer `src/components/features/deals/document-access-requests.tsx` : composant client listant les demandes PENDING avec boutons Approuver/Refuser
  - [ ] Appeler `PATCH /api/opportunities/[id]/documents/[docId]/grant-access` depuis le composant
  - [ ] Intégrer dans la page détail : afficher la section seulement si `isAuthor || isAdmin` et demandes PENDING existantes

- [ ] Créer les composants client pour les actions de demande d'accès (AC: 6)
  - [ ] Créer `src/components/features/deals/request-document-access-button.tsx` : bouton client appelant `POST .../request-access`
  - [ ] Gérer les états : idle, loading, success (PENDING), error (409 déjà demandé, 403 non autorisé)
  - [ ] Utiliser `toast` (sonner) pour feedback succès/erreur
  - [ ] Respecter les cibles tactiles min-h-11 et aria-labels

- [ ] Écrire les tests (AC: 8)
  - [ ] `src/lib/document-access.test.ts` : canViewDocument, hasApprovedAccess, getAccessStatusForDocuments
  - [ ] `src/app/api/opportunities/[id]/documents/[docId]/request-access/route.test.ts` : succès, 409 doublon, 403 non autorisé, 404 document introuvable, auteur/admin pas besoin
  - [ ] `src/app/api/opportunities/[id]/documents/[docId]/grant-access/route.test.ts` : approve, deny, idempotent, 403 non auteur/admin, admin suspendu
  - [ ] Mettre à jour les tests des routes existantes pour l'accès conditionnel
  - [ ] Tests composants : request-document-access-button, document-access-requests

- [ ] Valider le build et les tests (AC: 8)
  - [ ] `cd /home/alphaperseii/projects/ibc && npx vitest run`
  - [ ] `cd /home/alphaperseii/projects/ibc && npm run build`

## Dev Notes

### Décision produit et périmètre

- **Décision de Jonathan (15.06.2026)** : Les documents juridiques sensibles (RCCM, Articles of Organization, KYC, titre foncier, etc.) attachés aux opportunités doivent **JAMAIS** être publiquement accessibles. L'accès est accordé uniquement sur demande explicite, validée manuellement par le porteur de projet ou un admin. Toutes les consultations et téléchargements sont journalisés via audit log. [Source: décision produit validée par Jonathan]
- Le système actuel (Story 3.2) permet l'upload/attachement/download de documents via presigned URLs R2, mais **n'a aucun contrôle d'accès au-delà de l'auteur/admin**. Tous les membres avec abonnement actif et tier suffisant peuvent voir et télécharger tous les documents. [Source: `src/app/api/opportunities/[id]/documents/_helpers.ts` — `canManageDocuments` ne vérifie que `userId === authorId || role === ADMIN`]
- Cette story introduit une couche de contrôle d'accès granulaire **par document** : un membre peut voir la liste des documents (noms, tailles) mais ne peut les consulter/télécharger que s'il a une demande APPROVED.

### Architecture / stack à respecter

- Stack en place : Next.js 16.2.6 App Router, React 19.2.4, Prisma 7.8.0, Auth.js v5 beta.31, TailwindCSS 4, nodemailer SMTP Infomaniak. [Source: `package.json` ; `architecture.md`]
- Prisma client importé via `@/lib/prisma` (singleton). Les enums Prisma sont validés côté client en SQLite dev — ne pas compter sur la DB pour rattraper des strings invalides. [Source: `prisma/schema.prisma`]
- Auth.js v5 : `NextAuth()` doit rester appelé avec un seul objet spread. [Source: `src/lib/auth.ts`]
- Next.js 16 guardrail : dans tout JSX ajouté/modifié, utiliser des ternaires `condition ? <JSX /> : null` ; éviter `condition && <JSX />`, et pré-calculer les booléens composés avant le `return`. [Source: `architecture.md#JSX Boolean Guardrail`]
- API routes : format attendu succès `{ data: T }` ou `{ success: true }` ; erreurs `{ error, code?, details? }` en français ; `try/catch` et logs sanitisés pour erreurs inattendues. [Source: `architecture.md#API & Communication Patterns`]
- Guardrail idempotent : les side effects (audit logs, notifications) doivent vérifier que le statut change réellement avant de s'exécuter. [Source: `architecture.md#Idempotent State-Transition Side Effects`]
- Upload Security : ne jamais sérialiser `r2Key` ou `initialDocuments` complet pour les non-auteurs/non-admins. [Source: `architecture.md#Upload Security Patterns`]
- `getUserPremiumAccess()` requis pour vérifier l'abonnement actif sur toutes les pages dashboard. [Source: `src/lib/subscription-access.ts`]

### État actuel des fichiers à modifier

- **`src/lib/document-access.ts`** : contient actuellement `canManageDocuments(session, authorId)` et le type `DocumentAccessSession`. À étendre avec les fonctions d'accès conditionnel. Le fichier est déjà importé par `_helpers.ts`. [Source: fichier lu]
- **`src/app/api/opportunities/[id]/documents/_helpers.ts`** : importe et réexporte `canManageDocuments` depuis `@/lib/document-access`. Fournit `getDocumentSession()`, `getOpportunityForDocuments()`, `documentAccessDenied()`, `serializeDocument()`. Les routes de consultation (GET) utilisent actuellement `canManageDocuments` comme seul garde-fou — il faut y ajouter la vérification d'accès conditionnel. [Source: fichier lu]
- **`src/app/api/opportunities/[id]/documents/[documentId]/route.ts`** : GET retourne les détails du document + signed URL si auteur/admin, sinon `403`. DELETE supprime le document (auteur/admin uniquement). Il faut modifier le GET pour vérifier `hasApprovedAccess` si non auteur/admin. [Source: fichier lu]
- **`src/app/api/opportunities/[id]/documents/route.ts`** : GET liste tous les documents de l'opportunité (auteur/admin uniquement via `canManageDocuments`). POST crée un document (auteur/admin). Il faut modifier le GET pour permettre aux membres de voir la liste avec statut d'accès. [Source: fichier lu]
- **`src/app/api/opportunities/[id]/documents/[documentId]/download/route.ts`** : réexporte le GET de `[documentId]/route.ts` → même modification nécessaire. [Source: fichier lu]
- **`src/app/api/opportunities/[id]/documents/[documentId]/preview/route.ts`** : réexporte le GET de `[documentId]/route.ts` → même modification nécessaire. [Source: fichier lu]
- **`src/lib/audit-log.ts`** : contient `AUDIT_ACTIONS`, `createAuditLog()`, `safeCreateAuditLog()`. Ajouter les nouvelles actions. [Source: fichier lu]
- **`src/components/features/deals/document-upload-section.tsx`** : composant client gérant l'upload, preview, download des documents. Props actuelles : `canUpload`, `canPreview`. Il faut ajouter des props pour les statuts d'accès et afficher les boutons/badges conditionnels. [Source: fichier lu]
- **`src/app/(dashboard)/dashboard/opportunities/[id]/page.tsx`** : page détail opportunité. Actuellement, `canViewDocuments` est calculé comme `canManageDocuments || (access.hasAccess && hasTierAccess && isPublishedToMember)`. Il faut intégrer les statuts d'accès par document et la section « Demandes d'accès ». [Source: fichier lu]

### Modèle de données pertinent

- **`Document`** (existant) : `id`, `opportunityId`, `uploadedById`, `fileName`, `originalName`, `mimeType`, `size`, `r2Key @unique`, `publicUrl?`. Relation `opportunity`. [Source: `prisma/schema.prisma`]
- **`Opportunity`** (existant) : `id`, `authorId`, `verificationStatus`, `requiredTier`. [Source: `prisma/schema.prisma`]
- **`User`** (existant) : `id`, `role`, `status`, `tier`. [Source: `prisma/schema.prisma`]
- **`AuditLog`** (existant) : `id`, `actorId?`, `action`, `entityType`, `entityId`, `metadata Json?`, `createdAt`. [Source: `prisma/schema.prisma`]

### Schéma recommandé pour DocumentAccessRequest

```prisma
enum DocumentAccessRequestStatus {
  PENDING
  APPROVED
  DENIED
}

model DocumentAccessRequest {
  id          String                    @id @default(cuid())
  requesterId String
  documentId  String
  status      DocumentAccessRequestStatus @default(PENDING)
  reviewedById String?
  reviewedAt   DateTime?
  createdAt   DateTime                  @default(now())
  updatedAt   DateTime                  @updatedAt

  requester  User    @relation(fields: [requesterId], references: [id], onDelete: Cascade)
  document   Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  reviewedBy User?   @relation(fields: [reviewedById], references: [id], onDelete: SetNull)

  @@unique([requesterId, documentId])
  @@index([documentId, status])
  @@index([requesterId, status])
  @@map("document_access_requests")
}
```

- Ajouter `documentAccessRequests DocumentAccessRequest[]` au modèle `User` (relation requester)
- Ajouter `accessRequests DocumentAccessRequest[]` au modèle `Document`
- Ajouter `reviewedAccessRequests DocumentAccessRequest[]` au modèle `User` (relation reviewedBy) — vérifier que Prisma supporte deux relations vers le même modèle avec des noms différents

### Implémentation recommandée pour `src/lib/document-access.ts`

Étendre le fichier existant :

```ts
export async function hasApprovedAccess(requesterId: string, documentId: string): Promise<boolean> {
  const request = await prisma.documentAccessRequest.findUnique({
    where: { requesterId_documentId: { requesterId, documentId } },
    select: { status: true },
  });
  return request?.status === "APPROVED";
}

export async function getAccessStatusForDocuments(
  userId: string,
  documentIds: string[],
): Promise<Map<string, "locked" | "pending" | "denied" | "approved">> {
  if (documentIds.length === 0) return new Map();
  const requests = await prisma.documentAccessRequest.findMany({
    where: { requesterId: userId, documentId: { in: documentIds } },
    select: { documentId: true, status: true },
  });
  const map = new Map<string, "locked" | "pending" | "denied" | "approved">();
  for (const id of documentIds) {
    const req = requests.find((r) => r.documentId === id);
    map.set(id, req ? (req.status.toLowerCase() as "pending" | "denied" | "approved") : "locked");
  }
  return map;
}
```

- `canViewDocument(session, document, opportunityAuthorId)` : retourne `true` si auteur, admin, ou demande APPROVED
- Utiliser cette fonction dans les guards des routes GET existantes

### Modifications des routes existantes — point d'attention critique

- **Route `GET /api/opportunities/[id]/documents/route.ts`** : actuellement réservée aux auteurs/admins (`canManageDocuments`). Il faut l'ouvrir aux membres pour qu'ils puissent voir la liste des documents (avec statut d'accès) sans pouvoir télécharger. Deux approches :
  1. **Option A (recommandée)** : Modifier cette route pour permettre à tout membre authentifié avec abonnement actif et tier suffisant de lister les documents. Sérialiser les documents différemment selon le statut d'accès (sans `r2Key`, sans `publicUrl` pour les documents « locked »).
  2. **Option B** : Créer une route dédiée pour les membres. Mais c'est du code dupliqué — préférer l'Option A.

- **Route `GET /api/opportunities/[id]/documents/[documentId]/route.ts`** : ajouter vérification `hasApprovedAccess` avant de générer la signed URL. Si accès refusé, retourner `403` avec message « Accès refusé — demandez l'accès à ce document ».

- **Route DELETE** : aucun changement nécessaire — déjà protégée par `canManageDocuments`.

### Sécurité et effets de bord

- Les presigned URLs R2 ont une durée de vie de 180 secondes (`expiresIn: 180`). Ne jamais exposer ces URLs à un membre sans accès approuvé. [Source: `src/lib/r2.ts` — `createDownloadSignedUrl`]
- Le champ `r2Key` ne doit **jamais** être sérialisé pour les membres non-auteur/non-admin (guardrail existant de l'architecture). [Source: `architecture.md#Upload Security Patterns`]
- Le champ `publicUrl` sur `Document` : certains documents ont un `publicUrl` (R2 public bucket). **Il faut s'assurer que les documents juridiques sensibles n'ont pas de `publicUrl` publique**, ou à défaut, que le bucket R2 soit configuré en accès privé uniquement. Si `publicUrl` existe, il permet un accès direct non contrôlé — **c'est un problème de sécurité pré-existant** à adresser dans cette story ou à documenter comme risque. [Source: `src/lib/r2.ts` — `createPublicDocumentUrl` ; `prisma/schema.prisma` — champ `publicUrl String?`]
- Les audit logs doivent utiliser `safeCreateAuditLog()` pour ne pas interrompre les opérations métier en cas d'échec. [Source: `src/lib/audit-log.ts`]
- Admin route : vérifier `status !== SUSPENDED` pour l'admin qui approuve/refuse (pattern établi dans Story 10.1). [Source: `src/app/api/admin/users/[id]/verify/route.ts`]

### UX / accessibilité

- UI en français, texte non technique, diacritiques corrects. [Source: PRD/UX]
- Boutons : cible tactile min. `min-h-11` déjà utilisée ; état disabled doit expliquer pourquoi via tooltip ou texte inline. [Source: UX spec §12.1]
- Indicateurs de statut : ne pas utiliser la couleur seule. Ajouter icône/texte (`🔒 Accès restreint`, `⏳ En attente de validation`, `✗ Accès refusé`, `✓ Accès accordé`). [Source: UX spec §13.3]
- Toast feedback : utiliser `toast` de sonner (déjà en place dans `DocumentUploadSection`). [Source: `src/components/features/deals/document-upload-section.tsx`]
- Loading states : désactiver le bouton « Demander l'accès » pendant la requête avec spinner. [Source: UX spec §19]

### Tests attendus

- Ajouter/mettre à jour au minimum :
  - `src/lib/document-access.test.ts` : canViewDocument, hasApprovedAccess, getAccessStatusForDocuments
  - `src/app/api/opportunities/[id]/documents/[docId]/request-access/route.test.ts`
  - `src/app/api/opportunities/[id]/documents/[docId]/grant-access/route.test.ts`
  - Mise à jour : `src/app/api/opportunities/[id]/documents/[documentId]/route.test.ts` (accès conditionnel)
  - Mise à jour : `src/app/api/opportunities/[id]/documents/route.test.ts` (listing avec statut d'accès)
  - `src/components/features/deals/request-document-access-button.test.tsx`
  - `src/components/features/deals/document-access-requests.test.tsx`
- Chaque nouveau guard conditionnel doit avoir un test : non authentifié, non autorisé (pas d'abonnement), tier insuffisant, demande doublon, demande déjà approuvée, auteur/admin pas besoin de demande, admin suspendu, idempotence d'approbation, audit log création.

### Risque de sécurité pré-existant — publicUrl sur les documents

- Actuellement, `Document.publicUrl` peut contenir une URL publique R2 (via `createPublicDocumentUrl`). Si cette URL est accessible sans authentification, un membre qui connaît l'URL peut contourner le système de demande d'accès.
- **Recommandation** : Dans cette story, vérifier et potentiellement **retirer la sérialisation de `publicUrl`** pour les membres non-auteur/non-admin. Si le bucket R2 est public, envisager de le passer en accès privé et de ne servir les documents que via presigned URLs (ce qui est déjà le cas pour le download via `createDownloadSignedUrl`).
- Le champ `publicUrl` est déjà exclu de `serializeDocument` dans `_helpers.ts` — il n'est pas sérialisé dans la réponse API. Vérifier que ce champ n'est pas exposé autre part.

### Apprentissages de la story 10-1 (vérification membres)

- Pattern serveur-only : les fonctions qui accèdent à Prisma doivent être dans un fichier `.server.ts` si elles sont importées par des composants client, sinon Webpack bundling échoue. [Source: Story 10.1 Dev Notes — dynamic bundler issues resolved by isolating db interactions in `src/lib/verification.server.ts`]
- Pour cette story, les fonctions d'accès document sont appelées uniquement par des API routes (server-only) et des Server Components, donc pas besoin de séparation client/serveur a priori. Mais si un composant client a besoin d'accéder aux statuts d'accès, passer les données sérialisées en props plutôt que d'importer directement les fonctions Prisma.
- Pattern idempotent d'audit : créer l'audit log uniquement si le statut change réellement. Ne pas spammer les audits sur les re-soumissions identiques. [Source: `architecture.md#Idempotent State-Transition Side Effects` ; Story 10.1 Review Findings]
- Pattern admin suspendu : vérifier `admin.status !== SUSPENDED` dans toutes les routes admin. [Source: Story 10.1 AC 3]
- Pattern `sanitizeError` : utiliser `sanitizeError(error)` pour logger les erreurs inattendues sans fuite de données sensibles. [Source: `src/lib/sanitize-log.ts`]

### Références

- [Source: Décision produit Jonathan 15.06.2026] Documents juridiques sensibles doivent JAMAIS être publics.
- [Source: `_bmad-output/planning-artifacts/architecture.md`] Stack, structure, API patterns, guardrails JSX, Auth.js/Prisma, Upload Security Patterns, Idempotent State-Transition Side Effects.
- [Source: `_bmad-output/planning-artifacts/prd.md`] FR23, NFR-S5, NFR-S8, NFR-S9, accessibilité.
- [Source: `prisma/schema.prisma`] Modèles Document, Opportunity, User, AuditLog. Pas de modèle DocumentAccessRequest existant.
- [Source: `src/lib/document-access.ts`] Fonction `canManageDocuments` existante, type `DocumentAccessSession`.
- [Source: `src/app/api/opportunities/[id]/documents/_helpers.ts`] Helpers existants : getDocumentSession, serializeDocument, etc.
- [Source: `src/app/api/opportunities/[id]/documents/route.ts`] Route liste/création documents — accès auteur/admin uniquement.
- [Source: `src/app/api/opportunities/[id]/documents/[documentId]/route.ts`] Route GET/DELETE document — accès auteur/admin uniquement.
- [Source: `src/lib/audit-log.ts`] AUDIT_ACTIONS, createAuditLog, safeCreateAuditLog.
- [Source: `src/lib/r2.ts`] Presigned URL patterns, createDownloadSignedUrl.
- [Source: `src/components/features/deals/document-upload-section.tsx`] Composant upload/preview/download documents.
- [Source: `src/app/(dashboard)/dashboard/opportunities/[id]/page.tsx`] Page détail opportunité — logique canViewDocuments actuelle.
- [Source: `src/lib/subscription-access.ts`] getUserPremiumAccess, hasActiveSubscription.
- [Source: `_bmad-output/implementation-artifacts/10-1-verification-membres-pre-requis.md`] Apprentissages story précédente.

## Project Structure Notes

- Nouvelles routes API sous `src/app/api/opportunities/[id]/documents/[docId]/request-access/route.ts` et `.../grant-access/route.ts` — respecter le pattern RESTful existant.
- Nouveau composant client `src/components/features/deals/request-document-access-button.tsx` — petit composant dédié, pas transformer DocumentUploadSection en composant complexe.
- Nouveau composant client `src/components/features/deals/document-access-requests.tsx` — section pour l'auteur/admin.
- Étendre `src/lib/document-access.ts` pour les fonctions d'accès conditionnel — ne pas créer un nouveau fichier.
- Étendre `src/lib/audit-log.ts` pour les nouvelles actions — ne pas créer un nouveau fichier.
- Ne pas modifier le filtre public `/members` ou les routes d'opportunités teaser — cette story concerne uniquement l'accès aux documents.
- Respecter le pattern de sérialisation existant dans `_helpers.ts` — ne pas exposer `r2Key` ni `publicUrl` aux non-auteurs/non-admins.

## Dev Agent Record

### Agent Model Used

gpt-5.5 (openai-codex)

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.

### File List