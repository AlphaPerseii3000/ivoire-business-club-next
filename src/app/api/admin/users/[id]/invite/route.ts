import { NextResponse } from "next/server";
import crypto from "crypto";
import { AUDIT_ACTIONS, safeCreateAuditLog } from "@/lib/audit-log";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeError } from "@/lib/sanitize-log";
import { sendSetPasswordEmail } from "@/lib/email";

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, status: true },
    });

    if (admin?.role !== "ADMIN") {
      return NextResponse.json({ error: "Interdit" }, { status: 403 });
    }

    if (admin?.status === "SUSPENDED") {
      return NextResponse.json(
        { error: "Compte administrateur suspendu." },
        { status: 403 }
      );
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        status: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    if (user.status === "SUSPENDED") {
      return NextResponse.json(
        { error: "Impossible d'inviter un utilisateur suspendu." },
        { status: 400 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { error: "L'utilisateur a déjà activé son compte (email vérifié)." },
        { status: 400 }
      );
    }

    // Invalider les anciens tokens de type SET_PASSWORD pour cet utilisateur
    await prisma.verificationToken.deleteMany({
      where: {
        userId: user.id,
        tokenType: "SET_PASSWORD",
      },
    });

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    await prisma.verificationToken.create({
      data: {
        token: hashedToken,
        identifier: `set-${user.id}-${Date.now()}`,
        expires: new Date(Date.now() + TOKEN_TTL_MS),
        userId: user.id,
        tokenType: "SET_PASSWORD",
      },
    });

    await safeCreateAuditLog({
      actorId: session.user.id,
      action: AUDIT_ACTIONS.USER_INVITATION_EMAIL_SEND,
      entityType: "User",
      entityId: id,
      metadata: {
        targetUserId: user.id,
      },
    });

    try {
      await sendSetPasswordEmail({
        to: user.email,
        name: user.name,
        token: rawToken,
      });
    } catch (emailError) {
      // Nettoyer le token si l'envoi d'email échoue
      await prisma.verificationToken.deleteMany({
        where: { token: hashedToken },
      });
      console.error(
        "[admin-user-invite] Failed to send set-password email:",
        sanitizeError(emailError)
      );
      return NextResponse.json(
        { error: "Impossible d'envoyer l'email d'invitation." },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Invitation envoyée avec succès." });
  } catch (error) {
    console.error("[admin-user-invite] Error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
