import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { forgotPasswordRequestSchema } from "@/lib/validations";
import { passwordResetRateLimiter, getClientIp } from "@/lib/api-rate-limit";
import { sendPasswordResetEmail } from "@/lib/email";
import { sanitizeError } from "@/lib/sanitize-log";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 heure
const SUCCESS_MESSAGE = "Si un compte est associé à cet email, un lien de réinitialisation a été envoyé.";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateLimit = await passwordResetRateLimiter.limit(ip);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Trop de tentatives. Veuillez réessayer dans une minute." },
        { status: 429 }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Requête malformée." }, { status: 400 });
    }

    const parsed = forgotPasswordRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, name: true },
    });

    if (user) {
      // Invalider les anciens tokens de réinitialisation actifs pour cet utilisateur
      await prisma.verificationToken.deleteMany({
        where: {
          userId: user.id,
          tokenType: "PASSWORD_RESET",
        },
      });

      const rawToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

      await prisma.verificationToken.create({
        data: {
          token: hashedToken,
          identifier: `reset-${user.id}-${Date.now()}`,
          expires: new Date(Date.now() + TOKEN_TTL_MS),
          userId: user.id,
          tokenType: "PASSWORD_RESET",
        },
      });

      try {
        await sendPasswordResetEmail({
          to: user.email,
          name: user.name,
          token: rawToken,
        });
      } catch (emailError) {
        console.error("[forgot-password] Failed to send reset email:", sanitizeError(emailError));
        // On continue pour ne pas divulguer l'existence du compte.
      }
    }

    return NextResponse.json({ message: SUCCESS_MESSAGE });
  } catch (error) {
    console.error("Forgot password error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
