import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { commentCreateSchema } from "@/lib/validations";
import { hasActiveSubscription } from "@/lib/subscription-access";
import { sanitizeError } from "@/lib/sanitize-log";
import { safeCreateAuditLog } from "@/lib/audit-log";
import DOMPurify from "isomorphic-dompurify";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const hasAccess = await hasActiveSubscription(session.user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
    }

    const isAdmin = session.user.role === "ADMIN";
    const article = await prisma.article.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        ...(!isAdmin ? { published: true } : {}),
      },
    });

    if (!article) {
      return NextResponse.json({ error: "Article non trouvé" }, { status: 404 });
    }

    const comments = await prisma.comment.findMany({
      where: { articleId: article.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      take: 100,
    });

    return NextResponse.json({ comments });
  } catch (error) {
    console.error("Get comments error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const hasAccess = await hasActiveSubscription(session.user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
    }

    const isAdmin = session.user.role === "ADMIN";
    const article = await prisma.article.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        ...(!isAdmin ? { published: true } : {}),
      },
    });

    if (!article) {
      return NextResponse.json({ error: "Article non trouvé" }, { status: 404 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Corps de requête JSON invalide ou vide" }, { status: 400 });
    }

    const parsed = commentCreateSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message ?? "Données invalides" },
        { status: 400 }
      );
    }

    const sanitizedContent = DOMPurify.sanitize(parsed.data.content).trim();
    if (sanitizedContent.length < 2) {
      return NextResponse.json(
        { error: "Le commentaire doit contenir au moins 2 caractères" },
        { status: 400 }
      );
    }

    const comment = await prisma.comment.create({
      data: {
        content: sanitizedContent,
        userId: session.user.id,
        articleId: article.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    try {
      await safeCreateAuditLog({
        actorId: session.user.id,
        action: "COMMENT_CREATE",
        entityType: "Comment",
        entityId: comment.id,
        metadata: {
          articleId: article.id,
        },
      });
    } catch (auditError) {
      console.error("Failed to create audit log for comment:", sanitizeError(auditError));
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error("Create comment error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
