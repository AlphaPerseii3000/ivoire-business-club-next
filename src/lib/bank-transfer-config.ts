export const BANK_TRANSFER_CONFIG = {
  beneficiary: "KS Investment",
  currency: "EUR",
  amounts: {
    AFFRANCHI: 29,
    GRAND_FRERE: 49,
    BOSS: 99,
  } as Record<string, number>,
} as const;

export function getBankTransferDetails() {
  return {
    beneficiary: BANK_TRANSFER_CONFIG.beneficiary,
    iban: process.env.BANK_TRANSFER_IBAN ?? "",
    bic: process.env.BANK_TRANSFER_BIC ?? "",
    bankAddress: process.env.BANK_TRANSFER_BANK_ADDRESS ?? "",
    currency: BANK_TRANSFER_CONFIG.currency,
  };
}

export function getAmountForTier(tier: string): number {
  return BANK_TRANSFER_CONFIG.amounts[tier] ?? 0;
}
