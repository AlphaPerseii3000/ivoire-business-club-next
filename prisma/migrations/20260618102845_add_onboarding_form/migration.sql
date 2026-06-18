-- AlterTable
ALTER TABLE "users" ADD COLUMN "onboardingCompletedAt" DATETIME;
ALTER TABLE "users" ADD COLUMN "onboardingForm" JSONB;
