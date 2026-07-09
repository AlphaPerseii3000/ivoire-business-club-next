import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { receiptUploadSchema } from "@/lib/validations";
import { receiptUploadRateLimiter, getClientIp } from "@/lib/rate-limit";
import { scanFile, validateMimeWithMagicBytes } from "@/lib/file-scan";
import { safeCreateAuditLog } from "@/lib/audit-log";
import { sanitizeError } from "@/lib/sanitize-log";
import {
  createPublicDocumentUrl,
  createSubscriptionReceiptR2Key,
  getMissingR2Env,
  uploadObjectToS3,
} from "@/lib/r2";

export const runtime = "nodejs";

const GENERIC_UPLOAD_ERROR = "Le fichier n'a pas pu être accepté. Veuillez vérifier le document et réessayer.";

function makeRateLimitResponse(retryAfter: number) {
  return NextResponse.json(
    { error: "Trop de fichiers téléversés. Veuillez patienter.", code: "RATE_LIMITED" },
    { status: 429, headers: { "Retry-After": String(Math.max(1, retryAfter)) } }
  );
}

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

    // AC-5: MIME validation via Zod (receiptUploadSchema)
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

    // Story 26.7: rate limit by IP (3/min/IP) before any file processing
    const ipIdentifier = `ip:${getClientIp(req)}`;
    const publicRateLimit = await receiptUploadRateLimiter.limit(ipIdentifier);
    if (!publicRateLimit.success) {
      const retryAfter = Math.ceil((publicRateLimit.reset - Date.now()) / 1000);
      return makeRateLimitResponse(retryAfter);
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

    const buffer = Buffer.from(await file.arrayBuffer());

    // AC-5: backend magic-byte validation against the declared MIME type
    const magicValidation = validateMimeWithMagicBytes(parsed.data.mimeType, buffer);
    if (!magicValidation.ok) {
      await safeCreateAuditLog({
        actorId: session.user.id,
        action: "FILE_SCAN_REJECTED",
        entityType: "subscription_receipt",
        entityId: subscription.id,
        metadata: { fileName, mimeType: parsed.data.mimeType, reason: magicValidation.reason },
      });
      return NextResponse.json({ error: GENERIC_UPLOAD_ERROR, code: "FILE_SCAN_REJECTED" }, { status: 400 });
    }

    const r2Key = createSubscriptionReceiptR2Key(subscription.id, parsed.data.fileName, parsed.data.mimeType);

    // AC-4: antivirus scan before persisting anything
    const scanResult = await scanFile(buffer, parsed.data.mimeType);
    if (!scanResult.isSafe) {
      console.warn(`[upload-receipt] Scan antivirus rejeté pour subscriptionId=${subscription.id}:`, scanResult.reason);
      await safeCreateAuditLog({
        actorId: session.user.id,
        action: "FILE_SCAN_REJECTED",
        entityType: "subscription_receipt",
        entityId: subscription.id,
        metadata: { fileName, mimeType: parsed.data.mimeType, reason: scanResult.reason },
      });
      return NextResponse.json({ error: GENERIC_UPLOAD_ERROR, code: "FILE_SCAN_REJECTED" }, { status: 400 });
    }

    await uploadObjectToS3(r2Key, buffer, parsed.data.mimeType);

    // Audit log before DB write (pitfall #53)
    await safeCreateAuditLog({
      actorId: session.user.id,
      action: "DOCUMENT_UPLOAD",
      entityType: "subscription_receipt",
      entityId: subscription.id,
      metadata: { r2Key, mimeType: parsed.data.mimeType },
    });

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
    console.error("Receipt upload error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
