import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendReminderEmail } from "@/lib/email";
import { sendVerificationEmailToUser } from "@/lib/verification-email.server";
import { sanitizeError } from "@/lib/sanitize-log";

/**
 * ROUTE TEMPORAIRE — Blast email relance one-shot.
 * Cible: membres inscrits jusqu'au 2 juillet 2026 inclus,
 * n'ayant pas validé leur email ET/OU complété leur profil.
 *
 * GET  → dry-run (liste les utilisateurs + type de mail, n'envoie rien)
 * POST → envoi réel
 *
 * Auth: Bearer token (CRON_SECRET) — temporaire, à supprimer après usage.
 */

const CUTOFF_DATE = new Date("2026-07-02T23:59:59+02:00");

function getBearerToken(header: string | null): string | null {
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/);
  return match ? match[1].trim() : null;
}

function checkAuth(req: Request) {
  const authHeader = req.headers.get("Authorization");
  const token = getBearerToken(authHeader);
  const expected = process.env.CRON_SECRET;

  if (!expected || !token) return false;

  const tokenHash = crypto.createHash("sha256").update(token).digest();
  const expectedHash = crypto.createHash("sha256").update(expected).digest();

  return crypto.timingSafeEqual(tokenHash, expectedHash);
}

type BlastUser = {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  onboardingCompletedAt: Date | null;
  createdAt: Date;
};

type BlastEntry = {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  profileCompleted: boolean;
  createdAt: string;
  reminderType: "EMAIL_VERIFICATION" | "PROFILE_COMPLETION" | "FINAL_REMINDER";
};

function determineBlastType(user: BlastUser): "EMAIL_VERIFICATION" | "PROFILE_COMPLETION" | "FINAL_REMINDER" {
  const emailVerified = user.emailVerified === true;
  const profileCompleted = user.onboardingCompletedAt !== null;

  if (!emailVerified && !profileCompleted) return "FINAL_REMINDER";
  if (!emailVerified) return "EMAIL_VERIFICATION";
  return "PROFILE_COMPLETION";
}

async function getBlastUsers(): Promise<BlastUser[]> {
  return prisma.user.findMany({
    where: {
      createdAt: { lte: CUTOFF_DATE },
      email: { not: "test-agent-12345@example.com" },
      OR: [{ emailVerified: false }, { onboardingCompletedAt: null }],
    },
    select: {
      id: true,
      email: true,
      name: true,
      emailVerified: true,
      onboardingCompletedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function GET(req: Request) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const users = await getBlastUsers();

    const entries: BlastEntry[] = users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      emailVerified: u.emailVerified,
      profileCompleted: u.onboardingCompletedAt !== null,
      createdAt: u.createdAt.toISOString(),
      reminderType: determineBlastType(u),
    }));

    const summary = {
      total: entries.length,
      emailVerification: entries.filter((e) => e.reminderType === "EMAIL_VERIFICATION").length,
      profileCompletion: entries.filter((e) => e.reminderType === "PROFILE_COMPLETION").length,
      finalReminder: entries.filter((e) => e.reminderType === "FINAL_REMINDER").length,
    };

    return NextResponse.json({ dryRun: true, summary, users: entries });
  } catch (error) {
    console.error("[blast-reminders] Dry-run error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const users = await getBlastUsers();

    let sent = 0;
    let errors = 0;
    const errorDetails: { email: string; error: string }[] = [];

    for (const user of users) {
      const reminderType = determineBlastType(user);

      try {
        if (reminderType === "EMAIL_VERIFICATION") {
          // Pour la vérification email, on doit générer un nouveau token
          // sendVerificationEmailToUser gère la création du token + l'envoi
          const result = await sendVerificationEmailToUser(user.id);
          if (!result.sent) {
            // Rate-limited ou déjà vérifié — skip silencieux
            errors++;
            errorDetails.push({ email: user.email, error: result.reason });
            continue;
          }
        } else {
          // PROFILE_COMPLETION et FINAL_REMINDER utilisent sendReminderEmail
          await sendReminderEmail({
            to: user.email,
            name: user.name,
            type: reminderType,
          });
        }

        sent++;
      } catch (error) {
        errors++;
        errorDetails.push({ email: user.email, error: sanitizeError(error) });
        console.error(`[blast-reminders] Failed for ${user.email}:`, sanitizeError(error));
      }
    }

    return NextResponse.json({
      sent,
      errors,
      total: users.length,
      errorDetails: errorDetails.slice(0, 20),
    });
  } catch (error) {
    console.error("[blast-reminders] Send error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}