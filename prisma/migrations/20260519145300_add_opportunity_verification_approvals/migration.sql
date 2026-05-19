-- CreateTable
CREATE TABLE "opportunity_verification_approvals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "opportunityId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "opportunity_verification_approvals_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "opportunity_verification_approvals_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "opportunity_verification_approvals_opportunityId_adminId_key" ON "opportunity_verification_approvals"("opportunityId", "adminId");

-- CreateIndex
CREATE INDEX "opportunity_verification_approvals_opportunityId_idx" ON "opportunity_verification_approvals"("opportunityId");

-- CreateIndex
CREATE INDEX "opportunity_verification_approvals_adminId_idx" ON "opportunity_verification_approvals"("adminId");
