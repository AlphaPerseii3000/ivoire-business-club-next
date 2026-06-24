import { OpportunityTeasers } from "@/components/landing/opportunity-teasers";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import LandingMobileNav from "@/components/landing/mobile-nav";
import { Footer } from "@/components/landing/footer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Opportunités Business | Ivoire Business Club",
  description: "Consultez les opportunités d'affaires vérifiées par l'Ivoire Business Club : investissement, partenariat et deals en Côte d'Ivoire. Accès réservé aux membres.",
  openGraph: {
    title: "Opportunités Business | Ivoire Business Club",
    description: "Consultez les opportunités d'affaires vérifiées par l'Ivoire Business Club : investissement, partenariat et deals en Côte d'Ivoire. Accès réservé aux membres.",
    type: "website",
    locale: "fr_FR",
  },
};

export default async function PublicOpportunitiesPage() {
  let opportunities: { id: string; title: string; location: string | null }[] = [];
  try {
    const dbOpportunities = await prisma.opportunity.findMany({
      where: { verificationStatus: "VERIFIED" },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        title: true,
        author: { select: { location: true } },
      },
    });

    opportunities = dbOpportunities.map((opportunity) => ({
      id: opportunity.id,
      title: opportunity.title,
      location: opportunity.author.location,
    }));
  } catch (err) {
    console.error("Error fetching public opportunities:", err);
  }

  return (
    <div className="min-h-screen bg-[#090D16] text-white flex flex-col">
      <LandingMobileNav />
      <main className="flex-1">
        <OpportunityTeasers
          opportunities={opportunities}
          title="Toutes les opportunités visibles publiquement"
          description="Les visiteurs voient uniquement le titre et la localisation. Les montants, documents et contacts sont réservés aux membres actifs."
        />
      </main>
      <Footer />
    </div>
  );
}
