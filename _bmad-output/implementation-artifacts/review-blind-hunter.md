# Blind Hunter Code Review Prompt

Vous êtes un réviseur de code sénior agissant en tant que **Blind Hunter** (Chasseur Aveugle).

Votre rôle est d'analyser le diff ci-dessous de manière critique. Vous n'avez pas accès aux spécifications ou aux autres fichiers du projet. Vous recherchez uniquement les problèmes de qualité de code, de syntaxe, de typage TypeScript, d'incohérences de nommage, de bugs logiques évidents, et de mauvaises pratiques React/Next.js.

## Code Diff à Analyser

```diff
diff --git a/src/app/globals.css b/src/app/globals.css
--- a/src/app/globals.css
+++ b/src/app/globals.css
@@ -140,6 +140,20 @@
   }
 }
 
+/* Grain de film rétro-chic */
+.grain-overlay::before {
+  content: "";
+  position: fixed;
+  top: 0;
+  left: 0;
+  width: 100vw;
+  height: 100vh;
+  opacity: 0.025; /* Subtil sur fond sombre */
+  pointer-events: none;
+  z-index: 50;
+  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='150' height='150'><filter id='noise'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23noise)'/></svg>");
+}
+
 /* Custom Premium animations & variables */
 @keyframes shine {
   0% {
@@ -181,6 +181,19 @@
   border: 1px solid rgba(255, 255, 255, 0.05);
 }
 
+/* Densité des verres IBC */
+.glass-ibc-dark {
+  background: rgba(9, 13, 22, 0.65);
+  backdrop-filter: blur(14px);
+  border: 1px solid rgba(212, 168, 71, 0.15); /* Ligne dorée subtile */
+}
+
+.glass-ibc-gold {
+  background: rgba(212, 168, 71, 0.1);
+  backdrop-filter: blur(12px);
+  border: 1px solid rgba(212, 168, 71, 0.25);
+}
+
 /* Mesh Gradients */
 .mesh-gradient-bg {
   background-color: #090D16;
diff --git a/src/app/(public)/page.tsx b/src/app/(public)/page.tsx
--- a/src/app/(public)/page.tsx
+++ b/src/app/(public)/page.tsx
@@ -1,7 +1,7 @@
 import Link from 'next/link';
 import type { Metadata } from 'next';
 
-import { Hero } from '@/components/landing/hero';
+import { HeroShutter } from '@/components/landing/hero-shutter';
 import { Mission } from '@/components/landing/mission';
 import { HowItWorks } from '@/components/landing/how-it-works';
 
@@ -132,7 +132,7 @@
   const hasNextEvent = nextEvent !== null;
 
   return (
-    <div className="flex min-h-screen flex-col bg-[#090D16] text-white pb-20 md:pb-0">
+    <div className="flex min-h-screen flex-col bg-[#090D16] text-white pb-20 md:pb-0 grain-overlay">
       <LandingMobileNav />
 
       <header className="hidden md:flex sticky top-0 z-40 border-b border-white/10 bg-[#090D16]/95 backdrop-blur">
@@ -175,7 +175,7 @@
       </header>
 
       <main className="flex-1">
-        <Hero />
+        <HeroShutter />
         <Mission />
         <HowItWorks />
diff --git a/src/components/landing/pricing.tsx b/src/components/landing/pricing.tsx
--- a/src/components/landing/pricing.tsx
+++ b/src/components/landing/pricing.tsx
@@ -46,6 +46,8 @@
             return (
               <BlurReveal key={tier.tier} delay={i * 150}>
                 <SpotlightCard
+                  data-testid="tier-card"
+                  data-tier={tier.tier.toLowerCase().replace('_', '')}
                   spotlightColor={
                     isGrandFrere
                       ? 'rgba(212, 168, 71, 0.25)'
@@ -135,63 +135,59 @@
           </button>
         </div>
 
-        {showComparison ? (
-          <BlurReveal delay={100}>
-            <div className="mt-8 overflow-hidden border border-white/10 rounded-xl bg-white/[0.02] backdrop-blur-md max-w-4xl mx-auto">
-              <table className="w-full border-collapse text-left text-sm">
-                <thead>
-                  <tr className="border-b border-white/10 bg-[#090D16]/95">
-                    <th className="p-4 font-semibold text-slate-400 w-1/4">Fonctionnalités</th>
-                    <th className="p-4 font-semibold text-white w-1/4">Affranchis</th>
-                    <th className="p-4 font-semibold text-[#D4A847] w-1/4">Grands Frères</th>
-                    <th className="p-4 font-semibold text-white w-1/4">Boss</th>
-                  </tr>
-                </thead>
-                <tbody className="divide-y divide-white/5">
-                  <tr className="hover:bg-white/[0.02] transition-colors">
-                    <td className="p-4 font-medium text-slate-300">Réseautage & Accès</td>
-                    <td className="p-4 text-slate-400">Canaux thématiques</td>
-                    <td className="p-4 text-[#D4A847] font-medium">Prioritaire + Salons Privés</td>
-                    <td className="p-4 text-slate-400">Premium + Accès VIP</td>
-                  </tr>
-                  <tr className="hover:bg-white/[0.02] transition-colors">
-                    <td className="p-4 font-medium text-slate-300">Visibilité des opportunités</td>
-                    <td className="p-4 text-slate-400">Standard (deals vérifiés)</td>
-                    <td className="p-4 text-[#D4A847] font-medium">Prioritaire (avant-première)</td>
-                    <td className="p-4 text-slate-400">Exclusive (deals stratégiques)</td>
-                  </tr>
-                  <tr className="hover:bg-white/[0.02] transition-colors">
-                    <td className="p-4 font-medium text-slate-300">Événements d&apos;Affaires</td>
-                    <td className="p-4 text-slate-400">Accès payant</td>
-                    <td className="p-4 text-emerald-400">Inclus d&apos;office</td>
-                    <td className="p-4 text-emerald-400">Inclus + Accès VIP</td>
-                  </tr>
-                  <tr className="hover:bg-white/[0.02] transition-colors">
-                    <td className="p-4 font-medium text-slate-300">Conseil & Mentorat</td>
-                    <td className="p-4 text-slate-500">Non inclus</td>
-                    <td className="p-4 text-slate-500">Non inclus</td>
-                    <td className="p-4 text-[#D4A847] font-medium">1h / mois incluse</td>
-                  </tr>
-                  <tr className="hover:bg-white/[0.02] transition-colors">
-                    <td className="p-4 font-medium text-slate-300">Cotisation mensuelle</td>
-                    <td className="p-4">
-                      <span className="text-[#D4A847] font-medium">€29</span>
-                      <span className="block text-[10px] text-slate-400">19 000 CFA</span>
-                    </td>
-                    <td className="p-4">
-                      <span className="text-[#D4A847] font-bold">€49</span>
-                      <span className="block text-[10px] text-[#D4A847]/70">32 000 CFA</span>
-                    </td>
-                    <td className="p-4">
-                      <span className="text-[#D4A847] font-medium">€99</span>
-                      <span className="block text-[10px] text-slate-400">65 000 CFA</span>
-                    </td>
-                  </tr>
-                </tbody>
-              </table>
-            </div>
-          </BlurReveal>
-        ) : null}
+        <div className={`mt-8 overflow-x-auto border border-white/10 rounded-xl bg-white/5 backdrop-blur-md max-w-4xl mx-auto ${showComparison ? 'block' : 'hidden lg:block'}`}>
+          <table className="w-full border-collapse text-left">
+            <thead>
+              <tr className="sticky top-0 bg-[#090D16]/95 backdrop-blur-sm z-20 border-b border-white/10">
+                <th className="p-6 text-sm font-semibold text-slate-400 w-1/4">Offre</th>
+                <th className="p-6 w-1/4">
+                  <div className="flex flex-col gap-2">
+                    <span className="text-xl font-bold text-white">Affranchis</span>
+                    <span className="text-sm text-[#D4A847]">€29 / mois</span>
+                    <span className="text-xs text-[#D4A847]">19 000 CFA / mois</span>
+                    <a
+                      href="/auth/signup?tier=AFFRANCHI"
+                      className="mt-2 text-center text-xs font-semibold py-2 px-4 rounded border border-white/20 text-white hover:bg-white/10 hover:border-white transition-all min-h-11 flex items-center justify-center"
+                    >
+                      Choisir Affranchis
+                    </a>
+                  </div>
+                </th>
+                <th className="p-6 border-x border-white/5 bg-white/5 relative w-1/4">
+                  <div className="absolute top-0 right-0 left-0 h-1 bg-[#D4A847]" />
+                  <div className="flex flex-col gap-2">
+                    <div className="flex items-center gap-2">
+                      <span className="text-xl font-bold text-white">Grands Frères</span>
+                      <div className="border border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100 overflow-hidden whitespace-nowrap rounded px-1.5 py-0.5 text-[9px] font-bold">
+                        <ShinyText text="Recommandé" color="#D4A847" shineColor="#FFFFFF" speed={2.5} />
+                      </div>
+                    </div>
+                    <span className="text-sm text-[#D4A847]">€49 / mois</span>
+                    <span className="text-xs text-[#D4A847]">32 000 CFA / mois</span>
+                    <a
+                      href="/auth/signup?tier=GRAND_FRERE"
+                      className="mt-2 text-center text-xs font-semibold py-2 px-4 rounded bg-[#D4A847] text-black hover:bg-[#bfa03f] transition-all min-h-11 flex items-center justify-center"
+                    >
+                      Choisir Grands Frères
+                    </a>
+                  </div>
+                </th>
+                <th className="p-6 w-1/4">
+                  <div className="flex flex-col gap-2">
+                    <span className="text-xl font-bold text-white">Boss</span>
+                    <span className="text-sm text-[#D4A847]">€99 / mois</span>
+                    <span className="text-xs text-[#D4A847]">65 000 CFA / mois</span>
+                    <a
+                      href="/auth/signup?tier=BOSS"
+                      className="mt-2 text-center text-xs font-semibold py-2 px-4 rounded border border-white/20 text-white hover:bg-white/10 hover:border-white transition-all min-h-11 flex items-center justify-center"
+                    >
+                      Choisir Boss
+                    </a>
+                  </div>
+                </th>
+              </tr>
+            </thead>
+            <tbody className="divide-y divide-white/5 text-sm">
+              <tr className="hover:bg-white/5 transition-colors">
+                <td className="p-6 font-semibold text-slate-300">Accès WhatsApp</td>
+                <td className="p-6 text-slate-400">✓ Oui</td>
+                <td className="p-6 text-slate-400 border-x border-white/5 bg-white/5">✓ Oui</td>
+                <td className="p-6 text-slate-400">✓ Oui</td>
+              </tr>
+              <tr className="hover:bg-white/5 transition-colors">
+                <td className="p-6 font-semibold text-slate-300">Visibilité des opportunités</td>
+                <td className="p-6 text-slate-400">Standard (deals vérifiés)</td>
+                <td className="p-6 text-slate-200 font-medium border-x border-white/5 bg-white/5">Prioritaire</td>
+                <td className="p-6 text-slate-400">Exclusive (deals stratégiques)</td>
+              </tr>
+              <tr className="hover:bg-white/5 transition-colors">
+                <td className="p-6 font-semibold text-slate-300">Événements IBC</td>
+                <td className="p-6 text-slate-400">Accès payant</td>
+                <td className="p-6 text-slate-400 border-x border-white/5 bg-white/5">Inclus</td>
+                <td className="p-6 text-slate-400">Inclus + Accès VIP</td>
+              </tr>
+              <tr className="hover:bg-white/5 transition-colors">
+                <td className="p-6 font-semibold text-slate-300">Conseil & Mentorat</td>
+                <td className="p-6 text-slate-400">Non</td>
+                <td className="p-6 text-slate-400 border-x border-white/5 bg-white/5">Non</td>
+                <td className="p-6 text-slate-400">1h / mois incluse</td>
+              </tr>
+              <tr className="hover:bg-white/5 transition-colors">
+                <td className="p-6 font-semibold text-slate-300">Tarif mensuel</td>
+                <td className="p-6">
+                  <span className="text-sm text-[#D4A847] font-semibold">€29 / mois</span>
+                  <span className="block text-xs text-[#D4A847]">19 000 CFA / mois</span>
+                </td>
+                <td className="p-6 border-x border-white/5 bg-white/5">
+                  <span className="text-sm text-[#D4A847] font-bold">€49 / mois</span>
+                  <span className="block text-xs text-[#D4A847]">32 000 CFA / mois</span>
+                </td>
+                <td className="p-6">
+                  <span className="text-sm text-[#D4A847] font-semibold">€99 / mois</span>
+                  <span className="block text-xs text-[#D4A847]">65 000 CFA / mois</span>
+                </td>
+              </tr>
+            </tbody>
+          </table>
+        </div>
```

