---
story_key: 25-1-migration-modele-event-extended
epic: epic-25
title: Migration modèle Event + pricing + visibility + eventType
status: ready-for-dev
created_at: 2026-07-04
baseline_commit: 0ced548afdca7ca1ee4d48fce7191f82190ca534
---

# Story 25-1 : Migration modèle Event + pricing + visibility + eventType

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

**En tant qu'** admin,
**Je veux** que le modèle Event supporte le type d'événement, la visibilité, la tarification et la capacité,
**Afin de** pouvoir créer des événements différenciés (en ligne/présentiel, public/privé, payant/gratuit).

## Contexte

Cette story est la première de l'**Epic 25 : Plateforme d'Événements — Couverture, Visibilité, Tarification & Galerie**. Elle constitue la fondation de données pour toutes les stories suivantes (25-2 à 25-6). Elle étend le modèle Event créé dans Epic 12 et ajoute les modèles `EventRegistration` et `EventGalleryPhoto` sans les implémenter fonctionnellement (seule la structure Prisma + types + validations est livrée ici).

**Sources :**
- [Sprint Change Proposal — Epic 25 (2026-07-04)](../planning-artifacts/sprint-change-proposal-2026-07-04.md) §4.3, §4.5, Story 25-1
- [epics.md](../planning-artifacts/epics.md)
- [architecture.md](../planning-artifacts/architecture.md)
- Code existant Epic 12 : `prisma/schema.prisma`, `prisma/schema.dev.prisma`, `src/lib/validations.ts`, `src/app/api/events/**`, `src/components/features/admin/event-form.tsx`, `src/components/features/events/EventCard.tsx`, etc.

## Acceptance Criteria

### AC1 — Extension du modèle Prisma Event

**Given** le schéma Prisma actuel avec le modèle Event basique
**When** la migration est exécutée
**Then** le modèle Event inclut :
- `eventType` (`EventType` enum, default `IN_PERSON`)
- `visibility` (`EventVisibility` enum, default `PUBLIC`)
- `location` (String, devient optionnel)
- `onlineUrl` (String?, requis si `eventType = ONLINE`)
- `coverImagePath` (String?, remplace `imageUrl`)
- `maxCapacity` (Int?, > 0)
- `pricing` (Json?, structure tarifaire validée)

**And** les nouveaux modèles `EventRegistration` et `EventGalleryPhoto` sont créés avec leurs relations
**And** le modèle `User` reçoit les relations `eventRegistrations` et `galleryPhotos`

### AC2 — Drop/renommage de `imageUrl`

