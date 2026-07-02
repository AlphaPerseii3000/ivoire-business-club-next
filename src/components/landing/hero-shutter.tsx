'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { SplitText } from '@/components/ui/split-text';
import { LiveSimulator } from '@/components/landing/live-simulator';
import { TrendingUp, ShieldCheck } from 'lucide-react';

export function HeroShutter() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoGrowingRef = useRef<HTMLVideoElement>(null);

  const [useFallback, setUseFallback] = useState(false);

  // Framer motion scroll tracking
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // Parallax offsets for columns
  const leftRailY = useTransform(scrollYProgress, [0, 1], ['0vh', '-200vh']);
  const rightRailY = useTransform(scrollYProgress, [0, 1], ['0%', '10%']);

  // Scale of video (decreases during Phase 1 scroll)
  const videoScale = useTransform(scrollYProgress, [0, 0.85], [1.3, 1.0]);

  // Opacity for the growing tree video (fades out at the end of Hero scroll)
  const videoGrowingOpacity = useTransform(scrollYProgress, [0, 0.85, 0.95], [1, 1, 0]);

  // Bottom gradient opacity (fades in towards the end of the scroll to blend into Notre Mission)
  const bottomGradientOpacity = useTransform(scrollYProgress, [0.8, 0.95], [0, 1]);

  useEffect(() => {
    // Check performance constraints
    if (typeof window !== 'undefined') {
      const checkFallback = () => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          return true;
        }
        const conn = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
        if (conn) {
          if (conn.saveData) {
            return true;
          }
          const type = conn.effectiveType;
          if (type === '2g' || type === '3g' || type === 'slow-2g') {
            return true;
          }
        }
        if (window.innerWidth < 768) {
          return true;
        }
        return false;
      };

      // Wrap in setTimeout to avoid synchronous setState inside useEffect warning
      setTimeout(() => {
        if (checkFallback()) {
          setUseFallback(true);
        }
      }, 0);
    }
  }, []);

  // Smooth scroll scrubbing for the growing tree video
  useEffect(() => {
    if (useFallback) return;

    const videoGrowing = videoGrowingRef.current;
    if (!videoGrowing) return;

    let targetTime = 0;
    let currentTime = 0;
    let animationFrameId: number | null = null;
    let isLoopingFrame = false;

    const updateVideoFrame = () => {
      if (videoGrowing.readyState >= 2 && videoGrowing.duration) {
        currentTime += (targetTime - currentTime) * 0.15;
        if (Math.abs(currentTime - videoGrowing.currentTime) > 0.01) {
          videoGrowing.currentTime = currentTime;
        }
      }

      if (Math.abs(currentTime - targetTime) > 0.001) {
        animationFrameId = requestAnimationFrame(updateVideoFrame);
      } else {
        isLoopingFrame = false;
      }
    };

    const handleScrollEvent = () => {
      const currentScroll = window.scrollY;

      const container = containerRef.current;
      if (!container) return;

      // Calculate scroll range dynamically (total height of container minus viewport height)
      const scrollRange = container.offsetHeight - window.innerHeight;

      if (currentScroll <= scrollRange) {
        // Scrub the entire 24 seconds video
        targetTime = (currentScroll / Math.max(1, scrollRange)) * 24.0;
        if (videoGrowing.duration) {
          targetTime = Math.min(targetTime, videoGrowing.duration);
        }
        if (!isLoopingFrame) {
          isLoopingFrame = true;
          animationFrameId = requestAnimationFrame(updateVideoFrame);
        }
      } else {
        targetTime = 24.0;
      }
    };

    window.addEventListener('scroll', handleScrollEvent, { passive: true });
    // Initialize
    handleScrollEvent();

    return () => {
      window.removeEventListener('scroll', handleScrollEvent);
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [useFallback]);

  return (
    <div
      ref={containerRef}
      className="relative bg-[#090D16] w-full h-[500vh]"
    >
      {/* Sticky container */}
      <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center">
        
        {/* Background Visuals */}
        <div className="absolute inset-0 z-0">
          {useFallback ? (
            <div className="relative w-full h-full">
              <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-b from-[#090D16] via-[#090D16]/40 to-[#090D16]" />
              <img
                src="/hero-background-ibc-next.webp"
                alt="IBC Premium Cover"
                className="w-full h-full object-cover opacity-60"
              />
            </div>
          ) : (
            <motion.div style={{ scale: videoScale }} className="relative w-full h-full bg-black">
              {/* Top and Bottom Black Vignettes */}
              <div className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-b from-[#090D16] via-transparent to-[#090D16]/90" />
              
              {/* Video A: Growing Tree (Phase 1, scrubbed) */}
              <motion.video
                ref={videoGrowingRef}
                src="/Ivoire_business_club_growing_tree_compressed.mp4"
                muted
                playsInline
                preload="auto"
                style={{ opacity: videoGrowingOpacity }}
                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
              />
            </motion.div>
          )}
        </div>

        {/* Shutter Content Grid */}
        <div className="relative z-30 mx-auto max-w-7xl px-6 w-full h-full grid grid-cols-1 md:grid-cols-12 gap-8 items-center pt-16 md:pt-0">
          
          {/* Left Rail: 3 Sections stacked vertically */}
          <motion.div
            style={{ y: leftRailY }}
            className="col-span-12 md:col-span-7 flex flex-col justify-start items-start text-left self-start pt-0"
          >
            {/* Section 1: Hero Principal */}
            <div className="h-screen flex flex-col justify-center items-start gap-6">
              <span className="text-[#D4A847] text-xs font-semibold uppercase tracking-wider bg-[#D4A847]/10 px-3 py-1.5 rounded-full border border-[#D4A847]/20">
                Le Cercle des Décideurs d&apos;Afrique
              </span>
              
              <h1 className="text-4xl sm:text-6xl font-black text-white tracking-[-0.04em] leading-[1.05]">
                <SplitText
                  text="Bâtir son futur"
                  className="block"
                  delay={50}
                  duration={1.25}
                  ease="power3.out"
                  splitType="chars"
                />
                <span className="text-[#D4A847]">
                  <SplitText
                    text="en Afrique"
                    className="block mt-1"
                    delay={250}
                    duration={1.25}
                    ease="power3.out"
                    splitType="chars"
                  />
                </span>
              </h1>

              <p className="max-w-xl text-base sm:text-lg text-black leading-relaxed font-semibold bg-white/90 backdrop-blur-md px-5 py-4 rounded-xl border border-white/20 shadow-lg">
                Le réseau de référence pour investir, entreprendre et bâtir des opportunités fiables en Côte d&apos;Ivoire. IBC connecte la diaspora et les investisseurs internationaux avec les meilleurs deals d&apos;Abidjan.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mt-2">
                <a
                  href="/auth/signup"
                  className="group relative flex justify-center items-center rounded-lg px-8 py-3.5 text-base font-semibold shadow-xl transition-all duration-300 hover:scale-[1.02] bg-[#D4A847] text-black hover:bg-[#D4A847]/90 active:scale-[0.98]"
                >
                  Rejoindre le Club
                </a>
                <a
                  href="#mission"
                  className="flex justify-center items-center rounded-lg border border-white/20 bg-white/5 backdrop-blur-sm px-8 py-3.5 text-base font-semibold text-white hover:bg-white/10 hover:border-white/30 transition-all duration-300 active:scale-[0.98]"
                >
                  Découvrir la Mission
                </a>
              </div>

              {/* Micro Social Proof */}
              <div className="flex items-center gap-4 mt-4 text-xs text-slate-400">
                <div className="flex -space-x-2">
                  <img className="inline-block h-8 w-8 rounded-full ring-2 ring-[#090D16]" src="/avatars/avatar-1.webp" onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=faces'; }} alt="" />
                  <img className="inline-block h-8 w-8 rounded-full ring-2 ring-[#090D16]" src="/avatars/avatar-2.webp" onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=faces'; }} alt="" />
                  <img className="inline-block h-8 w-8 rounded-full ring-2 ring-[#090D16]" src="/avatars/avatar-3.webp" onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=faces'; }} alt="" />
                </div>
                <span>Rejoint par <strong>+500 leaders</strong> à Abidjan et en Europe</span>
              </div>
            </div>

            {/* Section 2: Opportunités & Deals */}
            <div className="h-screen flex flex-col justify-center items-start gap-6">
              <span className="text-[#D4A847] text-xs font-semibold uppercase tracking-wider bg-[#D4A847]/10 px-3 py-1.5 rounded-full border border-[#D4A847]/20">
                Opportunités & Deals
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-[-0.04em] leading-[1.1]">
                Accéder aux deals <br />
                <span className="text-[#D4A847]">les plus exclusifs</span>
              </h2>
              <p className="max-w-xl text-base sm:text-lg text-slate-300 leading-relaxed font-light">
                Chaque opportunité fait l&apos;objet d&apos;un audit rigoureux par nos experts locaux. De l&apos;immobilier à Abidjan aux projets agro-industriels, investissez en toute confiance.
              </p>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-[#D4A847]">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-sm font-bold text-white block">Sécurité Maximale</span>
                  <span className="text-xs text-slate-400">Due diligence complète de chaque dossier</span>
                </div>
              </div>
            </div>

            {/* Section 3: Réseau & Mentorat */}
            <div className="h-screen flex flex-col justify-center items-start gap-6">
              <span className="text-[#D4A847] text-xs font-semibold uppercase tracking-wider bg-[#D4A847]/10 px-3 py-1.5 rounded-full border border-[#D4A847]/20">
                Écosystème Unique
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-[-0.04em] leading-[1.1]">
                Connecter la diaspora <br />
                <span className="text-[#D4A847]">avec les décideurs</span>
              </h2>
              <p className="max-w-xl text-base sm:text-lg text-slate-300 leading-relaxed font-light">
                Rejoignez un réseau de professionnels, de mentors et de chefs d&apos;entreprise pour accélérer votre croissance en Côte d&apos;Ivoire et à l&apos;international.
              </p>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-[#D4A847]">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-sm font-bold text-white block">Croissance Accélérée</span>
                  <span className="text-xs text-slate-400">Mentorat, synergies et événements networking</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Rail: Live Simulator & Metriques Clés */}
          <motion.div
            style={{ y: rightRailY }}
            className="col-span-12 md:col-span-5 flex flex-col items-center md:items-end justify-center gap-6"
          >
            {/* Live simulator widget */}
            <LiveSimulator />

            {/* Quick stats grid card */}
            <div className="glass-ibc-dark rounded-xl border border-white/10 p-4 max-w-sm w-full flex flex-col gap-3 text-left">
              <h4 className="text-xs font-semibold text-[#D4A847] uppercase tracking-wider">
                Réseau de Confiance
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="text-sm font-bold text-white block">98%</span>
                    <span className="text-[10px] text-slate-400 block">Deals Validés</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="text-sm font-bold text-white block">100%</span>
                    <span className="text-[10px] text-slate-400 block">Membres Vérifiés</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
          
        </div>

        {/* Dynamic bottom transition gradient */}
        <motion.div
          style={{ opacity: bottomGradientOpacity }}
          className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none bg-gradient-to-t from-[#090D16] via-[#090D16]/95 to-transparent h-[25vh]"
        />
        
      </div>

      {/* Absolute bottom gradient mask to fade Hero into Mission */}
      <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-[#090D16] via-[#090D16]/80 to-transparent pointer-events-none z-30" />
    </div>
  );
}
