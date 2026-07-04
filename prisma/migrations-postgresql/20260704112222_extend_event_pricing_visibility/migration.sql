-- Migration PostgreSQL : extension du modèle Event + EventRegistration + EventGalleryPhoto
--
-- Avertissement : la colonne `imageUrl` de la table `events` est supprimée.
-- L'événement existant perdra sa couverture (comportement attendu, l'admin re-uploadera via Story 25-2).

-- Enums spécifiques à Epic 25
CREATE TYPE "EventType" AS ENUM ('ONLINE', 'IN_PERSON');
CREATE TYPE "EventVisibility" AS ENUM ('PUBLIC', 'PRIVATE');
CREATE TYPE "RegistrationStatus" AS ENUM ('REGISTERED', 'ATTENDED', 'CANCELLED', 'NO_SHOW');

-- Nouvelle table : inscriptions aux événements
CREATE TABLE "event_registrations" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "tierSnapshot" "Tier" NOT NULL DEFAULT 'AFFRANCHI',
    "amountPaid" INTEGER,
    "payOnSite" BOOLEAN NOT NULL DEFAULT false,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'REGISTERED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_registrations_pkey" PRIMARY KEY ("id")
);

-- Nouvelle table : photos de galerie d'événements
CREATE TABLE "event_gallery_photos" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_gallery_photos_pkey" PRIMARY KEY ("id")
);

-- Modification de la table events : drop imageUrl + ajout des champs Epic 25
ALTER TABLE "events" DROP COLUMN "imageUrl";
ALTER TABLE "events" ADD COLUMN "eventType" "EventType" NOT NULL DEFAULT 'IN_PERSON';
ALTER TABLE "events" ADD COLUMN "visibility" "EventVisibility" NOT NULL DEFAULT 'PUBLIC';
ALTER TABLE "events" ALTER COLUMN "location" DROP NOT NULL;
ALTER TABLE "events" ADD COLUMN "onlineUrl" TEXT;
ALTER TABLE "events" ADD COLUMN "coverImagePath" TEXT;
ALTER TABLE "events" ADD COLUMN "maxCapacity" INTEGER;
ALTER TABLE "events" ADD COLUMN "pricing" JSONB;

-- Index supplémentaires sur events
CREATE INDEX "events_visibility_status_startDate_idx" ON "events"("visibility", "status", "startDate");

-- Index et contraintes sur les nouvelles tables
CREATE INDEX "event_registrations_eventId_status_idx" ON "event_registrations"("eventId", "status");
CREATE UNIQUE INDEX "event_registrations_eventId_userId_key" ON "event_registrations"("eventId", "userId");
CREATE UNIQUE INDEX "event_registrations_eventId_email_key" ON "event_registrations"("eventId", "email");

CREATE INDEX "event_gallery_photos_eventId_createdAt_idx" ON "event_gallery_photos"("eventId", "createdAt");

-- Clés étrangères
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "event_gallery_photos" ADD CONSTRAINT "event_gallery_photos_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_gallery_photos" ADD CONSTRAINT "event_gallery_photos_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
