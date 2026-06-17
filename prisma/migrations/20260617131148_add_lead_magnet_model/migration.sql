-- CreateTable
CREATE TABLE "lead_magnets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guideSentAt" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "lead_magnets_email_key" ON "lead_magnets"("email");
