import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { autoTransitionVerificationStatus } from "@/lib/verification.server";
import { sanitizeError } from "@/lib/sanitize-log";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Requête malformée." },
        { status: 400 }
      );
    }

    const { token } = body;

    if (!token || typeof token !== "string" || token.trim() === "") {
      return NextResponse.json(
        { error: "Jeton de vérification manquant." },
        { status: 400 }
      );
    }

    // Hash token to look up in the DB
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Find verification token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token: hashedToken },
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
          where: { token: hashedToken },
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
        where: { token: hashedToken },
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
