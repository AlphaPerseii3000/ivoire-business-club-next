'use client';

import React from 'react';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import { BlurReveal } from '@/components/ui/blur-reveal';

export function Mission() {
  const pillars = [
    {
      title: 'Créer des ponts',
      desc: 'Entre l\'Europe et l\'Afrique, nous connectons les acteurs de la diaspora et les leaders économiques locaux.',
    },
    {
      title: 'Opportunités fiables',
      desc: 'Accès exclusif à des opportunités d\'investissement et de business rigoureusement auditées et vérifiées.',
    },
    {
      title: 'Valoriser le local',
      desc: 'Les talents et entrepreneurs ivoiriens sont au cœur de notre écosystème de co-développement.',
    },
    {
      title: 'Communauté d\'élite',
      desc: 'Un réseau solidaire de professionnels chevronnés, structuré autour du partage de valeur et de résultats.',
    },
  ];

  return (
    <section id="mission" className="py-24 bg-[#090D16] text-white">
      <div className="mx-auto max-w-7xl px-4">
        <BlurReveal>
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-[#D4A847] text-sm font-semibold tracking-wider uppercase">
              Notre Raison d'Être
            </span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-5xl">
              Notre Mission
            </h2>
            <p className="mt-4 text-slate-400">
              Construire le pont d'affaires de référence entre la diaspora et la Côte d'Ivoire.
            </p>
          </div>
        </BlurReveal>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((p, i) => (
            <BlurReveal key={p.title} delay={i * 120}>
              <SpotlightCard
                className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-6 text-center hover:border-[#D4A847]/30 transition-all duration-300"
              >
                <h3 className="text-lg font-bold text-[#D4A847] mb-3">{p.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{p.desc}</p>
              </SpotlightCard>
            </BlurReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
export default Mission;