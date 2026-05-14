-- Normalize existing payment provider values for the bank-transfer-only model.
UPDATE "subscriptions" SET "provider" = 'BANK_TRANSFER' WHERE "provider" <> 'BANK_TRANSFER';
UPDATE "payments" SET "provider" = 'BANK_TRANSFER' WHERE "provider" <> 'BANK_TRANSFER';
