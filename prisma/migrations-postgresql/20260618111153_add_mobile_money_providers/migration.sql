-- AlterTable: add mobile money provider phone to subscriptions
ALTER TABLE "subscriptions" ADD COLUMN "providerPhone" TEXT;