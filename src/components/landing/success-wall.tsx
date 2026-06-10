'use client';

import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SpotlightCard } from '@/components/ui/spotlight-card';

interface Testimonial {
  name: string;
  role: string;
  photo: string;
  quote: string;
}

export function SuccessWall() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const testimonials: Testimonial[] = [
    {
      name: 'Amara Diabaté',
      role: 'Jeune Entrepreneure Tech',
      photo: '/profil-1-jeune-entrepreneure-tech.webp',
      quote: 'Grâce à l\'IBC, j\'ai pu sécuriser un financement de pré-amorçage pour ma startup fintech et trouver des mentors d\'exception à Abidjan.',
    },
    {
      name: 'Marc-Antoine Koffi',
      role: 'Investisseur Senior & Business Angel',
      photo: '/profil-2-investisseur-senior-business-angel.webp',
      quote: 'L\'Ivoire Business Club offre un flux d\'opportunités qualifiées et structurées sans équivalent pour quiconque souhaite investir sérieusement en Côte d\'Ivoire.',
    },
    {
      name: 'Jean-Pierre Touré',
      role: 'Entrepreneur Local',
      photo: '/profil-3-entrepreneur-local-cote-divoire.webp',
      quote: 'L\'accès aux compétences et aux réseaux d\'affaires de la diaspora via le club a littéralement transformé notre chaîne logistique locale.',
    },
    {
      name: 'Awa Berthé',
      role: 'Cadre Financière & Experte en Investissement',
      photo: '/profil-4-cadre-financiere-experte-en-investissement.webp',
      quote: 'L\'IBC combine rigueur professionnelle et esprit communautaire. Une synergie parfaite pour sécuriser ses investissements en Afrique de l\'Ouest.',
    },
  ];

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const offset = direction === 'left' ? -clientWidth / 2 : clientWidth / 2;
      scrollRef.current.scrollTo({ left: scrollLeft + offset, behavior: 'smooth' });
    }
  };

  return (
    <section id="success-wall" className="py-24 bg-[#090D16] text-white overflow-hidden">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16">
          <div className="max-w-2xl">
            <span className="text-[#D4A847] text-sm font-semibold tracking-wider uppercase">
              Social Proof & Impacts
            </span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-5xl">
              Le Mur des Succès
            </h2>
            <p className="mt-4 text-slate-400">
              Découvrez les retours d'expérience des membres qui bâtissent l'économie de demain.
            </p>
          </div>
          <div className="flex gap-3 mt-6 md:mt-0">
            <button
              onClick={() => scroll('left')}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white hover:bg-[#D4A847] hover:text-black hover:border-[#D4A847] transition-all cursor-pointer"
              aria-label="Témoignage précédent"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white hover:bg-[#D4A847] hover:text-black hover:border-[#D4A847] transition-all cursor-pointer"
              aria-label="Témoignage suivant"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Carousel / horizontal scroll container */}
        <div className="relative w-full">
          <div ref={scrollRef} className="flex gap-6 overflow-x-auto pb-8 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent snap-x scroll-smooth">
            {testimonials.map((t, idx) => (
              <div key={idx} className="w-[300px] sm:w-[400px] shrink-0 snap-start">
                <SpotlightCard className="flex flex-col h-full justify-between p-6 border border-white/10 bg-white/5 backdrop-blur-md rounded-xl hover:border-[#D4A847]/30 transition-all duration-300">
                  <p className="text-slate-300 text-sm sm:text-base italic leading-relaxed mb-6">
                    “{t.quote}”
                  </p>
                  <div className="flex items-center gap-4">
                    <img
                      src={t.photo}
                      alt={t.name}
                      className="w-12 h-12 rounded-full object-cover border border-[#D4A847]/40 shadow-inner"
                    />
                    <div>
                      <h4 className="font-bold text-white text-sm sm:text-base">{t.name}</h4>
                      <p className="text-xs text-[#D4A847]">{t.role}</p>
                    </div>
                  </div>
                </SpotlightCard>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default SuccessWall;
