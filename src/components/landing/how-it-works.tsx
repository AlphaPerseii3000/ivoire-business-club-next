'use client';

import React from 'react';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import { BlurReveal } from '@/components/ui/blur-reveal';

export function HowItWorks() {
  const steps = [
    {
      num: '01',
      title: 'Rejoindre',
      desc: 'Tu rejoins le club et accèdes à une communauté exclusive d\'affaires, de mentorat et de synergie.',
      img: '/section-reseautage-synergie.webp',
    },
    {
      num: '02',
      title: 'Accéder',
      desc: 'Tu accèdes aux opportunités d\'investissement qualifiées, de mentorat et d\'accompagnement ciblé.',
      img: '/section-mentorat-accompagnement.webp',
    },
    {
      num: '03',
      title: 'Passer à l\'action',
      desc: 'Tu passes à l\'action avec des mises en relation directes et un accès au club d\'affaires prestige.',
      img: '/section-club-affaires-prestige.webp',
    },
  ];

  return (
    <section className="py-24 bg-transparent text-white">
      <div className="mx-auto max-w-7xl px-4">
        <BlurReveal>
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-[#D4A847] text-sm font-semibold tracking-wider uppercase">
              Processus du Club
            </span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-5xl">
              Comment ça marche ?
            </h2>
            <p className="mt-4 text-slate-400">
              Une boucle de valeur en 3 étapes conçue pour maximiser votre impact et vos connexions en Côte d&apos;Ivoire.
            </p>
          </div>
        </BlurReveal>

        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((s, i) => (
            <BlurReveal key={s.num} delay={i * 150}>
              <SpotlightCard
                className="flex flex-col h-full overflow-hidden border border-white/10 bg-white/5 backdrop-blur-md rounded-xl group hover:border-[#D4A847]/30 transition-all duration-300"
              >
                <div className="relative h-48 w-full overflow-hidden">
                  <img
                    src={s.img}
                    alt={s.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#090D16] via-transparent to-transparent" />
                  <div className="absolute top-4 left-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#D4A847] text-sm font-bold text-black shadow-md">
                    {s.num}
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">{s.title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              </SpotlightCard>
            </BlurReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
export default HowItWorks;