-- CreateEnum: create OpportunityCurrency enum
CREATE TYPE "OpportunityCurrency" AS ENUM ('EUR', 'XOF');

-- AlterTable: add currency column to opportunities with default EUR
ALTER TABLE "opportunities" ADD COLUMN "currency" "OpportunityCurrency" NOT NULL DEFAULT 'EUR';