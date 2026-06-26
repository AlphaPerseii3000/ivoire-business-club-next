-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "phone" TEXT,
    "location" TEXT,
    "country" TEXT,
    "tier" TEXT NOT NULL DEFAULT 'AFFRANCHI',
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "passwordHash" TEXT,
    "googleId" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "platinumAwardedAt" DATETIME,
    "platinumUpdatedAt" DATETIME,
    "onboardingForm" JSONB,
    "onboardingCompletedAt" DATETIME,
    "lastReminderSentAt" DATETIME,
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_users" ("avatarUrl", "bio", "country", "createdAt", "email", "emailVerified", "googleId", "id", "location", "name", "onboardingCompletedAt", "onboardingForm", "passwordHash", "phone", "platinumAwardedAt", "platinumUpdatedAt", "role", "status", "tier", "updatedAt", "verificationStatus") SELECT "avatarUrl", "bio", "country", "createdAt", "email", "emailVerified", "googleId", "id", "location", "name", "onboardingCompletedAt", "onboardingForm", "passwordHash", "phone", "platinumAwardedAt", "platinumUpdatedAt", "role", "status", "tier", "updatedAt", "verificationStatus" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");
CREATE INDEX "users_status_createdAt_idx" ON "users"("status", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
