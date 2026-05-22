import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { AUDIT_ACTIONS, safeCreateAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (admin?.role !== "ADMIN") return NextResponse.json({ error: "Interdit" }, { status: 403 });

  const { id } = await params;
  const formData = await req.formData();
  const tier = formData.get("tier") as string;

  const validTiers = ["AFFRANCHI", "GRAND_FRERE", "BOSS"];
  if (!validTiers.includes(tier)) return NextResponse.json({ error: "Tier invalide" }, { status: 400 });

  const existingUser = await prisma.user.findUnique({ where: { id }, select: { id: true, tier: true } });
  if (!existingUser) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  await prisma.user.update({ where: { id }, data: { tier: tier as "AFFRANCHI" | "GRAND_FRERE" | "BOSS" } });

  if (existingUser.tier !== tier) {
    await safeCreateAuditLog({
      actorId: session.user.id,
      action: AUDIT_ACTIONS.USER_TIER_UPDATE,
      entityType: "User",
      entityId: id,
      metadata: { previousTier: existingUser.tier, nextTier: tier },
    });
  }

  return NextResponse.json({ success: true });
}
