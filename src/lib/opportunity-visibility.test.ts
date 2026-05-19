import { describe, expect, it } from "vitest";

import {
  TIER_RANK,
  buildOpportunityVisibilityWhere,
  canUserAccessOpportunity,
  getAccessibleTierValues,
} from "./opportunity-visibility";

describe("opportunity visibility", () => {
  it("ranks tiers from Affranchi to Boss", () => {
    expect(TIER_RANK.AFFRANCHI).toBeLessThan(TIER_RANK.GRAND_FRERE);
    expect(TIER_RANK.GRAND_FRERE).toBeLessThan(TIER_RANK.BOSS);
  });

  it("allows Boss to access lower tiers and Boss opportunities", () => {
    expect(getAccessibleTierValues("BOSS")).toEqual(["AFFRANCHI", "GRAND_FRERE", "BOSS"]);
    expect(canUserAccessOpportunity("AFFRANCHI", "BOSS")).toBe(true);
    expect(canUserAccessOpportunity("GRAND_FRERE", "BOSS")).toBe(true);
    expect(canUserAccessOpportunity("BOSS", "BOSS")).toBe(true);
  });

  it("prevents Affranchi members from seeing Boss opportunities", () => {
    expect(getAccessibleTierValues("AFFRANCHI")).toEqual(["AFFRANCHI"]);
    expect(canUserAccessOpportunity("BOSS", "AFFRANCHI")).toBe(false);
  });

  it("refuses unknown values safely", () => {
    expect(getAccessibleTierValues("UNKNOWN")).toEqual([]);
    expect(canUserAccessOpportunity("AFFRANCHI", "UNKNOWN")).toBe(false);
    expect(canUserAccessOpportunity("UNKNOWN", "BOSS")).toBe(false);
  });

  it("builds the verified tier where clause", () => {
    expect(buildOpportunityVisibilityWhere("GRAND_FRERE")).toEqual({
      verificationStatus: "VERIFIED",
      requiredTier: { in: ["AFFRANCHI", "GRAND_FRERE"] },
    });
  });
});
