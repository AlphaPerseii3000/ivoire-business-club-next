import Link from "next/link";

const adminNav = [
  { href: "/admin/dashboard", label: "Tableau de bord" },
  { href: "/admin/members", label: "Membres" },
  { href: "/admin/subscriptions", label: "Abonnements" },
  { href: "/admin/opportunities", label: "Opportunités" },
  { href: "/admin/audit", label: "Audit" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r bg-destructive/5 md:block">
        <div className="flex h-16 items-center justify-center border-b">
          <Link href="/admin/dashboard" className="text-lg font-bold text-destructive">IBC Admin</Link>
        </div>
        <nav className="mt-4 space-y-1 px-3">
          {adminNav.map((item) => (
            <Link key={item.href} href={item.href} className="block min-h-11 rounded-md px-3 py-2 text-sm hover:bg-muted">
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center border-b px-6">
          <h1 className="text-lg font-semibold">Administration</h1>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
