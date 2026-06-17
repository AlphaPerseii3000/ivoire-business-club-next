-- Add opportunityId to articles (optional link to Opportunity)
ALTER TABLE "articles" ADD COLUMN "opportunityId" TEXT;

-- AddForeignKey: articles.opportunityId → opportunities.id (ON DELETE SET NULL)
ALTER TABLE "articles" ADD CONSTRAINT "articles_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex: articles.opportunityId
CREATE INDEX "articles_opportunityId_idx" ON "articles"("opportunityId");

-- CreateTable: article_comments
CREATE TABLE "article_comments" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,
    "articleId" TEXT NOT NULL,

    CONSTRAINT "article_comments_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey: article_comments.userId → users.id (ON DELETE SET NULL)
ALTER TABLE "article_comments" ADD CONSTRAINT "article_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: article_comments.articleId → articles.id (ON DELETE CASCADE)
ALTER TABLE "article_comments" ADD CONSTRAINT "article_comments_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex: articleId + createdAt (chronological comments per article)
CREATE INDEX "article_comments_articleId_createdAt_idx" ON "article_comments"("articleId", "createdAt");

-- CreateIndex: userId (find all comments by a user)
CREATE INDEX "article_comments_userId_idx" ON "article_comments"("userId");