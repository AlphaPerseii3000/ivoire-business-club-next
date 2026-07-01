import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { passwordResetSchema } from "@/lib/validations";
import { sanitizeError } from "@/lib/sanitize-log";

const BCRYPT_COST = 12;

export async function POST(req: Request) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Requête malformée." }, { status: 400 });
    }

    const { token, password, confirmPassword } = body as {
      token?: string;
      password?: string;
      confirmPassword?: string;
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

    if (!verificationToken || verificationToken.tokenType !== "PASSWORD_RESET") {
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

      return NextResponse.json(
        { error: "Ce lien de réinitialisation a expiré. Veuillez en demander un nouveau." },
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

    const passwordHash = await bcrypt.hash(parsed.data.password, BCRYPT_COST);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      }),
      prisma.verificationToken.delete({
        where: { token: hashedToken },
      }),
    ]);

    return NextResponse.json({ message: "Mot de passe réinitialisé avec succès." });
  } catch (error) {
    console.error("Reset password error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
