import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { AUDIT_ACTIONS, safeCreateAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { isEligibleForVerification } from "@/lib/verification";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  // Refuse suspended admins
  if (admin.status === "SUSPENDED") {
    return NextResponse.json({ error: "Compte administrateur suspendu" }, { status: 403 });
  }

  const { id } = await params;
  let formData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Formulaire invalide" }, { status: 400 });
  }
  const action = formData.get("action") as string;

  // Validate action explicitly
  if (action !== "verify" && action !== "reject") {
    return NextResponse.json({ error: "Action invalide" }, { status: 400 });
  }

  const status = action === "verify" ? "VERIFIED" : "REJECTED";

  // Fetch the target user with all prerequisites fields
  const existingUser = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      emailVerified: true,
      bio: true,
      location: true,
      country: true,
      status: true,
      verificationStatus: true,
    },
  });

  if (!existingUser) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  // For verify, enforce prerequisites check
  if (action === "verify") {
    const { eligible, missingPrerequisites } = isEligibleForVerification(existingUser);
    if (!eligible) {
      return NextResponse.json(
        {
          error: "Le membre ne remplit pas tous les pré-requis automatiques.",
          code: "PREREQUISITES_MISSING",
          missingPrerequisites,
        },
        { status: 400 }
      );
    }
  }

  await prisma.user.update({
    where: { id },
    data: { verificationStatus: status },
  });

  if (existingUser.verificationStatus !== status) {
    await safeCreateAuditLog({
      actorId: session.user.id,
      action: AUDIT_ACTIONS.USER_VERIFY,
      entityType: "User",
      entityId: id,
      metadata: { previousStatus: existingUser.verificationStatus, nextStatus: status },
    });
  }

  return NextResponse.json({ success: true });
}
