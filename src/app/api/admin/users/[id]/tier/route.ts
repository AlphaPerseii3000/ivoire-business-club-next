import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
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

  await prisma.user.update({ where: { id }, data: { tier: tier as "AFFRANCHI" | "GRAND_FRERE" | "BOSS" } });

  return NextResponse.json({ success: true });
}