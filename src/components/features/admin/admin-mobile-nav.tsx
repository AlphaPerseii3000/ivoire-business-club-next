'use client';

import { StaggeredMenu, type StaggeredMenuItem } from '@/components/StaggeredMenu';
import { signOut } from 'next-auth/react';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

interface AdminMobileNavProps {
  navItems: NavItem[];
}

export default function AdminMobileNav({ navItems }: AdminMobileNavProps) {
  const items: StaggeredMenuItem[] = [
    ...navItems.map((item) => ({
      label: item.label,
      ariaLabel: item.label,
      link: item.href,
    })),
    { label: 'Retour au site', ariaLabel: 'Retour au site', link: '/dashboard' },
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
        items={items}
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