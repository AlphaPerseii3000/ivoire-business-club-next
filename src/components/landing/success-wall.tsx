'use client';

import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import { BlurReveal } from '@/components/ui/blur-reveal';
import { TESTIMONIALS } from '@/lib/testimonials-config';
import { SplitText } from '@/components/ui/split-text';
import { ShinyText } from '@/components/ui/shiny-text';

export function SuccessWall() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const scrollLeftStart = useRef(0);
  const dragThreshold = 5;
  const hasMoved = useRef(false);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const offset = direction === 'left' ? -clientWidth / 2 : clientWidth / 2;
      scrollRef.current.scrollTo({ left: scrollLeft + offset, behavior: 'smooth' });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    hasMoved.current = false;
    startX.current = e.pageX - scrollRef.current.offsetLeft;
    scrollLeftStart.current = scrollRef.current.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    if (Math.abs(x - startX.current) > dragThreshold) {
      hasMoved.current = true;
    }
    scrollRef.current.scrollLeft = scrollLeftStart.current - walk;
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  return (
    <section id="success-wall" className="py-24 bg-[#090D16] text-white overflow-hidden" aria-label="Le Mur des Succès">
      <div className="mx-auto max-w-7xl px-4">
        <BlurReveal>
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16">
            <div className="max-w-2xl">
              <span className="text-[#D4A847] text-sm font-semibold tracking-wider uppercase">
                Social Proof & Impacts
              </span>
              <SplitText
                text="Le Mur des Succès"
                className="mt-2 text-3xl font-bold tracking-tight sm:text-5xl text-white block"
                tag="h2"
                textAlign="left"
                delay={40}
              />
              <ShinyText
                text="Découvrez les retours d'expérience des membres qui bâtissent l'économie de demain."
                color="#94a3b8"
                shineColor="#D4A847"
                className="mt-4 block text-slate-400 text-sm sm:text-base"
              />
              <div className="flex flex-wrap gap-8 mt-6">
                <div className="flex flex-col">
                  <ShinyText
                    text="15+ deals vérifiés"
                    color="#FFFFFF"
                    shineColor="#D4A847"
                    className="text-xl sm:text-2xl font-bold"
                  />
                  <span className="text-xs text-slate-500 uppercase tracking-wider mt-1 font-semibold">
                    Transactions validées
                  </span>
                </div>
                <div className="flex flex-col">
                  <ShinyText
                    text="500+ membres actifs"
                    color="#FFFFFF"
                    shineColor="#D4A847"
                    className="text-xl sm:text-2xl font-bold"
                  />
                  <span className="text-xs text-slate-500 uppercase tracking-wider mt-1 font-semibold">
                    Réseau d'élite
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6 md:mt-0">
              <button
                onClick={() => scroll('left')}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white hover:bg-[#D4A847] hover:text-black hover:border-[#D4A847] transition-all cursor-pointer"
                aria-label="Témoignage précédent"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                onClick={() => scroll('right')}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white hover:bg-[#D4A847] hover:text-black hover:border-[#D4A847] transition-all cursor-pointer"
                aria-label="Témoignage suivant"
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </BlurReveal>

        {/* Carousel / horizontal scroll container */}
        <BlurReveal delay={200}>
          <div className="relative w-full">
            <div
              ref={scrollRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUpOrLeave}
              onMouseLeave={handleMouseUpOrLeave}
              className={`flex gap-6 overflow-x-auto pb-8 snap-x scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent ${
                isDragging ? 'scroll-auto cursor-grabbing select-none' : 'scroll-smooth cursor-grab'
              }`}
            >
              {TESTIMONIALS.map((t, idx) => (
                <div key={idx} className="w-[300px] sm:w-[400px] shrink-0 snap-start select-none">
                  <SpotlightCard
                    spotlightColor="rgba(255, 255, 255, 0.15)"
                    className="flex flex-col h-full justify-between p-6 border border-white/10 bg-white/5 backdrop-blur-md rounded-xl hover:border-[#D4A847]/30 transition-all duration-300"
                  >
                    <p className="text-slate-300 text-sm sm:text-base italic leading-relaxed mb-6">
                      "{t.quote}"
                    </p>
                    <div className="flex items-center gap-4">
                      <img
                        src={t.photo}
                        alt={t.name}
                        className="w-12 h-12 rounded-full object-cover border border-[#D4A847]/40 shadow-inner"
                        draggable={false}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-bold text-white text-sm sm:text-base truncate">{t.name}</h4>
                          <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded bg-[#D4A847]/10 text-[#D4A847] border border-[#D4A847]/20 whitespace-nowrap">
                            {t.deals}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <span className="truncate">{t.role}</span>
                          <span>•</span>
                          <span className="shrink-0">{t.location}</span>
                        </div>
                      </div>
                    </div>
                  </SpotlightCard>
                </div>
              ))}
            </div>
          </div>
        </BlurReveal>
      </div>
    </section>
  );
}

export default SuccessWall;