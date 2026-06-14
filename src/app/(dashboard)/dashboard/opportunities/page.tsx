import Link from "next/link";
import { redirect } from "next/navigation";

import { CategoryFilterChips } from "@/components/features/deals/category-filter-chips";
import { DealCard } from "@/components/features/deals/deal-card";
import { PremiumAccessBlockedPanel } from "@/components/premium-access-blocked-panel";
import { EmptyState } from "@/components/shared/empty-state";
import { auth } from "@/lib/auth";
import { attachMatchMetadata } from "@/lib/matching";
import { OPPORTUNITY_CATEGORY_FILTERS } from "@/lib/opportunity-categories";
import { buildOpportunityVisibilityWhere } from "@/lib/opportunity-visibility";
import { prisma } from "@/lib/prisma";
import { getUserPremiumAccess } from "@/lib/subscription-access";
import { isTagCategory, isValidTagOption } from "@/lib/tags";

type OpportunitiesPageProps = {
  searchParams: Promise<{ category?: string; tagCategory?: string; tagValue?: string }>;
};

const VALID_CATEGORIES = OPPORTUNITY_CATEGORY_FILTERS.map((category) => category.value);

function normalizeCategory(category?: string) {
  return category ? (VALID_CATEGORIES.includes(category as (typeof VALID_CATEGORIES)[number]) ? category : undefined) : undefined;
}

function normalizeTagFilter(tagCategory?: string, tagValue?: string) {
  if (!tagCategory || !tagValue) {
    return null;
  }

  if (!isTagCategory(tagCategory)) {
    return null;
  }

  return isValidTagOption({ category: tagCategory, value: tagValue })
    ? { category: tagCategory, value: tagValue }
    : null;
}

export default async function OpportunitiesPage({ searchParams }: OpportunitiesPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const resolvedSearchParams = (await searchParams) || {};
  const activeCategory = normalizeCategory(resolvedSearchParams.category);
  const activeTag = normalizeTagFilter(resolvedSearchParams.tagCategory, resolvedSearchParams.tagValue);

  const access = await getUserPremiumAccess(session.user.id);

  if (!access.hasAccess) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Opportunités</h1>
            <p className="mt-1 text-muted-foreground">Découvre des opportunités business en Afrique</p>
          </div>
          <Link
            href="/dashboard/opportunities/new"
            className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            + Publier
          </Link>
        </div>
        <PremiumAccessBlockedPanel />
      </div>
    );
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      role: true,
      tier: true,
      tags: { orderBy: [{ category: "asc" }, { value: "asc" }], select: { category: true, value: true } },
    },
  });

  const categoryFilter = activeCategory ? { category: activeCategory as (typeof VALID_CATEGORIES)[number] } : {};
  const tagFilter = activeTag ? { tags: { some: { category: activeTag.category, value: activeTag.value } } } : null;
  const memberVisibilityWhere = buildOpportunityVisibilityWhere(currentUser?.tier);
  const adminWhere = { ...categoryFilter, ...(tagFilter ?? {}) };
  const memberAndFilters = tagFilter ? [categoryFilter, tagFilter, { OR: [memberVisibilityWhere, { authorId: session.user.id }] }] : [categoryFilter, { OR: [memberVisibilityWhere, { authorId: session.user.id }] }];

  const opportunities = await prisma.opportunity.findMany({
    where:
      currentUser?.role === "ADMIN"
        ? adminWhere
        : { AND: memberAndFilters },
    orderBy: { createdAt: "desc" },
    include: {
      author: {
        select: {
          name: true,
          id: true,
          phone: true,
          location: true,
          opportunities: { where: { verificationStatus: "VERIFIED" }, select: { id: true } },
        },
      },
      tags: { orderBy: [{ category: "asc" }, { value: "asc" }], select: { category: true, value: true } },
      _count: { select: { documents: true, verificationApprovals: true } },
      documents: {
        where: { mimeType: { in: ["image/jpeg", "image/png", "image/webp"] } },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { publicUrl: true },
      },
    },
  });

  const matchedOpportunities = currentUser?.tags.length ? attachMatchMetadata(opportunities, currentUser.tags) : opportunities.map((opportunity) => ({
    ...opportunity,
    commonTagCount: 0,
    matchPercent: 0,
    matchedTags: [],
  }));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Opportunités</h1>
          <p className="mt-1 text-muted-foreground">Découvre des opportunités business en Afrique</p>
        </div>
        <Link
          href="/dashboard/opportunities/new"
          className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          + Publier
        </Link>
      </div>

      <div className="mt-6">
        <CategoryFilterChips activeCategory={activeCategory} />
      </div>

      {matchedOpportunities.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="Aucun deal ne correspond à vos critères"
            description="Essayez une autre catégorie ou revenez plus tard."
            action={
              <Link
                href="/dashboard/opportunities"
                className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Réinitialiser les filtres
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          {matchedOpportunities.map((opportunity) => (
            <DealCard
              key={opportunity.id}
              match={{ commonTagCount: opportunity.commonTagCount, matchPercent: opportunity.matchPercent, matchedTags: opportunity.matchedTags }}
              deal={{
                id: opportunity.id,
                title: opportunity.title,
                amount: opportunity.amount,
                currency: opportunity.currency,
                location: opportunity.author.location,
                verificationStatus: opportunity.verificationStatus,
                documentCount: opportunity._count.documents,
                requiresDoubleVerification: opportunity.requiresDoubleVerification,
                approvalCount: opportunity._count.verificationApprovals,
                authorStats: { validatedDealsCount: opportunity.author.opportunities?.length ?? 0, averageRating: null },
                tags: opportunity.tags,
                author: { phone: opportunity.author.phone },
                thumbnailUrl: opportunity.documents.length > 0 ? `/api/opportunities/${opportunity.id}/thumbnail` : null,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
