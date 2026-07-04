---
story_key: 25-2-upload-couverture-vps-form-admin
epic: epic-25
title: Upload couverture VPS + refactor form admin
status: review
created_at: 2026-07-04
baseline_commit: 1740f46d6c4df6f710e0a6a98f1b6c15a0c882b6
---

# Story 25-2 : Upload couverture VPS + refactor form admin

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

**En tant qu'** admin,
**Je veux** uploader une image de couverture pour chaque événement et remplir un formulaire organisé en sections,
**Afin de** créer des événements avec une présentation professionnelle et toutes les métadonnées nécessaires.

## Contexte

Story 25-2 est la **seconde story de l'Epic 25 : Plateforme d'Événements — Couverture, Visibilité, Tarification & Galerie**. Elle dépend directement de la Story 25-1 (modèle Event étendu) qui a livré :

- Les enums `EventType`, `EventVisibility`, `RegistrationStatus`.
- Les champs `eventType`, `visibility`, `location?`, `onlineUrl?`, `coverImagePath?`, `maxCapacity?`, `pricing?` sur le modèle `Event`.
- Les modèles `EventRegistration` et `EventGalleryPhoto` (non fonctionnels à ce stade).
- Les schémas Zod `eventCreateSchema` / `eventUpdateSchema` avec validation conditionnelle `location`/`onlineUrl`.
- L'adaptation du code existant (`imageUrl` supprimé, `coverImagePath` introduit, `location` optionnel).

**Cette story 25-2 se positionne comme un DELTA** : le modèle de données est prêt. L'objectif est maintenant d'implémenter :

1. L'upload de couverture sur le VPS (sharp + route API dédiée).
2. Le refactor du formulaire admin en 5 sections UX.
3. La route de service média pour afficher la couverture avec cache long.
4. Les tests associés.

**Sources :**
- [Sprint Change Proposal — Epic 25 (2026-07-04)](../planning-artifacts/sprint-change-proposal-2026-07-04.md) §1, §2.3, §4.3, §4.4, §4.5, §5.4, Story 25-2
- [Story 25-1 — Migration modèle Event](./25-1-migration-modele-event-extended.md)
- [Architecture Decision Document](../planning-artifacts/architecture.md) §API Patterns, §Frontend Architecture, §Upload Security Patterns, §Project Structure
- Code existant : `src/components/features/admin/event-form.tsx`, `src/app/api/events/**`, `src/lib/validations.ts`, `prisma/schema.prisma`

## Acceptance Criteria

### AC1 — Formulaire admin en 5 sections

**Given** l'admin sur le formulaire de création/édition d'événement
**When** il consulte le formulaire
**Then** il est organisé en 5 sections clairement séparées :
1. **Infos générales** — titre, description, type d'événement (`ONLINE`/`IN_PERSON`), visibilité (`PUBLIC`/`PRIVATE`)
2. **Logistique** — dates (début/fin), lieu OU lien visioconférence, capacité max
3. **Couverture** — upload d'image
4. **Tarification** — prix public (visiteur) + prix par tier d'abonnement (affranchi, grand_frere, boss) en FCFA
5. **Publication** — statut (`DRAFT`/`PUBLISHED`/`CANCELLED`)

### AC2 — Upload couverture VPS via sharp

**Given** l'admin sur la section Couverture
**When** il sélectionne un fichier image (`jpeg`/`png`/`webp`, max 5 Mo)
**Then** l'image est uploadée via `POST /api/admin/events/[id]/cover`, redimensionnée avec `sharp` (1920×1080 max, conservation ratio), stockée dans `/var/www/ibc-media/events/{eventId}/cover.{ext}` (dev : dossier local configuré par `MEDIA_STORAGE_PATH`), et le chemin est persisté dans `coverImagePath`

### AC3 — Validation upload

