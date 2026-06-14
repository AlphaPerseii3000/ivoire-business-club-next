import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { buildOpportunityVisibilityWhere } from "@/lib/opportunity-visibility";
import { prisma } from "@/lib/prisma";
import { dedupeTags, isTagCategory, isValidTagOption } from "@/lib/tags";
import { opportunityCreateSchema } from "@/lib/validations";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const isPublicMode = url.searchParams.get("public") === "true";

    if (isPublicMode) {
      const publicOpportunities = await prisma.opportunity.findMany({
        where: { verificationStatus: "VERIFIED" },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          title: true,
          author: { select: { location: true } },
        },
      });

      const data = publicOpportunities.map((opportunity) => ({
        id: opportunity.id,
        title: opportunity.title,
        location: opportunity.author.location,
      }));

      return NextResponse.json({ data });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userId = session.user.id;
    const tagCategory = url.searchParams.get("tagCategory");
    const tagValue = url.searchParams.get("tagValue");
    const tagFilter = tagCategory && tagValue && isTagCategory(tagCategory) && isValidTagOption({ category: tagCategory, value: tagValue })
      ? { tags: { some: { category: tagCategory, value: tagValue } } }
      : null;

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, tier: true },
    });

    const memberVisibilityWhere = buildOpportunityVisibilityWhere(currentUser?.tier);
    const memberAndFilters = tagFilter ? [tagFilter, { OR: [memberVisibilityWhere, { authorId: userId }] }] : [{ OR: [memberVisibilityWhere, { authorId: userId }] }];

    const opportunities = await prisma.opportunity.findMany({
      where:
        currentUser?.role === "ADMIN"
          ? (tagFilter ?? {})
          : { AND: memberAndFilters },
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            location: true,
            phone: true,
            opportunities: { where: { verificationStatus: "VERIFIED" }, select: { id: true } },
          },
        },
        tags: { orderBy: [{ category: "asc" }, { value: "asc" }], select: { category: true, value: true } },
        _count: { select: { documents: true, verificationApprovals: true } },
      },
    });

    const data = opportunities.map((opportunity) => ({
      id: opportunity.id,
      title: opportunity.title,
      description: opportunity.description,
      category: opportunity.category,
      amount: opportunity.amount,
      requiredTier: opportunity.requiredTier,
      verificationStatus: opportunity.verificationStatus,
      createdAt: opportunity.createdAt,
      tags: opportunity.tags,
      author: {
        id: opportunity.author.id,
        name: opportunity.author.name,
        location: opportunity.author.location,
        phone: opportunity.author.phone,
      },
      documentCount: opportunity._count.documents,
      requiresDoubleVerification: opportunity.requiresDoubleVerification,
      approvalCount: opportunity._count.verificationApprovals,
      authorStats: { validatedDealsCount: opportunity.author.opportunities?.length ?? 0, averageRating: null },
      rejectionNote: opportunity.authorId === userId || currentUser?.role === "ADMIN" ? opportunity.rejectionNote : undefined,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error("List opportunities error:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();
    const parsed = opportunityCreateSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message ?? "Données invalides" },
        { status: 400 },
      );
    }

    const { title, description, category, amount, requiredTier } = parsed.data;
    const tags = dedupeTags(parsed.data.tags);
    const numericAmount = typeof amount === "number" ? amount : null;
    const requiresDoubleVerification = numericAmount !== null && numericAmount > 50000;

    const opportunity = await prisma.$transaction(async (tx) => tx.opportunity.create({
      data: {
        authorId: userId,
        title,
        description,
        category,
        amount: numericAmount,
        requiredTier: requiredTier ?? "AFFRANCHI",
        requiresDoubleVerification,
        tags: {
          create: tags.map((tag) => ({ category: tag.category, value: tag.value })),
        },
      },
      include: { tags: { select: { category: true, value: true } } },
    }));

    return NextResponse.json(opportunity, { status: 201 });
  } catch (error) {
    console.error("Create opportunity error:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
