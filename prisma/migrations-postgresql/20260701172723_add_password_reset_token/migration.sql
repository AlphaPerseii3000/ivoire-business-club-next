-- AlterTable: add tokenType column
ALTER TABLE "verification_tokens" ADD COLUMN "tokenType" TEXT NOT NULL DEFAULT 'EMAIL_VERIFICATION';

-- CreateIndex
CREATE INDEX "verification_tokens_tokenType_expires_idx" ON "verification_tokens"("tokenType", "expires");
