import { TierCard } from "@/components/tier-card";
import { MEMBERSHIP_TIERS } from "@/lib/tier-config";

export function Pricing() {
  return (
    <section id="pricing" className="py-20" aria-labelledby="pricing-heading">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 id="pricing-heading" className="text-3xl font-bold">
            Nos offres
          </h2>
          <p className="mt-4 text-muted-foreground">
            Trois niveaux simples pour accéder aux deals vérifiés, aux events et au mentorat IBC.
          </p>
          <p className="mt-3 text-sm font-medium text-foreground">
            Prix mensuels clairs : €29, €49 et €99.
          </p>
        </div>

        <div data-testid="pricing-tier-grid" className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
          {MEMBERSHIP_TIERS.map((tier) => (
            <TierCard key={tier.tier} tier={tier.tier} href="/auth/signup" actionLabel={tier.ctaLabel} />
          ))}
        </div>
      </div>
    </section>
  );
}
