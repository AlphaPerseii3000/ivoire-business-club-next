import { prisma } from "@/lib/prisma";

export async function hasActiveSubscription(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  // Admins always have premium access
  if (user?.role === "ADMIN") return true;

  const activeSubscription = await prisma.subscription.findFirst({
    where: { userId, status: "ACTIVE" },
    select: { id: true },
  });

  return Boolean(activeSubscription);
}

export async function getUserPremiumAccess(userId: string): Promise<{ hasAccess: boolean }> {
  return { hasAccess: await hasActiveSubscription(userId) };
}
