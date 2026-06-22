'use client';

import { StaggeredMenu } from '@/components/StaggeredMenu';

const LANDING_MENU_ITEMS = [
  { label: 'Mission', ariaLabel: 'Notre mission', link: '#mission' },
  { label: 'Tarifs', ariaLabel: 'Voir les tarifs', link: '#pricing' },
  { label: 'Articles', ariaLabel: 'Lire les articles', link: '/articles' },
  { label: 'Experts', ariaLabel: 'Voir les experts', link: '/experts' },
  { label: 'Partenaires', ariaLabel: 'Voir les partenaires', link: '/partners' },
  { label: 'Événements', ariaLabel: 'Voir les événements', link: '/events' },
  { label: 'Connexion', ariaLabel: 'Se connecter', link: '/auth/signin' },
  { label: 'Rejoins le club', ariaLabel: "S'inscrire", link: '/auth/signup' },
];

export default function LandingMobileNav() {
  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-50 h-16 bg-[#090D16]/80 backdrop-blur-sm border-b border-white/10">
      <StaggeredMenu
        position="right"
        colors={['#D4A847', '#090D16']}
        items={LANDING_MENU_ITEMS}
        displaySocials={false}
        displayItemNumbering={true}
        accentColor="#D4A847"
        menuButtonColor="#ffffff"
        openMenuButtonColor="#ffffff"
        logoUrl="/logo-ibc-landing.webp"
        isFixed={false}
        closeOnClickAway={true}
      />
    </div>
  );
}