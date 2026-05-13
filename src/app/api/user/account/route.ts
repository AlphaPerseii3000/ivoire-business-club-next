import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { accountDeletionSchema } from "@/lib/validations";
import { accountDeleteRateLimiter, getClientIdentifier } from "@/lib/rate-limit";
import { sanitizeError } from "@/lib/sanitize-log";
import bcrypt from "bcryptjs";

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Rate limit per user ID to prevent concurrent deletion race condition
    const rateLimit = await accountDeleteRateLimiter.limit(
      getClientIdentifier(req, session.user.id)
    );
    if (!rateLimit.success) {
      const retryAfter = Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000));
      return NextResponse.json(
        { error: "Trop de tentatives. Réessayez dans une minute." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Requête invalide." },
        { status: 400 }
      );
    }

    const parsed = accountDeletionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Veuillez taper SUPPRIMER pour confirmer." },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    // Anonymize user and delete all related data in a transaction
    const randomHash = await bcrypt.hash(crypto.randomUUID(), 12);

    await prisma.$transaction([
      // Delete opportunities authored by user (explicit, even though cascade should handle)
      prisma.opportunity.deleteMany({ where: { authorId: userId } }),
      // Delete payments
      prisma.payment.deleteMany({ where: { userId } }),
      // Delete subscriptions
      prisma.subscription.deleteMany({ where: { userId } }),
      // Delete OAuth accounts
      prisma.account.deleteMany({ where: { userId } }),
      // Delete sessions
      prisma.session.deleteMany({ where: { userId } }),
      // Delete verification tokens
      prisma.verificationToken.deleteMany({ where: { userId } }),
      // Anonymize user record (not hard-delete)
      prisma.user.update({
        where: { id: userId },
        data: {
          email: `deleted_${userId}@deleted.ibc`,
          name: "Compte supprimé",
          bio: null,
          image: null,
          phone: null,
          location: null,
          country: null,
          passwordHash: randomHash,
          googleId: null,
          emailVerified: false,
          verificationStatus: "REJECTED",
        },
      }),
    ]);

    return NextResponse.json({
      data: { message: "Compte supprimé avec succès." },
    });
  } catch (error) {
    console.error("Account deletion error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}