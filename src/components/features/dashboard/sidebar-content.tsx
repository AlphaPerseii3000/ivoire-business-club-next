'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutPanelLeft,
  Newspaper,
  SquareMousePointer,
  Handshake,
  Bell,
  CalendarDays,
  Building2,
  UsersRound,
  UserRoundPen,
  SlidersHorizontal,
  ShieldUser,
} from 'lucide-react';
import SignOutButton from "@/components/auth/sign-out-button";

interface SidebarContentProps {
  isAdmin: boolean;
  onboardingIncomplete: boolean;
}

export default function SidebarContent({ isAdmin, onboardingIncomplete }: SidebarContentProps) {
  const pathname = usePathname();

  const NAV_ITEMS = [
    { href: "/dashboard", icon: <LayoutPanelLeft className="sidebar-icon" />, label: "Tableau de bord" },
    { href: "/articles", icon: <Newspaper className="sidebar-icon" />, label: "Articles" },
    { href: "/dashboard/opportunities", icon: <SquareMousePointer className="sidebar-icon" />, label: "Opportunités" },
    { href: "/dashboard/matching", icon: <Handshake className="sidebar-icon" />, label: "Matching" },
    { href: "/dashboard/notifications", icon: <Bell className="sidebar-icon" />, label: "Notifications" },
    { href: "/events", icon: <CalendarDays className="sidebar-icon" />, label: "Événements" },
    { href: "/partners", icon: <Building2 className="sidebar-icon" />, label: "Partenaires" },
    { href: "/members", icon: <UsersRound className="sidebar-icon" />, label: "Membres" },
    { href: "/profile", icon: <UserRoundPen className="sidebar-icon" />, label: "Mon profil" },
    { href: "/settings", icon: <SlidersHorizontal className="sidebar-icon" />, label: "Paramètres" },
  ];

  const LOCKED_HREFS = new Set(["/articles", "/dashboard/opportunities", "/members", "/dashboard/matching"]);

  const visibleNavItems = onboardingIncomplete
    ? NAV_ITEMS.filter((item) => !LOCKED_HREFS.has(item.href))
    : NAV_ITEMS;

  const isLinkActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="hidden md:flex w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center px-4 border-b">
        <Link href="/dashboard" className="text-xl font-bold text-primary">
          IBC
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {onboardingIncomplete ? (
          <Link
            href="/onboarding/complete-profile"
            className="mb-2 inline-block text-xs text-amber-400 hover:text-amber-300"
          >
            🔒 Complète ton profil
          </Link>
        ) : null}

        {visibleNavItems.map((item) => {
          const active = isLinkActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-item flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors ${
                active ? "active" : ""
              }`}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}

        {isAdmin ? (
          <Link
            href="/admin/dashboard"
            className={`sidebar-item mt-3 pt-3 border-t border-border flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors text-primary font-semibold ${
              isLinkActive("/admin/dashboard") ? "active" : ""
            }`}
          >
            <ShieldUser className="sidebar-icon" />
            <span>Espace Admin</span>
          </Link>
        ) : null}
      </nav>

      {/* Visual separation with hr and margin to avoid chat widget overlap */}
      <hr className="mx-4 border-border" />
      <div className="p-4 my-2 flex flex-col gap-2">
        <SignOutButton />
      </div>
    </aside>
  );
}
