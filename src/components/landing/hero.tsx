'use client';

import React, { useEffect, useRef } from 'react';
import { HeroVideoPlayer, HeroVideoPlayerHandle } from '@/components/ui/hero-video-player';
import { SplitText } from '@/components/ui/split-text';
import { BlurText } from '@/components/ui/blur-text';
import { ShinyText } from '@/components/ui/shiny-text';

export function Hero() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const gradientRef = useRef<HTMLDivElement>(null);
  const videoPlayerRef = useRef<HeroVideoPlayerHandle>(null);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) return;

    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        const wrapper = wrapperRef.current;
        const content = contentRef.current;
        const sticky = stickyRef.current;
        const gradient = gradientRef.current;
        if (!wrapper || !content || !sticky) {
          ticking = false;
          return;
        }

        const rect = wrapper.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const scrollableDistance = wrapper.offsetHeight - viewportHeight;

        if (scrollableDistance <= 0) {
          ticking = false;
          return;
        }

        // Progress: 0 at top, 1 when wrapper bottom reaches viewport bottom
        const progress = Math.max(0, Math.min(1, -rect.top / scrollableDistance));

        // --- Text content: stays fully visible until 55%, then fades out ---
        // 0→0.55: opacity=1, 0.55→0.85: fade to 0, 0.85→1: invisible
        const textFadeStart = 0.55;
        const textFadeEnd = 0.85;
        const contentOpacity = progress < textFadeStart
          ? 1
          : progress > textFadeEnd
            ? 0
            : 1 - (progress - textFadeStart) / (textFadeEnd - textFadeStart);

        // Subtle parallax: content drifts up slightly as it fades
        const parallaxY = progress > textFadeStart ? (progress - textFadeStart) * -80 : 0;
        const contentScale = 1 - Math.max(0, (progress - textFadeStart) * 0.08);

        content.style.transform = `translateY(${parallaxY}px) scale(${contentScale})`;
        content.style.opacity = String(contentOpacity);

        // --- Sticky container: fades out in the last 30% to blend into next section ---
        // This prevents the "frozen last frame" jank — the whole hero dissolves away
        const stickyFadeStart = 0.7;
        const stickyOpacity = progress > stickyFadeStart
          ? 1 - (progress - stickyFadeStart) / (1 - stickyFadeStart)
          : 1;

        sticky.style.opacity = String(stickyOpacity);

        // --- Bottom gradient: intensifies from 40% onwards ---
        if (gradient) {
          gradient.style.opacity = String(Math.max(0, Math.min(1, (progress - 0.3) / 0.5)));
        }

        // --- Video scrub: maps to full video duration ---
        videoPlayerRef.current?.scrub(progress);

        ticking = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="relative bg-[#090D16] mesh-gradient-bg"
      style={{ height: '160vh' }}
    >
      {/* Sticky container — stays pinned while the tall wrapper scrolls */}
      <div
        ref={stickyRef}
        className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center will-change-transform"
      >
        {/* Background Video Loops */}
        <div className="absolute inset-0 z-0">
          <HeroVideoPlayer
            ref={videoPlayerRef}
            videoUrl="/animated-hero-section.mp4"
            fallbackImageUrl="/hero-background-ibc-next-with-blue-vignette.webp"
          />
        </div>

        {/* Grid Overlay to add depth */}
        <div className="absolute inset-0 z-1 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.02),transparent_60%)]" />

        {/* Content wrapper — styled via imperative DOM in scroll handler */}
        <div
          ref={contentRef}
          className="relative z-10 mx-auto max-w-7xl px-4 text-center will-change-transform"
        >
          {/* Animated Headline */}
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-white">
            <SplitText
              text="Bâtir son futur en Afrique"
              className="inline-block"
              delay={50}
              duration={1.25}
              ease="power3.out"
              splitType="chars"
              tag="span"
            />
          </h1>

          {/* Animated Subheadline */}
          <div className="mx-auto mt-6 max-w-2xl text-lg text-slate-300">
            <BlurText
              text="Avec l'Ivoire Business Club, accède aux meilleures opportunités business en Côte d'Ivoire. Le réseau de référence pour investir, entreprendre ou développer ton activité."
              animateBy="words"
              direction="top"
              delay={200}
              stepDuration={0.05}
            />
          </div>

          <div className="mt-4">
            <BlurText
              text={"«\u00a0Investir ou entreprendre ne s'improvise pas\u00a0»"}
              className="text-xl font-semibold text-[#D4A847]"
              animateBy="words"
              direction="bottom"
              delay={400}
              stepDuration={0.08}
            />
          </div>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row justify-center items-center gap-4">
            <a
              href="/auth/signup"
              className="glass-panel group relative rounded-lg px-8 py-3 text-lg font-semibold shadow-lg overflow-hidden transition-all duration-300 hover:scale-[1.02] border border-[#D4A847]/30 hover:border-[#D4A847]/60"
            >
              <ShinyText
                text="Rejoins le club"
                speed={2}
                color="#b5b5b5"
                shineColor="#ffffff"
                className="font-semibold"
              />
            </a>
            <a
              href="#mission"
              className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-md px-8 py-3 text-lg font-semibold text-white hover:bg-white/10 hover:border-white/20 transition-all duration-300"
            >
              En savoir plus
            </a>
          </div>
        </div>

        {/* Bottom gradient that intensifies as video finishes to blend into next section */}
        <div
          ref={gradientRef}
          className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none bg-gradient-to-t from-[#090D16] via-[#090D16]/80 to-transparent"
          style={{ height: '40vh', opacity: 0 }}
        />
      </div>
    </div>
  );
}