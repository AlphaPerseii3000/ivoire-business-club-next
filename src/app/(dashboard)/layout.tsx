import { requireActiveAuthenticatedUser } from "@/lib/account-status";
import DashboardMobileNav from "@/components/features/dashboard/dashboard-mobile-nav";
import SidebarContent from "@/components/features/dashboard/sidebar-content";

const MOBILE_NAV_ITEMS = [
  { href: "/dashboard", label: "Tableau de bord" },
  { href: "/articles", label: "Articles" },
  { href: "/dashboard/opportunities", label: "Opportunités" },
  { href: "/events", label: "Événements" },
  { href: "/partners", label: "Partenaires" },
  { href: "/members", label: "Membres" },
];

const LOCKED_HREFS = new Set(["/articles", "/dashboard/opportunities", "/members", "/dashboard/matching"]);

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireActiveAuthenticatedUser();
  const isAdmin = (session?.user as { role?: string })?.role === "ADMIN";
  const sessionUser = session.user as unknown as {
    emailVerified?: boolean;
    onboardingCompleted?: boolean;
  };
  const onboardingIncomplete = !sessionUser.emailVerified || !sessionUser.onboardingCompleted;

  const mobileItems = onboardingIncomplete
    ? MOBILE_NAV_ITEMS.filter((item) => !LOCKED_HREFS.has(item.href))
    : isAdmin
      ? [...MOBILE_NAV_ITEMS, { href: "/admin/dashboard", label: "Admin" }]
      : MOBILE_NAV_ITEMS;

  return (
    <div className="flex min-h-screen">
      <DashboardMobileNav items={mobileItems} />
      
      {/* Sidebar Desktop */}
      <SidebarContent isAdmin={isAdmin} onboardingIncomplete={onboardingIncomplete} />

      {/* Main content */}
      <main className="flex-1 overflow-auto pt-16 md:pt-0">
        {children}
      </main>
    </div>
  );
}