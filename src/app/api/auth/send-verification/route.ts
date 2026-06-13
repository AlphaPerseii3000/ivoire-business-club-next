import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { sendEmailVerificationEmail } from "@/lib/email";
import { verificationSendRateLimiter } from "@/lib/rate-limit";
import { sanitizeError } from "@/lib/sanitize-log";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userId = session.user.id;

    // Rate Limit Check
    const rateLimit = await verificationSendRateLimiter.limit(userId);
    if (!rateLimit.success) {
      const retryAfter = Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000));
      return NextResponse.json(
        { error: "Trop de tentatives de renvoi. Réessayez dans une minute." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, emailVerified: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // No-op if already verified
    if (user.emailVerified) {
      return NextResponse.json({ success: true, message: "Email déjà vérifié" });
    }

    // Database cleanup: delete old verification tokens for this user
    await prisma.verificationToken.deleteMany({
      where: { userId },
    });

    // Generate high-entropy token and 24h expiration
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create VerificationToken
    // identifier is left out to let it auto-generate a CUID as @id in prisma/schema.prisma
    await prisma.verificationToken.create({
      data: {
        token,
        expires,
        userId,
      },
    });

    // Send email
    try {
      await sendEmailVerificationEmail({
        to: user.email,
        name: user.name,
        token,
      });
    } catch (emailError) {
      console.error("[send-verification] Failed to send verification email:", sanitizeError(emailError));
      // Cleanup token on mail failure so they can retry without leaving orphaned db entries
      await prisma.verificationToken.deleteMany({
        where: { token },
      });
      return NextResponse.json(
        { error: "Impossible d'envoyer l'email de vérification. Veuillez réessayer plus tard." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[send-verification] Unexpected error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}
