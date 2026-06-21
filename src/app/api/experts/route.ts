import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { expertCreateSchema } from "@/lib/validations";
import { generateUniqueSlug } from "@/lib/expert-utils";
import { sanitizeError } from "@/lib/sanitize-log";
import { safeCreateAuditLog } from "@/lib/audit-log";

export async function GET() {
  try {
    const experts = await prisma.expert.findMany({
      where: {
        isPublished: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ data: experts });
  } catch (error) {
    console.error("List experts error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Corps de requête JSON invalide ou vide" },
        { status: 400 }
      );
    }

    const parsed = expertCreateSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message ?? "Données invalides" },
        { status: 400 }
      );
    }

    const { name, title, bio, photoUrl, phone, email, whatsapp, specialties, requiredTier, isPublished } = parsed.data;

    let slug;
    try {
      slug = await generateUniqueSlug(name);
    } catch (slugError: any) {
      return NextResponse.json({ error: slugError.message }, { status: 400 });
    }

    try {
      const expert = await prisma.expert.create({
        data: {
          name,
          slug,
          title,
          bio,
          photoUrl: photoUrl || null,
          phone: phone || null,
          email: email || null,
          whatsapp: whatsapp || null,
          specialties: specialties || null,
          requiredTier,
          isPublished: isPublished ?? false,
        },
      });

      await safeCreateAuditLog({
        actorId: session.user.id,
        action: "EXPERT_CREATE",
        entityType: "EXPERT",
        entityId: expert.id,
        metadata: {
          name: expert.name,
          isPublished: expert.isPublished,
        },
      });

      return NextResponse.json(expert, { status: 201 });
    } catch (dbError: any) {
      if (dbError.code === "P2002") {
        return NextResponse.json(
          { error: "Un expert avec ce nom ou slug existe déjà." },
          { status: 409 }
        );
      }
      throw dbError;
    }
  } catch (error) {
    console.error("Create expert error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
