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
  const action = formData.get("action") as string;

  const status = action === "approve" ? "VERIFIED" : "REJECTED";

  await prisma.opportunity.update({
    where: { id },
    data: {
      verificationStatus: status,
      verifiedAt: status === "VERIFIED" ? new Date() : null,
      verifiedById: status === "VERIFIED" ? session.user.id : null,
    },
  });

  return NextResponse.json({ success: true });
}