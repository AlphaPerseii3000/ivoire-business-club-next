'use client';

import Link from 'next/link';
import { DealCard } from '@/components/features/deals/deal-card';
import { BlurReveal } from '@/components/ui/blur-reveal';

type OpportunityTeaser = {
  id: string;
  title: string;
  category?: string | null;
  location?: string | null;
};

type OpportunityTeasersProps = {
  opportunities: OpportunityTeaser[];
  title?: string;
  description?: string;
};

export function OpportunityTeasers({
  opportunities,
  title = 'Aperçu des opportunités vérifiées',
  description = 'Quelques deals sont visibles publiquement. Les détails restent réservés aux membres actifs.',
}: OpportunityTeasersProps) {
  return (
    <section id="opportunites" className="bg-[#090D16] py-24 text-white">
      <div className="mx-auto max-w-7xl px-4">
        <BlurReveal>
          <div className="mx-auto max-w-2xl text-center mb-16">
            <span className="text-[#D4A847] text-sm font-semibold uppercase tracking-wider">
              Deals Teaser
            </span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-5xl">{title}</h2>
            <p className="mt-4 text-slate-400">{description}</p>
          </div>
        </BlurReveal>

        {opportunities.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-3">
            {opportunities.map((opportunity, i) => (
              <BlurReveal key={opportunity.id} delay={i * 120}>
                <DealCard
                  deal={opportunity}
                  isTeaser={true}
                />
              </BlurReveal>
            ))}
          </div>
        ) : (
          <BlurReveal>
            <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-white/10 bg-[#0F172A] p-8 text-center text-slate-400">
              Aucun teaser vérifié disponible pour le moment.
            </div>
          </BlurReveal>
        )}

        <BlurReveal delay={400}>
          <div className="mt-12 text-center">
            <Link
              href="/opportunities"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#D4A847] px-6 py-2 text-sm font-semibold text-[#D4A847] hover:bg-[#D4A847]/10 transition-all duration-300"
            >
              Voir tous les teasers
            </Link>
          </div>
        </BlurReveal>
      </div>
    </section>
  );
}
export default OpportunityTeasers;