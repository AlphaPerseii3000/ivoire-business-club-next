-- Add a dedicated account status for user suspension/reactivation.
ALTER TABLE "users" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE';

CREATE INDEX "users_status_createdAt_idx" ON "users"("status", "createdAt");
