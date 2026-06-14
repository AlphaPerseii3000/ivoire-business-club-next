import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { articleCreateSchema } from "@/lib/validations";
import { getAccessibleArticleVisibilities, generateUniqueSlug } from "@/lib/article-visibility";
import { hasActiveSubscription } from "@/lib/subscription-access";
import { sanitizeError } from "@/lib/sanitize-log";
import { safeCreateAuditLog } from "@/lib/audit-log";

export async function GET(req: Request) {
  try {
    const session = await auth();
    let isAdmin = false;
    let hasActiveSub = false;
    let userTier = null;

    if (session?.user) {
      isAdmin = (session.user as any).role === "ADMIN";
      if (!isAdmin) {
        hasActiveSub = await hasActiveSubscription(session.user.id);
        userTier = (session.user as any).tier;
      }
    }

    let whereClause: any = {};

    if (!isAdmin) {
      whereClause.published = true;
      const visibilities = getAccessibleArticleVisibilities(userTier, hasActiveSub);
      whereClause.visibility = { in: visibilities };
    }

    const articles = await prisma.article.findMany({
      where: whereClause,
      orderBy: [
        { publishedAt: "desc" },
        { id: "desc" }
      ],
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ data: articles });
  } catch (error) {
    console.error("List articles error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Corps de requête JSON invalide ou vide" },
        { status: 400 }
      );
    }

    const parsed = articleCreateSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message ?? "Données invalides" },
        { status: 400 }
      );
    }

    const { title, excerpt, content, category, visibility, imageUrl } = parsed.data;
    
    let slug;
    try {
      slug = await generateUniqueSlug(title);
    } catch (slugError: any) {
      return NextResponse.json({ error: slugError.message }, { status: 400 });
    }

    try {
      const article = await prisma.article.create({
        data: {
          title,
          excerpt,
          content,
          category,
          visibility,
          imageUrl,
          slug,
          published: false,
          authorId: session.user.id,
        },
      });

      await safeCreateAuditLog({
        actorId: session.user.id,
        action: "ARTICLE_CREATE",
        entityType: "ARTICLE",
        entityId: article.id,
        metadata: {
          title: article.title,
          visibility: article.visibility,
        },
      });

      return NextResponse.json(article, { status: 201 });
    } catch (dbError: any) {
      if (dbError.code === "P2002") {
        return NextResponse.json(
          { error: "Un article avec ce titre ou slug existe déjà." },
          { status: 409 }
        );
      }
      throw dbError;
    }
  } catch (error) {
    console.error("Create article error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
