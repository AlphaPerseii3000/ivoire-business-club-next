---
story_key: 25-5-galerie-collaborative-post-event
epic: epic-25
title: Galerie collaborative post-event
status: ready-for-dev
created_at: 2026-07-04
baseline_commit: 0ee1d79
---

# Story 25-5 : Galerie collaborative post-event

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

**En tant qu'** admin ou membre,
**Je veux** uploader des photos d'un événement passé dans une galerie collaborative,
**Afin de** partager les moments IBC et créer de l'engagement.

## Contexte

Cette story est la 5ème de l'**Epic 25 : Plateforme d'Événements — Couverture, Visibilité, Tarification & Galerie**. Elle s'appuie sur la fondation Prisma créée dans la Story 25-1 (modèle `EventGalleryPhoto`), la gestion des chemins médias et de `sharp` de la Story 25-2, ainsi que la visibilité et l'affichage des événements des Stories 25-3 et 25-4.

Elle permet aux membres et aux administrateurs de faire vivre la communauté post-événement en partageant des clichés des rencontres IBC.

**Sources :**
- [Sprint Change Proposal — Epic 25 (2026-07-04)](../planning-artifacts/sprint-change-proposal-2026-07-04.md) §4.3, §4.5, Story 25-5
- [epics.md](../planning-artifacts/epics.md)
- [architecture.md](../planning-artifacts/architecture.md)
- Code existant : `prisma/schema.prisma`, `src/lib/media-path.ts`, `src/app/api/admin/events/[id]/cover/route.ts`, `src/app/(public)/events/[slug]/page.tsx`

---

## Acceptance Criteria

### AC1 — Page galerie dashboard post-event (`startDate < now`)
**Given** un membre ou admin connecté sur la page d'un événement passé (`startDate < now`)
**When** il accède à la galerie `/dashboard/events/[slug]/gallery`
**Then** il voit les photos existantes ordonnées par date de création décroissante avec le nom/avatar de l'uploader et un bouton « Ajouter des photos »
**And** si l'événement n'est pas encore passé (`startDate >= now`), un message d'information s'affiche indiquant que la galerie ouvre après le déroulement de l'événement.

### AC2 — Upload de photo avec Sharp & Stockage VPS
**Given** un membre ou admin qui sélectionne une photo (jpeg/png/webp, max 10 Mo)
**When** il soumet le fichier via `/api/events/[id]/gallery`
**Then** l'image est validée (MIME + taille), redimensionnée avec `sharp` (max 1200x800px, `fit: inside`, `withoutEnlargement: true`), stockée dans le volume média sous `/var/www/ibc-media/events/{eventId}/gallery/{uuid}.{ext}` (ou `./public/ibc-media/events/{eventId}/gallery/{uuid}.{ext}` en dev)
**And** un enregistrement `EventGalleryPhoto` est créé en base avec `eventId`, `uploadedById`, `filePath`, `caption` optionnel
**And** l'API retourne `{ data: photo }` avec HTTP 201.

### AC3 — Modération Admin (suppression de n'importe quelle photo)
**Given** un administrateur connecté sur la galerie (`role = ADMIN`)
**When** il consulte la galerie d'un événement
**Then** un bouton de suppression (icône poubelle / modération) est présent sur toutes les photos
**When** il clique sur supprimer et confirme
**Then** une requête `DELETE /api/events/[id]/gallery/[photoId]` supprime la photo en base et supprime le fichier image du disque avec `fs.unlink`
**And** un log d'audit `EVENT_GALLERY_PHOTO_DELETE` est enregistré.

### AC4 — Suppression par le membre propriétaire
**Given** un membre connecté (`role = MEMBER` ou autre role non-admin)
**When** il consulte la galerie
**Then** il ne voit le bouton de suppression que sur les photos qu'il a lui-même uploadées (`photo.uploadedById === session.user.id`)
**When** un membre tente de supprimer une photo appartenant à un autre membre via l'API `DELETE /api/events/[id]/gallery/[photoId]`
**Then** l'API rejette la demande avec HTTP 403 Forbidden ("Action non autorisée.").

### AC5 — Affichage de la galerie sur la page publique d'événement
**Given** la page de détail publique d'un événement `/events/[slug]`
**When** des photos existent dans la galerie pour cet événement et que la visibilité de l'événement permet l'accès (visiteur sur event PUBLIC ou membre sur event PRIVATE)
**Then** la galerie de photos s'affiche en bas de la page sous la forme d'une grille responsive avec possibilité de cliquer pour agrandir (lightbox / zoom)
**And** pour un visiteur non connecté sur un événement PRIVÉ, le teaser privé masque la galerie.

