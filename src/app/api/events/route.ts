import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { eventCreateSchema } from "@/lib/validations";
import { generateUniqueSlug } from "@/lib/event-utils";
import { sanitizeError } from "@/lib/sanitize-log";
import { safeCreateAuditLog } from "@/lib/audit-log";

export async function GET() {
  try {
    const events = await prisma.event.findMany({
      where: {
        status: { in: ["PUBLISHED", "CANCELLED"] },
      },
      orderBy: { startDate: "desc" },
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ data: events });
  } catch (error) {
    console.error("List events error:", sanitizeError(error));
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

    const parsed = eventCreateSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message ?? "Données invalides" },
        { status: 400 }
      );
    }

    const {
      title,
      description,
      startDate,
      endDate,
      location,
      coverImagePath,
      eventType,
      visibility,
      onlineUrl,
      maxCapacity,
      pricing,
    } = parsed.data;

    let slug;
    try {
      slug = await generateUniqueSlug(title);
    } catch (slugError: any) {
      return NextResponse.json({ error: slugError.message }, { status: 400 });
    }

    try {
      const event = await prisma.event.create({
        data: {
          title,
          slug,
          description,
          startDate: new Date(startDate),
          endDate: endDate ? new Date(endDate) : null,
          eventType,
          visibility,
          location,
          onlineUrl,
          coverImagePath,
          maxCapacity,
          pricing: pricing !== undefined ? (pricing === null ? Prisma.JsonNull : (pricing as Prisma.InputJsonValue)) : undefined,
          status: "DRAFT",
          authorId: session.user.id,
        },
      });

      await safeCreateAuditLog({
        actorId: session.user.id,
        action: "EVENT_CREATE",
        entityType: "EVENT",
        entityId: event.id,
        metadata: {
          title: event.title,
          status: event.status,
        },
      });

      return NextResponse.json(event, { status: 201 });
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
    console.error("Create event error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
