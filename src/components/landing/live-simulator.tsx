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
        // Keep only last 4 events
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
        }, 2500); // Wait before clearing
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
      {/* Glossy Reflection Overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />

      {/* Header */}
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

      {/* Events Feed */}
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
            ) : event.type === 'deal' ? (
              <span className="text-[#D4A847] text-[10px] font-bold shrink-0 mt-0.5">$$</span>
            ) : (
              <span className="text-blue-400 text-[10px] font-bold shrink-0 mt-0.5">NEW</span>
            )}
          </div>
        ))}
      </div>

      {/* Interactive Sim Box */}
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