### Nouveaux fichiers créés :

#### 1. `src/components/landing/live-simulator.tsx`
```tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Users, CheckCircle, MessageSquare } from 'lucide-react';

interface SimulationEvent {
  id: number;
  text: string;
  time: string;
  type: 'match' | 'deal' | 'join';
}

const INITIAL_EVENTS: SimulationEvent[] = [
  { id: 1, text: 'Investisseur de Paris mis en relation avec Promotion immobilière Cocody (250M FCFA)', time: 'À l\'instant', type: 'match' },
  { id: 2, text: 'Financement bouclé pour la coopérative Cajou Bouaké (45M FCFA)', time: 'Il y a 2 min', type: 'deal' },
  { id: 3, text: 'Nouveau mentor Platinum (Banque d\'Affaires) rejoint le Club', time: 'Il y a 5 min', type: 'join' },
];

const NEW_EVENTS_POOL = [
  'Mise en relation : Exportateur Mangues - Business Angel (Abidjan)',
  'Investisseur de Genève intéressé par le projet Agri-Tech Korhogo',
  'Partenariat signé : Logistique Abidjan Port & Membre IBC',
  'Deal bouclé : Co-investissement immeuble résidentiel Marcory',
  'Nouveau membre Premium (Diaspora Montréal) validé',
  'Mise en relation : Financement court terme Import-Export',
];

const TYPING_PHRASES = [
  'Un investisseur de Londres recherche un projet agro-industriel...',
  'Un promoteur immobilier cherche un co-investisseur pour Cocody...',
  'Un mentor senior propose un accompagnement levée de fonds...',
  'Un membre de la diaspora souhaite investir dans la tech à Abidjan...',
];

export function LiveSimulator() {
  const [events, setEvents] = useState<SimulationEvent[]>(INITIAL_EVENTS);
  const [typingText, setTypingText] = useState('');
  const [typingIndex, setTypingIndex] = useState(0);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);

  // Simulation of incoming events
  useEffect(() => {
    const interval = setInterval(() => {
      const randomText = NEW_EVENTS_POOL[Math.floor(Math.random() * NEW_EVENTS_POOL.length)];
      const newEvent: SimulationEvent = {
        id: Date.now(),
        text: randomText,
        time: 'À l\'instant',
        type: Math.random() > 0.5 ? 'match' : 'deal',
      };

      setEvents((prev) => {
        const updated = [newEvent, ...prev.map(e => {
          if (e.time === 'À l\'instant') return { ...e, time: 'Il y a 1 min' };
          if (e.time.startsWith('Il y a 1 min')) return { ...e, time: 'Il y a 3 min' };
          return { ...e, time: 'Il y a 10 min' };
        })];
        return updated.slice(0, 4);
      });
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  // Typing machine effect
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const phrase = TYPING_PHRASES[phraseIndex];

    if (isTyping) {
      if (typingIndex < phrase.length) {
        timer = setTimeout(() => {
          setTypingText((prev) => prev + phrase.charAt(typingIndex));
          setTypingIndex((prev) => prev + 1);
        }, 60);
      } else {
        timer = setTimeout(() => {
          setIsTyping(false);
        }, 2500);
      }
    } else {
      if (typingText.length > 0) {
        timer = setTimeout(() => {
          setTypingText((prev) => prev.slice(0, -1));
        }, 30);
      } else {
        setIsTyping(true);
        setTypingIndex(0);
        setPhraseIndex((prev) => (prev + 1) % TYPING_PHRASES.length);
      }
    }

    return () => clearTimeout(timer);
  }, [typingIndex, phraseIndex, isTyping, typingText]);

  return (
    <div className="glass-ibc-dark rounded-xl p-5 border border-[#D4A847]/20 shadow-2xl relative overflow-hidden w-full max-w-sm flex flex-col gap-4 text-left">
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />
      <div className="flex items-center justify-between border-b border-white/10 pb-3 z-10">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            IBC Live Matchmaking
          </span>
        </div>
        <Users className="h-4 w-4 text-[#D4A847]" />
      </div>
      <div className="flex flex-col gap-3 min-h-[180px] justify-start z-10">
        {events.map((event) => (
          <div
            key={event.id}
            className="flex items-start gap-3 text-xs leading-relaxed border-l-2 border-[#D4A847]/30 pl-3 py-1 transition-all duration-500 animate-fade-in"
          >
            <div className="flex-1">
              <p className="text-slate-200 font-medium">{event.text}</p>
              <span className="text-[10px] text-slate-500 block mt-1">{event.time}</span>
            </div>
            {event.type === 'match' ? (
              <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <span className="text-[#D4A847] text-[10px] font-bold shrink-0 mt-0.5">$$</span>
            )}
          </div>
        ))}
      </div>
      <div className="bg-[#090D16]/90 border border-white/5 rounded-lg p-3 mt-2 z-10 flex items-center gap-3">
        <MessageSquare className="h-4 w-4 text-[#D4A847]/70 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
            Recherche en cours...
          </p>
          <p className="text-xs text-slate-300 truncate h-5 mt-0.5">
            {typingText}
            <span className="animate-pulse inline-block w-1.5 h-3.5 bg-[#D4A847] ml-0.5 align-middle"></span>
          </p>
        </div>
      </div>
    </div>
  );
}
```