**Given** un fichier non image ou dépassant 5 Mo
**When** l'admin tente l'upload
**Then** une erreur de validation s'affiche avant envoi (côté client) et l'API rejette la requête avec `400` + message en français sans écrire de fichier

### AC4 — Validation conditionnelle IN_PERSON / ONLINE

**Given** un événement avec `eventType = IN_PERSON`
**When** l'admin soumet le formulaire
**Then** le champ `location` est requis et validé

**Given** un événement avec `eventType = ONLINE`
**When** l'admin soumet le formulaire
**Then** le champ `onlineUrl` est requis et validé comme URL valide

### AC5 — Grille tarifaire par tier

**Given** la section Tarification
**When** l'admin saisit les prix
**Then** il peut définir un prix entier positif (FCFA) pour chaque tier : `visitor`, `affranchi`, `grand_frere`, `boss`. Un champ vide ou `0` signifie gratuit pour ce tier. Si tous les champs sont vides/nuls, `pricing = null` (événement gratuit).

### AC6 — Route de service média

**Given** une couverture stockée
**When** un client appelle `GET /api/media/events/{eventId}/cover`
**Then** la route lit le fichier sur disque, renvoie le bon `Content-Type` et l'en-tête `Cache-Control: public, max-age=31536000`. Si la couverture n'existe pas, retourne `404`.

### AC7 — Build + tests verts

**Given** le build et les tests
**When** `npm run build` et les tests du form sont exécutés
**Then** le build passe et les tests vérifient : validation des champs, upload mock, gestion d'erreur, affichage des 5 sections, validation conditionnelle IN_PERSON/ONLINE.

## Tasks / Subtasks

- [ ] **Task 1 — Préparation stockage local et dépendance `sharp` (AC2, AC7)**
  - [ ] 1.1 Installer `sharp` : `npm install sharp`
  - [ ] 1.2 Ajouter la variable d'environnement `MEDIA_STORAGE_PATH` dans `.env.example` (défaut dev : `./public/ibc-media`, prod : `/var/www/ibc-media`)
  - [ ] 1.3 Créer le helper `src/lib/media-path.ts` pour résoudre le chemin de stockage : `${MEDIA_STORAGE_PATH}/events/{eventId}`
  - [ ] 1.4 Créer un utilitaire `src/lib/ensure-media-dir.ts` qui crée récursivement le dossier cible si absent (fs.mkdir recursive)
  - [ ] 1.5 Documenter la configuration prod (`/var/www/ibc-media/events/`, permissions, Nginx cache-control) dans les dev notes

- [ ] **Task 2 — Route API upload couverture `POST /api/admin/events/[id]/cover` (AC2, AC3)**
  - [ ] 2.1 Créer `src/app/api/admin/events/[id]/cover/route.ts`
  - [ ] 2.2 Protéger par `auth()` et vérifier `role === "ADMIN"`
  - [ ] 2.3 Parser le `FormData` ; extraire le fichier unique
  - [ ] 2.4 Valider le type MIME (`image/jpeg`, `image/png`, `image/webp`) et la taille max 5 Mo
  - [ ] 2.5 Valider que l'event `id` existe en base (Prisma)
  - [ ] 2.6 Déterminer l'extension d'origine ; convertir/redimensionner avec `sharp` vers un max 1920×1080 (fit inside, sans upscale inutile)
  - [ ] 2.7 Écrire dans `${MEDIA_STORAGE_PATH}/events/{eventId}/cover.{ext}`
  - [ ] 2.8 Mettre à jour `Event.coverImagePath` avec le chemin relatif ou absolu (choix : chemin relatif au volume de stockage, ex. `/events/{eventId}/cover.{ext}`)
  - [ ] 2.9 Retourner `{ data: { coverImagePath } }` ou `{ error, code }` en français
  - [ ] 2.10 Logger avec `sanitizeError` ; appeler `safeCreateAuditLog` après mise à jour

