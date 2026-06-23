import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { signupSchema } from "@/lib/validations";
import { signupRateLimiter, getClientIp } from "@/lib/rate-limit";
import { sanitizeError } from "@/lib/sanitize-log";
import { roleForEmail } from "@/lib/admin-authorization";
import { sendEmailVerificationEmail, sendWelcomeEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateLimit = await signupRateLimiter.limit(ip);
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
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { name, email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Cet email est déjà associé à un compte." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, passwordHash, role: roleForEmail(email) },
    });

    // Send verification email (non-blocking for registration success)
    try {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await prisma.verificationToken.create({
        data: {
          token: hashedToken,
          expires,
          userId: user.id,
        },
      });

      await sendEmailVerificationEmail({
        to: user.email,
        name: user.name,
        token: rawToken,
      });
    } catch (verifyEmailError) {
      console.error("Failed to send initial email verification:", sanitizeError(verifyEmailError));
    }

    // Send welcome email (non-blocking for registration success)
    try {
      await sendWelcomeEmail({
        to: user.email,
        name: user.name,
        // Newly created users don't have a subscription tier yet; default to AFFRANCHI copy.
        tier: "AFFRANCHI",
        userId: user.id,
      });
    } catch (welcomeEmailError) {
      console.error("Failed to send welcome email:", sanitizeError(welcomeEmailError));
    }

    return NextResponse.json(
      { id: user.id, email: user.email, name: user.name },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
