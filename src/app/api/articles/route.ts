import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { articleCreateSchema } from "@/lib/validations";
import { getAccessibleArticleVisibilities } from "@/lib/article-visibility";
import { hasActiveSubscription } from "@/lib/subscription-access";
import { slugify } from "@/lib/utils";

async function generateUniqueSlug(title: string): Promise<string> {
  const baseSlug = slugify(title);
  let slug = baseSlug;
  let count = 0;

  while (true) {
    const existing = await prisma.article.findUnique({
      where: { slug },
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

export async function GET(req: Request) {
  try {
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

    let whereClause: any = {};

    if (!isAdmin) {
      whereClause.published = true;
      const visibilities = getAccessibleArticleVisibilities(userTier, hasActiveSub);
      whereClause.visibility = { in: visibilities };
    }

    const articles = await prisma.article.findMany({
      where: whereClause,
      orderBy: { publishedAt: "desc" },
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
    console.error("List articles error:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = articleCreateSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message ?? "Données invalides" },
        { status: 400 }
      );
    }

    const { title, excerpt, content, category, visibility } = parsed.data;
    const slug = await generateUniqueSlug(title);

    const article = await prisma.article.create({
      data: {
        title,
        excerpt,
        content,
        category,
        visibility,
        slug,
        published: false,
        authorId: session.user.id,
      },
    });

    return NextResponse.json(article, { status: 201 });
  } catch (error) {
    console.error("Create article error:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
