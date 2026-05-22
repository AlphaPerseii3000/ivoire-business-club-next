import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { queryAuditLogs } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { sanitizeError } from "@/lib/sanitize-log";

const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(20),
  action: z.string().trim().min(1).max(80).optional(),
  entityType: z.string().trim().min(1).max(80).optional(),
  actorId: z.string().trim().min(1).max(120).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  q: z.string().trim().min(1).max(120).optional(),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Non autorisé" }, { status: 401 }) };
  }

  const admin = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  if (admin?.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Interdit" }, { status: 403 }) };
  }

  return { sessionUserId: session.user.id };
}

function serializeLog(log: Awaited<ReturnType<typeof queryAuditLogs>>["logs"][number]) {
  return {
    id: log.id,
    actorId: log.actorId,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    metadata: log.metadata,
    createdAt: log.createdAt.toISOString(),
    actor: log.actor ? { id: log.actor.id, name: log.actor.name, email: log.actor.email } : null,
  };
}

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const url = new URL(req.url);
    const parsed = auditQuerySchema.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) {
      return NextResponse.json({ error: "Filtres invalides", details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const from = parsed.data.from ? new Date(parsed.data.from) : undefined;
    const to = parsed.data.to ? new Date(parsed.data.to) : undefined;
    const hasInvalidRange = Boolean(from && to && from > to);
    if (hasInvalidRange) {
      return NextResponse.json({ error: "La date de début doit être antérieure à la date de fin" }, { status: 400 });
    }

    const result = await queryAuditLogs({
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
      action: parsed.data.action,
      entityType: parsed.data.entityType,
      actorId: parsed.data.actorId,
      from,
      to,
      q: parsed.data.q,
    });

    return NextResponse.json({
      data: {
        logs: result.logs.map(serializeLog),
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    console.error("[admin-audit-list]", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
