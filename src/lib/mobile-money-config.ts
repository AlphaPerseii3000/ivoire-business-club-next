export const MOBILE_MONEY_SUPPORTED_PREFIXES = [
  "+225", // Côte d'Ivoire
  "+221", // Sénégal
  "+226", // Burkina Faso
  "+223", // Mali
  "+229", // Bénin
  "+228", // Togo
  "+227", // Niger
  "+245", // Guinée-Bissau
  "+233", // Ghana
  "+224", // Guinée
  "+238", // Cap-Vert
] as const;

export const MOBILE_MONEY_SUPPORTED_COUNTRIES = [
  "Côte d'Ivoire",
  "Sénégal",
  "Burkina Faso",
  "Mali",
  "Bénin",
  "Togo",
  "Niger",
  "Guinée-Bissau",
  "Ghana",
  "Guinée",
  "Cap-Vert",
] as const;

export type MobileMoneyProvider = "WAVE" | "ORANGE_MONEY";

export const MOBILE_MONEY_CONFIG = {
  WAVE: {
    label: "Wave",
    colorClass: "blue",
    merchantNumber: process.env.NEXT_PUBLIC_WAVE_MERCHANT_NUMBER || "+2250708100650",
    instructionLines: [
      "Ouvre ton application Wave.",
      "Transfère le montant au numéro marchand affiché ci-dessus.",
      "Indique impérativement la référence dans la description du transfert.",
    ],
  },
  ORANGE_MONEY: {
    label: "Orange Money",
    colorClass: "orange",
    merchantNumber: process.env.NEXT_PUBLIC_ORANGE_MONEY_MERCHANT_NUMBER || "+2250708100650",
    ussdCode: process.env.NEXT_PUBLIC_ORANGE_MONEY_USSD_CODE || "#144#",
    ussdTransferNational: "#144*1#",
    ussdTransferInternational: "#144*13#",
    instructionLines: [
      "Compose le code USSD #144# ou ouvre ton application Orange Money.",
      "Pour un transfert national : compose #144*1# (raccourci direct).",
      "Pour un transfert international : compose #144*13# (raccourci direct).",
      "Effectue un transfert vers le numéro marchand affiché ci-dessus.",
      "Indique impérativement la référence dans la description du transfert.",
    ],
  },
} as const;

export function getMobileMoneyConfig(provider: MobileMoneyProvider) {
  return MOBILE_MONEY_CONFIG[provider];
}

export function formatMobileMoneyReference(userId: string, tier: string): string {
  return `IBC-${userId}-${tier}`;
}

export function formatMobileMoneyAmount(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

export function isSupportedMobileMoneyPrefix(phone: string): boolean {
  return MOBILE_MONEY_SUPPORTED_PREFIXES.some((prefix) => phone.startsWith(prefix));
}

export function getSupportedCountriesSentence(): string {
  return MOBILE_MONEY_SUPPORTED_COUNTRIES.join(", ") + ".";
}

export function getProviderColorClasses(provider: MobileMoneyProvider): {
  badge: string;
  border: string;
  bg: string;
  text: string;
} {
  if (provider === "WAVE") {
    return {
      badge: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100",
      border: "border-blue-200 dark:border-blue-800",
      bg: "bg-blue-50 dark:bg-blue-950/30",
      text: "text-blue-800 dark:text-blue-100",
    };
  }

  return {
    badge: "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-100",
    border: "border-orange-200 dark:border-orange-800",
    bg: "bg-orange-50 dark:bg-orange-950/30",
    text: "text-orange-800 dark:text-orange-100",
  };
}
