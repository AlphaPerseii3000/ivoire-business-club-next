import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { autoTransitionVerificationStatus } from "@/lib/verification.server";
import { sanitizeError } from "@/lib/sanitize-log";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token } = body;

    if (!token || typeof token !== "string" || token.trim() === "") {
      return NextResponse.json(
        { error: "Jeton de vérification manquant." },
        { status: 400 }
      );
    }

    // Find verification token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      return NextResponse.json(
        { error: "Jeton de vérification invalide ou inconnu." },
        { status: 400 }
      );
    }

    // Check expiration
    if (verificationToken.expires < new Date()) {
      // Clean up expired token to save space
      try {
        await prisma.verificationToken.delete({
          where: { token },
        });
      } catch (e) {
        console.warn("Could not delete expired token:", sanitizeError(e));
      }

      return NextResponse.json(
        { error: "Le lien de vérification a expiré." },
        { status: 400 }
      );
    }

    const userId = verificationToken.userId;
    if (!userId) {
      return NextResponse.json(
        { error: "Utilisateur associé au jeton introuvable." },
        { status: 400 }
      );
    }

    // Single transaction for atomicity
    await prisma.$transaction(async (tx) => {
      // 1. Mark email as verified
      await tx.user.update({
        where: { id: userId },
        data: { emailVerified: true },
      });

      // 2. Delete the used token
      await tx.verificationToken.delete({
        where: { token },
      });

      // 3. Evaluate and auto transition verification status
      await autoTransitionVerificationStatus(userId, tx);
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Verify email API error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne de vérification" }, { status: 500 });
  }
}
