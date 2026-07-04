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

    const registrations = await prisma.eventRegistration.findMany({
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
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ registrations });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
