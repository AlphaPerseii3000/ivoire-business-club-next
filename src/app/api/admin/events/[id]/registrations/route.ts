import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RegistrationStatus } from "@/generated/prisma/client";

const VALID_STATUSES = ["REGISTERED", "ATTENDED", "CANCELLED", "NO_SHOW"];

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);

    const statusParam = searchParams.get("status");
    const qParam = searchParams.get("q");

    const validStatus =
      statusParam && VALID_STATUSES.includes(statusParam)
        ? (statusParam as RegistrationStatus)
        : undefined;

    const registrationsData = await prisma.eventRegistration.findMany({
      where: {
        eventId: id,
        ...(validStatus ? { status: validStatus } : {}),
        ...(qParam
          ? {
              OR: [
                { email: { contains: qParam, mode: "insensitive" } },
                { user: { name: { contains: qParam, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const registrations = registrationsData.map((reg) => {
      const mapped = { ...reg } as any;
      if (reg.user !== undefined) {
        mapped.user = reg.user
          ? {
              id: reg.user.id,
              name: reg.user.name,
              email: reg.user.email,
              avatarUrl: reg.user.image,
            }
          : null;
      }
      return mapped;
    });

    return NextResponse.json({ registrations });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
