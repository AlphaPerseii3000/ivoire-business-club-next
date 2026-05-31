import { isConfiguredAdminEmail } from "@/lib/admin-authorization";
import { prisma } from "@/lib/prisma";

export async function promoteConfiguredAdminUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, status: true },
  });

  if (!user) return null;
  if (!isConfiguredAdminEmail(user.email) || user.role === "ADMIN") return user;

  await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  return { ...user, role: "ADMIN" as const };
}
