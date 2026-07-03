'use client';

import React, { useState } from 'react';
import { Check, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { MEMBERSHIP_TIERS } from '@/lib/tier-config';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import { BlurReveal } from '@/components/ui/blur-reveal';
import { SplitText } from '@/components/ui/split-text';
import { ShinyText } from '@/components/ui/shiny-text';

export function Pricing() {
  const [showComparison, setShowComparison] = useState(false);

  return (
    <section id="pricing" className="py-24 bg-[#090D16] text-white relative overflow-hidden" aria-label="Nos offres">
      {/* Subtle Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#D4A847]/5 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="mx-auto max-w-7xl px-6 relative z-10">
        <BlurReveal>
          <div className="mx-auto max-w-3xl text-center mb-16">
            <span className="text-[#D4A847] text-xs font-semibold tracking-widest uppercase bg-[#D4A847]/10 px-3.5 py-1.5 rounded-full border border-[#D4A847]/20">
              Adhésion au Club
            </span>
            <div id="pricing-heading" className="mt-4">
              <SplitText
                text="Investir dans son réseau"
                className="text-4xl font-black tracking-[-0.04em] sm:text-5xl text-white block"
                tag="h2"
                textAlign="center"
                delay={40}
              />
            </div>
            <p className="mt-4 text-slate-400 font-light text-base leading-relaxed">
              Trois niveaux d&apos;adhésion conçus pour s&apos;adapter à vos ambitions. Accédez aux deals vérifiés, aux événements privés d&apos;Abidjan et au mentorat d&apos;élite.
            </p>
          </div>
        </BlurReveal>

        {/* Bento Grid - 3 columns on desktop */}
        <div data-testid="pricing-tier-grid" className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-12 items-stretch">
          {MEMBERSHIP_TIERS.map((tier, i) => {
            const isGrandFrere = tier.tier === 'GRAND_FRERE';
            const isBoss = tier.tier === 'BOSS';

            return (
              <BlurReveal key={tier.tier} delay={i * 150}>
                <SpotlightCard
                  data-testid="tier-card"
                  data-tier={tier.tier.toLowerCase().replace('_', '')}
                  spotlightColor={
                    isGrandFrere
                      ? 'rgba(212, 168, 71, 0.25)'
                      : isBoss
                      ? 'rgba(167, 139, 250, 0.15)'
                      : 'rgba(255, 255, 255, 0.12)'
                  }
                  className={`h-full flex flex-col justify-between p-8 rounded-2xl transition-all duration-500 border ${
                    isGrandFrere
                      ? 'border-[#D4A847]/40 bg-[#090D16]/80 shadow-[0_0_50px_rgba(212,168,71,0.1)] ring-1 ring-[#D4A847]/20 scale-[1.02] lg:scale-[1.04]'
                      : 'border-white/10 bg-white/[0.02]'
                  }`}
                >
                  <div className="flex flex-col gap-6">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-heading text-2xl font-bold tracking-tight text-white">
                          {tier.label}
                        </h3>
                        <p className="mt-1.5 text-xs text-slate-400 font-light">
                          {tier.shortDescription}
                        </p>
                      </div>
                      
                      {isGrandFrere ? (
                        <div className="border border-[#D4A847]/40 bg-[#D4A847]/10 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase text-[#D4A847] flex items-center gap-1.5">
                          <Sparkles className="h-3 w-3" />
                          <ShinyText text="Recommandé" color="#D4A847" shineColor="#FFFFFF" speed={2.5} />
                        </div>
                      ) : null}
                    </div>

                    {/* Pricing Display */}
                    <div className="py-2 border-y border-white/5 flex flex-col gap-1">
                      <span className="text-3xl font-bold text-white tracking-tight">
                        {tier.priceLabel}
                      </span>
                      <span className="text-xs text-[#D4A847]/90 font-medium">
                        Soit environ {tier.xofPriceLabel}
                      </span>
                    </div>

                    {/* Features List */}
                    <ul className="space-y-4 text-sm" aria-label={`Avantages ${tier.label}`}>
                      {tier.benefits.map((benefit) => (
                        <li key={benefit} className="flex items-start gap-3">
                          <div className={`mt-0.5 rounded-full p-0.5 shrink-0 ${isGrandFrere ? 'bg-[#D4A847]/10' : 'bg-white/5'}`}>
                            <Check className={`size-3.5 ${isGrandFrere ? 'text-[#D4A847]' : 'text-slate-400'}`} aria-hidden="true" />
                          </div>
                          <span className="text-slate-300 font-light leading-relaxed">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* CTA Button */}
                  <div className="mt-8">
                    <a
                      href={`/auth/signup?tier=${tier.tier}`}
                      className={`relative flex min-h-12 w-full items-center justify-center rounded-xl text-sm font-semibold tracking-wide transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${
                        isGrandFrere
                          ? 'bg-[#D4A847] text-black shadow-lg shadow-[#D4A847]/10 hover:bg-[#E8C96A]'
                          : 'border border-white/10 hover:border-white/20 bg-white/5 text-white hover:bg-white/10'
                      }`}
                    >
                      {isGrandFrere ? (
                        <ShinyText text={tier.ctaLabel} color="#000000" shineColor="#FFFFFF" speed={3} className="font-semibold" />
                      ) : (
                        <ShinyText text={tier.ctaLabel} color="#FFFFFF" shineColor="#D4A847" speed={4} className="font-semibold" />
                      )}
                    </a>
                  </div>
                </SpotlightCard>
              </BlurReveal>
            );
          })}
        </div>

        {/* Collapsible Comparison Table */}
        <div className="mt-16 text-center">
          <button
            onClick={() => setShowComparison(!showComparison)}
            className="inline-flex items-center gap-2 text-slate-400 hover:text-[#D4A847] text-sm font-medium transition-colors duration-300"
          >
            {showComparison ? 'Masquer le comparatif des offres' : 'Voir le comparatif complet des fonctionnalités'}
            {showComparison ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        <div className={`mt-8 overflow-x-auto border border-white/10 rounded-xl bg-white/5 backdrop-blur-md max-w-4xl mx-auto ${showComparison ? 'block' : 'hidden lg:block'}`}>
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="sticky top-0 bg-[#090D16]/95 backdrop-blur-sm z-20 border-b border-white/10">
                <th className="p-6 text-sm font-semibold text-slate-400 w-1/4">Offre</th>
                <th className="p-6 w-1/4">
                  <div className="flex flex-col gap-2">
                    <span className="text-xl font-bold text-white">Affranchis</span>
                    <span className="text-sm text-[#D4A847]">€29 / mois</span>
                    <span className="text-xs text-[#D4A847]">19 000 CFA / mois</span>
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
                    <span className="text-sm text-[#D4A847]">€59 / mois</span>
                    <span className="text-xs text-[#D4A847]">39 000 CFA / mois</span>
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
                    <span className="text-sm text-[#D4A847]">€129 / mois</span>
                    <span className="text-xs text-[#D4A847]">85 000 CFA / mois</span>
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
                <td className="p-6">
                  <span className="text-sm text-[#D4A847] font-semibold">€29 / mois</span>
                  <span className="block text-xs text-[#D4A847]">19 000 CFA / mois</span>
                </td>
                <td className="p-6 border-x border-white/5 bg-white/5">
                  <span className="text-sm text-[#D4A847] font-bold">€59 / mois</span>
                  <span className="block text-xs text-[#D4A847]">39 000 CFA / mois</span>
                </td>
                <td className="p-6">
                  <span className="text-sm text-[#D4A847] font-semibold">€129 / mois</span>
                  <span className="block text-xs text-[#D4A847]">85 000 CFA / mois</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default Pricing;