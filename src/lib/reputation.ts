export type ReviewRatingInput = {
  rating: number;
  weight?: number | null;
};

export type ReliabilityScore = {
  averageRating: number | null;
  reviewCount: number;
};

export type PlatinumDisplayState = "none" | "active" | "maintain";

export type PlatinumStats = {
  validatedDealsCount: number;
  averageRating: number | null;
  platinumAwardedAt?: Date | string | null;
};

type PlatinumUserClient = {
  user: {
    updateMany: (args: {
      where: { id: string; platinumAwardedAt: null };
      data: { platinumAwardedAt: Date; platinumUpdatedAt: Date };
    }) => Promise<{ count: number }>;
    findUnique: (args: {
      where: { id: string };
      select: { platinumAwardedAt: true };
    }) => Promise<{ platinumAwardedAt: Date | null } | null>;
  };
};

export function roundReliabilityScore(value: number): number {
  return Math.round(value * 10) / 10;
}

export function calculateReliabilityScore(reviews: ReviewRatingInput[]): ReliabilityScore {
  if (reviews.length === 0) {
    return { averageRating: null, reviewCount: 0 };
  }

  const weightedTotals = reviews.reduce(
    (acc, review) => {
      const weight = review.weight ?? 1;
      return {
        ratingTotal: acc.ratingTotal + review.rating * weight,
        weightTotal: acc.weightTotal + weight,
      };
    },
    { ratingTotal: 0, weightTotal: 0 },
  );

  const averageRating = weightedTotals.weightTotal > 0
    ? roundReliabilityScore(weightedTotals.ratingTotal / weightedTotals.weightTotal)
    : null;

  return { averageRating, reviewCount: reviews.length };
}

export function isPlatinumEligible({ validatedDealsCount, averageRating }: Pick<PlatinumStats, "validatedDealsCount" | "averageRating">): boolean {
  return validatedDealsCount >= 3 && averageRating !== null && averageRating >= 4.5;
}

export function getPlatinumDisplayState({ awardedAt, averageRating }: { awardedAt?: Date | string | null; averageRating: number | null }): PlatinumDisplayState {
  if (!awardedAt) {
    return "none";
  }

  return averageRating !== null && averageRating >= 4.5 ? "active" : "maintain";
}

export async function ensurePlatinumAwarded(
  userId: string,
  stats: PlatinumStats,
  client?: PlatinumUserClient,
): Promise<{ awardedAt: Date | null; newlyAwarded: boolean; displayState: PlatinumDisplayState }> {
  const db = client ?? (await import("@/lib/prisma")).prisma;
  const currentAwardedAt = stats.platinumAwardedAt ? new Date(stats.platinumAwardedAt) : null;
  const eligible = isPlatinumEligible(stats);

  if (!eligible) {
    return {
      awardedAt: currentAwardedAt,
      newlyAwarded: false,
      displayState: getPlatinumDisplayState({ awardedAt: currentAwardedAt, averageRating: stats.averageRating }),
    };
  }

  if (currentAwardedAt) {
    return { awardedAt: currentAwardedAt, newlyAwarded: false, displayState: "active" };
  }

  const awardDate = new Date();
  const updateResult = await db.user.updateMany({
    where: { id: userId, platinumAwardedAt: null },
    data: { platinumAwardedAt: awardDate, platinumUpdatedAt: awardDate },
  });

  if (updateResult.count === 1) {
    return { awardedAt: awardDate, newlyAwarded: true, displayState: "active" };
  }

  const freshUser = await db.user.findUnique({ where: { id: userId }, select: { platinumAwardedAt: true } });
  const awardedAt = freshUser?.platinumAwardedAt ?? null;

  return {
    awardedAt,
    newlyAwarded: false,
    displayState: getPlatinumDisplayState({ awardedAt, averageRating: stats.averageRating }),
  };
}
