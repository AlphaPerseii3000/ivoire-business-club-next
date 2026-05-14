import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import SignOutButton from "@/components/auth/sign-out-button";

const ADMIN_NAV = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/members", label: "Membres", icon: "👥" },
  { href: "/admin/subscriptions", label: "Abonnements", icon: "💳" },
  { href: "/admin/opportunities", label: "Opportunités", icon: "🎯" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (user?.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="flex min-h-screen">
      <aside className="hidden md:flex w-60 flex-col border-r bg-card">
        <div className="flex h-16 items-center px-4 border-b">
          <a href="/admin" className="text-lg font-bold text-primary">IBC Admin</a>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {ADMIN_NAV.map((item) => (
            <a key={item.href} href={item.href} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted">
              <span>{item.icon}</span>{item.label}
            </a>
          ))}
          <hr className="my-3" />
          <a href="/dashboard" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted">
            <span>🔙</span>Retour au site
          </a>
        </nav>
        <div className="border-t p-4">
          <SignOutButton />
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}