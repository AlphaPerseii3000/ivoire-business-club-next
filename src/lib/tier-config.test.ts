import { describe, expect, it } from "vitest";

import {
  getTierBadgeConfig,
  getTierPriceLabel,
  MEMBERSHIP_TIERS,
  TIER_ORDER,
} from "./tier-config";

describe("tier config", () => {
  it("uses the bank transfer amounts as the pricing source of truth", () => {
    expect(TIER_ORDER).toEqual(["AFFRANCHI", "GRAND_FRERE", "BOSS"]);
    expect(MEMBERSHIP_TIERS.map((tier) => [tier.tier, tier.label, tier.priceLabel])).toEqual([
      ["AFFRANCHI", "Affranchis", "€29/mois"],
      ["GRAND_FRERE", "Grands Frères", "€59/mois"],
      ["BOSS", "Boss", "€129/mois"],
    ]);
  });

  it("exposes exact short benefit summaries required by the story", () => {
    expect(MEMBERSHIP_TIERS[0]?.shortDescription).toContain("accès deals vérifiés");
    expect(MEMBERSHIP_TIERS[1]?.shortDescription).toContain("deals prioritaires + events");
    expect(MEMBERSHIP_TIERS[2]?.shortDescription).toContain("deals exclusifs + mentorat 1-1");
  });

  it("maps profile badge colors to teal, amber, and violet", () => {
    expect(getTierBadgeConfig("AFFRANCHI")).toMatchObject({ label: "Affranchis" });
    expect(getTierBadgeConfig("AFFRANCHI").className).toContain("teal");
    expect(getTierBadgeConfig("GRAND_FRERE")).toMatchObject({ label: "Grands Frères" });
    expect(getTierBadgeConfig("GRAND_FRERE").className).toContain("amber");
    expect(getTierBadgeConfig("BOSS")).toMatchObject({ label: "Boss" });
    expect(getTierBadgeConfig("BOSS").className).toContain("violet");
  });

  it("formats tier prices in French monthly euros", () => {
    expect(getTierPriceLabel("AFFRANCHI")).toBe("€29/mois");
    expect(getTierPriceLabel("GRAND_FRERE")).toBe("€59/mois");
    expect(getTierPriceLabel("BOSS")).toBe("€129/mois");
  });
});