#### 2. `src/components/landing/hero-shutter.tsx`
```tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { SplitText } from '@/components/ui/split-text';
import { LiveSimulator } from '@/components/landing/live-simulator';
import { MapPin, TrendingUp, ShieldCheck } from 'lucide-react';

export function HeroShutter() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoGrowingRef = useRef<HTMLVideoElement>(null);
  const videoLoopRef = useRef<HTMLVideoElement>(null);

  const [useFallback, setUseFallback] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  const leftRailY = useTransform(scrollYProgress, [0, 1], ['0%', '-30%']);
  const rightRailY = useTransform(scrollYProgress, [0, 1], ['0%', '15%']);

  const videoScale = useTransform(scrollYProgress, [0, 0.33], [1.3, 1.0]);

  const videoGrowingOpacity = useTransform(scrollYProgress, [0, 0.25, 0.33], [1, 1, 0]);
  const videoLoopOpacity = useTransform(scrollYProgress, [0.25, 0.33, 0.85, 0.95], [0, 1, 1, 0]);

  const bottomGradientOpacity = useTransform(scrollYProgress, [0.33, 0.5], [0, 1]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setUseFallback(true);
        return;
      }
      const conn = (navigator as any).connection;
      if (conn) {
        if (conn.saveData) {
          setUseFallback(true);
          return;
        }
        const type = conn.effectiveType;
        if (type === '2g' || type === '3g' || type === 'slow-2g') {
          setUseFallback(true);
          return;
        }
      }
      if (window.innerWidth < 768) {
        setUseFallback(true);
      }
    }
  }, []);

  useEffect(() => {
    if (useFallback) return;

    const videoGrowing = videoGrowingRef.current;
    const videoLoop = videoLoopRef.current;
    if (!videoGrowing || !videoLoop) return;

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
      setScrollY(currentScroll);

      if (currentScroll <= 800) {
        targetTime = (currentScroll / 800) * 2.4;
        if (videoGrowing.duration) {
          targetTime = Math.min(targetTime, videoGrowing.duration);
        }
        if (!isLoopingFrame) {
          isLoopingFrame = true;
          animationFrameId = requestAnimationFrame(updateVideoFrame);
        }
      } else {
        targetTime = 2.4;
      }

      if (currentScroll >= 800 && currentScroll <= 2600) {
        if (videoLoop.paused) {
          videoLoop.play().catch(() => {});
        }
      } else {
        if (!videoLoop.paused) {
          videoLoop.pause();
        }
      }
    };

    window.addEventListener('scroll', handleScrollEvent, { passive: true });
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
      className="relative bg-[#090D16] w-full h-[300vh]"
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center">
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
              <div className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-b from-[#090D16] via-transparent to-[#090D16]/90" />
              <motion.video
                ref={videoGrowingRef}
                src="/Ivoire_business_club_growing_tree_compressed.mp4"
                muted
                playsInline
                preload="auto"
                style={{ opacity: videoGrowingOpacity }}
                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
              />
              <motion.video
                ref={videoLoopRef}
                src="/Ivoire_business_club_loop_compressed.mp4"
                muted
                playsInline
                loop
                preload="auto"
                style={{ opacity: videoLoopOpacity }}
                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
              />
            </motion.div>
          )}
        </div>

        <div className="relative z-30 mx-auto max-w-7xl px-6 w-full h-full grid grid-cols-1 md:grid-cols-12 gap-8 items-center pt-16 md:pt-0">
          <motion.div
            style={{ y: leftRailY }}
            className="col-span-12 md:col-span-7 flex flex-col justify-center items-start text-left gap-6"
          >
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
            <p className="max-w-xl text-base sm:text-lg text-slate-300 leading-relaxed font-light">
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
            <div className="flex items-center gap-4 mt-4 text-xs text-slate-400">
              <div className="flex -space-x-2">
                <img className="inline-block h-8 w-8 rounded-full ring-2 ring-[#090D16]" src="/avatars/avatar-1.webp" onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=faces'; }} alt="" />
                <img className="inline-block h-8 w-8 rounded-full ring-2 ring-[#090D16]" src="/avatars/avatar-2.webp" onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=faces'; }} alt="" />
                <img className="inline-block h-8 w-8 rounded-full ring-2 ring-[#090D16]" src="/avatars/avatar-3.webp" onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=faces'; }} alt="" />
              </div>
              <span>Rejoint par <strong>+500 leaders</strong> à Abidjan et en Europe</span>
            </div>
          </motion.div>

          <motion.div
            style={{ y: rightRailY }}
            className="col-span-12 md:col-span-5 flex flex-col items-center md:items-end justify-center gap-6"
          >
            <LiveSimulator />
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

        <motion.div
          style={{ opacity: bottomGradientOpacity }}
          className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none bg-gradient-to-t from-[#090D16] via-[#090D16]/95 to-transparent h-[25vh]"
        />
      </div>
    </div>
  );
}
```

## Consignes pour le Blind Hunter
Veuillez inspecter ces modifications de code. Cherchez en priorité :
1. Les erreurs de typage TypeScript ou d'importation.
2. Les éventuels problèmes de performance avec Framer Motion.
3. Les structures de balisage HTML non sémantiques ou non valides.
4. Les fuites potentielles d'écouteurs d'événements.
