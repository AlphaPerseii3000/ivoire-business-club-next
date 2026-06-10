'use client';

import React from 'react';
import { TierCard } from '@/components/tier-card';
import { MEMBERSHIP_TIERS } from '@/lib/tier-config';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import { BlurReveal } from '@/components/ui/blur-reveal';

export function Pricing() {
  return (
    <section id="pricing" className="py-24 bg-[#090D16] text-white" aria-labelledby="pricing-heading">
      <div className="mx-auto max-w-7xl px-4">
        <BlurReveal>
          <div className="mx-auto max-w-3xl text-center mb-16">
            <span className="text-[#D4A847] text-sm font-semibold tracking-wider uppercase">
              Adhésion au Club
            </span>
            <h2 id="pricing-heading" className="mt-2 text-3xl font-bold tracking-tight sm:text-5xl">
              Nos offres
            </h2>
            <p className="mt-4 text-slate-400">
              Trois niveaux simples pour accéder aux deals vérifiés, aux événements et au mentorat IBC.
            </p>
            <p className="mt-3 text-sm font-medium text-[#D4A847]">
              Prix mensuels clairs : €29, €49 et €99.
            </p>
          </div>
        </BlurReveal>

        <div data-testid="pricing-tier-grid" className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
          {MEMBERSHIP_TIERS.map((tier, i) => (
            <BlurReveal key={tier.tier} delay={i * 150}>
              <SpotlightCard
                spotlightColor={
                  tier.tier === 'GRAND_FRERE'
                    ? 'rgba(212, 168, 71, 0.15)'
                    : 'rgba(255, 255, 255, 0.15)'
                }
                className="h-full rounded-xl border border-white/10 bg-white/5 backdrop-blur-md"
              >
                <TierCard
                  tier={tier.tier}
                  href="/auth/signup"
                  actionLabel={tier.ctaLabel}
                  className="bg-transparent border-transparent shadow-none h-full text-white"
                />
              </SpotlightCard>
            </BlurReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Pricing;