import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const ACCOUNT_SUSPENDED_REDIRECT = "/auth/signin?error=AccountSuspended";

export async function requireActiveAuthenticatedUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, status: true },
  });

  if (!user) redirect("/auth/signin");
  if (user.status === "SUSPENDED") redirect(ACCOUNT_SUSPENDED_REDIRECT);

  return session;
}
