import { auth } from "@/lib/auth";
import { ACCOUNT_SUSPENDED_REDIRECT } from "@/lib/account-status";
import { promoteConfiguredAdminUser } from "@/lib/admin-access";
import { redirect } from "next/navigation";
import SignOutButton from "@/components/auth/sign-out-button";
import AdminMobileNav from "@/components/features/admin/admin-mobile-nav";
import Link from "next/link";

const ADMIN_NAV = [
  { href: "/admin/dashboard", label: "Tableau de bord", icon: "📊" },
  { href: "/admin/members", label: "Membres", icon: "👥" },
  { href: "/admin/subscriptions", label: "Abonnements", icon: "💳" },
  { href: "/admin/opportunities", label: "Opportunités", icon: "🎯" },
  { href: "/admin/articles", label: "Articles", icon: "✍️" },
  { href: "/admin/audit", label: "Audit", icon: "📋" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const user = await promoteConfiguredAdminUser(session.user.id);
  if (user?.role !== "ADMIN") redirect("/dashboard");
  if (user?.status === "SUSPENDED") redirect(ACCOUNT_SUSPENDED_REDIRECT);

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      {/* Sidebar Desktop/Tablet */}
      <aside className="hidden md:flex md:w-16 lg:w-60 flex-col border-r bg-card transition-all duration-300">
        <div className="flex h-16 items-center justify-center lg:justify-start px-4 border-b">
          <Link href="/admin/dashboard" className="text-lg font-bold text-primary lg:block hidden">
            IBC Admin
          </Link>
          <Link href="/admin/dashboard" className="text-lg font-bold text-primary lg:hidden block">
            IBC
          </Link>
        </div>
        <nav className="flex-1 space-y-1 p-2 lg:p-4">
          {ADMIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-h-11 items-center justify-center lg:justify-start gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors"
              title={item.label}
            >
              <span className="text-base">{item.icon}</span>
              <span className="lg:block hidden">{item.label}</span>
            </Link>
          ))}
          <hr className="my-3 border-border" />
          <Link
            href="/dashboard"
            className="flex min-h-11 items-center justify-center lg:justify-start gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors"
            title="Retour au site"
          >
            <span className="text-base">🔙</span>
            <span className="lg:block hidden">Retour au site</span>
          </Link>
        </nav>
        <div className="border-t p-2 lg:p-4 flex justify-center lg:justify-start">
          <SignOutButton />
        </div>
      </aside>

      {/* Header Mobile Navigation */}
      <AdminMobileNav navItems={ADMIN_NAV} />

      {/* Main Content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
