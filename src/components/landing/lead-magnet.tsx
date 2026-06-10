'use client';

import { useState } from 'react';
import { BlurReveal } from '@/components/ui/blur-reveal';

export function LeadMagnet() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <section className="py-24 bg-[#090D16] text-white">
      <div className="mx-auto max-w-4xl px-4 text-center">
        <BlurReveal>
          <div className="glass-panel p-8 sm:p-12 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md relative overflow-hidden">
            {/* Subtle glow layers */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#D4A847]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#1E3A5F]/20 rounded-full blur-3xl pointer-events-none" />

            <span className="text-[#D4A847] text-sm font-semibold tracking-wider uppercase">
              Guide Exclusif
            </span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl text-white">
              Guide gratuit : Investir en CI 2026
            </h2>
            <p className="mt-4 text-base text-slate-300 max-w-2xl mx-auto">
              Télécharge notre guide et découvre les opportunités les plus prometteuses en Côte d&apos;Ivoire.
            </p>

            {submitted ? (
              <p className="mt-8 text-lg font-bold text-[#D4A847] animate-fade-in">
                Merci ! Vérifie ta boîte email pour télécharger le guide.
              </p>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="mx-auto mt-8 flex flex-col sm:flex-row max-w-md gap-3"
              >
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ex: jean.dupont@email.com"
                  className="min-h-11 flex-1 rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#D4A847]"
                  aria-label="Votre adresse email pour recevoir le guide"
                />
                <button
                  type="submit"
                  className="min-h-11 rounded-md bg-[#D4A847] text-black font-semibold text-sm px-6 py-2 hover:bg-[#D4A847]/90 transition-all cursor-pointer"
                  aria-label="Télécharger le guide"
                >
                  Télécharger
                </button>
              </form>
            )}
          </div>
        </BlurReveal>
      </div>
    </section>
  );
}

export default LeadMagnet;