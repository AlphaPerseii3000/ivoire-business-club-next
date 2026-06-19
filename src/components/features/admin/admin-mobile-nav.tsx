"use client";

import React from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { StaggeredMenu, type StaggeredMenuItem } from "@/components/ui/staggered-menu";

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
      label: `${item.icon} ${item.label}`,
      link: item.href,
    })),
    { label: "🔙 Retour au site", link: "/dashboard" },
    {
      label: "🚪 Déconnexion",
      onClick: () => {
        signOut({ redirectTo: "/" });
      },
    },
  ];

  return (
    <header className="md:hidden flex h-16 items-center justify-between border-b bg-[#090D16] px-4 sticky top-0 z-50">
      <Link href="/admin/dashboard" className="text-lg font-bold text-[#D4A847]">
        IBC Admin
      </Link>

      <div className="relative h-full w-24">
        <StaggeredMenu
          position="right"
          colors={["#D4A847", "#090D16"]}
          items={items}
          displaySocials={false}
          displayItemNumbering={true}
          accentColor="#D4A847"
          menuButtonColor="#ffffff"
          openMenuButtonColor="#ffffff"
          logoUrl="/logo-ibc.webp"
          isFixed={false}
          closeOnClickAway={true}
          className="absolute inset-0"
        />
      </div>
    </header>
  );
}
