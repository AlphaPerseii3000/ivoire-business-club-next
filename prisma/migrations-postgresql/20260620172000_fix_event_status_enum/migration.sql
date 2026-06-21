-- Drop the composite index first since its column type changes
DROP INDEX IF EXISTS "events_status_startDate_idx";

-- CreateEnum (safely, if it doesn't exist via DO block)
DO $$ BEGIN
    CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Drop default on events.status before type conversion
ALTER TABLE "events" ALTER COLUMN "status" DROP DEFAULT;

-- Convert events.status from text to EventStatus enum using explicit cast
ALTER TABLE "events" ALTER COLUMN "status" TYPE "EventStatus" USING "status"::"EventStatus";

-- Restore default on events.status
ALTER TABLE "events" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- Recreate the composite index
CREATE INDEX "events_status_startDate_idx" ON "events"("status", "startDate");
