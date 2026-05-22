-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");
CREATE INDEX "audit_logs_actorId_createdAt_idx" ON "audit_logs"("actorId", "createdAt");
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");
CREATE INDEX "audit_logs_action_createdAt_idx" ON "audit_logs"("action", "createdAt");

-- Immutability guards for SQLite development.
-- PostgreSQL production (Story 6.6) must use equivalent BEFORE UPDATE/DELETE triggers or DB permissions.
CREATE TRIGGER "audit_logs_no_update"
BEFORE UPDATE ON "audit_logs"
BEGIN
  SELECT RAISE(ABORT, 'audit logs are immutable');
END;

CREATE TRIGGER "audit_logs_no_delete"
BEFORE DELETE ON "audit_logs"
BEGIN
  SELECT RAISE(ABORT, 'audit logs are immutable');
END;
