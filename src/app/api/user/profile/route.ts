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
    const { name, bio, phone, country, location } = body as {
      name?: string;
      bio?: string;
      phone?: string;
      country?: string;
      location?: string;
    };

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(name && { name }),
        ...(bio !== undefined && { bio }),
        ...(phone !== undefined && { phone }),
        ...(country !== undefined && { country }),
        ...(location !== undefined && { location }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}