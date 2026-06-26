import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmailVerificationEmail } from "@/lib/email";
import { sanitizeError } from "@/lib/sanitize-log";

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export function isWithinLast24h(date: Date | null): boolean {
  if (!date) return false;
  return Date.now() - date.getTime() < VERIFICATION_TOKEN_TTL_MS;
}

export async function sendVerificationEmailToUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, emailVerified: true },
  });

  if (!user) {
    throw new Error("Utilisateur non trouvé");
  }

  if (user.emailVerified) {
    return { sent: false, reason: "already-verified" as const };
  }

  const lastToken = await prisma.verificationToken.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  if (isWithinLast24h(lastToken?.createdAt ?? null)) {
    return { sent: false, reason: "rate-limited" as const };
  }

  await prisma.verificationToken.deleteMany({ where: { userId } });

  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expires = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);

  await prisma.verificationToken.create({
    data: {
      token: hashedToken,
      expires,
      userId,
    },
  });

  try {
    await sendEmailVerificationEmail({
      to: user.email,
      name: user.name,
      token: rawToken,
    });
  } catch (emailError) {
    await prisma.verificationToken.deleteMany({ where: { token: hashedToken } });
    console.error(
      "[verification-email.server] Failed to send verification email:",
      sanitizeError(emailError)
    );
    throw new Error("Impossible d'envoyer l'email de vérification");
  }

  return { sent: true, reason: "sent" as const };
}
