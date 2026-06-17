-- CreateTable
CREATE TABLE "article_comments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    CONSTRAINT "article_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "article_comments_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "articles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_articles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "imageUrl" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "authorId" TEXT NOT NULL,
    "opportunityId" TEXT,
    CONSTRAINT "articles_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "articles_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_articles" ("authorId", "category", "content", "createdAt", "excerpt", "id", "imageUrl", "published", "publishedAt", "slug", "title", "updatedAt", "visibility") SELECT "authorId", "category", "content", "createdAt", "excerpt", "id", "imageUrl", "published", "publishedAt", "slug", "title", "updatedAt", "visibility" FROM "articles";
DROP TABLE "articles";
ALTER TABLE "new_articles" RENAME TO "articles";
CREATE UNIQUE INDEX "articles_slug_key" ON "articles"("slug");
CREATE INDEX "articles_published_visibility_publishedAt_idx" ON "articles"("published", "visibility", "publishedAt");
CREATE INDEX "articles_category_published_idx" ON "articles"("category", "published");
CREATE TABLE "new_document_access_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requesterId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "document_access_requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "document_access_requests_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "opportunity_documents" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "document_access_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_document_access_requests" ("createdAt", "documentId", "id", "requesterId", "reviewedAt", "reviewedById", "status", "updatedAt") SELECT "createdAt", "documentId", "id", "requesterId", "reviewedAt", "reviewedById", "status", "updatedAt" FROM "document_access_requests";
DROP TABLE "document_access_requests";
ALTER TABLE "new_document_access_requests" RENAME TO "document_access_requests";
CREATE INDEX "document_access_requests_documentId_status_idx" ON "document_access_requests"("documentId", "status");
CREATE INDEX "document_access_requests_requesterId_status_idx" ON "document_access_requests"("requesterId", "status");
CREATE UNIQUE INDEX "document_access_requests_requesterId_documentId_key" ON "document_access_requests"("requesterId", "documentId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "article_comments_articleId_createdAt_idx" ON "article_comments"("articleId", "createdAt");

-- CreateIndex
CREATE INDEX "article_comments_userId_idx" ON "article_comments"("userId");
