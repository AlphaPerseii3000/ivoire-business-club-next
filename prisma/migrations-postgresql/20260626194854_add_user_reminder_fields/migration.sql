-- Add onboarding reminder fields to users (Epic 15)
ALTER TABLE "users" ADD COLUMN "lastReminderSentAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "reminderCount" INTEGER NOT NULL DEFAULT 0;
