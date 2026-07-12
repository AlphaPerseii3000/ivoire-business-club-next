import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { commentCreateSchema } from "@/lib/validations";
import { hasActiveSubscription } from "@/lib/subscription-access";
import { sanitizeError } from "@/lib/sanitize-log";
import { safeCreateAuditLog } from "@/lib/audit-log";
import DOMPurify from "isomorphic-dompurify";
import { commentCreateRateLimiter } from "@/lib/rate-limit";
import { z } from "zod";

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

    const processedComments = comments.map((comment) => {
      if (comment.deletedAt) {
        return {
          ...comment,
          content: "Ce commentaire a été supprimé.",
          userId: "deleted",
          user: {
            id: "deleted",
            name: "Membre",
            image: null,
          },
        };
      }
      return comment;
    });

    return NextResponse.json({ comments: processedComments });
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

    const rateLimit = await commentCreateRateLimiter.limit(`user:${session.user.id}`);
    if (!rateLimit.success) {
      const retryAfter = Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000));
      return NextResponse.json(
        { error: "Trop de requêtes. Veuillez réessayer plus tard." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
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

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: articleId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const rateLimit = await commentCreateRateLimiter.limit(`user:${session.user.id}`);
    if (!rateLimit.success) {
      const retryAfter = Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000));
      return NextResponse.json(
        { error: "Trop de requêtes. Veuillez réessayer plus tard." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    const hasAccess = await hasActiveSubscription(session.user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
    }

    const isAdmin = session.user.role === "ADMIN";
    const article = await prisma.article.findFirst({
      where: {
        OR: [{ id: articleId }, { slug: articleId }],
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

    const commentUpdateSchema = z.object({
      commentId: z.string().min(1, "L'identifiant du commentaire est requis"),
      content: z.string().trim().min(2, "Le commentaire doit contenir au moins 2 caractères").max(1000, "Le commentaire ne doit pas dépasser 1000 caractères"),
    });

    const parsed = commentUpdateSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message ?? "Données invalides" },
        { status: 400 }
      );
    }

    const { commentId, content } = parsed.data;

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      return NextResponse.json({ error: "Commentaire introuvable" }, { status: 404 });
    }

    if (comment.articleId !== article.id) {
      return NextResponse.json({ error: "Commentaire non associé à cet article" }, { status: 400 });
    }

    if (comment.deletedAt) {
      return NextResponse.json({ error: "Ce commentaire a été supprimé" }, { status: 400 });
    }

    if (comment.userId !== session.user.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const sanitizedContent = DOMPurify.sanitize(content).trim();
    if (sanitizedContent.length < 2) {
      return NextResponse.json(
        { error: "Le commentaire doit contenir au moins 2 caractères" },
        { status: 400 }
      );
    }

    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: {
        content: sanitizedContent,
        updatedAt: new Date(),
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
        action: "COMMENT_UPDATE",
        entityType: "Comment",
        entityId: commentId,
        metadata: {
          articleId: article.id,
        },
      });
    } catch (auditError) {
      console.error("Failed to create audit log for comment update:", sanitizeError(auditError));
    }

    return NextResponse.json(updatedComment);
  } catch (error) {
    console.error("Update comment error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: articleId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const rateLimit = await commentCreateRateLimiter.limit(`user:${session.user.id}`);
    if (!rateLimit.success) {
      const retryAfter = Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000));
      return NextResponse.json(
        { error: "Trop de requêtes. Veuillez réessayer plus tard." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    const isAdmin = session.user.role === "ADMIN";
    const article = await prisma.article.findFirst({
      where: {
        OR: [{ id: articleId }, { slug: articleId }],
        ...(!isAdmin ? { published: true } : {}),
      },
    });

    if (!article) {
      return NextResponse.json({ error: "Article non trouvé" }, { status: 404 });
    }

    let commentId: string | null = null;

    // Accept via query param first, then body
    const { searchParams } = new URL(req.url);
    commentId = searchParams.get("commentId");

    if (!commentId) {
      try {
        const body = await req.json();
        commentId = body?.commentId || null;
      } catch {
        // Body is not json or empty, ignore
      }
    }

    if (!commentId) {
      return NextResponse.json({ error: "L'identifiant du commentaire est requis" }, { status: 400 });
    }

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      return NextResponse.json({ error: "Commentaire introuvable" }, { status: 404 });
    }

    if (comment.articleId !== article.id) {
      return NextResponse.json({ error: "Commentaire non associé à cet article" }, { status: 400 });
    }

    if (comment.deletedAt) {
      return NextResponse.json({ error: "Ce commentaire a déjà été supprimé" }, { status: 400 });
    }

    const isAuthor = comment.userId === session.user.id;

    if (!isAdmin && !isAuthor) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    await prisma.comment.update({
      where: { id: commentId },
      data: {
        deletedAt: new Date(),
      },
    });

    try {
      await safeCreateAuditLog({
        actorId: session.user.id,
        action: "COMMENT_DELETE",
        entityType: "Comment",
        entityId: commentId,
        metadata: {
          articleId: article.id,
        },
      });
    } catch (auditError) {
      console.error("Failed to create audit log for comment delete:", sanitizeError(auditError));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete comment error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