**Given** un événement existant en base avec `imageUrl`
**When** la migration s'exécute
**Then** le champ `imageUrl` est supprimé/renommé et l'event existant n'a plus de couverture (l'admin re-uploadera via Story 25-2)

### AC3 — Génération des types TypeScript

**Given** les nouveaux enums `EventType`, `EventVisibility`, `RegistrationStatus`
**When** `npx prisma generate` est exécuté
**Then** les types sont disponibles dans `@/generated/prisma/client` et utilisables dans les routes/components/tests

### AC4 — Schémas Zod à jour

**Given** les schémas de validation Zod
**When** ils sont mis à jour
**Then** `eventCreateSchema` et `eventUpdateSchema` incluent : `eventType`, `visibility`, `location` (optionnel), `onlineUrl` (optionnel), `maxCapacity` (optionnel), `pricing` (optionnel, structure JSON validée), `coverImagePath` (optionnel)
**And** la validation exige `location` si `eventType = IN_PERSON` et `onlineUrl` si `eventType = ONLINE`

### AC5 — Rétro-compatibilité build + tests

**Given** le build et les tests
**When** `npm run build` et `npx vitest run` sont exécutés
**Then** le build passe et les tests existants restent verts (composants, routes API et pages événements doivent être adaptés aux nouveaux champs)

## Tasks / Subtasks

- [ ] **Task 1 — Modèle Prisma (AC1, AC2, AC3)**
  - [ ] 1.1 Ajouter les enums dans `prisma/schema.prisma` et `prisma/schema.dev.prisma` :
    ```prisma
    enum EventType {
      ONLINE
      IN_PERSON
    }

    enum EventVisibility {
      PUBLIC
      PRIVATE
    }

    enum RegistrationStatus {
      REGISTERED
      ATTENDED
      CANCELLED
      NO_SHOW
    }
    ```
  - [ ] 1.2 Étendre le modèle `Event` avec `eventType`, `visibility`, `location?`, `onlineUrl?`, `coverImagePath?`, `maxCapacity?`, `pricing?`
  - [ ] 1.3 Créer `model EventRegistration` avec `eventId`, `userId?`, `email`, `tierSnapshot`, `amountPaid?`, `payOnSite`, `status`
  - [ ] 1.4 Créer `model EventGalleryPhoto` avec `eventId`, `uploadedById`, `filePath`, `caption?`
  - [ ] 1.5 Ajouter les relations `eventRegistrations` et `galleryPhotos` sur `User`
  - [ ] 1.6 Supprimer/renommer `imageUrl` sur `Event`
  - [ ] 1.7 Synchroniser `prisma/schema.prisma` (PostgreSQL) et `prisma/schema.dev.prisma` (SQLite)
  - [ ] 1.8 Créer les migrations : `npx prisma migrate dev --name extend_event_pricing_visibility` sur les deux schémas
  - [ ] 1.9 Exécuter `npx prisma generate`

- [ ] **Task 2 — Schémas Zod (AC4)**
  - [ ] 2.1 Mettre à jour `baseEventSchema` dans `src/lib/validations.ts` avec les nouveaux champs
  - [ ] 2.2 Ajouter la validation conditionnelle `location` requis si `IN_PERSON`, `onlineUrl` requis si `ONLINE`
  - [ ] 2.3 Valider la structure JSON de `pricing` : `{ visitor?, affranchi?, grand_frere?, boss? }` avec montants entiers positifs ou null
  - [ ] 2.4 Conserver la règle `endDate >= startDate`
  - [ ] 2.5 Exporter/actualiser `EventCreateInput` et `EventUpdateInput`

- [ ] **Task 3 — Adapter le code existant aux nouveaux champs (AC5)**
  - [ ] 3.1 Mettre à jour `src/app/api/events/route.ts` pour utiliser `coverImagePath` au lieu de `imageUrl` et supporter les nouveaux champs
  - [ ] 3.2 Mettre à jour `src/app/api/events/[id]/route.ts` (GET/PUT/DELETE) pour les nouveaux champs
  - [ ] 3.3 Adapter `src/components/features/admin/event-form.tsx` : champs `eventType`, `visibility`, `onlineUrl`, `maxCapacity`, `pricing`, `coverImagePath`, validation conditionnelle
  - [ ] 3.4 Adapter `src/components/features/admin/events-list-table.tsx` : colonnes optionnelles et null-safety sur `location`
  - [ ] 3.5 Adapter `src/components/features/events/EventCard.tsx`, `EventPopup.tsx`, `NextEventCard.tsx` pour `coverImagePath` et `location` optionnel
  - [ ] 3.6 Adapter les pages publiques `/events/page.tsx` et `/events/[slug]/page.tsx`
  - [ ] 3.7 Adapter le sitemap (`src/app/sitemap.ts`) si nécessaire

- [ ] **Task 4 — Tests (AC5)**
  - [ ] 4.1 Mettre à jour `src/components/features/admin/event-form.test.tsx` avec les nouveaux champs/validations
  - [ ] 4.2 Mettre à jour `src/components/features/admin/events-list-table.test.tsx`
  - [ ] 4.3 Mettre à jour `src/app/api/events/route.test.ts` et `src/app/api/events/[id]/route.test.ts`
  - [ ] 4.4 Mettre à jour `src/components/features/events/*.test.tsx` si `location` ou `imageUrl` y sont utilisés
  - [ ] 4.5 Exécuter `npm run build` et `npx vitest run`, corriger les régressions

## Dev Notes

### Architecture & patterns à suivre

- **Langue du projet** : Tous les artefacts, UI, messages d'erreur, logs et commentaires de code en **français**.
- **Next.js 16 / React 19 / App Router** : les paramètres dynamiques `params` sont asynchrones et doivent être `await`és.
- **Prisma 7.8.0** : importer le client généré depuis `@/generated/prisma/client`, jamais directement `@prisma/client`. Utiliser le singleton `prisma` de `@/lib/prisma`.
- **Schémas Prisma** : maintenir `prisma/schema.prisma` (PostgreSQL cible) et `prisma/schema.dev.prisma` (SQLite dev) strictement synchronisés (mêmes enums/modèles).
- **Auth.js v5** : utiliser `auth()` de `@/lib/auth` ; vérifier `ADMIN` via `(session.user as any).role === "ADMIN"`.
- **Validation** : Zod via `src/lib/validations.ts` ; côté client React Hook Form + `@hookform/resolvers/zod`.
- **Gestion d'erreurs** : logger avec `sanitizeError`. Réponses API en français, format `{ data: T }` / `{ error: string, code?: string }`.
- **Audit** : appeler `safeCreateAuditLog` après mutations si pertinent (ici, la migration elle-même n'écrit pas d'audit log).
- **UX / JSX** : préférer les ternaires `condition ? <X /> : null` au court-circuit `&&` (Next.js 16 strict).
- **Enums Prisma** : les valeurs d'enum sont en UPPER_SNAKE_CASE. Caster les strings validées vers les types Prisma si besoin.

### Schéma Prisma cible

```prisma
enum EventType {
  ONLINE
  IN_PERSON
}

enum EventVisibility {
  PUBLIC
  PRIVATE
}

enum RegistrationStatus {
  REGISTERED
  ATTENDED
  CANCELLED
  NO_SHOW
}

model Event {
  id             String          @id @default(cuid())
  title          String
  slug           String          @unique
  description    String
  startDate      DateTime
  endDate        DateTime?
  eventType      EventType       @default(IN_PERSON)
  visibility     EventVisibility @default(PUBLIC)
  location       String?         // requis si IN_PERSON
  onlineUrl      String?         // requis si ONLINE
  coverImagePath String?         // remplace imageUrl
  maxCapacity    Int?
  pricing        Json?           // { visitor?, affranchi?, grand_frere?, boss? }
  status         EventStatus     @default(DRAFT)
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
  authorId       String
  author         User            @relation(fields: [authorId], references: [id], onDelete: Cascade)
  registrations  EventRegistration[]
  galleryPhotos  EventGalleryPhoto[]

  @@index([startDate])
  @@index([status, startDate])
  @@index([visibility, status, startDate])
  @@map("events")
}

model EventRegistration {
  id           String             @id @default(cuid())
  eventId      String
  userId       String?
  email        String
  tierSnapshot Tier               @default(AFFRANCHI)
  amountPaid   Int?
  payOnSite    Boolean            @default(false)
  status       RegistrationStatus @default(REGISTERED)
  createdAt    DateTime           @default(now())
  event        Event              @relation(fields: [eventId], references: [id], onDelete: Cascade)
  user         User?              @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@unique([eventId, userId])
  @@unique([eventId, email])
  @@index([eventId, status])
  @@map("event_registrations")
}

model EventGalleryPhoto {
  id           String   @id @default(cuid())
  eventId      String
  uploadedById String
  filePath     String
  caption      String?
  createdAt    DateTime @default(now())
  event        Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  uploader     User     @relation(fields: [uploadedById], references: [id], onDelete: Cascade)

  @@index([eventId, createdAt])
  @@map("event_gallery_photos")
}
```

Relations à ajouter sur `User` :

```prisma
  eventRegistrations  EventRegistration[]
  galleryPhotos       EventGalleryPhoto[]
```

### Schémas Zod cibles

```typescript
const eventImagePathSchema = z
  .string()
  .trim()
  .refine(
    (val) => val === "" || val.startsWith("/") || z.string().url().safeParse(val).success,
    { message: "Le chemin de couverture doit être une URL valide ou un chemin local" }
  )
  .transform((val) => (val === "" ? null : val))
  .optional()
  .nullable();

const eventPricingSchema = z
  .object({
    visitor: z.number().int().nonnegative().nullable().optional(),
    affranchi: z.number().int().nonnegative().nullable().optional(),
    grand_frere: z.number().int().nonnegative().nullable().optional(),
    boss: z.number().int().nonnegative().nullable().optional(),
  })
  .optional()
  .nullable();

const baseEventSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(10).max(5000),
  startDate: z.string().datetime("Date de début invalide"),
  endDate: z
    .string()
    .datetime("Date de fin invalide")
    .optional()
    .nullable()
    .or(z.literal("")),
  eventType: z.enum(["ONLINE", "IN_PERSON"]).default("IN_PERSON"),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).default("PUBLIC"),
  location: z.string().trim().max(200).optional().nullable().or(z.literal("")),
  onlineUrl: z
    .string()
    .trim()
    .url("URL de visioconférence invalide")
    .max(500)
    .optional()
    .nullable()
    .or(z.literal("")),
  maxCapacity: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z.number().int().positive("La capacité doit être un nombre entier positif").nullable().optional()
  ),
  pricing: eventPricingSchema,
  coverImagePath: eventImagePathSchema,
});

export const eventCreateSchema = baseEventSchema
  .refine(
    (data) => data.eventType !== "IN_PERSON" || (data.location && data.location.trim().length > 0),
    { message: "Le lieu est requis pour un événement en présentiel", path: ["location"] }
  )
  .refine(
    (data) => data.eventType !== "ONLINE" || (data.onlineUrl && data.onlineUrl.trim().length > 0),
    { message: "Le lien visio est requis pour un événement en ligne", path: ["onlineUrl"] }
  )
  .refine(
    (data) => !data.endDate || new Date(data.endDate).getTime() >= new Date(data.startDate).getTime(),
    { message: "La date de fin doit être postérieure ou égale à la date de début", path: ["endDate"] }
  );

export const eventUpdateSchema = baseEventSchema
  .partial()
  .extend({
    status: z.enum(["DRAFT", "PUBLISHED", "CANCELLED"], { message: "Statut invalide" }).optional(),
  })
  .refine(
    (data) => !data.endDate || !data.startDate || new Date(data.endDate).getTime() >= new Date(data.startDate).getTime(),
    { message: "La date de fin doit être postérieure ou égale à la date de début", path: ["endDate"] }
  );
```

### Composants & chemins à créer / modifier

| Fichier | Action | Raison |
|---------|--------|--------|
| `prisma/schema.prisma` | UPDATE | Enums + modèles Event/Registration/Gallery + relations User |
| `prisma/schema.dev.prisma` | UPDATE | Synchronisation SQLite |
| `src/lib/validations.ts` | UPDATE | `baseEventSchema`, `eventCreateSchema`, `eventUpdateSchema`, types |
| `src/app/api/events/route.ts` | UPDATE | POST/GET utilisent nouveaux champs |
| `src/app/api/events/[id]/route.ts` | UPDATE | GET/PUT/DELETE utilisent nouveaux champs |
| `src/components/features/admin/event-form.tsx` | UPDATE | Champs eventType/visibility/onlineUrl/maxCapacity/pricing/coverImagePath |
| `src/components/features/admin/events-list-table.tsx` | UPDATE | `location` optionnel |
| `src/components/features/events/EventCard.tsx` | UPDATE | `coverImagePath`, `location` optionnel |
| `src/components/features/events/EventPopup.tsx` | UPDATE | `coverImagePath`, `location` optionnel |
| `src/components/features/events/NextEventCard.tsx` | UPDATE | `coverImagePath`, `location` optionnel |
| `src/app/(public)/events/page.tsx` | UPDATE | Sélection `coverImagePath`, `location` optionnel |
| `src/app/(public)/events/[slug]/page.tsx` | UPDATE | `coverImagePath`, `location` optionnel |
| `src/app/sitemap.ts` | UPDATE | Si sélection d'`imageUrl` |
| `src/app/api/events/route.test.ts` | UPDATE | Nouveaux champs dans les payloads |
| `src/app/api/events/[id]/route.test.ts` | UPDATE | Nouveaux champs dans les payloads |
| `src/components/features/admin/event-form.test.tsx` | UPDATE | Nouveaux champs/validation |
| `src/components/features/admin/events-list-table.test.tsx` | UPDATE | Données de test sans `imageUrl` |
| `src/components/features/events/*.test.tsx` | UPDATE | Données de test compatibles |

### Références

- [Sprint Change Proposal — Epic 25](../planning-artifacts/sprint-change-proposal-2026-07-04.md)
- [Epic 25 & acceptance criteria](../planning-artifacts/epics.md)
- [Architecture Decision Document](../planning-artifacts/architecture.md)
- Story précédente Epic 12 : [12-1-modele-event-crud-admin.md](./12-1-modele-event-crud-admin.md)
- Code existant : `prisma/schema.prisma`, `src/lib/validations.ts`, `src/app/api/events/**`, `src/components/features/admin/event-form.tsx`, `src/components/features/events/EventCard.tsx`

## Previous Story Intelligence

- **Story 24-2** (admin members filtering) a consolidé le pattern Prisma `AND: conditions[]` pour combiner plusieurs filtres `OR`. Bien que ce ne soit pas le cœur de la story 25-1, il est pertinent pour les futures requêtes d'inscriptions (Story 25-4).
- Les derniers commits montrent que le repo fonctionne en mode "commit de status BMAD séparé" (`chore(bmad): epic-X in-progress, story X-Y ready-for-dev`).
- Les stories récentes maintiennent les deux schémas Prisma synchronisés (`schema.prisma` + `schema.dev.prisma`).

## Git Intelligence Summary

Derniers commits pertinents :
- `0ced548` — CC: Epic 25 — Plateforme d'Événements (SCP 2026-07-04) + sprint-status entries
- `1a76aa9` — chore(bmad): mark story 24-2 as done — CR PASS after DS fix
- `cf8e003` — fix(story-24-2): CR patches
- `09e17c6` — feat(story-24-2): filtres avancés page admin members

**Patterns observés :** le modèle Event existant date d'Epic 12. L'image actuelle est une URL externe (`imageUrl`). Le passage à `coverImagePath` + upload VPS est explicitement reporté à Story 25-2.

## Latest Technical Information

- Stack confirmée : Next.js 16.2.6, React 19.2.4, Prisma 7.8.0, Auth.js 5.0.0-beta.31, TailwindCSS 4, Zod 4.4.3, React Hook Form 7.75.0.
- Prisma client généré dans `src/generated/prisma`.
- Deux schémas : `prisma/schema.prisma` (PostgreSQL) et `prisma/schema.dev.prisma` (SQLite). Les migrations doivent être produites pour les deux environnements.
- Le projet ne contient pas encore `sharp` ; l'ajout est prévu en Story 25-2.

## Pitfalls à éviter

- **Oublier de synchroniser `schema.dev.prisma`** : tout ajout dans `schema.prisma` doit être répercuté dans `schema.dev.prisma` (seul `datasource.provider` diffère).
- **Conserver `imageUrl`** : il doit être supprimé du modèle Event ; la couverture existante sera perdue (comportement attendu).
- **`location` non nullable** : il devient optionnel, mais les composants/tableaux existants l'attendent comme string. Mettre à jour le typage et le rendu (affichage conditionnel).
- **Validation Zod conditionnelle mal placée** : utiliser `.refine()` sur le schéma final avec `path` correct pour que le message d'erreur apparaisse sur le bon champ.
- **`pricing` non typé** : valider la structure JSON côté Zod pour éviter d'écrire des objets arbitraires en base.
- **Tests cassés par défaut** : les tests existants construisent des objets Event avec `imageUrl` et `location` requis. Les mettre à jour dans la même PR pour garder le build vert.
- **Edge runtime** : ne jamais importer Prisma/bcrypt dans `src/middleware.ts` ou `src/lib/auth.config.ts`.
- **Date parsing** : conserver le helper `toISOdatetime` existant dans `event-form.tsx` pour gérer `datetime-local`.

## Dev Agent Record

### Agent Model Used

À renseigner par le DS.

### Debug Log References

### Completion Notes List

### File List

- À modifier : `prisma/schema.prisma`, `prisma/schema.dev.prisma`, `src/lib/validations.ts`, `src/app/api/events/route.ts`, `src/app/api/events/[id]/route.ts`, `src/components/features/admin/event-form.tsx`, `src/components/features/admin/events-list-table.tsx`, `src/components/features/events/EventCard.tsx`, `src/components/features/events/EventPopup.tsx`, `src/components/features/events/NextEventCard.tsx`, `src/app/(public)/events/page.tsx`, `src/app/(public)/events/[slug]/page.tsx`, `src/app/sitemap.ts`, tests associés.

## Story Completion Status

- Status: **ready-for-dev**
- Note: Ultimate context engine analysis completed — comprehensive developer guide created.
