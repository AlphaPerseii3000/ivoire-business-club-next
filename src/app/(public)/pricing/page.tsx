import Link from "next/link";

import { TierCard } from "@/components/tier-card";
import { MEMBERSHIP_TIERS } from "@/lib/tier-config";

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-card">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="rounded-md text-xl font-bold text-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            IBC
          </Link>
          <nav className="flex items-center gap-3 text-sm sm:gap-6" aria-label="Navigation principale">
            <Link href="/auth/signin" className="inline-flex min-h-11 items-center rounded-md px-2 hover:text-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
              Connexion
            </Link>
            <Link href="/auth/signup" className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
              Rejoins le club
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex-1 max-w-7xl px-4 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-bold sm:text-4xl">Nos offres</h1>
          <p className="mt-4 text-muted-foreground">
            Compare les trois niveaux IBC et choisis l&apos;accès qui correspond à tes objectifs.
          </p>
          <p className="mt-3 text-sm font-medium text-foreground">
            Prix mensuels en euros : €29, €49 et €99. La sélection détaillée arrive à l&apos;étape suivante.
          </p>
        </div>

        <div data-testid="pricing-tier-grid" className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
          {MEMBERSHIP_TIERS.map((tier) => (
            <TierCard key={tier.tier} tier={tier.tier} href="/auth/signup" actionLabel={tier.ctaLabel} />
          ))}
        </div>
      </main>
    </div>
  );
}
