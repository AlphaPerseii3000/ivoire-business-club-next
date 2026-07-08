import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { receiptUploadSchema } from "@/lib/validations";
import { createPublicDocumentUrl, createSubscriptionReceiptR2Key, getMissingR2Env, uploadObjectToS3 } from "@/lib/r2";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const missing = getMissingR2Env();
    if (missing.length > 0) {
      return NextResponse.json(
        { error: "Stockage des documents indisponible. Configuration R2/S3 manquante." },
        { status: 503 }
      );
    }

    const formData = await req.formData();
    const subscriptionId = formData.get("subscriptionId");
    const fileEntry = formData.get("file");

    if (typeof subscriptionId !== "string" || subscriptionId.length === 0) {
      return NextResponse.json({ error: "Identifiant d'abonnement requis", code: "SUBSCRIPTION_ID_REQUIRED" }, { status: 400 });
    }

    if (!fileEntry || typeof fileEntry === "string") {
      return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
    }

    const file = fileEntry as File;
    const fileName = typeof file.name === "string" ? file.name : "receipt";
    const fileType = typeof file.type === "string" ? file.type : "application/octet-stream";
    const fileSize = typeof file.size === "number" ? file.size : 0;

    const parsed = receiptUploadSchema.safeParse({
      fileName,
      mimeType: fileType,
      size: fileSize,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides" },
        { status: 400 }
      );
    }

    const subscription = await prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        userId: session.user.id,
        provider: "BANK_TRANSFER",
        status: { in: ["PENDING", "TRIAL"] },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "Abonnement introuvable ou non autorisé", code: "SUBSCRIPTION_NOT_FOUND" },
        { status: 404 }
      );
    }

    const r2Key = createSubscriptionReceiptR2Key(subscription.id, parsed.data.fileName, parsed.data.mimeType);
    const buffer = Buffer.from(await file.arrayBuffer());

    await uploadObjectToS3(r2Key, buffer, parsed.data.mimeType);

    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        paymentReceiptUrl: createPublicDocumentUrl(r2Key),
        paymentReceiptKey: r2Key,
      },
    });

    return NextResponse.json(
      {
        data: {
          subscriptionId: updated.id,
          paymentReceiptUrl: updated.paymentReceiptUrl,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Receipt upload error:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
