-- CreateTable
CREATE TABLE "experts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "photoUrl" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "whatsapp" TEXT,
    "specialties" TEXT,
    "requiredTier" "Tier" NOT NULL DEFAULT 'AFFRANCHI',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "experts_slug_key" ON "experts"("slug");

-- CreateIndex
CREATE INDEX "experts_isPublished_idx" ON "experts"("isPublished");
