-- CreateTable
CREATE TABLE "opportunity_interests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "opportunity_interests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "opportunity_interests_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "opportunity_interests_opportunityId_createdAt_idx" ON "opportunity_interests"("opportunityId", "createdAt");

-- CreateIndex
CREATE INDEX "opportunity_interests_userId_createdAt_idx" ON "opportunity_interests"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "opportunity_interests_userId_opportunityId_key" ON "opportunity_interests"("userId", "opportunityId");
