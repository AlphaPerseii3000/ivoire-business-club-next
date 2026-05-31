import { redirect } from "next/navigation";

import { AdminDashboard } from "@/components/features/admin/admin-dashboard";
import { promoteConfiguredAdminUser } from "@/lib/admin-access";
import { auth } from "@/lib/auth";

export const revalidate = 300;

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const user = await promoteConfiguredAdminUser(session.user.id);
  if (user?.role !== "ADMIN") redirect("/dashboard");

  return <AdminDashboard />;
}
