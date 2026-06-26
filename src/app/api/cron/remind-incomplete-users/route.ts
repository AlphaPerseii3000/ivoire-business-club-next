import { NextResponse } from "next/server";
import { sendRemindersToIncompleteUsers } from "@/lib/reminders.server";
import { sanitizeError } from "@/lib/sanitize-log";

function getBearerToken(header: string | null): string | null {
  if (!header) return null;
  const parts = header.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return null;
  return parts[1]?.trim() || null;
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    const token = getBearerToken(authHeader);
    const expected = process.env.CRON_SECRET;

    if (!expected || token !== expected) {
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
