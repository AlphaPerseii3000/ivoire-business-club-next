import type { SelectedTag } from "@/lib/tags";
import { dedupeTags, getTagKey } from "@/lib/tags";

export type OpportunityMatchMetadata = {
  commonTagCount: number;
  matchPercent: number;
  matchedTags: SelectedTag[];
};

export type WithOpportunityTags = {
  tags?: readonly SelectedTag[];
  createdAt?: Date | string;
};

export type WithMatchMetadata<T> = T & OpportunityMatchMetadata;

function toTime(value: Date | string | undefined) {
  if (!value) return 0;
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

export function countCommonTags(userTags: readonly SelectedTag[] = [], opportunityTags: readonly SelectedTag[] = []): number {
  const userTagKeys = new Set(dedupeTags(userTags).map(getTagKey));
  return dedupeTags(opportunityTags).filter((tag) => userTagKeys.has(getTagKey(tag))).length;
}

export function calculateMatchPercent(commonCount: number, userTagCount: number): number {
  if (userTagCount <= 0 || commonCount <= 0) return 0;
  const percent = Math.round((commonCount / userTagCount) * 100);
  return Math.min(100, Math.max(0, percent));
}

export function attachMatchMetadata<T extends WithOpportunityTags>(opportunities: readonly T[], userTags: readonly SelectedTag[] = []): Array<WithMatchMetadata<T>> {
  const normalizedUserTags = dedupeTags(userTags);
  const userTagKeys = new Set(normalizedUserTags.map(getTagKey));

  return opportunities
    .map((opportunity) => {
      const matchedTags = dedupeTags(opportunity.tags ?? []).filter((tag) => userTagKeys.has(getTagKey(tag)));
      const commonTagCount = matchedTags.length;
      const matchPercent = calculateMatchPercent(commonTagCount, normalizedUserTags.length);

      return {
        ...opportunity,
        commonTagCount,
        matchPercent,
        matchedTags,
      };
    })
    .sort((left, right) => {
      if (right.commonTagCount !== left.commonTagCount) {
        return right.commonTagCount - left.commonTagCount;
      }
      return toTime(right.createdAt) - toTime(left.createdAt);
    });
}
