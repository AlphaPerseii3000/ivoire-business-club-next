import { NextResponse } from "next/server";
import { sendRemindersToIncompleteUsers } from "@/lib/reminders.server";
import { sanitizeError } from "@/lib/sanitize-log";
import crypto from "crypto";

function getBearerToken(header: string | null): string | null {
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/);
  return match ? match[1] : null;
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    const token = getBearerToken(authHeader);
    const expected = process.env.CRON_SECRET;

    if (!expected || !token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest();
    const expectedHash = crypto.createHash("sha256").update(expected).digest();

    if (!crypto.timingSafeEqual(tokenHash, expectedHash)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await sendRemindersToIncompleteUsers();

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error(
      "[cron/remind-incomplete-users] Unexpected error:",
      sanitizeError(error)
    );
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
