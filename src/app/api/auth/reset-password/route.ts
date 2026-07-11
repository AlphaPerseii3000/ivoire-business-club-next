import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { passwordResetSchema } from "@/lib/validations";
import { sanitizeError } from "@/lib/sanitize-log";
import { resetPasswordRateLimiter, getClientIp } from "@/lib/rate-limit";
import { safeCreateAuditLog, AUDIT_ACTIONS } from "@/lib/audit-log";
import { sendPasswordChangedEmail } from "@/lib/email";

const BCRYPT_COST = 12;

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateLimit = await resetPasswordRateLimiter.limit(ip);
    if (!rateLimit.success) {
      const retryAfter = Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000));
      return NextResponse.json(
        { error: "Trop de tentatives. Réessayez dans une minute." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Requête malformée." }, { status: 400 });
    }

    const { token, password, confirmPassword, type } = body as {
      token?: string;
      password?: string;
      confirmPassword?: string;
      type?: string;
    };

    if (!token || typeof token !== "string" || token.trim() === "") {
      return NextResponse.json({ error: "Le token est requis." }, { status: 400 });
    }

    const parsed = passwordResetSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token: hashedToken },
    });

    if (
      !verificationToken ||
      (verificationToken.tokenType !== "PASSWORD_RESET" &&
        verificationToken.tokenType !== "SET_PASSWORD")
    ) {
      if (type === "set" || (verificationToken && verificationToken.tokenType === "SET_PASSWORD")) {
        return NextResponse.json(
          {
            error:
              "Ce lien d'invitation a expiré. Contactez le support pour en recevoir un nouveau.",
          },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: "Ce lien est invalide." },
        { status: 400 }
      );
    }

    const now = new Date();
    if (verificationToken.expires.getTime() < now.getTime()) {
      try {
        await prisma.verificationToken.delete({
          where: { token: hashedToken },
        });
      } catch (e) {
        console.warn("Could not delete expired reset token:", sanitizeError(e));
      }

      if (verificationToken.tokenType === "SET_PASSWORD") {
        return NextResponse.json(
          {
            error:
              "Ce lien d'invitation a expiré. Contactez le support pour en recevoir un nouveau.",
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          error:
            "Ce lien de réinitialisation a expiré. Veuillez en demander un nouveau.",
        },
        { status: 400 }
      );
    }

    const userId = verificationToken.userId;
    if (!userId) {
      return NextResponse.json(
        { error: "Ce lien est invalide." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, status: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable." },
        { status: 400 }
      );
    }

    if (user.status === "SUSPENDED") {
      return NextResponse.json(
        { error: "Ce compte a été suspendu." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, BCRYPT_COST);

    const userUpdateData: { passwordHash: string; emailVerified?: boolean } = {
      passwordHash,
    };

    if (verificationToken.tokenType === "SET_PASSWORD") {
      userUpdateData.emailVerified = true;
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: userUpdateData,
      }),
      prisma.verificationToken.delete({
        where: { token: hashedToken },
      }),
    ]);

    // Create Audit Log
    await safeCreateAuditLog({
      actorId: userId,
      action: AUDIT_ACTIONS.PASSWORD_CHANGED,
      entityType: "USER",
      entityId: userId,
    });

    // Send Email Notification
    if (user.email) {
      try {
        await sendPasswordChangedEmail({
          to: user.email,
          name: user.name,
        });
      } catch (e) {
        console.error("Failed to send password changed email from reset token:", sanitizeError(e));
      }
    }

    const successMessage =
      verificationToken.tokenType === "SET_PASSWORD"
        ? "Votre mot de passe a été défini. Vous pouvez vous connecter."
        : "Mot de passe réinitialisé avec succès.";

    return NextResponse.json({ message: successMessage });
  } catch (error) {
    console.error("Reset password error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateLimit = await resetPasswordRateLimiter.limit(ip);
    if (!rateLimit.success) {
      const retryAfter = Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000));
      return NextResponse.json(
        { error: "Trop de tentatives. Réessayez dans une minute." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token || typeof token !== "string" || token.trim() === "") {
      return NextResponse.json({ error: "Le token est requis." }, { status: 400 });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token: hashedToken },
    });

    if (
      !verificationToken ||
      (verificationToken.tokenType !== "PASSWORD_RESET" &&
        verificationToken.tokenType !== "SET_PASSWORD")
    ) {
      return NextResponse.json(
        { error: "Ce lien est invalide ou expiré." },
        { status: 400 }
      );
    }

    const now = new Date();
    if (verificationToken.expires.getTime() < now.getTime()) {
      return NextResponse.json(
        { error: "Ce lien est invalide ou expiré." },
        { status: 400 }
      );
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error("GET reset-password token validation error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
