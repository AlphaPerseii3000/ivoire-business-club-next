import Link from "next/link";
import { redirect } from "next/navigation";

import { DealCard } from "@/components/features/deals/deal-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PremiumAccessBlockedPanel } from "@/components/premium-access-blocked-panel";
import { auth } from "@/lib/auth";
import { attachMatchMetadata } from "@/lib/matching";
import { buildOpportunityVisibilityWhere } from "@/lib/opportunity-visibility";
import { prisma } from "@/lib/prisma";
import { getUserPremiumAccess } from "@/lib/subscription-access";

function editTagsAction() {
  return (
    <Link
      href="/profile/edit"
      className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      Modifier mes tags
    </Link>
  );
}

export default async function MatchingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const access = await getUserPremiumAccess(session.user.id);
  if (!access.hasAccess) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold">Matching</h1>
          <p className="mt-1 text-muted-foreground">Des deals priorisés selon les tags de ton profil.</p>
        </div>
        <div className="mt-8">
          <PremiumAccessBlockedPanel />
        </div>
      </div>
    );
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      tier: true,
      tags: { orderBy: [{ category: "asc" }, { value: "asc" }], select: { category: true, value: true } },
    },
  });

  if (!currentUser) redirect("/auth/signin");

  const hasProfileTags = currentUser.tags.length > 0;

  if (!hasProfileTags) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold">Matching</h1>
          <p className="mt-1 text-muted-foreground">Des deals priorisés selon les tags de ton profil.</p>
        </div>
        <div className="mt-8">
          <EmptyState
            title="Ajoutez des tags à votre profil"
            description="Sélectionnez vos secteurs, montants et localisations pour recevoir des suggestions pertinentes."
            action={editTagsAction()}
          />
        </div>
      </div>
    );
  }

  const memberVisibilityWhere = buildOpportunityVisibilityWhere(currentUser.tier);
  const opportunities = await prisma.opportunity.findMany({
    where:
      currentUser.role === "ADMIN"
        ? {}
        : { OR: [memberVisibilityWhere, { authorId: session.user.id }] },
    orderBy: { createdAt: "desc" },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          phone: true,
          location: true,
          opportunities: { where: { verificationStatus: "VERIFIED" }, select: { id: true } },
        },
      },
      tags: { orderBy: [{ category: "asc" }, { value: "asc" }], select: { category: true, value: true } },
      _count: { select: { documents: true, verificationApprovals: true } },
    },
  });

  const matchedOpportunities = attachMatchMetadata(opportunities, currentUser.tags).filter((opportunity) => opportunity.commonTagCount > 0);
  const hasMatches = matchedOpportunities.length > 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">Matching</h1>
        <p className="mt-1 text-muted-foreground">Des deals priorisés selon les tags de ton profil.</p>
      </div>

      {hasMatches ? (
        <div className="mt-8 space-y-4">
          {matchedOpportunities.map((opportunity) => (
            <DealCard
              key={opportunity.id}
              match={{ commonTagCount: opportunity.commonTagCount, matchPercent: opportunity.matchPercent, matchedTags: opportunity.matchedTags }}
              deal={{
                id: opportunity.id,
                title: opportunity.title,
                amount: opportunity.amount,
                location: opportunity.author.location,
                verificationStatus: opportunity.verificationStatus,
                documentCount: opportunity._count.documents,
                requiresDoubleVerification: opportunity.requiresDoubleVerification,
                approvalCount: opportunity._count.verificationApprovals,
                authorStats: { validatedDealsCount: opportunity.author.opportunities?.length ?? 0, averageRating: null },
                tags: opportunity.tags,
                author: { phone: opportunity.author.phone },
              }}
            />
          ))}
        </div>
      ) : (
        <div className="mt-8">
          <EmptyState
            title="Aucun deal ne correspond à vos critères actuels"
            description="Modifiez vos tags pour élargir vos suggestions."
            action={editTagsAction()}
          />
        </div>
      )}
    </div>
  );
}
