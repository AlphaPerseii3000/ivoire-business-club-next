-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_article_comments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT,
    "articleId" TEXT NOT NULL,
    CONSTRAINT "article_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "article_comments_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "articles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_article_comments" ("articleId", "content", "createdAt", "id", "updatedAt", "userId") SELECT "articleId", "content", "createdAt", "id", "updatedAt", "userId" FROM "article_comments";
DROP TABLE "article_comments";
ALTER TABLE "new_article_comments" RENAME TO "article_comments";
CREATE INDEX "article_comments_articleId_createdAt_idx" ON "article_comments"("articleId", "createdAt");
CREATE INDEX "article_comments_userId_idx" ON "article_comments"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "articles_opportunityId_idx" ON "articles"("opportunityId");
