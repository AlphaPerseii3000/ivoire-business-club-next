import { BANK_TRANSFER_CONFIG } from "@/lib/bank-transfer-config";

export type MembershipTier = "AFFRANCHI" | "GRAND_FRERE" | "BOSS";

export const TIER_ORDER: MembershipTier[] = ["AFFRANCHI", "GRAND_FRERE", "BOSS"];

type TierAccent = "teal" | "amber" | "violet";

type TierConfig = {
  tier: MembershipTier;
  label: string;
  shortDescription: string;
  benefits: string[];
  ctaLabel: string;
  accent: TierAccent;
  price: number;
  priceLabel: string;
  cardClassName: string;
  badgeClassName: string;
};

const tierCopy: Record<MembershipTier, Omit<TierConfig, "tier" | "price" | "priceLabel">> = {
  AFFRANCHI: {
    label: "Affranchis",
    shortDescription: "accès deals vérifiés",
    benefits: [
      "Accès aux deals vérifiés",
      "Profil membre IBC visible",
      "Accès aux événements communautaires",
    ],
    ctaLabel: "Choisir Affranchis",
    accent: "teal",
    cardClassName: "border-teal-200/80 dark:border-teal-800/70",
    badgeClassName:
      "border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-800 dark:bg-teal-950 dark:text-teal-100",
  },
  GRAND_FRERE: {
    label: "Grands Frères",
    shortDescription: "deals prioritaires + events",
    benefits: [
      "Accès aux deals prioritaires",
      "Invitations aux events IBC",
      "Mises en relation ciblées",
    ],
    ctaLabel: "Choisir Grands Frères",
    accent: "amber",
    cardClassName: "border-amber-300 shadow-lg shadow-amber-500/10 dark:border-amber-700",
    badgeClassName:
      "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100",
  },
  BOSS: {
    label: "Boss",
    shortDescription: "deals exclusifs + mentorat 1-1",
    benefits: [
      "Accès aux deals exclusifs",
      "Mentorat 1-1 chaque mois",
      "Priorité sur les opportunités stratégiques",
    ],
    ctaLabel: "Choisir Boss",
    accent: "violet",
    cardClassName: "border-violet-300 dark:border-violet-700",
    badgeClassName:
      "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-100",
  },
};

export function getTierPriceLabel(tier: MembershipTier): string {
  return `€${BANK_TRANSFER_CONFIG.amounts[tier]}/mois`;
}

export function getTierConfig(tier: MembershipTier): TierConfig {
  const copy = tierCopy[tier];
  const price = BANK_TRANSFER_CONFIG.amounts[tier];

  return {
    tier,
    ...copy,
    price,
    priceLabel: getTierPriceLabel(tier),
  };
}

export const MEMBERSHIP_TIERS: TierConfig[] = TIER_ORDER.map((tier) => getTierConfig(tier));

export function getTierBadgeConfig(tier: string): { label: string; className: string } {
  if (tier === "AFFRANCHI" || tier === "GRAND_FRERE" || tier === "BOSS") {
    const config = getTierConfig(tier);
    return { label: config.label, className: config.badgeClassName };
  }

  return {
    label: tier,
    className:
      "border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100",
  };
}
