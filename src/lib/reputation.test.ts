import { describe, expect, it, vi } from "vitest";

import {
  calculateReliabilityScore,
  ensurePlatinumAwarded,
  getPlatinumDisplayState,
  isPlatinumEligible,
  roundReliabilityScore,
} from "./reputation";

describe("reputation score helpers", () => {
  it("returns a no-review state without a fake average", () => {
    expect(calculateReliabilityScore([])).toEqual({ averageRating: null, reviewCount: 0 });
  });

  it("calculates one received review", () => {
    expect(calculateReliabilityScore([{ rating: 5 }])).toEqual({ averageRating: 5, reviewCount: 1 });
  });

  it("calculates multiple received reviews with one-decimal rounding", () => {
    expect(calculateReliabilityScore([{ rating: 5 }, { rating: 4 }, { rating: 5 }])).toEqual({ averageRating: 4.7, reviewCount: 3 });
  });

  it("rounds reliability scores to one decimal", () => {
    expect(roundReliabilityScore(4.44)).toBe(4.4);
    expect(roundReliabilityScore(4.45)).toBe(4.5);
  });

  it("treats threshold at exactly 4.5 as eligible", () => {
    expect(isPlatinumEligible({ validatedDealsCount: 3, averageRating: 4.5 })).toBe(true);
  });

  it("does not treat 4.49 as eligible", () => {
    expect(isPlatinumEligible({ validatedDealsCount: 3, averageRating: 4.49 })).toBe(false);
  });

  it("uses equal weights by default while supporting explicit future weights", () => {
    expect(calculateReliabilityScore([{ rating: 5 }, { rating: 1 }]).averageRating).toBe(3);
    expect(calculateReliabilityScore([{ rating: 5, weight: 3 }, { rating: 1, weight: 1 }]).averageRating).toBe(4);
  });
});

describe("platinum award helpers", () => {
  function clientMock(updateCount: number, persistedAwardedAt: Date | null = null) {
    return {
      user: {
        updateMany: vi.fn().mockResolvedValue({ count: updateCount }),
        findUnique: vi.fn().mockResolvedValue({ platinumAwardedAt: persistedAwardedAt }),
      },
    };
  }

  it("persists a newly eligible Platinum award once", async () => {
    const client = clientMock(1);

    const result = await ensurePlatinumAwarded("user-1", { validatedDealsCount: 3, averageRating: 4.5, platinumAwardedAt: null }, client);

    expect(client.user.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "user-1", platinumAwardedAt: null } }));
    expect(result.newlyAwarded).toBe(true);
    expect(result.displayState).toBe("active");
  });

  it("does not update the first award timestamp when already awarded", async () => {
    const awardedAt = new Date("2026-05-01T00:00:00.000Z");
    const client = clientMock(0);

    const result = await ensurePlatinumAwarded("user-1", { validatedDealsCount: 4, averageRating: 4.8, platinumAwardedAt: awardedAt }, client);

    expect(client.user.updateMany).not.toHaveBeenCalled();
    expect(result.awardedAt).toEqual(awardedAt);
    expect(result.newlyAwarded).toBe(false);
  });

  it("does not award below threshold", async () => {
    const client = clientMock(0);

    const result = await ensurePlatinumAwarded("user-1", { validatedDealsCount: 3, averageRating: 4.49, platinumAwardedAt: null }, client);

    expect(client.user.updateMany).not.toHaveBeenCalled();
    expect(result.displayState).toBe("none");
  });

  it("keeps previously awarded Platinum in maintain state below threshold", async () => {
    const awardedAt = new Date("2026-05-01T00:00:00.000Z");
    const client = clientMock(0);

    const result = await ensurePlatinumAwarded("user-1", { validatedDealsCount: 3, averageRating: 4.49, platinumAwardedAt: awardedAt }, client);

    expect(client.user.updateMany).not.toHaveBeenCalled();
    expect(result.displayState).toBe("maintain");
    expect(getPlatinumDisplayState({ awardedAt, averageRating: 4.49 })).toBe("maintain");
  });
});
