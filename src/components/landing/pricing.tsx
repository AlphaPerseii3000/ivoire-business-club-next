'use client';

import React from 'react';
import { TierCard } from '@/components/tier-card';
import { MEMBERSHIP_TIERS } from '@/lib/tier-config';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import { BlurReveal } from '@/components/ui/blur-reveal';
import { SplitText } from '@/components/ui/split-text';
import { ShinyText } from '@/components/ui/shiny-text';

export function Pricing() {
  return (
    <section id="pricing" className="py-24 bg-[#090D16] text-white" aria-label="Nos offres">
      <div className="mx-auto max-w-7xl px-4">
        <BlurReveal>
          <div className="mx-auto max-w-3xl text-center mb-16">
            <span className="text-[#D4A847] text-sm font-semibold tracking-wider uppercase">
              Adhésion au Club
            </span>
            <div id="pricing-heading" className="mt-2">
              <SplitText
                text="Nos offres"
                className="text-3xl font-bold tracking-tight sm:text-5xl text-white block"
                tag="h2"
                textAlign="center"
                delay={40}
              />
            </div>
            <p className="mt-4 text-slate-400">
              Trois niveaux simples pour accéder aux deals vérifiés, aux événements et au mentorat IBC.
            </p>
            <p className="mt-3 text-sm font-medium text-[#D4A847]">
              Prix mensuels clairs : €29, €49 et €99.
            </p>
          </div>
        </BlurReveal>

        {/* Card layout - hidden on large screens, visible on mobile/tablet */}
        <div data-testid="pricing-tier-grid" className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3 lg:hidden">
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
                  href={`/auth/signup?tier=${tier.tier}`}
                  actionLabel={tier.ctaLabel}
                  className="bg-transparent border-transparent shadow-none h-full text-white"
                />
              </SpotlightCard>
            </BlurReveal>
          ))}
        </div>

        {/* Desktop-only Comparison Table layout (>= 1024px) */}
        <BlurReveal delay={300}>
          <div className="hidden lg:block mt-12 overflow-x-auto border border-white/10 rounded-xl bg-white/5 backdrop-blur-md">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="sticky top-0 bg-[#090D16]/95 backdrop-blur-sm z-20 border-b border-white/10">
                  <th className="p-6 text-sm font-semibold text-slate-400 w-1/4">Offre</th>
                  <th className="p-6 w-1/4">
                    <div className="flex flex-col gap-2">
                      <span className="text-xl font-bold text-white">Affranchis</span>
                      <span className="text-sm text-[#D4A847]">€29 / mois</span>
                      <a
                        href="/auth/signup?tier=AFFRANCHI"
                        className="mt-2 text-center text-xs font-semibold py-2 px-4 rounded border border-white/20 text-white hover:bg-white/10 hover:border-white transition-all min-h-11 flex items-center justify-center"
                      >
                        Choisir Affranchis
                      </a>
                    </div>
                  </th>
                  <th className="p-6 border-x border-white/5 bg-white/5 relative w-1/4">
                    <div className="absolute top-0 right-0 left-0 h-1 bg-[#D4A847]" />
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-white">Grands Frères</span>
                        <div className="border border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100 overflow-hidden whitespace-nowrap rounded px-1.5 py-0.5 text-[9px] font-bold">
                          <ShinyText text="Recommandé" color="#D4A847" shineColor="#FFFFFF" speed={2.5} />
                        </div>
                      </div>
                      <span className="text-sm text-[#D4A847]">€49 / mois</span>
                      <a
                        href="/auth/signup?tier=GRAND_FRERE"
                        className="mt-2 text-center text-xs font-semibold py-2 px-4 rounded bg-[#D4A847] text-black hover:bg-[#bfa03f] transition-all min-h-11 flex items-center justify-center"
                      >
                        Choisir Grands Frères
                      </a>
                    </div>
                  </th>
                  <th className="p-6 w-1/4">
                    <div className="flex flex-col gap-2">
                      <span className="text-xl font-bold text-white">Boss</span>
                      <span className="text-sm text-[#D4A847]">€99 / mois</span>
                      <a
                        href="/auth/signup?tier=BOSS"
                        className="mt-2 text-center text-xs font-semibold py-2 px-4 rounded border border-white/20 text-white hover:bg-white/10 hover:border-white transition-all min-h-11 flex items-center justify-center"
                      >
                        Choisir Boss
                      </a>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                <tr className="hover:bg-white/5 transition-colors">
                  <td className="p-6 font-semibold text-slate-300">Accès WhatsApp</td>
                  <td className="p-6 text-slate-400">✓ Oui</td>
                  <td className="p-6 text-slate-400 border-x border-white/5 bg-white/5">✓ Oui</td>
                  <td className="p-6 text-slate-400">✓ Oui</td>
                </tr>
                <tr className="hover:bg-white/5 transition-colors">
                  <td className="p-6 font-semibold text-slate-300">Visibilité des opportunités</td>
                  <td className="p-6 text-slate-400">Standard (deals vérifiés)</td>
                  <td className="p-6 text-slate-200 font-medium border-x border-white/5 bg-white/5">Prioritaire</td>
                  <td className="p-6 text-slate-400">Exclusive (deals stratégiques)</td>
                </tr>
                <tr className="hover:bg-white/5 transition-colors">
                  <td className="p-6 font-semibold text-slate-300">Événements IBC</td>
                  <td className="p-6 text-slate-400">Accès payant</td>
                  <td className="p-6 text-slate-400 border-x border-white/5 bg-white/5">Inclus</td>
                  <td className="p-6 text-slate-400">Inclus + Accès VIP</td>
                </tr>
                <tr className="hover:bg-white/5 transition-colors">
                  <td className="p-6 font-semibold text-slate-300">Conseil & Mentorat</td>
                  <td className="p-6 text-slate-400">Non</td>
                  <td className="p-6 text-slate-400 border-x border-white/5 bg-white/5">Non</td>
                  <td className="p-6 text-slate-400">1h / mois incluse</td>
                </tr>
                <tr className="hover:bg-white/5 transition-colors">
                  <td className="p-6 font-semibold text-slate-300">Tarif mensuel</td>
                  <td className="p-6 text-[#D4A847] font-semibold">€29 / mois</td>
                  <td className="p-6 text-[#D4A847] font-bold border-x border-white/5 bg-white/5">€49 / mois</td>
                  <td className="p-6 text-[#D4A847] font-semibold">€99 / mois</td>
                </tr>
              </tbody>
            </table>
          </div>
        </BlurReveal>
      </div>
    </section>
  );
}

export default Pricing;