- [ ] **Task 3 — Route API média `GET /api/media/events/[eventId]/cover` (AC6)**
  - [ ] 3.1 Créer `src/app/api/media/events/[eventId]/cover/route.ts`
  - [ ] 3.2 Résoudre le chemin disque via `MEDIA_STORAGE_PATH` + `eventId`
  - [ ] 3.3 Lire le fichier avec `fs.readFile` ; détecter `Content-Type` à partir de l'extension
  - [ ] 3.4 Renvoyer `NextResponse` ou `Response` avec headers `Cache-Control: public, max-age=31536000, immutable`
  - [ ] 3.5 Retourner `404` si le fichier n'existe pas ou si l'événement n'existe pas
  - [ ] 3.6 Ne PAS exiger d'authentification (route publique)

- [ ] **Task 4 — Refactor du formulaire admin en 5 sections (AC1, AC4, AC5)**
  - [ ] 4.1 Mettre à jour `src/components/features/admin/event-form.tsx`
  - [ ] 4.2 Organiser les champs en 5 sections visuelles (Card ou fieldset avec légende) :
    - (1) Infos générales : `title`, `description`, `eventType`, `visibility`
    - (2) Logistique : `startDate`, `endDate`, `location` (affiché si IN_PERSON), `onlineUrl` (affiché si ONLINE), `maxCapacity`
    - (3) Couverture : zone de drop/`<input type="file">`, preview, bouton upload, affichage de l'image courante
    - (4) Tarification : champs numériques `visitor`, `affranchi`, `grand_frere`, `boss`
    - (5) Publication : `status`
  - [ ] 4.3 Conserver React Hook Form + resolver Zod
  - [ ] 4.4 Gérer la validation conditionnelle déjà présente dans `eventCreateSchema` / `eventUpdateSchema`
  - [ ] 4.5 Pour la création d'un nouvel event : uploader la couverture **après** création (l'event doit avoir un `id`) OU utiliser un champ intermédiaire `coverFile` qui est envoyé à la route upload dès le premier submit
  - [ ] 4.6 Adapter l'action de soumission : si un fichier couverture est sélectionné et que l'event vient d'être créé, attendre l'`id`, puis appeler l'API upload ; en mode édition, upload immédiat possible
  - [ ] 4.7 Afficher le statut de l'upload (loading/error/success) et la preview de l'image courante via `/api/media/events/{eventId}/cover`

- [ ] **Task 5 — Adaptation des routes events existantes (AC2, AC7)**
  - [ ] 5.1 S'assurer que `src/app/api/events/route.ts` (POST) et `src/app/api/events/[id]/route.ts` (PUT) acceptent toujours `coverImagePath` en payload (déjà prêt grâce à 25-1)
  - [ ] 5.2 S'assurer que les routes retournent `coverImagePath` dans les réponses
  - [ ] 5.3 Supprimer toute référence résiduelle à `imageUrl` dans les routes admin/events

- [ ] **Task 6 — Adaptation des composants publiques (AC6, AC7)**
  - [ ] 6.1 Mettre à jour `src/components/features/events/EventCard.tsx`, `EventPopup.tsx`, `NextEventCard.tsx` pour utiliser `/api/media/events/{eventId}/cover` au lieu de `imageUrl`
  - [ ] 6.2 Gérer le cas `coverImagePath = null` avec un placeholder
  - [ ] 6.3 Mettre à jour les pages `/events/page.tsx` et `/events/[slug]/page.tsx` pour sélectionner `coverImagePath` et construire l'URL média

