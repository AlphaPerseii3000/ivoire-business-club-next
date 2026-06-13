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

  const currentStatus = user.verificationStatus;
  const { eligible } = isEligibleForVerification(user);

  let newStatus = currentStatus;

  if (currentStatus === "VERIFIED") {
    return { changed: false, status: "VERIFIED" };
  }

  if (eligible) {
    if (currentStatus === "PENDING" || currentStatus === "REJECTED") {
      newStatus = "EN_COURS";
    }
  } else {
    if (currentStatus === "EN_COURS") {
      newStatus = "PENDING";
    }
  }

  if (newStatus !== currentStatus) {
    await db.user.update({
      where: { id: userId },
      data: { verificationStatus: newStatus },
    });
    return { changed: true, status: newStatus as VerificationStatus };
  }

  return { changed: false, status: currentStatus as VerificationStatus };
}
