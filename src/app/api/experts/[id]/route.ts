import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { expertUpdateSchema } from "@/lib/validations";
import { generateUniqueSlug } from "@/lib/expert-utils";
import { sanitizeError } from "@/lib/sanitize-log";
import { safeCreateAuditLog } from "@/lib/audit-log";
import { promoteConfiguredAdminUser } from "@/lib/admin-access";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    let isAdmin = false;
    if (session?.user?.id) {
      const adminUser = await promoteConfiguredAdminUser(session.user.id);
      isAdmin = adminUser?.role === "ADMIN";
    }

    const expert = await prisma.expert.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
    });

    if (!expert) {
      return NextResponse.json({ error: "Expert non trouvé" }, { status: 404 });
    }

    if (!expert.isPublished && !isAdmin) {
      return NextResponse.json({ error: "Expert non trouvé" }, { status: 404 });
    }

    return NextResponse.json(expert);
  } catch (error) {
    console.error("Get expert error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }
    const adminUser = await promoteConfiguredAdminUser(session.user.id);
    if (!adminUser || adminUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Corps de requête JSON invalide ou vide" }, { status: 400 });
    }

    const parsed = expertUpdateSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message ?? "Données invalides" },
        { status: 400 }
      );
    }

    const expert = await prisma.expert.findFirst({
      where: { OR: [{ id }, { slug: id }] },
    });

    if (!expert) {
      return NextResponse.json({ error: "Expert non trouvé" }, { status: 404 });
    }

    const data: any = { ...parsed.data };

    if (data.name && data.name !== expert.name) {
      try {
        data.slug = await generateUniqueSlug(data.name, expert.id);
      } catch (slugError: any) {
        return NextResponse.json({ error: slugError.message }, { status: 400 });
      }
    }



    try {
      const updatedExpert = await prisma.expert.update({
        where: { id: expert.id },
        data,
      });

      await safeCreateAuditLog({
        actorId: session.user.id,
        action: "EXPERT_UPDATE",
        entityType: "EXPERT",
        entityId: updatedExpert.id,
        metadata: {
          name: updatedExpert.name,
          isPublished: updatedExpert.isPublished,
        },
      });

      if (expert.isPublished !== updatedExpert.isPublished) {
        await safeCreateAuditLog({
          actorId: session.user.id,
          action: updatedExpert.isPublished ? "EXPERT_PUBLISH" : "EXPERT_UNPUBLISH",
          entityType: "EXPERT",
          entityId: updatedExpert.id,
          metadata: {
            name: updatedExpert.name,
            previousStatus: expert.isPublished,
            newStatus: updatedExpert.isPublished,
          },
        });
      }

      return NextResponse.json(updatedExpert);
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
    console.error("Update expert error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }
    const adminUser = await promoteConfiguredAdminUser(session.user.id);
    if (!adminUser || adminUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const expert = await prisma.expert.findFirst({
      where: { OR: [{ id }, { slug: id }] },
    });

    if (!expert) {
      return NextResponse.json({ error: "Expert non trouvé" }, { status: 404 });
    }

    await prisma.expert.delete({
      where: { id: expert.id },
    });

    await safeCreateAuditLog({
      actorId: session.user.id,
      action: "EXPERT_DELETE",
      entityType: "EXPERT",
      entityId: expert.id,
      metadata: {
        name: expert.name,
      },
    });

    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    console.error("Delete expert error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
