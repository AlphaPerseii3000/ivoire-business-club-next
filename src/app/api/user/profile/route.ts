import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dedupeTags } from "@/lib/tags";
import { profileUpdateSchema } from "@/lib/validations";
import { sanitizeError } from "@/lib/sanitize-log";
import { autoTransitionVerificationStatus } from "@/lib/verification.server";

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
    const shouldUpdateTags = Object.prototype.hasOwnProperty.call(body, "tags");
    const tags = shouldUpdateTags ? dedupeTags(data.tags) : null;

    const sanitizedData = {
      name: data.name,
      bio: data.bio === "" ? null : data.bio,
      phone: data.phone === "" ? null : data.phone,
      location: data.location === "" ? null : data.location,
      country: data.country === "" ? null : data.country,
    };

    const updatedUser = await prisma.$transaction(async (tx) => {
      if (shouldUpdateTags) {
        const updatedTags = tags ?? [];
        await tx.userTag.deleteMany({ where: { userId } });

        if (updatedTags.length > 0) {
          await tx.userTag.createMany({
            data: updatedTags.map((tag) => ({
              userId,
              category: tag.category,
              value: tag.value,
            })),
          });
        }
      }

      const user = await tx.user.update({
        where: { id: userId },
        data: sanitizedData,
        select: profileSelect,
      });

      const transition = await autoTransitionVerificationStatus(userId, tx);
      if (transition.changed) {
        user.verificationStatus = transition.status;
      }

      return user;
    });

    return NextResponse.json({ data: updatedUser });
  } catch (error) {
    console.error("Profile update error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
