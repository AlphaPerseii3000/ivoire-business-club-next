'use client';

import React from 'react';
import { Mail, Phone } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#090D16] py-12 text-slate-400">
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <img src="/logo-ibc.webp" alt="IBC Logo" className="h-8 w-auto" />
              <span className="font-extrabold text-white">Ivoire Business Club</span>
            </div>
            <p className="text-sm text-slate-400">Bâtir son futur en Afrique</p>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-3">Contact</h4>
            <div className="text-sm space-y-2">
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-[#D4A847]" />
                <a href="mailto:sarah@ivoire-business-club.com" className="hover:text-white transition-colors">
                  sarah@ivoire-business-club.com
                </a>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-[#D4A847]" />
                <a href="tel:+41794214789" className="hover:text-white transition-colors">
                  +41 79 421 47 89
                </a>
              </p>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-3">Légal</h4>
            <ul className="text-sm space-y-2">
              <li>
                <a href="/mentions-legales" className="hover:text-white transition-colors">
                  Mentions légales
                </a>
              </li>
              <li>
                <a href="/politique-de-confidentialite" className="hover:text-white transition-colors">
                  Politique de confidentialité
                </a>
              </li>
              <li>
                <a href="/cgv" className="hover:text-white transition-colors">
                  CGV
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-3">Newsletter</h4>
            <p className="text-xs mb-3 text-slate-400">
              Recevez nos opportunités en avant-première.
            </p>
            <form onSubmit={(e) => e.preventDefault()} className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                placeholder="Votre adresse email"
                className="min-h-11 rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#D4A847]"
                aria-label="Adresse email pour la newsletter"
                required
              />
              <button
                type="submit"
                className="min-h-11 rounded-md bg-[#D4A847] text-black font-semibold text-sm px-4 py-2 hover:bg-[#D4A847]/90 transition-colors cursor-pointer"
                aria-label="S'abonner à la newsletter"
              >
                S'abonner
              </button>
            </form>
          </div>
        </div>
        <div className="mt-8 border-t border-white/10 pt-8 text-center text-xs">
          © {new Date().getFullYear()} Ivoire Business Club. Tous droits réservés.
        </div>
      </div>
    </footer>
  );
}

export default Footer;
