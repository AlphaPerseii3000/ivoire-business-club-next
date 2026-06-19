"use client";

import { StaggeredMenu, type StaggeredMenuItem } from "@/components/ui/staggered-menu";
import { signOut } from "next-auth/react";

interface DashboardMobileNavProps {
  items: { href: string; label: string; icon?: string }[];
}

export default function DashboardMobileNav({ items }: DashboardMobileNavProps) {
  const menuItems: StaggeredMenuItem[] = [
    ...items.map((item) => ({
      label: `${item.icon ? `${item.icon} ` : ""}${item.label}`,
      link: item.href,
    })),
    {
      label: "🚪 Déconnexion",
      onClick: () => {
        signOut({ redirectTo: "/" });
      },
    },
  ];

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-50 h-16">
      <StaggeredMenu
        position="right"
        colors={["#D4A847", "#090D16"]}
        items={menuItems}
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
