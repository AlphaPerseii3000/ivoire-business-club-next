import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dedupeTags } from "@/lib/tags";
import { profileUpdateSchema } from "@/lib/validations";
import { sanitizeError } from "@/lib/sanitize-log";

const profileSelect = {
  id: true,
  name: true,
  email: true,
  bio: true,
  image: true,
  phone: true,
  location: true,
  country: true,
  tier: true,
  role: true,
  verificationStatus: true,
  createdAt: true,
  updatedAt: true,
  tags: {
    orderBy: [{ category: "asc" as const }, { value: "asc" as const }],
    select: { category: true, value: true },
  },
};

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: profileSelect,
    });

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    return NextResponse.json({ data: user });
  } catch (error) {
    console.error("Profile GET error:", sanitizeError(error));
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
    const parsed = profileUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const tags = dedupeTags(data.tags);

    const sanitizedData = {
      name: data.name,
      bio: data.bio === "" ? null : data.bio,
      phone: data.phone === "" ? null : data.phone,
      location: data.location === "" ? null : data.location,
      country: data.country === "" ? null : data.country,
    };

    const updatedUser = await prisma.$transaction(async (tx) => {
      await tx.userTag.deleteMany({ where: { userId } });

      if (tags.length > 0) {
        await tx.userTag.createMany({
          data: tags.map((tag) => ({
            userId,
            category: tag.category,
            value: tag.value,
          })),
        });
      }

      return tx.user.update({
        where: { id: userId },
        data: sanitizedData,
        select: profileSelect,
      });
    });

    return NextResponse.json({ data: updatedUser });
  } catch (error) {
    console.error("Profile update error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
