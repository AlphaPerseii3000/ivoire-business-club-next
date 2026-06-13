import SignOutButton from "@/components/auth/sign-out-button";
import { requireActiveAuthenticatedUser } from "@/lib/account-status";
import Link from "next/link";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Tableau de bord", icon: "📊" },
  { href: "/dashboard/opportunities", label: "Opportunités", icon: "🎯" },
  { href: "/dashboard/matching", label: "Matching", icon: "✨" },
  { href: "/dashboard/notifications", label: "Notifications", icon: "🔔" },
  { href: "/members", label: "Membres", icon: "🤝" },
  { href: "/profile", label: "Mon profil", icon: "👤" },
  { href: "/settings", label: "Paramètres", icon: "⚙️" },
];

const MOBILE_NAV_ITEMS = [NAV_ITEMS[0], NAV_ITEMS[1], NAV_ITEMS[2], NAV_ITEMS[5]];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireActiveAuthenticatedUser();
  const isAdmin = (session?.user as { role?: string })?.role === "ADMIN";

  const mobileItems = isAdmin
    ? [...MOBILE_NAV_ITEMS, { href: "/admin/dashboard", label: "Admin", icon: "🛠️" }]
    : MOBILE_NAV_ITEMS;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-card">
        <div className="flex h-16 items-center px-4 border-b">
          <Link href="/dashboard" className="text-xl font-bold text-primary">IBC</Link>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors"
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              href="/admin/dashboard"
              className="mt-3 pt-3 border-t border-border flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors text-primary font-medium"
            >
              <span aria-hidden="true">🛠️</span>
              Espace Admin
            </Link>
          )}
        </nav>
        <div className="border-t p-4">
          <SignOutButton />
        </div>
      </aside>

      {/* Mobile top nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-card/90 backdrop-blur-md flex justify-around h-16 items-center" aria-label="Navigation mobile">
        {mobileItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-1 flex-col items-center justify-center h-full text-muted-foreground hover:text-foreground transition-colors min-h-[44px]"
          >
            <span className="text-xl mb-1" aria-hidden="true">{item.icon}</span>
            <span className="text-[10px] font-medium leading-none">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-auto pb-16 md:pb-0">
        {children}
      </main>
    </div>
  );
}