-- CreateTable: lead_magnets
CREATE TABLE "lead_magnets" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guideSentAt" TIMESTAMP(3),

    CONSTRAINT "lead_magnets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique email
CREATE UNIQUE INDEX "lead_magnets_email_key" ON "lead_magnets"("email");
