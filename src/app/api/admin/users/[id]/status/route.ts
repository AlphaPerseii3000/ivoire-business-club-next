import { NextResponse } from "next/server";

import { AUDIT_ACTIONS, safeCreateAuditLog } from "@/lib/audit-log";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type StatusAction = "suspend" | "reactivate";

type StatusRequestBody = {
  action?: unknown;
};

function isStatusAction(action: unknown): action is StatusAction {
  return action === "suspend" || action === "reactivate";
}

async function parseBody(req: Request): Promise<{ body?: StatusRequestBody; error?: NextResponse }> {
  try {
    const body = (await req.json()) as StatusRequestBody;
    return { body };
  } catch {
    return {
      error: NextResponse.json(
        { error: "Le corps de la requête JSON est invalide.", code: "INVALID_JSON" },
        { status: 400 }
      ),
    };
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const parsed = await parseBody(req);
  if (parsed.error) return parsed.error;

  const action = parsed.body?.action;
  if (!isStatusAction(action)) {
    return NextResponse.json(
      { error: "Action invalide. Utilisez suspend ou reactivate.", code: "INVALID_ACTION" },
      { status: 400 }
    );
  }

  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, status: true },
  });
  if (admin?.role !== "ADMIN") return NextResponse.json({ error: "Interdit" }, { status: 403 });
  if (admin?.status === "SUSPENDED") return NextResponse.json({ error: "Compte administrateur suspendu." }, { status: 403 });

  const { id } = await params;
  if (action === "suspend" && id === session.user.id) {
    return NextResponse.json(
      { error: "Vous ne pouvez pas suspendre votre propre compte administrateur.", code: "SELF_SUSPEND" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, status: true, role: true, email: true, name: true, tier: true },
  });
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  const nextStatus = action === "suspend" ? "SUSPENDED" : "ACTIVE";
  if (user.status === nextStatus) {
    return NextResponse.json(
      {
        error: action === "suspend" ? "Ce compte est déjà suspendu." : "Ce compte est déjà actif.",
        code: "INVALID_TRANSITION",
        data: { id: user.id, status: user.status, changed: false },
      },
      { status: 409 }
    );
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: { status: nextStatus },
    select: { id: true, status: true, tier: true },
  });

  await safeCreateAuditLog({
    actorId: session.user.id,
    action: nextStatus === "SUSPENDED" ? AUDIT_ACTIONS.USER_SUSPEND : AUDIT_ACTIONS.USER_REACTIVATE,
    entityType: "User",
    entityId: id,
    metadata: {
      previousStatus: user.status,
      nextStatus,
      targetUserId: user.id,
      tier: user.tier,
    },
  });

  return NextResponse.json({ data: { id: updatedUser.id, status: updatedUser.status, changed: true } });
}
