import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAccessibleArticleVisibilities } from "@/lib/article-visibility";
import { hasActiveSubscription } from "@/lib/subscription-access";
import { sanitizeError } from "@/lib/sanitize-log";
import { ReactionType } from "@/generated/prisma/client";

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

    // Aggregate reaction counts
    const reactionCounts = await prisma.articleReaction.groupBy({
      by: ["type"],
      where: { articleId: article.id },
      _count: {
        _all: true,
      },
    });

    // Format counts
    const counts = {
      LIKE: 0,
      CLAP: 0,
      INSIGHTFUL: 0,
    };

    reactionCounts.forEach((group) => {
      if (group.type in counts) {
        counts[group.type as keyof typeof counts] = group._count._all;
      }
    });

    // Check user reaction
    let userReaction = null;
    if (session?.user?.id) {
      const reaction = await prisma.articleReaction.findUnique({
        where: {
          userId_articleId: {
            userId: session.user.id,
            articleId: article.id,
          },
        },
      });
      if (reaction) {
        userReaction = reaction.type;
      }
    }

    return NextResponse.json({
      reactions: counts,
      userReaction,
    });
  } catch (error) {
    console.error("Get article reactions error:", sanitizeError(error));
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

    const userId = session.user.id;
    let isAdmin = (session.user as any).role === "ADMIN";
    let hasActiveSub = false;
    let userTier = (session.user as any).tier;

    if (!isAdmin) {
      hasActiveSub = await hasActiveSubscription(userId);
    }

    const article = await prisma.article.findFirst({
      where: { OR: [{ id }, { slug: id }] },
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

    let body;
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const { type } = body;
    if (!type || !Object.values(ReactionType).includes(type)) {
      return NextResponse.json({ error: "Type de réaction requis ou invalide" }, { status: 400 });
    }

    // Look for existing reaction
    const existing = await prisma.articleReaction.findUnique({
      where: {
        userId_articleId: {
          userId,
          articleId: article.id,
        },
      },
    });

    try {
      if (existing) {
        if (existing.type === type) {
          // Toggle off: clicked the same reaction type
          await prisma.articleReaction.delete({
            where: { id: existing.id },
          });
          return NextResponse.json({ ok: true, action: "removed" });
        } else {
          // Update type: clicked a different reaction type
          const updated = await prisma.articleReaction.update({
            where: { id: existing.id },
            data: { type: type as ReactionType },
          });
          return NextResponse.json({ ok: true, action: "updated", type: updated.type });
        }
      } else {
        // Create new reaction
        const created = await prisma.articleReaction.create({
          data: {
            userId,
            articleId: article.id,
            type: type as ReactionType,
          },
        });
        return NextResponse.json({ ok: true, action: "added", type: created.type });
      }
    } catch (e: any) {
      if (e.code === "P2002" || e.code === "P2025") {
        return NextResponse.json({ error: "Conflict", message: "Concurrent modification" }, { status: 409 });
      }
      throw e;
    }
  } catch (error) {
    console.error("Post article reaction error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
