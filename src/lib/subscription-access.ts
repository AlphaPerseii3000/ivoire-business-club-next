import { prisma } from "@/lib/prisma";

export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const activeSubscription = await prisma.subscription.findFirst({
    where: { userId, status: "ACTIVE" },
    select: { id: true },
  });

  return Boolean(activeSubscription);
}

export async function getUserPremiumAccess(userId: string): Promise<{ hasAccess: boolean }> {
  return { hasAccess: await hasActiveSubscription(userId) };
}
