export type TrustLevel = "bronze" | "argent" | "or";

export type TrustLevelInput = {
  documentCount?: number | null;
  verificationStatus?: string | null;
  requiresDoubleVerification?: boolean | null;
  approvalCount?: number | null;
  authorStats?: {
    validatedDealsCount?: number | null;
    averageRating?: number | null;
  } | null;
};

export function hasCommunityGoldCriteria(input: Pick<TrustLevelInput, "authorStats">) {
  const validatedDealsCount = input.authorStats?.validatedDealsCount ?? 0;
  const averageRating = input.authorStats?.averageRating ?? null;
  return validatedDealsCount >= 3 && averageRating !== null && averageRating >= 4.5;
}

export function isDoubleVerificationComplete(input: Pick<TrustLevelInput, "requiresDoubleVerification" | "approvalCount">) {
  return input.requiresDoubleVerification ? (input.approvalCount ?? 0) >= 2 : true;
}

export function getOpportunityTrustLevel(input: TrustLevelInput): TrustLevel | null {
  const documentCount = input.documentCount ?? 0;
  const verificationStatus = input.verificationStatus ?? "PENDING";
  const isVerified = verificationStatus === "VERIFIED";
  const goldEligible = isVerified && hasCommunityGoldCriteria(input) && isDoubleVerificationComplete(input);

  if (goldEligible) return "or";
  if (isVerified) return "argent";
  if (documentCount > 0) return "bronze";
  return null;
}

export function getSafeTrustLevel(input: TrustLevelInput): TrustLevel {
  return getOpportunityTrustLevel(input) ?? "bronze";
}
