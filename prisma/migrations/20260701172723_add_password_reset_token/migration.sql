-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_verification_tokens" (
    "identifier" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    "userId" TEXT,
    "tokenType" TEXT NOT NULL DEFAULT 'EMAIL_VERIFICATION',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "verification_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_verification_tokens" ("createdAt", "expires", "identifier", "token", "userId") SELECT "createdAt", "expires", "identifier", "token", "userId" FROM "verification_tokens";
DROP TABLE "verification_tokens";
ALTER TABLE "new_verification_tokens" RENAME TO "verification_tokens";
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");
CREATE INDEX "verification_tokens_tokenType_expires_idx" ON "verification_tokens"("tokenType", "expires");
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
