import { ArticleVisibility, Tier } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

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

export async function generateUniqueSlug(title: string, excludeId?: string): Promise<string> {
  const baseSlug = slugify(title);
  if (!baseSlug) {
    throw new Error("Le titre ne contient aucun caractère valide pour générer un slug.");
  }
  let slug = baseSlug;
  let count = 0;
  const maxIterations = 1000;

  while (count < maxIterations) {
    const existing = await prisma.article.findFirst({
      where: {
        slug,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (!existing) {
      return slug;
    }
    count++;
    slug = `${baseSlug}-${count}`;
  }
  throw new Error("Impossible de générer un slug unique après 1000 tentatives.");
}

