'use client';

import { StaggeredMenu } from '@/components/ui/staggered-menu';

const LANDING_MENU_ITEMS = [
  { label: 'Mission', link: '#mission' },
  { label: 'Tarifs', link: '#pricing' },
  { label: 'Articles', link: '/articles' },
  { label: 'Événements', link: '/events' },
  { label: 'Connexion', link: '/auth/signin' },
  { label: 'Rejoins le club', link: '/auth/signup' },
];

export default function LandingMobileNav() {
  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-50 h-16">
      <StaggeredMenu
        position="right"
        colors={['#D4A847', '#090D16']}
        items={LANDING_MENU_ITEMS}
        displaySocials={false}
        displayItemNumbering={true}
        accentColor="#D4A847"
        menuButtonColor="#ffffff"
        openMenuButtonColor="#ffffff"
        logoUrl="/logo-ibc.webp"
        isFixed={false}
        closeOnClickAway={true}
      />
    </div>
  );
}
