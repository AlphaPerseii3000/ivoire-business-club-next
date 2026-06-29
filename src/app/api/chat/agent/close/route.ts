import { prisma } from "@/lib/prisma";
import { sanitizeError } from "@/lib/sanitize-log";
import { chatAgentCloseSchema } from "@/lib/validations";
import { NextResponse } from "next/server";

function getBearerToken(header: string | null): string | null {
  if (!header) return null;
  const parts = header.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return null;
  return parts[1]?.trim() || null;
}

function authenticateAgent(req: Request): boolean {
  const authHeader = req.headers.get("Authorization");
  const token = getBearerToken(authHeader);
  const expected = process.env.CRON_SECRET;
  return Boolean(expected && token === expected);
}

export async function POST(req: Request) {
  try {
    if (!authenticateAgent(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = chatAgentCloseSchema.safeParse(body);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((issue) => issue.message).join("; ");
      return NextResponse.json({ error: issues, code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const { messageId } = parsed.data;

    const existing = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      select: { status: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Message introuvable" }, { status: 404 });
    }

    if (existing.status === "CLOSED") {
      return NextResponse.json({ data: { closed: true } });
    }

    await prisma.chatMessage.update({
      where: { id: messageId },
      data: { status: "CLOSED" },
    });

    return NextResponse.json({ data: { closed: true } });
  } catch (error) {
    console.error("[chat/agent/close POST] Unexpected error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}
