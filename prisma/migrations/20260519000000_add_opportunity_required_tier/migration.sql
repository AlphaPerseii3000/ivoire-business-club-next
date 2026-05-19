-- Add tier-based visibility to opportunities.
-- Existing rows are backfilled to AFFRANCHI through the non-null default.
ALTER TABLE "opportunities" ADD COLUMN "requiredTier" TEXT NOT NULL DEFAULT 'AFFRANCHI';
