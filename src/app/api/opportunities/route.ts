import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { opportunityCreateSchema } from "@/lib/validations";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userId = session.user.id;
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    const opportunities = await prisma.opportunity.findMany({
      where:
        currentUser?.role === "ADMIN"
          ? undefined
          : {
              OR: [{ verificationStatus: "VERIFIED" }, { authorId: userId }],
            },
      orderBy: { createdAt: "desc" },
      include: { author: { select: { id: true, name: true } }, _count: { select: { documents: true } } },
    });

    const data = opportunities.map((opportunity) => ({
      id: opportunity.id,
      title: opportunity.title,
      description: opportunity.description,
      category: opportunity.category,
      amount: opportunity.amount,
      verificationStatus: opportunity.verificationStatus,
      createdAt: opportunity.createdAt,
      author: opportunity.author,
      documentCount: opportunity._count.documents,
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

    const body = await req.json();
    const parsed = opportunityCreateSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message ?? "Données invalides" },
        { status: 400 },
      );
    }

    const { title, description, category, amount } = parsed.data;
    const numericAmount = typeof amount === "number" ? amount : null;
    const requiresDoubleVerification = numericAmount !== null && numericAmount > 50000;

    const opportunity = await prisma.opportunity.create({
      data: {
        authorId: session.user.id,
        title,
        description,
        category,
        amount: numericAmount,
        requiresDoubleVerification,
      },
    });

    return NextResponse.json(opportunity, { status: 201 });
  } catch (error) {
    console.error("Create opportunity error:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}