### AC6 — Qualité, Build et Tests Unitaires/Intégration
**Given** le code développé
**When** `npm run build` et `npx vitest run` sont exécutés
**Then** le build Next.js passe sans erreur TypeScript/ESLint et les tests couvrent :
- Validation des fichiers uploadés (format, taille, type MIME)
- Upload mock et création en base `EventGalleryPhoto`
- Droits de suppression (Admin vs Propriétaire vs Autre membre)
- Servie des médias via la route `/api/media/events/[eventId]/gallery/[filename]`
- Rendu de la grille UI et état vide/chargement.

---

## Tasks / Subtasks

- [ ] **Task 1 — Extensions Helpers Chemins Média (`src/lib/media-path.ts`) (AC2)**
  - [ ] 1.1 Ajouter `getEventGalleryDir(eventId: string): string` -> `path.join(getMediaStoragePath(), "events", eventId, "gallery")`
  - [ ] 1.2 Ajouter `getEventGalleryFilePath(eventId: string, filename: string): string` -> `path.join(getEventGalleryDir(eventId), filename)`
  - [ ] 1.3 Ajouter `getEventGalleryRelativePath(eventId: string, filename: string): string` -> `/events/${eventId}/gallery/${filename}`

- [ ] **Task 2 — Route de Servie Média Galerie (`src/app/api/media/events/[eventId]/gallery/[filename]/route.ts`) (AC2, AC5)**
  - [ ] 2.1 Vérifier la présence de l'événement et son statut de visibilité (`PUBLIC` accessible à tous, `PRIVATE` nécessite session utilisateur actif).
  - [ ] 2.2 Servir l'image depuis `getEventGalleryFilePath(eventId, filename)` avec Content-Type approprié (`image/jpeg`, `image/png`, `image/webp`) et header `Cache-Control: public, max-age=31536000, immutable`.
  - [ ] 2.3 Retourner 404 si le fichier ou l'événement n'existe pas.

- [ ] **Task 3 — Route API Galerie (`src/app/api/events/[id]/gallery/route.ts`) (AC1, AC2)**
  - [ ] 3.1 `GET /api/events/[id]/gallery` : Récupérer les photos de l'événement triées par `createdAt desc` avec `uploader: { select: { id: true, name: true, image: true } }`. Vérifier l'accès selon la visibilité de l'événement.
  - [ ] 3.2 `POST /api/events/[id]/gallery` : Authentification requise. Recevoir FormData (`file`, `caption?`).
  - [ ] 3.3 Valider la taille (<= 10 Mo) et le type MIME (jpeg, png, webp).
  - [ ] 3.4 Générer un identifiant unique / UUID pour le fichier (`{uuid}.{ext}`).
  - [ ] 3.5 Traiter l'image avec `sharp` (max 1200x800px) et sauvegarder sur disque via `ensureMediaDir` et `toFile`.
  - [ ] 3.6 Insérer `EventGalleryPhoto` dans Prisma et générer un log d'audit `EVENT_GALLERY_PHOTO_UPLOAD`.

- [ ] **Task 4 — Route API Suppression Photo (`src/app/api/events/[id]/gallery/[photoId]/route.ts`) (AC3, AC4)**
  - [ ] 4.1 `DELETE /api/events/[id]/gallery/[photoId]` : Authentification requise.
  - [ ] 4.2 Charger la photo et vérifier qu'elle appartient à l'événement `id`.
  - [ ] 4.3 Vérifier les permissions : `session.user.role === "ADMIN"` OU `photo.uploadedById === session.user.id`. Si non respecté -> HTTP 403.
  - [ ] 4.4 Supprimer le fichier physique avec `fs.unlink(filePath)` (ignorer silencieusement si déjà supprimé).
  - [ ] 4.5 Supprimer la ligne dans Prisma `prisma.eventGalleryPhoto.delete({ where: { id: photoId } })`.
  - [ ] 4.6 Logger l'audit log `EVENT_GALLERY_PHOTO_DELETE`.

