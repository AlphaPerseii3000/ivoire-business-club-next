import Link from "next/link";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/opportunities", label: "Opportunités" },
  { href: "/members", label: "Annuaire" },
  { href: "/profile", label: "Profil" },
  { href: "/settings", label: "Paramètres" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r bg-card md:block">
        <div className="flex h-16 items-center justify-center border-b">
          <Link href="/dashboard" className="text-lg font-bold text-primary">IBC</Link>
        </div>
        <nav className="mt-4 space-y-1 px-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b px-6">
          <h1 className="text-lg font-semibold">Espace Membre</h1>
          <form action="/api/auth/signout" method="POST">
            <button type="submit" className="text-sm text-muted-foreground hover:text-foreground">
              Déconnexion
            </button>
          </form>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
