import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { eventUpdateSchema } from "@/lib/validations";
import { generateUniqueSlug } from "@/lib/event-utils";
import { sanitizeError } from "@/lib/sanitize-log";
import { safeCreateAuditLog } from "@/lib/audit-log";

function isEventCancelled(event: { status: string }) {
  return event.status === "CANCELLED";
}

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

    if (isEventCancelled(event)) {
      return NextResponse.json(
        { error: "Transition de statut invalide : un événement annulé ne peut pas être modifié." },
        { status: 400 }
      );
    }

    const data: any = { ...parsed.data };

    // Convertir les champs optionnels vides en null AVANT la validation conditionnelle
    if (data.location === "") {
      data.location = null;
    }
    if (data.onlineUrl === "") {
      data.onlineUrl = null;
    }
    if (data.coverImagePath === "") {
      data.coverImagePath = null;
    }
    if (data.pricing === "") {
      data.pricing = null;
    }
    if (data.maxCapacity === "") {
      data.maxCapacity = null;
    }

    // Normaliser le champ JSON tarifaire pour Prisma
    if (data.pricing !== undefined) {
      data.pricing = data.pricing === null ? Prisma.JsonNull : (data.pricing as Prisma.InputJsonValue);
    }

    // Enforce the documented DRAFT → PUBLISHED → CANCELLED lifecycle. Once
    // CANCELLED, an event can no longer change status through this endpoint.
    if (data.status) {
      if (event.status === "CANCELLED") {
        return NextResponse.json(
          { error: "Transition de statut invalide : un événement annulé ne peut pas être modifié." },
          { status: 400 }
        );
      }
      const allowedTransitions: Record<"DRAFT" | "PUBLISHED" | "CANCELLED", Array<"DRAFT" | "PUBLISHED" | "CANCELLED">> = {
        DRAFT: ["DRAFT", "PUBLISHED"],
        PUBLISHED: ["PUBLISHED", "CANCELLED"],
        CANCELLED: [],
      };
      const allowed = allowedTransitions[event.status as keyof typeof allowedTransitions] ?? [];
      if (!allowed.includes(data.status)) {
        return NextResponse.json(
          { error: `Transition de statut invalide : ${event.status} → ${data.status} n'est pas autorisée.` },
          { status: 400 }
        );
      }
    }

    if (data.endDate === "") {
      data.endDate = null;
    }

    // Nettoyer les champs non présents dans le schéma Prisma
    const prismaData: any = { ...data };

    // Compute effective dates to enforce the invariant even on partial updates
    const effectiveStart = data.startDate
      ? new Date(data.startDate)
      : event.startDate;
    const effectiveEnd =
      data.endDate !== undefined ? (data.endDate ? new Date(data.endDate) : null) : event.endDate;

    if (effectiveEnd && effectiveStart > effectiveEnd) {
      return NextResponse.json(
        { error: "La date de fin doit être postérieure ou égale à la date de début" },
        { status: 400 }
      );
    }

    if (data.startDate) {
      prismaData.startDate = effectiveStart;
    }
    if (data.endDate !== undefined) {
      prismaData.endDate = effectiveEnd;
    }

    if (parsed.data.title && parsed.data.title !== event.title) {
      try {
        prismaData.slug = await generateUniqueSlug(parsed.data.title, event.id);
      } catch (slugError: any) {
        return NextResponse.json({ error: slugError.message }, { status: 400 });
      }
    }

    try {
      const updatedEvent = await prisma.event.update({
        where: { id: event.id },
        data: prismaData,
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
