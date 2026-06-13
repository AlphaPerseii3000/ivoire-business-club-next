import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { articleUpdateSchema } from "@/lib/validations";
import { getAccessibleArticleVisibilities } from "@/lib/article-visibility";
import { hasActiveSubscription } from "@/lib/subscription-access";
import { slugify } from "@/lib/utils";

async function generateUniqueSlug(title: string, excludeId?: string): Promise<string> {
  const baseSlug = slugify(title);
  let slug = baseSlug;
  let count = 0;

  while (true) {
    const existing = await prisma.article.findFirst({
      where: {
        slug,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (!existing) {
      break;
    }
    count++;
    slug = `${baseSlug}-${count}`;
  }
  return slug;
}

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
      isAdmin = session.user.role === "ADMIN";
      if (!isAdmin) {
        hasActiveSub = await hasActiveSubscription(session.user.id);
        userTier = (session.user as any).tier;
      }
    }

    let article = await prisma.article.findUnique({
      where: { id },
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
      article = await prisma.article.findUnique({
        where: { slug: id },
        include: {
          author: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    }

    if (!article) {
      return NextResponse.json({ error: "Article non trouvé" }, { status: 404 });
    }

    if (!isAdmin) {
      if (!article.published) {
        return NextResponse.json({ error: "Article non trouvé" }, { status: 404 });
      }

      const visibilities = getAccessibleArticleVisibilities(userTier, hasActiveSub);
      if (!visibilities.includes(article.visibility)) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 404 });
      }
    }

    return NextResponse.json(article);
  } catch (error) {
    console.error("Get article error:", error);
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
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = articleUpdateSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message ?? "Données invalides" },
        { status: 400 }
      );
    }

    let article = await prisma.article.findUnique({
      where: { id },
    });

    if (!article) {
      article = await prisma.article.findUnique({
        where: { slug: id },
      });
    }

    if (!article) {
      return NextResponse.json({ error: "Article non trouvé" }, { status: 404 });
    }

    const data: any = { ...parsed.data };

    if (parsed.data.title && parsed.data.title !== article.title) {
      data.slug = await generateUniqueSlug(parsed.data.title, article.id);
    }

    if (data.published === true && !article.published) {
      data.publishedAt = new Date();
    } else if (data.published === false) {
      data.publishedAt = null;
    }

    const updatedArticle = await prisma.article.update({
      where: { id: article.id },
      data,
    });

    return NextResponse.json(updatedArticle);
  } catch (error) {
    console.error("Update article error:", error);
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
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    let article = await prisma.article.findUnique({
      where: { id },
    });

    if (!article) {
      article = await prisma.article.findUnique({
        where: { slug: id },
      });
    }

    if (!article) {
      return NextResponse.json({ error: "Article non trouvé" }, { status: 404 });
    }

    await prisma.article.delete({
      where: { id: article.id },
    });

    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    console.error("Delete article error:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
