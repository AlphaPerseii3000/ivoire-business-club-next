import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signinSchema } from "@/lib/validations";
import { signinRateLimiter, getClientIp } from "@/lib/rate-limit";
import { sanitizeError } from "@/lib/sanitize-log";
import { isConfiguredAdminEmail } from "@/lib/admin-authorization";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateLimit = await signinRateLimiter.limit(ip);
    if (!rateLimit.success) {
      const retryAfter = Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000));
      return NextResponse.json(
        { error: "Trop de tentatives. Réessayez dans une minute." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    const body = await req.json();
    const parsed = signinSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: "Email ou mot de passe incorrect." },
        { status: 401 }
      );
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Email ou mot de passe incorrect." },
        { status: 401 }
      );
    }

    const role = isConfiguredAdminEmail(user.email) && user.role !== "ADMIN" ? "ADMIN" : user.role;
    if (role !== user.role) {
      await prisma.user.update({ where: { id: user.id }, data: { role } });
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      tier: user.tier,
      role,
    });
  } catch (error) {
    console.error("Signin error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