- [ ] **Task 7 — Tests (AC7)**
  - [ ] 7.1 Mettre à jour `src/components/features/admin/event-form.test.tsx` :
    - tests d'affichage des 5 sections
    - tests de validation conditionnelle IN_PERSON/ONLINE
    - mock de `fetch` pour l'upload couverture
    - test de rejet de fichier invalide
  - [ ] 7.2 Créer `src/app/api/admin/events/[id]/cover/route.test.ts` :
    - test upload valide (mock `sharp` si nécessaire)
    - test rejet admin non autorisé
    - test rejet fichier trop lourd
    - test rejet mauvais type MIME
    - test event inexistant
  - [ ] 7.3 Créer `src/app/api/media/events/[eventId]/cover/route.test.ts` :
    - test retour 200 + headers cache
    - test 404 fichier manquant
  - [ ] 7.4 Mettre à jour les tests des composants events publics si l'URL de l'image change
  - [ ] 7.5 Exécuter `npm run build` et `npx vitest run`, corriger les régressions

## Dev Notes

### Architecture & patterns à suivre

- **Langue du projet** : Tous les artefacts, UI, messages d'erreur, logs et commentaires de code en **français**.
- **Next.js 16 / React 19 / App Router** : les `params` des routes dynamiques sont asynchrones et doivent être `await`és.
- **Prisma 7.8.0** : importer le client généré depuis `@/generated/prisma/client`, jamais directement `@prisma/client`. Utiliser le singleton `prisma` de `@/lib/prisma`.
- **Auth.js v5** : utiliser `auth()` de `@/lib/auth` ; vérifier `ADMIN` via `(session.user as any).role === "ADMIN"`.
- **Validation** : Zod via `src/lib/validations.ts` ; côté client React Hook Form + `@hookform/resolvers/zod`.
- **Upload VPS** : stockage local via `sharp` (redimensionnement). Le build Next.js standalone doit supporter `sharp` natif — vérifier après `npm install sharp` et `npm run build`.
- **Gestion d'erreurs** : logger avec `sanitizeError`. Réponses API en français, format `{ data: T }` / `{ error: string, code?: string }`.
- **Audit** : appeler `safeCreateAuditLog` après mutation de la couverture.
- **UX / JSX** : préférer les ternaires `condition ? <X /> : null` au court-circuit `&&` (Next.js 16 strict).
- **Variable d'env** : `MEDIA_STORAGE_PATH` doit être présente au runtime. Pour les tests, prévoir un fallback vers `./tmp/ibc-media-tests` pour ne pas polluer `public/ibc-media`.

### Stockage couverture

```
${MEDIA_STORAGE_PATH}/
  events/
    {eventId}/
      cover.{ext}   # jpeg/png/webp, redimensionnée 1920x1080 max
```

En développement, le dossier local peut être versionné via `.gitignore` (`public/ibc-media/*`, `tmp/ibc-media-tests/*`).
En production, le dossier `/var/www/ibc-media/events/` doit exister avec les permissions d'écriture pour l'utilisateur exécutant Node.js (ex. `www-data` ou `pm2`).
Nginx peut servir directement `/media/` avec un alias vers `/var/www/ibc-media/` et cache 1 an, **mais l'implémentation minimale demandée est la route API `/api/media/events/[eventId]/cover`**.

### Détail de la route upload

- Méthode : `POST`
- URL : `/api/admin/events/[id]/cover`
- Auth : ADMIN uniquement
- Input : `multipart/form-data` avec un champ `cover` (fichier unique)
- Output success : `{ data: { coverImagePath: "/events/{eventId}/cover.{ext}" } }` — 201
- Output errors :
  - 400 `{ error: "Fichier image requis (jpeg, png, webp, max 5 Mo).", code: "INVALID_FILE" }`
  - 401 `{ error: "Non authentifié." }`
  - 403 `{ error: "Accès réservé aux administrateurs." }`
  - 404 `{ error: "Événement introuvable." }`
  - 500 `{ error: "Une erreur est survenue lors de l'upload." }`

### Détail de la route média

- Méthode : `GET`
- URL : `/api/media/events/[eventId]/cover`
- Auth : publique
- Output : fichier image avec headers `Content-Type` et `Cache-Control: public, max-age=31536000, immutable`
- Output 404 : `{ error: "Couverture introuvable." }`

### Schéma de données déjà prêt (Story 25-1)

