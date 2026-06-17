'use client';

import { useState } from 'react';
import { BlurReveal } from '@/components/ui/blur-reveal';

export function LeadMagnet() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setIsError(false);
    setMessage('');

    try {
      const response = await fetch('/api/lead-magnet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();

      if (response.ok) {
        setSubmitted(true);
        setMessage(data.message || 'Merci ! Vérifie ta boîte email pour télécharger le guide.');
      } else if (response.status === 400) {
        setIsError(true);
        setMessage('Veuillez saisir une adresse email valide.');
      } else if (response.status === 429) {
        setIsError(true);
        setMessage('Trop de tentatives. Réessayez dans une minute.');
      } else {
        setIsError(true);
        setMessage('Une erreur est survenue. Veuillez réessayer plus tard.');
      }
    } catch {
      setIsError(true);
      setMessage('Une erreur est survenue. Veuillez réessayer plus tard.');
    } finally {
      setLoading(false);
    }
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
                {message}
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
                  disabled={loading}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ex: jean.dupont@email.com"
                  className="min-h-11 flex-1 rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#D4A847] disabled:opacity-50"
                  aria-label="Votre adresse email pour recevoir le guide"
                />
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="min-h-11 rounded-md bg-[#D4A847] text-black font-semibold text-sm px-6 py-2 hover:bg-[#D4A847]/90 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  aria-label="Télécharger le guide"
                >
                  {loading ? (
                    <>
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                      Envoi...
                    </>
                  ) : (
                    'Télécharger'
                  )}
                </button>
              </form>
            )}

            {isError ? (
              <p className="mt-4 text-sm text-red-400" role="alert">
                {message}
              </p>
            ) : null}
          </div>
        </BlurReveal>
      </div>
    </section>
  );
}

export default LeadMagnet;
