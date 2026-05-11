import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, category, amount } = body as {
      title?: string;
      description?: string;
      category?: string;
      amount?: number | null;
    };

    if (!title || !description || !category) {
      return NextResponse.json({ error: "Titre, description et catégorie requis" }, { status: 400 });
    }

    const validCategories = ["INVESTISSEMENT", "BUSINESS", "PARTENARIAT", "IMMOBILIER"];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: "Catégorie invalide" }, { status: 400 });
    }

    const opportunity = await prisma.opportunity.create({
      data: {
        authorId: session.user.id,
        title,
        description,
        category: category as "INVESTISSEMENT" | "BUSINESS" | "PARTENARIAT" | "IMMOBILIER",
        amount: amount ?? null,
      },
    });

    return NextResponse.json(opportunity, { status: 201 });
  } catch (error) {
    console.error("Create opportunity error:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}