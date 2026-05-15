import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { opportunityCreateSchema } from "@/lib/validations";

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