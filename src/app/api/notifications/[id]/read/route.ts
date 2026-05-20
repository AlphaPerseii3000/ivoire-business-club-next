import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeError } from "@/lib/sanitize-log";

type RouteContext = { params: Promise<{ id: string }> };

async function markNotificationRead({ params }: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const notification = await prisma.notification.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true, readAt: true },
    });

    if (!notification) {
      return NextResponse.json({ error: "Notification introuvable" }, { status: 404 });
    }

    if (notification.readAt) {
      return NextResponse.json({ data: notification });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
      select: { id: true, readAt: true },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[notification-read]", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

export async function POST(_req: Request, context: RouteContext) {
  return markNotificationRead(context);
}

export async function PATCH(_req: Request, context: RouteContext) {
  return markNotificationRead(context);
}
