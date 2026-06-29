import { prisma } from "@/lib/prisma";
import { sanitizeError } from "@/lib/sanitize-log";
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

export async function GET(req: Request) {
  try {
    if (!authenticateAgent(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        userId: true,
        category: true,
        content: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ data: { messages } });
  } catch (error) {
    console.error("[chat/agent/read GET] Unexpected error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}
