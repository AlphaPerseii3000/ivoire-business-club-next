import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { eventUpdateSchema } from "@/lib/validations";
import { generateUniqueSlug } from "@/lib/event-utils";
import { sanitizeError } from "@/lib/sanitize-log";
import { safeCreateAuditLog } from "@/lib/audit-log";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const event = await prisma.event.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Événement non trouvé" }, { status: 404 });
    }

    if (!["PUBLISHED", "CANCELLED"].includes(event.status)) {
      return NextResponse.json({ error: "Événement non trouvé" }, { status: 404 });
    }

    return NextResponse.json(event);
  } catch (error) {
    console.error("Get event error:", sanitizeError(error));
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
    if (!session?.user?.id || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Corps de requête JSON invalide ou vide" }, { status: 400 });
    }

    const parsed = eventUpdateSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message ?? "Données invalides" },
        { status: 400 }
      );
    }

    const event = await prisma.event.findFirst({
      where: { OR: [{ id }, { slug: id }] },
    });

    if (!event) {
      return NextResponse.json({ error: "Événement non trouvé" }, { status: 404 });
    }

    const data: any = { ...parsed.data };

    if (data.startDate) {
      data.startDate = new Date(data.startDate);
    }
    if (data.endDate) {
      data.endDate = new Date(data.endDate);
    }

    if (parsed.data.title && parsed.data.title !== event.title) {
      try {
        data.slug = await generateUniqueSlug(parsed.data.title, event.id);
      } catch (slugError: any) {
        return NextResponse.json({ error: slugError.message }, { status: 400 });
      }
    }

    try {
      const updatedEvent = await prisma.event.update({
        where: { id: event.id },
        data,
      });

      await safeCreateAuditLog({
        actorId: session.user.id,
        action: "EVENT_UPDATE",
        entityType: "EVENT",
        entityId: updatedEvent.id,
        metadata: {
          title: updatedEvent.title,
          status: updatedEvent.status,
        },
      });

      if (event.status !== updatedEvent.status) {
        await safeCreateAuditLog({
          actorId: session.user.id,
          action: updatedEvent.status === "PUBLISHED" ? "EVENT_PUBLISH" : updatedEvent.status === "CANCELLED" ? "EVENT_CANCEL" : "EVENT_UPDATE",
          entityType: "EVENT",
          entityId: updatedEvent.id,
          metadata: {
            title: updatedEvent.title,
            previousStatus: event.status,
            newStatus: updatedEvent.status,
          },
        });
      }

      return NextResponse.json(updatedEvent);
    } catch (dbError: any) {
      if (dbError.code === "P2002") {
        return NextResponse.json(
          { error: "Un événement avec ce titre ou slug existe déjà." },
          { status: 409 }
        );
      }
      throw dbError;
    }
  } catch (error) {
    console.error("Update event error:", sanitizeError(error));
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
    if (!session?.user?.id || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const event = await prisma.event.findFirst({
      where: { OR: [{ id }, { slug: id }] },
    });

    if (!event) {
      return NextResponse.json({ error: "Événement non trouvé" }, { status: 404 });
    }

    await prisma.event.delete({
      where: { id: event.id },
    });

    await safeCreateAuditLog({
      actorId: session.user.id,
      action: "EVENT_DELETE",
      entityType: "EVENT",
      entityId: event.id,
      metadata: {
        title: event.title,
      },
    });

    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    console.error("Delete event error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