- [ ] **Task 5 — Composants UI Galerie (`src/components/features/events/`) (AC1, AC2, AC3, AC4, AC5)**
  - [ ] 5.1 Créer `EventGallery.tsx` : Grille responsive de photos (lightbox simple au clic, informations uploader, date d'ajout, bouton supprimer conditionnel).
  - [ ] 5.2 Créer `EventGalleryUploadModal.tsx` : Dialogue d'upload drag-and-drop / sélection avec prévisualisation, champ caption optionnel, jauge de progression / loader et gestion d'erreurs en français.
  - [ ] 5.3 Gérer les états vides ("Aucune photo partagée pour le moment"), chargement (skeletons) et notifications toast / alertes.

- [ ] **Task 6 — Page Dashboard Galerie (`src/app/(dashboard)/dashboard/events/[slug]/gallery/page.tsx`) (AC1)**
  - [ ] 6.1 Charger l'événement par son `slug` (ou `id`).
  - [ ] 6.2 Vérifier si `startDate < now`. Si oui, afficher le header de l'événement, le composant `EventGallery` et le bouton "Ajouter des photos".
  - [ ] 6.3 Si `startDate >= now`, afficher une bannière "Événement à venir : la galerie sera ouverte dès le début de l'événement."

- [ ] **Task 7 — Intégration sur la Page Publique `/events/[slug]/page.tsx` (AC5)**
  - [ ] 7.1 Charger les photos de la galerie dans la page de détail d'événement.
  - [ ] 7.2 Si l'événement a des photos et n'est pas en teaser flouté privé, afficher une section "Galerie photos" en bas de page avant le Footer.

- [ ] **Task 8 — Tests Unitaires et d'Intégration (AC6)**
  - [ ] 8.1 Écrire `src/app/api/events/[id]/gallery/route.test.ts` : test GET, test POST (succès, format invalide, taille max dépassée, non authentifié).
  - [ ] 8.2 Écrire `src/app/api/events/[id]/gallery/[photoId]/route.test.ts` : test DELETE par Admin (succès), test DELETE par propriétaire (succès), test DELETE par un autre membre (rejet 403).
  - [ ] 8.3 Écrire `src/components/features/events/EventGallery.test.tsx` : tests de rendu, clic image, affichage du bouton supprimer.
  - [ ] 8.4 Exécuter `npm run build` et `npx vitest run` pour valider l'absence de régressions.

---

## Dev Notes

### Architecture & Patterns à suivre

- **Langue du projet** : Tout en **français** (UI, messages d'erreur, logs d'audit, commentaires).
- **Next.js 16 / React 19 / App Router** : `params` est une promesse asynchrone (`await params`).
- **Client Prisma** : Importer depuis `@/generated/prisma/client`, et l'instance `prisma` depuis `@/lib/prisma`.
- **Auth.js v5** : Authentification via `const session = await auth()`. Rôle admin vérifié via `(session.user as any).role === "ADMIN"`.
- **Validation d'images avec Sharp** :
  - Formats acceptés : `image/jpeg`, `image/png`, `image/webp`
  - Limite de taille : 10 Mo (`10 * 1024 * 1024` octets)
  - Redimensionnement : `sharp(inputBuffer).resize(1200, 800, { fit: "inside", withoutEnlargement: true })`
- **Gestion des médias et stockage VPS** :
  - Utiliser `getMediaStoragePath()` de `@/lib/media-path`
  - Dossier galerie : `<storage>/events/<eventId>/gallery/`
  - Emplacement relatif stocké dans DB (`filePath`) : `/events/<eventId>/gallery/<filename>`
  - Route d'accès médias : `/api/media/events/<eventId>/gallery/<filename>`

### Existing Code Analysis & Files to Touch

#### Files to UPDATE:
1. `src/lib/media-path.ts`:
   - Ajouter helpers pour le sous-dossier `gallery`.
2. `src/app/(public)/events/[slug]/page.tsx`:
   - Inclure le composant `EventGallery` en mode lecture seule publique pour les événements qui ont des photos.

#### Files to CREATE:
1. `src/app/api/media/events/[eventId]/gallery/[filename]/route.ts`:
   - Endpoint de livraison de fichiers images statiques.
2. `src/app/api/events/[id]/gallery/route.ts`:
   - GET (liste des photos) et POST (upload nouvelle photo).
3. `src/app/api/events/[id]/gallery/[photoId]/route.ts`:
   - DELETE (suppression avec modération / droits d'auteur).
4. `src/components/features/events/EventGallery.tsx`:
   - Composant grille + lightbox.
5. `src/components/features/events/EventGalleryUploadModal.tsx`:
   - Modal d'upload de photo.
6. `src/app/(dashboard)/dashboard/events/[slug]/gallery/page.tsx`:
   - Page d'administration / contribution galerie pour les membres & admins.
7. Test files:
   - `src/app/api/events/[id]/gallery/route.test.ts`
   - `src/app/api/events/[id]/gallery/[photoId]/route.test.ts`
   - `src/components/features/events/EventGallery.test.tsx`

---

## Dev Agent Record

### Agent Model Used

Gemini 3.5 Flash (High) / Antigravity Agent

### Debug Log References

N/A (Nouvelle story créée)

### Completion Notes List

- Story 25-5 générée avec l'ensemble des critères d'acceptation BDD, dev notes, architecture VPS/sharp, et plan de tests complet.

### File List

- `_bmad-output/implementation-artifacts/25-5-galerie-collaborative-post-event.md` (nouveau)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (mis à jour : `25-5-galerie-collaborative-post-event: ready-for-dev`)
