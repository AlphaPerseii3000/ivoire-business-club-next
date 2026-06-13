import { ArticleVisibility, Tier } from "@/generated/prisma/client";

export function getAccessibleArticleVisibilities(
  userTier: Tier | null | undefined,
  hasActiveSubscription: boolean
): ArticleVisibility[] {
  if (!hasActiveSubscription || !userTier) {
    return [ArticleVisibility.PUBLIC];
  }

  switch (userTier) {
    case Tier.BOSS:
      return [
        ArticleVisibility.PUBLIC,
        ArticleVisibility.AFFRANCHI,
        ArticleVisibility.GRAND_FRERE,
        ArticleVisibility.BOSS,
      ];
    case Tier.GRAND_FRERE:
      return [
        ArticleVisibility.PUBLIC,
        ArticleVisibility.AFFRANCHI,
        ArticleVisibility.GRAND_FRERE,
      ];
    case Tier.AFFRANCHI:
    default:
      return [ArticleVisibility.PUBLIC, ArticleVisibility.AFFRANCHI];
  }
}
