import { describe, expect, it } from "vitest";

import { getOpportunityTrustLevel, getSafeTrustLevel } from "./trust-level";

describe("getOpportunityTrustLevel", () => {
  it("returns null when there are no trust signals", () => {
    expect(getOpportunityTrustLevel({ documentCount: 0, verificationStatus: "PENDING" })).toBeNull();
  });

  it("returns bronze for uploaded documents before admin verification", () => {
    expect(getOpportunityTrustLevel({ documentCount: 2, verificationStatus: "EN_COURS" })).toBe("bronze");
  });

  it("returns argent for admin verified opportunities without gold proof", () => {
    expect(getOpportunityTrustLevel({ documentCount: 2, verificationStatus: "VERIFIED", authorStats: { validatedDealsCount: 3, averageRating: null } })).toBe("argent");
  });

  it("returns or for verified opportunities with strong community stats", () => {
    expect(getOpportunityTrustLevel({ documentCount: 2, verificationStatus: "VERIFIED", authorStats: { validatedDealsCount: 3, averageRating: 4.5 } })).toBe("or");
  });

  it("does not return or when double verification is required but incomplete", () => {
    expect(getOpportunityTrustLevel({ documentCount: 2, verificationStatus: "VERIFIED", requiresDoubleVerification: true, approvalCount: 1, authorStats: { validatedDealsCount: 4, averageRating: 4.8 } })).toBe("argent");
  });

  it("uses bronze as safe legacy fallback", () => {
    expect(getSafeTrustLevel({ documentCount: 0, verificationStatus: "PENDING" })).toBe("bronze");
  });
});
