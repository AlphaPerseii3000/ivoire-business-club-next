import { prisma } from "@/lib/prisma";
import { sanitizeError } from "@/lib/sanitize-log";
import { chatAgentReplySchema } from "@/lib/validations";
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
    const parsed = chatAgentReplySchema.safeParse(body);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((issue) => issue.message).join("; ");
      return NextResponse.json({ error: issues, code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const { messageId, content } = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      const parent = await tx.chatMessage.findUnique({
        where: { id: messageId },
      });

      if (!parent) {
        throw new Error("NOT_FOUND");
      }

      if (parent.status !== "PENDING") {
        throw new Error("NOT_PENDING");
      }

      await tx.chatMessage.update({
        where: { id: messageId },
        data: { status: "REPLIED" },
      });

      const reply = await tx.chatMessage.create({
        data: {
          userId: parent.userId,
          author: "HERMES",
          replyToId: messageId,
          content,
        },
      });

      return reply;
    });

    return NextResponse.json({ data: { reply: result } }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "NOT_FOUND") {
        return NextResponse.json({ error: "Message introuvable" }, { status: 404 });
      }
      if (error.message === "NOT_PENDING") {
        return NextResponse.json(
          { error: "Le message n'est pas en attente de réponse", code: "NOT_PENDING" },
          { status: 404 }
        );
      }
    }
    console.error("[chat/agent/reply POST] Unexpected error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}
