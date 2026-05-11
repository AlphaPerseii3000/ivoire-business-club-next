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
    "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "passwordHash" TEXT,
    "googleId" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_users" ("avatarUrl", "bio", "createdAt", "email", "emailVerified", "googleId", "id", "location", "name", "passwordHash", "phone", "role", "tier", "updatedAt") SELECT "avatarUrl", "bio", "createdAt", "email", "emailVerified", "googleId", "id", "location", "name", "passwordHash", "phone", "role", "tier", "updatedAt" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