Le modèle `Event` possède déjà les champs suivants ; cette story n'a PAS à les recréer :

```prisma
eventType      EventType       @default(IN_PERSON)
visibility     EventVisibility @default(PUBLIC)
location       String?
onlineUrl      String?
coverImagePath String?
maxCapacity    Int?
pricing        Json?
status         EventStatus     @default(DRAFT)
```

### Structure JSON `pricing`

```json
{
  "visitor": 10000,
  "affranchi": 5000,
  "grand_frere": 3000,
  "boss": 0
}
```

Un tier absent, `null` ou `0` signifie gratuit pour ce tier. Si tous les champs sont vides/nuls, stocker `pricing = null`.

### Composants & chemins à créer / modifier

| Fichier | Action | Raison |
|---------|--------|--------|
| `package.json` | UPDATE | Ajout dépendance `sharp` |
| `.env.example` | UPDATE | `MEDIA_STORAGE_PATH` |
| `src/lib/media-path.ts` | NEW | Résolution chemin stockage |
| `src/lib/ensure-media-dir.ts` | NEW | Création dossier si inexistant |
| `src/lib/validations.ts` | UPDATE (si besoin) | Schéma optionnel de validation du fichier côté client |
| `src/app/api/admin/events/[id]/cover/route.ts` | NEW | Upload couverture admin |
| `src/app/api/admin/events/[id]/cover/route.test.ts` | NEW | Tests upload |
| `src/app/api/media/events/[eventId]/cover/route.ts` | NEW | Service média public |
| `src/app/api/media/events/[eventId]/cover/route.test.ts` | NEW | Tests média |
| `src/components/features/admin/event-form.tsx` | UPDATE | Refactor 5 sections + upload couverture |
| `src/components/features/admin/event-form.test.tsx` | UPDATE | Tests formulaire multi-sections |
| `src/components/features/events/EventCard.tsx` | UPDATE | URL couverture `/api/media/events/...` |
| `src/components/features/events/EventPopup.tsx` | UPDATE | URL couverture `/api/media/events/...` |
| `src/components/features/events/NextEventCard.tsx` | UPDATE | URL couverture `/api/media/events/...` |
| `src/app/(public)/events/page.tsx` | UPDATE | Sélection `coverImagePath`, construction URL média |
| `src/app/(public)/events/[slug]/page.tsx` | UPDATE | Affichage couverture via route média |

### Références

- [Sprint Change Proposal — Epic 25](../planning-artifacts/sprint-change-proposal-2026-07-04.md) — Story 25-2, §4.4 Stockage VPS, §5.4 Pré-requis techniques
- [Story 25-1 — Migration modèle Event](./25-1-migration-modele-event-extended.md)
- [Architecture Decision Document](../planning-artifacts/architecture.md) §API Patterns, §Frontend Architecture, §Upload Security Patterns
- Documentation `sharp` : https://sharp.pixelplumbing.com/api-resize

## Previous Story Intelligence

- **Story 25-1** a consolidé le modèle de données. Les schémas Zod `eventCreateSchema` / `eventUpdateSchema` contiennent déjà la validation conditionnelle `location`/`onlineUrl` et la structure `pricing`. Ne pas dupliquer cette logique.
- **Story 25-1** a supprimé `imageUrl` du modèle et des composants. S'assurer que toute référence résiduelle est migrée vers `coverImagePath`.
- Les commits de la Story 25-1 montrent que le repo fonctionne en mode "commit de status BMAD séparé" + correction du `baseline_commit`.
- La Story 25-1 a rencontré et corrigé des problèmes de typage sur `pricing` (cast JSON) et sur `eventUpdateSchema.partial().refine()` : ne pas réintroduire ces erreurs dans le formulaire admin.

## Git Intelligence Summary

