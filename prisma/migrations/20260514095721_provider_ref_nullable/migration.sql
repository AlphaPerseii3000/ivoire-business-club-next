-- Make providerRef nullable on subscriptions and payments for bank transfer workflow
-- Also ensure PENDING status support (handled at app level for SQLite)

-- Recreate subscriptions table with nullable providerRef
CREATE TABLE "subscriptions_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerRef" TEXT,
    "status" TEXT NOT NULL DEFAULT 'TRIAL',
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "subscriptions_new" SELECT * FROM "subscriptions";
DROP TABLE "subscriptions";
ALTER TABLE "subscriptions_new" RENAME TO "subscriptions";

-- Recreate payments table with nullable providerRef
CREATE TABLE "payments_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerRef" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "payments_new" SELECT * FROM "payments";
DROP TABLE "payments";
ALTER TABLE "payments_new" RENAME TO "payments";
