import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeError } from "@/lib/sanitize-log";
import { chatMessageCreateSchema } from "@/lib/validations";
import { chatMessagePublicRateLimiter, chatMessageRateLimiter, getClientIdentifier, getClientIp } from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import crypto from "crypto";

const DEFAULT_PAGE_LIMIT = 20;
const MAX_PAGE_LIMIT = 50;

const ACKNOWLEDGEMENT_CONTENT =
  "Merci, votre message a été reçu. L'équipe vous répondra sous peu. 🚧 Plateforme en phase bêta.";

function makeRateLimitResponse(retryAfter: number) {
  return NextResponse.json(
    { error: "Trop de messages envoyés. Veuillez patienter.", code: "RATE_LIMITED" },
    { status: 429, headers: { "Retry-After": String(Math.max(1, retryAfter)) } }
  );
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const userId = session.user.id;

    // Story 26.7: IP-based public rate limit first (10/min/IP)
    const ipIdentifier = `ip:${getClientIp(req)}`;
    const publicRateLimit = await chatMessagePublicRateLimiter.limit(ipIdentifier);
    if (!publicRateLimit.success) {
      const retryAfter = Math.ceil((publicRateLimit.reset - Date.now()) / 1000);
      return makeRateLimitResponse(retryAfter);
    }

    // Existing per-user rate limit (1/30s/user) kept for anti-spam continuity
    const identifier = getClientIdentifier(req, userId);
    const rateLimit = await chatMessageRateLimiter.limit(identifier);
    if (!rateLimit.success) {
      const retryAfter = Math.ceil((rateLimit.reset - Date.now()) / 1000);
      return makeRateLimitResponse(retryAfter);
    }

    const body = await req.json();
    const parsed = chatMessageCreateSchema.safeParse(body);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((issue) => issue.message).join("; ");
      return NextResponse.json({ error: issues, code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const { category, content } = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      const message = await tx.chatMessage.create({
        data: {
          userId,
          author: "MEMBER",
          status: "PENDING",
          category,
          content,
        },
      });

      const ack = await tx.chatMessage.create({
        data: {
          userId,
          author: "SYSTEM",
          status: "ACKNOWLEDGED",
          replyToId: message.id,
          content: ACKNOWLEDGEMENT_CONTENT,
        },
      });

      return { message, ack };
    });

    if (process.env.WEBHOOK_URL) {
      const webhookBody = JSON.stringify({
        messageId: result.message.id,
        userId,
        category,
        content,
      });
      const signature = crypto
        .createHmac("sha256", process.env.WEBHOOK_SECRET!)
        .update(webhookBody)
        .digest("hex");

      void (async () => {
        try {
          const response = await fetch(process.env.WEBHOOK_URL as string, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Webhook-Signature": signature,
            },
            body: webhookBody,
          });
          if (!response.ok) {
            console.warn(
              `[chat/messages POST] Webhook call failed for messageId=${result.message.id} userId=${userId} category=${category}: HTTP ${response.status}`
            );
          }
        } catch (error) {
          console.warn(
            `[chat/messages POST] Webhook call failed for messageId=${result.message.id} userId=${userId} category=${category}:`,
            sanitizeError(error)
          );
        }
      })();
    }

    return NextResponse.json({ data: { message: result.message, ack: result.ack } }, { status: 201 });
  } catch (error) {
    console.error("[chat/messages POST] Unexpected error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(req.url);
    const rawPage = searchParams.get("page");
    const rawLimit = searchParams.get("limit");

    const page = Math.max(1, Number(rawPage) || 1);
    const limit = Math.min(MAX_PAGE_LIMIT, Math.max(1, Number(rawLimit) || DEFAULT_PAGE_LIMIT));
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      prisma.chatMessage.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.chatMessage.count({ where: { userId } }),
    ]);

    return NextResponse.json({ data: { messages, total, page, limit } });
  } catch (error) {
    console.error("[chat/messages GET] Unexpected error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}
