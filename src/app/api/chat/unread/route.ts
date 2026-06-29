import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeError } from "@/lib/sanitize-log";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const userId = session.user.id;

    const unreadCount = await prisma.chatMessage.count({
      where: {
        userId,
        author: { in: ["HERMES", "SYSTEM"] },
        readAt: null,
      },
    });

    return NextResponse.json({ data: { unreadCount } });
  } catch (error) {
    console.error("[chat/unread GET] Unexpected error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}
