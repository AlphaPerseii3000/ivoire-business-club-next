import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { leadMagnetSchema } from "@/lib/validations";
import { sendGuideEmail } from "@/lib/email";
import { createRateLimiter, getClientIdentifier } from "@/lib/rate-limit";
import { sanitizeError } from "@/lib/sanitize-log";

const leadMagnetRateLimiter = createRateLimiter({ requests: 5, windowSeconds: 60 });

export async function POST(request: NextRequest) {
  try {
    const identifier = getClientIdentifier(request);
    const rateLimit = await leadMagnetRateLimiter.limit(identifier);
    if (!rateLimit.success) {
      const retryAfter = Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000));
      return NextResponse.json(
        { error: "Trop de tentatives. Réessayez dans une minute." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Requête malformée." }, { status: 400 });
    }

    const parsed = leadMagnetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email } = parsed.data;

    const existing = await prisma.leadMagnet.findUnique({ where: { email } });
    if (existing?.guideSentAt) {
      return NextResponse.json(
        { success: true, message: "Vous avez déjà reçu ce guide." },
        { status: 200 }
      );
    }

    const leadMagnet = await prisma.leadMagnet.create({
      data: { email },
    });

    try {
      await sendGuideEmail({ to: email });
    } catch (emailError) {
      console.error("[lead-magnet] Failed to send guide email:", sanitizeError(emailError));
      return NextResponse.json(
        { error: "Impossible d'envoyer l'email. Veuillez réessayer plus tard." },
        { status: 500 }
      );
    }

    await prisma.leadMagnet.update({
      where: { id: leadMagnet.id },
      data: { guideSentAt: new Date() },
    });

    return NextResponse.json(
      { success: true, message: "Votre guide vous a été envoyé par email." },
      { status: 200 }
    );
  } catch (error) {
    console.error("[lead-magnet] Unexpected error:", sanitizeError(error));
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
