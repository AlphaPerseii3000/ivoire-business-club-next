'use client';

import { StaggeredMenu, type StaggeredMenuItem } from '@/components/StaggeredMenu';
import { signOut } from 'next-auth/react';

interface DashboardMobileNavProps {
  items: { href: string; label: string; icon?: string }[];
}

export default function DashboardMobileNav({ items }: DashboardMobileNavProps) {
  const menuItems: StaggeredMenuItem[] = [
    ...items.map((item) => ({
      label: item.label,
      ariaLabel: item.label,
      link: item.href,
    })),
    {
      label: 'Déconnexion',
      ariaLabel: 'Se déconnecter',
      onClick: () => {
        signOut({ redirectTo: '/' });
      },
    },
  ];

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-50 h-16 bg-[#090D16]/80 backdrop-blur-sm border-b border-white/10">
      <StaggeredMenu
        position="right"
        colors={['#D4A847', '#090D16']}
        items={menuItems}
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