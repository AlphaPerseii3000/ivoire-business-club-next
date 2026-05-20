-- CreateTable
CREATE TABLE "user_tags" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_tags_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "opportunity_tags" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "opportunityId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "opportunity_tags_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "user_tags_category_value_idx" ON "user_tags"("category", "value");

-- CreateIndex
CREATE UNIQUE INDEX "user_tags_userId_category_value_key" ON "user_tags"("userId", "category", "value");

-- CreateIndex
CREATE INDEX "opportunity_tags_category_value_idx" ON "opportunity_tags"("category", "value");

-- CreateIndex
CREATE UNIQUE INDEX "opportunity_tags_opportunityId_category_value_key" ON "opportunity_tags"("opportunityId", "category", "value");
