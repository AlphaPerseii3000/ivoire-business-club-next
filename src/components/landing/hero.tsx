'use client';

import React, { useEffect, useRef } from 'react';
import { HeroVideoPlayer, HeroVideoPlayerHandle } from '@/components/ui/hero-video-player';
import { SplitText } from '@/components/ui/split-text';

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
    let lastScrollY = typeof window !== 'undefined' ? window.scrollY : 0;
    let scrollStopTimer: ReturnType<typeof setTimeout> | null = null;

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;

      // Reset pause timer on every scroll event
      if (scrollStopTimer) clearTimeout(scrollStopTimer);

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

        const progress = Math.max(0, Math.min(1, -rect.top / scrollableDistance));

        // --- Text content: parallax drift only, no opacity override ---
        const parallaxY = progress > 0.4 ? (progress - 0.4) * -50 : 0;
        const contentScale = 1 - Math.max(0, (progress - 0.4) * 0.05);
        content.style.transform = `translateY(${parallaxY}px) scale(${contentScale})`;

        // --- Sticky container: fades out in the last 30% ---
        const stickyFadeStart = 0.7;
        const stickyOpacity = progress > stickyFadeStart
          ? 1 - (progress - stickyFadeStart) / (1 - stickyFadeStart)
          : 1;
        sticky.style.opacity = String(stickyOpacity);

        // --- Bottom gradient ---
        if (gradient) {
          gradient.style.opacity = String(Math.max(0, Math.min(1, (progress - 0.3) / 0.5)));
        }

        // --- Video: forward on scroll down, rewind on scroll up, pause on idle ---
        const isScrollingDown = window.scrollY > lastScrollY;
        lastScrollY = window.scrollY;

        if (progress > 0.02 && progress < 0.98) {
          if (isScrollingDown) {
            videoPlayerRef.current?.playForward();
          } else {
            videoPlayerRef.current?.playBackward();
          }
        } else {
          videoPlayerRef.current?.pause();
        }

        // Pause video after 150ms without scroll movement
        scrollStopTimer = setTimeout(() => {
          videoPlayerRef.current?.pause();
        }, 150);

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
      className="relative bg-[#090D16] mesh-gradient-bg h-[200vh] md:h-[400vh]"
    >
      {/* Sticky container */}
      <div
        ref={stickyRef}
        className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center will-change-transform"
      >
        {/* Background Video */}
        <div className="absolute inset-0 z-0">
          <HeroVideoPlayer
            ref={videoPlayerRef}
            videoUrl="/animated-hero-section.mp4"
            fallbackImageUrl="/hero-background-ibc-next-with-blue-vignette.webp"
          />
        </div>

        {/* Dark overlay for text contrast */}
        <div className="absolute inset-0 z-1 pointer-events-none bg-black/50" />

        {/* Content wrapper */}
        <div
          ref={contentRef}
          className="relative z-10 mx-auto max-w-7xl px-4 text-center will-change-transform"
        >
          {/* Animated Headline */}
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-white">
            <SplitText
              text="Bâtir son futur"
              className="inline-block"
              delay={50}
              duration={1.25}
              ease="power3.out"
              splitType="chars"
              tag="span"
            />
            <br className="sm:hidden" />
            <SplitText
              text="en Afrique"
              className="inline-block"
              delay={250}
              duration={1.25}
              ease="power3.out"
              splitType="chars"
              tag="span"
            />
          </h1>

          {/* Subheadline — CSS animation, no framer-motion useInView dependency */}
          <p className="hero-fade-in mx-auto mt-6 max-w-2xl text-lg text-slate-300" style={{ animationDelay: '0.6s' }}>
            Avec l&apos;Ivoire Business Club, accède aux meilleures opportunités business en Côte d&apos;Ivoire. Le réseau de référence pour investir, entreprendre ou développer ton activité.
          </p>

          {/* CTAs */}
          <div className="hero-fade-in mt-10 flex flex-col sm:flex-row justify-center items-center gap-4" style={{ animationDelay: '1.2s' }}>
            <a
              href="/auth/signup"
              className="group relative rounded-lg px-8 py-3 text-lg font-semibold shadow-lg transition-all duration-300 hover:scale-[1.02] bg-[#D4A847] text-black hover:bg-[#D4A847]/90"
            >
              Rejoins le club
            </a>
            <a
              href="#mission"
              className="rounded-lg border border-white/20 bg-transparent px-8 py-3 text-lg font-semibold text-white hover:bg-white/10 hover:border-white/30 transition-all duration-300"
            >
              En savoir plus
            </a>
          </div>

          {/* Social proof */}
          <p className="hero-fade-in mt-4 text-sm text-slate-400" style={{ animationDelay: '1.4s' }}>
            Rejoins +500 entrepreneurs et investisseurs en Côte d&apos;Ivoire
          </p>

          {/* Citation — déplacée après les CTA, discret */}
          <p className="hero-fade-in mt-6 text-sm italic text-[#D4A847]/60" style={{ animationDelay: '1.6s' }}>
            «&nbsp;Investir ou entreprendre ne s&apos;improvise pas&nbsp;»
          </p>
        </div>

        {/* Bottom gradient */}
        <div
          ref={gradientRef}
          className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none bg-gradient-to-t from-[#090D16] via-[#090D16]/80 to-transparent"
          style={{ height: '40vh', opacity: 0 }}
        />
      </div>
    </div>
  );
}