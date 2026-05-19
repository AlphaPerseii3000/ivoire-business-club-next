import type { MembershipTier } from "@/lib/tier-config";

type Tier = MembershipTier;

export const TIER_RANK: Record<Tier, number> = {
  AFFRANCHI: 1,
  GRAND_FRERE: 2,
  BOSS: 3,
};

const TIER_VALUES: Tier[] = ["AFFRANCHI", "GRAND_FRERE", "BOSS"];

export function isKnownTier(value: unknown): value is Tier {
  return typeof value === "string" && TIER_VALUES.includes(value as Tier);
}

export function canUserAccessOpportunity(requiredTier: unknown, userTier: unknown): boolean {
  if (!isKnownTier(requiredTier) || !isKnownTier(userTier)) {
    return false;
  }

  return TIER_RANK[userTier] >= TIER_RANK[requiredTier];
}

export function getAccessibleTierValues(userTier: unknown): Tier[] {
  if (!isKnownTier(userTier)) {
    return [];
  }

  return TIER_VALUES.filter((tier) => canUserAccessOpportunity(tier, userTier));
}

export function buildOpportunityVisibilityWhere(userTier: unknown) {
  return {
    verificationStatus: "VERIFIED" as const,
    requiredTier: { in: getAccessibleTierValues(userTier) },
  };
}
