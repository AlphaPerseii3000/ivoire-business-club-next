-- AlterTable: add onboarding fields to users
ALTER TABLE "users" ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "onboardingForm" JSONB;