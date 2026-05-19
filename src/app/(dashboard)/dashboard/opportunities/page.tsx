import Link from "next/link";
import { redirect } from "next/navigation";

import { CategoryFilterChips } from "@/components/features/deals/category-filter-chips";
import { DealCard } from "@/components/features/deals/deal-card";
import { PremiumAccessBlockedPanel } from "@/components/premium-access-blocked-panel";
import { EmptyState } from "@/components/shared/empty-state";
import { auth } from "@/lib/auth";
import { OPPORTUNITY_CATEGORY_FILTERS } from "@/lib/opportunity-categories";
import { buildOpportunityVisibilityWhere } from "@/lib/opportunity-visibility";
import { prisma } from "@/lib/prisma";
import { getUserPremiumAccess } from "@/lib/subscription-access";

type OpportunitiesPageProps = {
  searchParams?: Promise<{ category?: string }>;
};

const VALID_CATEGORIES = OPPORTUNITY_CATEGORY_FILTERS.map((category) => category.value);

function normalizeCategory(category?: string) {
  return category && VALID_CATEGORIES.includes(category as (typeof VALID_CATEGORIES)[number]) ? category : undefined;
}

export default async function OpportunitiesPage({ searchParams }: OpportunitiesPageProps = {}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const activeCategory = normalizeCategory(resolvedSearchParams.category);

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
    select: { role: true, tier: true },
  });

  const categoryFilter = activeCategory ? { category: activeCategory as (typeof VALID_CATEGORIES)[number] } : {};
  const memberVisibilityWhere = buildOpportunityVisibilityWhere(currentUser?.tier);

  const opportunities = await prisma.opportunity.findMany({
    where:
      currentUser?.role === "ADMIN"
        ? categoryFilter
        : {
            AND: [
              categoryFilter,
              {
                OR: [
                  memberVisibilityWhere,
                  { authorId: session.user.id },
                ],
              },
            ],
          },
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { name: true, id: true, phone: true, location: true } },
      _count: { select: { documents: true } },
    },
  });

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

      {opportunities.length === 0 ? (
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
        <div className="mt-8 space-y-4">
          {opportunities.map((opportunity) => (
            <DealCard
              key={opportunity.id}
              deal={{
                id: opportunity.id,
                title: opportunity.title,
                amount: opportunity.amount,
                location: opportunity.author.location,
                verificationStatus: opportunity.verificationStatus,
                documentCount: opportunity._count.documents,
                author: { phone: opportunity.author.phone },
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
