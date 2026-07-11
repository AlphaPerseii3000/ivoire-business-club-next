import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { passwordChangeSchema } from "@/lib/validations";
import { sanitizeError } from "@/lib/sanitize-log";
import { userPasswordUpdateRateLimiter } from "@/lib/rate-limit";
import { safeCreateAuditLog, AUDIT_ACTIONS } from "@/lib/audit-log";
import { sendPasswordChangedEmail } from "@/lib/email";

const BCRYPT_COST = 12;

async function handlePasswordChange(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userId = session.user.id;
    const rateLimit = await userPasswordUpdateRateLimiter.limit(`user:${userId}`);
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

    const parsed = passwordChangeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, passwordHash: true, status: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    if (user.status === "SUSPENDED") {
      return NextResponse.json({ error: "Compte suspendu" }, { status: 403 });
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        { error: "Ce compte utilise la connexion Google." },
        { status: 400 }
      );
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Le mot de passe actuel est incorrect." },
        { status: 400 }
      );
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, BCRYPT_COST);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedNewPassword },
    });

    // Log Audit
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
        console.error("Failed to send password changed email:", sanitizeError(e));
      }
    }

    return NextResponse.json({ message: "Mot de passe mis à jour avec succès." });
  } catch (error) {
    console.error("Password change error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return handlePasswordChange(req);
}

export async function PUT(req: Request) {
  return handlePasswordChange(req);
}
