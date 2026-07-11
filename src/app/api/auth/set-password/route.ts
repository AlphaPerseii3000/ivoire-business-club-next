import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { passwordSetSchema } from "@/lib/validations";
import { setPasswordRateLimiter, getClientIp } from "@/lib/rate-limit";
import { sanitizeError } from "@/lib/sanitize-log";
import { safeCreateAuditLog, AUDIT_ACTIONS } from "@/lib/audit-log";
import { sendPasswordChangedEmail } from "@/lib/email";

const BCRYPT_COST = 12;

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateLimit = await setPasswordRateLimiter.limit(ip);
    if (!rateLimit.success) {
      const retryAfter = Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000));
      return NextResponse.json(
        { error: "Trop de tentatives. Réessayez dans une minute." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userId = session.user.id;
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Requête malformée." }, { status: 400 });
    }

    const parsed = passwordSetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { password } = parsed.data;

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

    if (user.passwordHash) {
      return NextResponse.json(
        { error: "Un mot de passe est déjà configuré pour ce compte." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_COST);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword },
    });

    // Create Audit Log
    await safeCreateAuditLog({
      actorId: userId,
      action: AUDIT_ACTIONS.PASSWORD_CHANGED,
      entityType: "USER",
      entityId: userId,
    });

    // Send Email
    if (user.email) {
      try {
        await sendPasswordChangedEmail({
          to: user.email,
          name: user.name,
        });
      } catch (e) {
        console.error("Failed to send set password notification email:", sanitizeError(e));
      }
    }

    return NextResponse.json({ message: "Mot de passe défini avec succès." });
  } catch (error) {
    console.error("Set password error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
