-- CreateEnum
CREATE TYPE "ChatMessageStatus" AS ENUM ('PENDING', 'ACKNOWLEDGED', 'REPLIED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ChatMessageAuthor" AS ENUM ('MEMBER', 'HERMES', 'SYSTEM');

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "author" "ChatMessageAuthor" NOT NULL,
    "status" "ChatMessageStatus" NOT NULL DEFAULT 'PENDING',
    "category" TEXT,
    "content" TEXT NOT NULL,
    "replyToId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_messages_userId_createdAt_idx" ON "chat_messages"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "chat_messages_status_idx" ON "chat_messages"("status");

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "chat_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;