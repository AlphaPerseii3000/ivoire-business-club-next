import { OpportunityTeasers } from "@/components/landing/opportunity-teasers";
import { prisma } from "@/lib/prisma";
import LandingMobileNav from "@/components/landing/mobile-nav";

export const dynamic = "force-dynamic";

export default async function PublicOpportunitiesPage() {
  const opportunities = await prisma.opportunity.findMany({
    where: { verificationStatus: "VERIFIED" },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      title: true,
      author: { select: { location: true } },
    },
  });

  const teasers = opportunities.map((opportunity) => ({
    id: opportunity.id,
    title: opportunity.title,
    location: opportunity.author.location,
  }));

  return (
    <div className="min-h-screen bg-background">
      <LandingMobileNav />
      <OpportunityTeasers
        opportunities={teasers}
        title="Toutes les opportunités visibles publiquement"
        description="Les visiteurs voient uniquement le titre et la localisation. Les montants, documents et contacts sont réservés aux membres actifs."
      />
    </div>
  );
}