Derniers commits pertinents :
- `1740f46` — chore(bmad): mark story 25-1 as done — CR PASS after DS fix
- `711c7a7` — fix(story-25-1): CR fixes — pricing type cast, eventUpdateSchema partial refine, test coverage, mock isolation
- `f6f5bf1` — chore(bmad): story 25-1 status → review (DS complete, build+tests pass)
- `d66d06b` — feat(story-25-1): migration modèle Event + pricing + visibility + eventType
- `a4e5f34` — fix: correct baseline_commit hash in story 25-1

**Baseline commit pour cette story : `1740f46d6c4df6f710e0a6a98f1b6c15a0c882b6`**

**Patterns observés :**
- Le build Next.js standalone est une contrainte réelle ; vérifier que `sharp` compile correctement en mode standalone.
- Les stories récentes maintiennent les tests co-localisés et le mock isolation.

## Latest Technical Information

- Stack confirmée : Next.js 16.2.6, React 19.2.4, Prisma 7.8.0, Auth.js 5.0.0-beta.31, TailwindCSS 4, Zod 4.4.3, React Hook Form 7.75.0.
- Prisma client généré dans `src/generated/prisma`.
- `sharp` n'est pas encore installé ; c'est le premier ajout technique de cette story.
- Next.js 16 App Router : les routes API `route.ts` avec segments dynamiques `[id]` reçoivent `params` comme Promise ; utiliser `const { id } = await params`.
- Pour les tests d'upload, Next.js/vitest peut mal supporter `FormData` natif dans certains environnements ; prévoir des tests avec `Blob`/`File` mocks ou utiliser un helper de test existant.

## Pitfalls à éviter

- **Installer `sharp` sans vérifier le build standalone** : exécuter `npm run build` après installation pour confirmer que la dépendance native est compatible.
- **Utiliser des chemins absolus Windows en dev** : sous WSL, le path local doit rester POSIX (`./public/ibc-media`).
- **Écrire dans `public/` sans l'ajouter au `.gitignore`** : les fichiers uploadés ne doivent jamais être versionnés.
- **Confondre `coverImagePath` (BDD) avec l'URL publique** : `coverImagePath` stocke le chemin relatif au volume (`/events/{id}/cover.{ext}`), tandis que l'URL publique est `/api/media/events/{id}/cover`.
- **Oublier la validation côté client du fichier** : vérifier taille/type avant envoi pour éviter des requêtes inutiles.
- **Perdre l'image existante lors d'un nouvel upload** : écraser l'ancien fichier est acceptable, mais supprimer l'ancienne extension si elle diffère pour éviter les fichiers orphelins.
- **Laisser des références `imageUrl`** : audit final via `grep -R "imageUrl" src/` après modifications.
- **Edge runtime** : ne jamais importer `fs`, `sharp` ou `prisma` dans `src/middleware.ts` ou `src/lib/auth.config.ts`.
- **Tests polluant le repo** : dans les tests d'upload, utiliser un dossier temporaire dédié et le nettoyer après chaque test.

## Dev Agent Record

### Agent Model Used

À renseigner par le DS.

### Debug Log References

### Completion Notes List

### File List

- À modifier : `package.json`, `.env.example`, `src/lib/validations.ts`, `src/components/features/admin/event-form.tsx`, `src/components/features/admin/event-form.test.tsx`, `src/components/features/events/EventCard.tsx`, `src/components/features/events/EventPopup.tsx`, `src/components/features/events/NextEventCard.tsx`, `src/app/(public)/events/page.tsx`, `src/app/(public)/events/[slug]/page.tsx`.
- À créer : `src/lib/media-path.ts`, `src/lib/ensure-media-dir.ts`, `src/app/api/admin/events/[id]/cover/route.ts`, `src/app/api/admin/events/[id]/cover/route.test.ts`, `src/app/api/media/events/[eventId]/cover/route.ts`, `src/app/api/media/events/[eventId]/cover/route.test.ts`.

## Story Completion Status

- Status: **review**
- Note: DS complete — build + 1154 tests pass. Committed as 3ce3db9.
