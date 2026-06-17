import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { articleUpdateSchema } from "@/lib/validations";
import { getAccessibleArticleVisibilities, generateUniqueSlug } from "@/lib/article-visibility";
import { hasActiveSubscription } from "@/lib/subscription-access";
import { sanitizeError } from "@/lib/sanitize-log";
import { safeCreateAuditLog } from "@/lib/audit-log";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const article = await prisma.article.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!article) {
      return NextResponse.json({ error: "Article non trouvé" }, { status: 404 });
    }

    if (!isAdmin) {
      if (!article.published) {
        return NextResponse.json({ error: "Article non trouvé" }, { status: 404 });
      }

      const visibilities = getAccessibleArticleVisibilities(userTier, hasActiveSub);
      if (!visibilities.includes(article.visibility)) {
        return NextResponse.json({ error: "Article non trouvé" }, { status: 404 });
      }
    }

    return NextResponse.json(article);
  } catch (error) {
    console.error("Get article error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Corps de requête JSON invalide ou vide" }, { status: 400 });
    }

    const parsed = articleUpdateSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message ?? "Données invalides" },
        { status: 400 }
      );
    }

    const article = await prisma.article.findFirst({
      where: { OR: [{ id }, { slug: id }] },
    });

    if (!article) {
      return NextResponse.json({ error: "Article non trouvé" }, { status: 404 });
    }

    const data: any = { ...parsed.data };

    if (data.opportunityId) {
      const opp = await prisma.opportunity.findFirst({
        where: { id: data.opportunityId, verificationStatus: "VERIFIED" },
      });
      if (!opp) {
        return NextResponse.json(
          { error: "L'opportunité associée est introuvable ou non validée." },
          { status: 400 }
        );
      }
    }

    if (parsed.data.title && parsed.data.title !== article.title) {
      try {
        data.slug = await generateUniqueSlug(parsed.data.title, article.id);
      } catch (slugError: any) {
        return NextResponse.json({ error: slugError.message }, { status: 400 });
      }
    }

    if (data.published === true && !article.published) {
      data.publishedAt = new Date();
    } else if (data.published === false) {
      data.publishedAt = null;
    }

    try {
      const updatedArticle = await prisma.article.update({
        where: { id: article.id },
        data,
      });

      await safeCreateAuditLog({
        actorId: session.user.id,
        action: "ARTICLE_UPDATE",
        entityType: "ARTICLE",
        entityId: updatedArticle.id,
        metadata: {
          title: updatedArticle.title,
          visibility: updatedArticle.visibility,
        },
      });

      if (article.published !== updatedArticle.published) {
        await safeCreateAuditLog({
          actorId: session.user.id,
          action: updatedArticle.published ? "ARTICLE_PUBLISH" : "ARTICLE_UNPUBLISH",
          entityType: "ARTICLE",
          entityId: updatedArticle.id,
          metadata: {
            title: updatedArticle.title,
          },
        });
      }

      return NextResponse.json(updatedArticle);
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
    console.error("Update article error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const article = await prisma.article.findFirst({
      where: { OR: [{ id }, { slug: id }] },
    });

    if (!article) {
      return NextResponse.json({ error: "Article non trouvé" }, { status: 404 });
    }

    await prisma.article.delete({
      where: { id: article.id },
    });

    await safeCreateAuditLog({
      actorId: session.user.id,
      action: "ARTICLE_DELETE",
      entityType: "ARTICLE",
      entityId: article.id,
      metadata: {
        title: article.title,
      },
    });

    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    console.error("Delete article error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
