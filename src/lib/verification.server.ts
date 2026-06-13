import { prisma } from "@/lib/prisma";
import type { VerificationStatus } from "@/generated/prisma/client";
import { isEligibleForVerification } from "./verification";

export async function autoTransitionVerificationStatus(
  userId: string,
  txClient?: any
): Promise<{ changed: boolean; status: VerificationStatus }> {
  const db = txClient || prisma;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      emailVerified: true,
      bio: true,
      location: true,
      country: true,
      status: true,
      verificationStatus: true,
    },
  });

  if (!user) {
    return { changed: false, status: "PENDING" };
  }

  // Only transition PENDING -> EN_COURS.
  // Do not transition if user is already EN_COURS, VERIFIED, or REJECTED.
  if (user.verificationStatus !== "PENDING") {
    return { changed: false, status: user.verificationStatus as VerificationStatus };
  }

  const { eligible } = isEligibleForVerification(user);

  if (eligible) {
    await db.user.update({
      where: { id: userId },
      data: { verificationStatus: "EN_COURS" },
    });
    return { changed: true, status: "EN_COURS" };
  }

  return { changed: false, status: user.verificationStatus as VerificationStatus };
}
