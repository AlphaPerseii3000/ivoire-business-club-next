import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import SignOutButton from "@/components/auth/sign-out-button";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Tableau de bord", icon: "📊" },
  { href: "/opportunities", label: "Opportunités", icon: "🎯" },
  { href: "/members", label: "Membres", icon: "🤝" },
  { href: "/profile", label: "Mon profil", icon: "👤" },
  { href: "/settings", label: "Paramètres", icon: "⚙️" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-card">
        <div className="flex h-16 items-center px-4 border-b">
          <a href="/dashboard" className="text-xl font-bold text-primary">IBC</a>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors"
            >
              <span>{item.icon}</span>
              {item.label}
            </a>
          ))}
        </nav>
        <div className="border-t p-4">
          <SignOutButton />
        </div>
      </aside>

      {/* Mobile top nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-card flex justify-around py-2">
        {NAV_ITEMS.slice(0, 4).map((item) => (
          <a key={item.href} href={item.href} className="flex flex-col items-center text-xs">
            <span className="text-lg">{item.icon}</span>
            {item.label.split(" ")[0]}
          </a>
        ))}
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-auto pb-16 md:pb-0">
        {children}
      </main>
    </div>
  );
}