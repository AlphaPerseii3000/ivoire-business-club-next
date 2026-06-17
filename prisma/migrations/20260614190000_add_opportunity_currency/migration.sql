-- AlterTable: add currency column to opportunities with default EUR
ALTER TABLE "opportunities" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'EUR';