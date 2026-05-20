/*
  Warnings:

  - The legacy column `avatarUrl` is copied into `image` during the users RedefineTables step; the later avatarUrl map migration renames it back.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'BANK_TRANSFER',
    "providerRef" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_payments" ("amount", "createdAt", "currency", "id", "provider", "providerRef", "status", "userId") SELECT "amount", "createdAt", "currency", "id", "provider", "providerRef", "status", "userId" FROM "payments";
DROP TABLE "payments";
ALTER TABLE "new_payments" RENAME TO "payments";
CREATE TABLE "new_subscriptions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'BANK_TRANSFER',
    "providerRef" TEXT,
    "status" TEXT NOT NULL DEFAULT 'TRIAL',
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_subscriptions" ("createdAt", "endDate", "id", "period", "provider", "providerRef", "startDate", "status", "tier", "updatedAt", "userId") SELECT "createdAt", "endDate", "id", "period", "provider", "providerRef", "startDate", "status", "tier", "updatedAt", "userId" FROM "subscriptions";
DROP TABLE "subscriptions";
ALTER TABLE "new_subscriptions" RENAME TO "subscriptions";
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bio" TEXT,
    "image" TEXT,
    "phone" TEXT,
    "location" TEXT,
    "country" TEXT,
    "tier" TEXT NOT NULL DEFAULT 'AFFRANCHI',
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "passwordHash" TEXT,
    "googleId" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
-- Preserve existing avatarUrl data by copying it into the interim image column; a later migration renames image back to avatarUrl for Prisma @map.
INSERT INTO "new_users" ("bio", "country", "createdAt", "email", "emailVerified", "googleId", "id", "image", "location", "name", "passwordHash", "phone", "role", "tier", "updatedAt", "verificationStatus") SELECT "bio", "country", "createdAt", "email", "emailVerified", "googleId", "id", "avatarUrl", "location", "name", "passwordHash", "phone", "role", "tier", "updatedAt", "verificationStatus" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
