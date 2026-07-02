'use client';

import React, { useEffect, useState } from 'react';
import { Users, CheckCircle, MessageSquare, DollarSign, UserPlus } from 'lucide-react';

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
  'Mise en relation : Financement Promotion Immobilière Riviera',
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
      const types: ('match' | 'deal' | 'join')[] = ['match', 'deal', 'join'];
      const randomType = types[Math.floor(Math.random() * types.length)];
      
      const newEvent: SimulationEvent = {
        id: Date.now(),
        text: randomText,
        time: 'À l\'instant',
        type: randomType,
      };

      setEvents((prev) => {
        const updated = [newEvent, ...prev.map(e => {
          if (e.time === 'À l\'instant') return { ...e, time: 'Il y a 1 min' };
          if (e.time.startsWith('Il y a 1 min')) return { ...e, time: 'Il y a 3 min' };
          return { ...e, time: 'Il y a 10 min' };
        })];
        return updated.slice(0, 3); // Keep 3 events for perfect vertical spacing
      });
    }, 7000);

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
        }, 50);
      } else {
        timer = setTimeout(() => {
          setIsTyping(false);
        }, 3000); // Wait before clearing
      }
    } else {
      if (typingText.length > 0) {
        timer = setTimeout(() => {
          setTypingText((prev) => prev.slice(0, -1));
        }, 20);
      } else {
        setIsTyping(true);
        setTypingIndex(0);
        setPhraseIndex((prev) => (prev + 1) % TYPING_PHRASES.length);
      }
    }

    return () => clearTimeout(timer);
  }, [typingIndex, phraseIndex, isTyping, typingText]);

  return (
    <div className="glass-ibc-dark rounded-2xl p-6 border border-[#D4A847]/30 shadow-[0_0_50px_rgba(212,168,71,0.12)] relative overflow-hidden w-full max-w-sm flex flex-col gap-5 text-left transition-all duration-500 hover:scale-[1.01] hover:border-[#D4A847]/50">
      {/* Premium Glossy Reflection Overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.03] to-transparent pointer-events-none" />
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#D4A847]/10 rounded-full blur-[60px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4 z-10">
        <div className="flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-bold text-slate-200 uppercase tracking-widest">
            IBC Live Matchmaking
          </span>
        </div>
        <Users className="h-4 w-4 text-[#D4A847] animate-pulse" />
      </div>

      {/* Events Feed */}
      <div className="flex flex-col gap-4 min-h-[190px] justify-start z-10">
        {events.map((event) => (
          <div
            key={event.id}
            className="flex items-start gap-3.5 text-xs leading-relaxed border-l border-[#D4A847]/40 pl-4 py-1.5 transition-all duration-500 animate-fade-in hover:bg-white/[0.02] rounded-r-lg pr-2"
          >
            <div className="flex-1">
              <p className="text-slate-100 font-medium tracking-wide">{event.text}</p>
              <span className="text-[10px] text-slate-500 font-light mt-1.5 block">{event.time}</span>
            </div>
            
            <div className="shrink-0 mt-0.5">
              {event.type === 'match' ? (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <CheckCircle className="h-3.5 w-3.5" />
                </div>
              ) : event.type === 'deal' ? (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#D4A847]/10 border border-[#D4A847]/20 text-[#D4A847]">
                  <DollarSign className="h-3.5 w-3.5" />
                </div>
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  <UserPlus className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Interactive Sim Box */}
      <div className="bg-[#090D16]/95 border border-white/10 rounded-xl p-4 mt-1 z-10 flex items-center gap-3.5 shadow-inner">
        <MessageSquare className="h-4 w-4 text-[#D4A847]/80 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
            Recherche en cours...
          </p>
          <p className="text-xs text-[#D4A847] truncate h-5 mt-1 font-mono">
            {typingText}
            <span className="animate-pulse inline-block w-2 h-3.5 bg-[#D4A847] ml-1 align-middle"></span>
          </p>
        </div>
      </div>
    </div>
  );
}
