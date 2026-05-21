import { redirect } from "next/navigation";

import { AdminDashboard } from "@/components/features/admin/admin-dashboard";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const revalidate = 300;

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  if (user?.role !== "ADMIN") redirect("/dashboard");

  return <AdminDashboard />;
}
