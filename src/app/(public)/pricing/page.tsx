import Link from "next/link";
import type { Metadata } from "next";

import { PricingTierSelection } from "@/components/pricing-tier-selection";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Adhésion IBC — Tarifs & formules",
  description:
    "Découvrez les 3 formules d'adhésion IBC : Affranchis (29€/mois), Grands Frères (59€/mois) et Boss (129€/mois). Accès aux opportunités, networking et experts.",
  alternates: {
    canonical: '/pricing',
  },
  openGraph: {
    title: "Adhésion IBC — Tarifs & formules",
    description:
      "3 formules d'adhésion à l'Ivoire Business Club : Affranchis, Grands Frères et Boss. Networking, investissements et opportunités business en Côte d'Ivoire.",
    type: "website",
    locale: "fr_FR",
  },
};

export default async function PricingPage() {
  const session = await auth();
  const isAuthenticated = !!session?.user?.id;
  const userId = session?.user?.id;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-16">
      <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-bold sm:text-4xl">Nos offres</h1>
          <p className="mt-4 text-muted-foreground">
            Compare les trois niveaux IBC et choisis l&apos;accès qui correspond à tes objectifs.
          </p>
          <p className="mt-3 text-sm font-medium text-foreground">
            Prix mensuels en euros : €29, €59 et €129. Sélectionne une offre pour recevoir les instructions de virement.
          </p>
        </div>

        <div className="mt-12">
          <PricingTierSelection isAuthenticated={isAuthenticated} userId={userId} />
        </div>
      </div>
    );
  }
