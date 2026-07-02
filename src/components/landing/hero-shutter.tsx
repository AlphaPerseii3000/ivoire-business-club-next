'use client';

import React, { useEffect, useRef, useState } from 'react';
import { LiveSimulator } from '@/components/landing/live-simulator';

export function HeroShutter() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const moverRef = useRef<HTMLDivElement>(null);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    // Check performance constraints (reduced motion, slow connections, or mobile)
    const checkFallback = () => {
      if (typeof window === 'undefined') return false;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return true;
      }
      const conn = (navigator as any).connection;
      if (conn) {
        if (conn.saveData) return true;
        const type = conn.effectiveType;
        if (type === '2g' || type === '3g' || type === 'slow-2g') return true;
      }
      return false;
    };
    setUseFallback(checkFallback());
  }, []);

  // Smooth scroll scrubbing for the video & mover translation
  useEffect(() => {
    if (useFallback) return;

    const video = videoRef.current;
    const container = containerRef.current;
    const mover = moverRef.current;
    if (!video || !container || !mover) return;

    let targetTime = 0;
    let currentTime = 0;
    let targetMoverY = 0;
    let currentMoverY = 0;
    let animationFrameId: number;

    const updateFrame = () => {
      const scrollY = window.scrollY;
      const trackHeight = container.offsetHeight;
      const windowHeight = window.innerHeight;
      const scrollRange = trackHeight - windowHeight;

      if (scrollRange > 0) {
        const progress = Math.min(Math.max(0, scrollY / scrollRange), 1);

        if (video.duration) {
          targetTime = progress * video.duration;
        }

        const moverHeight = mover.offsetHeight;
        // Calculate max scroll for mover so that the last slide is centered at progress 1.0
        const maxMoverScroll = Math.max(0, moverHeight - windowHeight);
        targetMoverY = progress * maxMoverScroll;
      }

      // Lerp video currentTime for buttery smooth scrub
      if (video.readyState >= 2 && video.duration) {
        currentTime += (targetTime - currentTime) * 0.12;
        if (Math.abs(currentTime - video.currentTime) > 0.01) {
          video.currentTime = currentTime;
        }
      }

      // Lerp mover translateY to eliminate jitter
      currentMoverY += (targetMoverY - currentMoverY) * 0.12;
      mover.style.transform = `translate3d(0, ${-currentMoverY}px, 0)`;

      animationFrameId = requestAnimationFrame(updateFrame);
    };

    const handleLoadedMetadata = () => {
      if (video.duration) {
        targetTime = 0;
      }
    };
    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    // Start loop
    animationFrameId = requestAnimationFrame(updateFrame);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      cancelAnimationFrame(animationFrameId);
    };
  }, [useFallback]);

  if (useFallback) {
    return (
      <div className="relative w-full bg-[#090D16] py-16">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#090D16] to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#090D16] to-transparent z-10 pointer-events-none" />
          <img
            src="/hero-background-ibc-next.webp"
            alt="IBC Premium Cover"
            className="w-full h-full object-cover opacity-40 fixed inset-0 pointer-events-none"
          />
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-6 w-full flex flex-col gap-24">
          {/* Fallback Slide 1 */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-12 min-h-[70vh]">
            <div className="flex flex-col gap-4 max-w-xl">
              <span className="uppercase text-[12px] tracking-[0.1em] text-[#ff3b30] font-bold">
                Le Cercle des Décideurs d&apos;Afrique
              </span>
              <h1 className="font-sans font-bold text-4xl sm:text-6xl leading-[1.02] tracking-[-0.04em] text-white">
                Bâtir son futur <br />
                <span className="text-[#D4A847]">en Afrique</span>
              </h1>
              <p className="text-[15px] leading-[1.6] text-white/75 max-w-[42ch]">
                Le réseau de référence pour investir, entreprendre et bâtir des opportunités fiables en Côte d&apos;Ivoire. IBC connecte la diaspora et les investisseurs internationaux avec les meilleurs deals d&apos;Abidjan.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mt-4">
                <a
                  href="/auth/signup"
                  className="flex justify-center items-center rounded-lg px-8 py-3.5 text-sm font-bold bg-[#D4A847] text-black hover:bg-[#D4A847]/90 transition-all duration-300 shadow-lg shadow-[#D4A847]/10"
                >
                  Rejoindre le Club
                </a>
              </div>
            </div>
            <div className="w-full max-w-sm">
              <LiveSimulator />
            </div>
          </div>

          {/* Fallback Slide 2 */}
          <div className="flex flex-col gap-4 max-w-xl min-h-[50vh] justify-center">
            <span className="uppercase text-[12px] tracking-[0.1em] text-[#ff3b30] font-bold">
              Opportunités & Deals
            </span>
            <h2 className="font-sans font-bold text-3xl sm:text-5xl leading-[1.02] tracking-[-0.04em] text-white">
              Accéder aux deals <br />
              <span className="text-[#D4A847]">les plus exclusifs</span>
            </h2>
            <p className="text-[15px] leading-[1.6] text-white/75 max-w-[42ch]">
              Chaque opportunité fait l&apos;objet d&apos;un audit rigoureux par nos experts locaux. De l&apos;immobilier à Abidjan aux projets agro-industriels, investissez en toute confiance.
            </p>
          </div>

          {/* Fallback Slide 3 */}
          <div className="flex flex-col gap-4 max-w-xl min-h-[50vh] justify-center">
            <span className="uppercase text-[12px] tracking-[0.1em] text-[#ff3b30] font-bold">
              Écosystème Unique
            </span>
            <h2 className="font-sans font-bold text-3xl sm:text-5xl leading-[1.02] tracking-[-0.04em] text-white">
              Connecter la diaspora <br />
              <span className="text-[#D4A847]">avec les décideurs</span>
            </h2>
            <p className="text-[15px] leading-[1.6] text-white/75 max-w-[42ch]">
              Rejoignez un réseau de professionnels, de mentors et de chefs d&apos;entreprise pour accélérer votre croissance en Côte d&apos;Ivoire et à l&apos;international.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[480vh] bg-[#090D16]"
    >
      {/* Sticky Viewport */}
      <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center">
        {/* Video Engine */}
        <div className="absolute inset-0 z-0 bg-black">
          {/* Top and Bottom vignettes to blend video with background */}
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#090D16] to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#090D16] to-transparent z-10 pointer-events-none" />
          
          <video
            ref={videoRef}
            src="/Ivoire_business_club_loop_all-i.mp4"
            muted
            playsInline
            preload="auto"
            className="w-full h-full object-cover opacity-75 pointer-events-none"
          />
        </div>

        {/* Content Container */}
        <div className="relative z-10 max-w-[1920px] mx-auto w-full h-full px-6 md:px-12 flex items-center justify-between">
          {/* Left Column: Mover of Overlays */}
          <div className="relative h-screen w-full md:w-[45%] flex items-center overflow-hidden">
            <div
              ref={moverRef}
              className="absolute left-0 w-full flex flex-col will-change-transform"
            >
              {/* Slide 1 */}
              <div className="h-screen flex flex-col justify-center items-start gap-4">
                <span className="uppercase text-[12px] tracking-[0.1em] text-[#ff3b30] font-bold">
                  Le Cercle des Décideurs d&apos;Afrique
                </span>
                <h1 className="font-sans font-bold text-[clamp(32px,5vw,56px)] leading-[1.02] tracking-[-0.04em] text-white">
                  Bâtir son futur <br />
                  <span className="text-[#D4A847]">en Afrique</span>
                </h1>
                <p className="text-[15px] leading-[1.6] text-white/75 max-w-[42ch]">
                  Le réseau de référence pour investir, entreprendre et bâtir des opportunités fiables en Côte d&apos;Ivoire. IBC connecte la diaspora et les investisseurs internationaux avec les meilleurs deals d&apos;Abidjan.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mt-4">
                  <a
                    href="/auth/signup"
                    className="flex justify-center items-center rounded-lg px-8 py-3.5 text-sm font-bold bg-[#D4A847] text-black hover:bg-[#D4A847]/90 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#D4A847]/10"
                  >
                    Rejoindre le Club
                  </a>
                  <a
                    href="#mission"
                    className="flex justify-center items-center rounded-lg border border-white/20 bg-white/5 backdrop-blur-sm px-8 py-3.5 text-sm font-bold text-white hover:bg-white/10 hover:border-white/30 transition-all duration-300 active:scale-[0.98]"
                  >
                    Découvrir la Mission
                  </a>
                </div>
                {/* Social Proof */}
                <div className="flex items-center gap-3.5 mt-6 text-xs text-slate-400">
                  <div className="flex -space-x-2">
                    <img className="inline-block h-8 w-8 rounded-full ring-2 ring-[#090D16]" src="/avatars/avatar-1.webp" onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=faces'; }} alt="" />
                    <img className="inline-block h-8 w-8 rounded-full ring-2 ring-[#090D16]" src="/avatars/avatar-2.webp" onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=faces'; }} alt="" />
                    <img className="inline-block h-8 w-8 rounded-full ring-2 ring-[#090D16]" src="/avatars/avatar-3.webp" onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=faces'; }} alt="" />
                  </div>
                  <span className="text-[#D4A847]">Rejoint par <strong className="font-semibold text-slate-200">+500 leaders</strong> à Abidjan et en Europe</span>
                </div>
              </div>

              {/* Slide 2 */}
              <div className="h-screen flex flex-col justify-center items-start gap-4">
                <span className="uppercase text-[12px] tracking-[0.1em] text-[#ff3b30] font-bold">
                  Opportunités & Deals
                </span>
                <h2 className="font-sans font-bold text-[clamp(32px,5vw,56px)] leading-[1.02] tracking-[-0.04em] text-white">
                  Accéder aux deals <br />
                  <span className="text-[#D4A847]">les plus exclusifs</span>
                </h2>
                <p className="text-[15px] leading-[1.6] text-white/75 max-w-[42ch]">
                  Chaque opportunité fait l&apos;objet d&apos;un audit rigoureux par nos experts locaux. De l&apos;immobilier à Abidjan aux projets agro-industriels, investissez en toute confiance.
                </p>
                <div className="mt-4 flex items-center gap-3.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-[#D4A847]">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white block">Sécurité Maximale</span>
                    <span className="text-xs text-[#D4A847]">Due diligence complète de chaque dossier</span>
                  </div>
                </div>
              </div>

              {/* Slide 3 */}
              <div className="h-screen flex flex-col justify-center items-start gap-4">
                <span className="uppercase text-[12px] tracking-[0.1em] text-[#ff3b30] font-bold">
                  Écosystème Unique
                </span>
                <h2 className="font-sans font-bold text-[clamp(32px,5vw,56px)] leading-[1.02] tracking-[-0.04em] text-white">
                  Connecter la diaspora <br />
                  <span className="text-[#D4A847]">avec les décideurs</span>
                </h2>
                <p className="text-[15px] leading-[1.6] text-white/75 max-w-[42ch]">
                  Rejoignez un réseau de professionnels, de mentors et de chefs d&apos;entreprise pour accélérer votre croissance en Côte d&apos;Ivoire et à l&apos;international.
                </p>
                <div className="mt-4 flex items-center gap-3.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-[#D4A847]">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white block">Croissance Accélérée</span>
                    <span className="text-xs text-[#D4A847]">Mentorat, synergies et événements networking</span>
                  </div>
                </div>
                
                {/* On mobile, render the LiveSimulator inline at the end of the text column so it is fully visible and scrollable */}
                <div className="block md:hidden mt-8 w-full">
                  <LiveSimulator />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Sticky Simulator for Desktop only */}
          <div className="hidden md:block w-[40%] max-w-[400px] relative z-20">
            <LiveSimulator />
          </div>
        </div>
      </div>
    </div>
  );
}
