export const BANK_TRANSFER_CONFIG = {
  beneficiary: "KS Investment",
  currency: "EUR",
  amounts: {
    AFFRANCHI: 29,
    GRAND_FRERE: 49,
    BOSS: 99,
  } as Record<string, number>,
} as const;

export interface BankAccountXOF {
  bankName: string;
  domiciliation: string;
  iban: string;
  beneficiary: string;
  currency: string;
  bic: string;
  bankCode: string;
  branchCode: string;
  accountNumber: string;
  ribKey: string;
  bankAddress?: string;
  phone?: string;
  fax?: string;
}

export interface BankAccountEUR {
  bankName: string;
  bankAddress: string;
  bic: string;
  faveur: string;
  bankCode: string;
  branchCode: string;
  accountNumber: string;
  ribKey: string;
  swift: string;
  finalBeneficiary: string;
  finalBankCode: string;
  finalBranchCode: string;
  finalAccountNumber: string;
  finalRibKey: string;
  finalIban: string;
  currency: string;
}

export function getBankTransferDetails() {
  return {
    xof: {
      bankName: "VERSUS BANK",
      domiciliation: "01005-AGENCE ANGRE",
      iban: process.env.BANK_TRANSFER_XOF_IBAN || process.env.BANK_TRANSFER_IBAN || "CI93 CI11 2010 0501 8780 4900 0125",
      beneficiary: "KS Investment",
      currency: "XOF",
      bic: process.env.BANK_TRANSFER_XOF_BIC || process.env.BANK_TRANSFER_BIC || "VSBKCIABXXX",
      bankCode: "CI112",
      branchCode: "01005",
      accountNumber: "018780490001",
      ribKey: "25",
      bankAddress: "01 BP 1874 ABIDJAN 01, COTE D'IVOIRE",
      phone: "27 20 25 60 60",
      fax: "27 20 25 60 99",
    } as BankAccountXOF,
    eur: {
      bankName: "SOCIETE GENERALE - PARIS",
      bankAddress: "17 Cours Valmy Tour Granite 92800 Paris La Défense 7 France",
      bic: process.env.BANK_TRANSFER_EUR_BIC || "SOGEFRPPXXX",
      faveur: "VERSUS BANK",
      bankCode: "30003",
      branchCode: "06990",
      accountNumber: "00101610633",
      ribKey: "63",
      swift: process.env.BANK_TRANSFER_BIC || "VSBKCIABXXX",
      finalBeneficiary: "KS Investment",
      finalBankCode: "CI112",
      finalBranchCode: "01005",
      finalAccountNumber: "018780490001",
      finalRibKey: "25",
      finalIban: process.env.BANK_TRANSFER_EUR_IBAN || process.env.BANK_TRANSFER_IBAN || "CI93 CI11 2010 0501 8780 4900 0125",
      currency: "EUR",
    } as BankAccountEUR,
    // Keep legacy fields for backward compatibility/types
    beneficiary: BANK_TRANSFER_CONFIG.beneficiary,
    iban: process.env.BANK_TRANSFER_IBAN || "CI93 CI11 2010 0501 8780 4900 0125",
    bic: process.env.BANK_TRANSFER_BIC || "VSBKCIABXXX",
    bankAddress: process.env.BANK_TRANSFER_BANK_ADDRESS || "17 Cours Valmy Tour Granite 92800 Paris La Défense 7 France",
    currency: BANK_TRANSFER_CONFIG.currency,
  };
}

export function getAmountForTier(tier: string): number {
  return BANK_TRANSFER_CONFIG.amounts[tier] ?? 0;
}

