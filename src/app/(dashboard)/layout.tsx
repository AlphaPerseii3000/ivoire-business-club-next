import SignOutButton from "@/components/auth/sign-out-button";
import { requireActiveAuthenticatedUser } from "@/lib/account-status";
import Link from "next/link";
import DashboardMobileNav from "@/components/features/dashboard/dashboard-mobile-nav";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Tableau de bord", icon: "📊" },
  { href: "/articles", label: "Articles", icon: "📰" },
  { href: "/dashboard/opportunities", label: "Opportunités", icon: "🎯" },
  { href: "/dashboard/matching", label: "Matching", icon: "✨" },
  { href: "/dashboard/notifications", label: "Notifications", icon: "🔔" },
  { href: "/members", label: "Membres", icon: "🤝" },
  { href: "/profile", label: "Mon profil", icon: "👤" },
  { href: "/settings", label: "Paramètres", icon: "⚙️" },
];

const MOBILE_NAV_ITEMS = [NAV_ITEMS[0], NAV_ITEMS[1], NAV_ITEMS[2], NAV_ITEMS[5]];

const LOCKED_HREFS = new Set(["/articles", "/dashboard/opportunities", "/members", "/dashboard/matching"]);

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireActiveAuthenticatedUser();
  const isAdmin = (session?.user as { role?: string })?.role === "ADMIN";
  const sessionUser = session.user as unknown as {
    emailVerified?: boolean;
    onboardingCompleted?: boolean;
  };
  const onboardingIncomplete = !sessionUser.emailVerified || !sessionUser.onboardingCompleted;

  const visibleNavItems = onboardingIncomplete
    ? NAV_ITEMS.filter((item) => !LOCKED_HREFS.has(item.href))
    : NAV_ITEMS;

  const mobileItems = onboardingIncomplete
    ? MOBILE_NAV_ITEMS.filter((item) => !LOCKED_HREFS.has(item.href))
    : isAdmin
      ? [...MOBILE_NAV_ITEMS, { href: "/admin/dashboard", label: "Admin", icon: "🛠️" }]
      : MOBILE_NAV_ITEMS;

  return (
    <div className="flex min-h-screen">
      <DashboardMobileNav items={mobileItems} />
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-card">
        <div className="flex h-16 items-center px-4 border-b">
          <Link href="/dashboard" className="text-xl font-bold text-primary">IBC</Link>
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
          {visibleNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors"
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </Link>
          ))}
          {isAdmin ? (
            <Link
              href="/admin/dashboard"
              className="mt-3 pt-3 border-t border-border flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors text-primary font-medium"
            >
              <span aria-hidden="true">🛠️</span>
              Espace Admin
            </Link>
          ) : null}
        </nav>
        <div className="border-t p-4">
          <SignOutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto pt-16 md:pt-0">
        {children}
      </main>
    </div>
  );
}