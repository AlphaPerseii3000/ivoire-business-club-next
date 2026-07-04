import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeError } from "@/lib/sanitize-log";
import { safeCreateAuditLog } from "@/lib/audit-log";
import { getEventCoverFilePath, getEventCoverRelativePath, getEventCoverDir } from "@/lib/media-path";
import { ensureMediaDir } from "@/lib/ensure-media-dir";
import {
  COVER_MAX_WIDTH,
  COVER_MAX_HEIGHT,
  getExtensionFromMime,
  validateFile,
  validateBuffer,
} from "@/lib/cover-upload-config";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let tmpPath: string | null = null;

  try {
    const { id } = await params;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }
    if ((session.user as { role?: string }).role !== "ADMIN") {
      return NextResponse.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: "Fichier image requis (jpeg, png, webp, max 5 Mo).", code: "INVALID_FILE" }, { status: 400 });
    }

    const file = formData.get("cover");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "Fichier image requis (jpeg, png, webp, max 5 Mo).", code: "INVALID_FILE" }, { status: 400 });
    }

    const validation = validateFile(file);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error, code: "INVALID_FILE" }, { status: 400 });
    }
    const { mimeType } = validation;

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      return NextResponse.json({ error: "Événement introuvable." }, { status: 404 });
    }

    const extension = getExtensionFromMime(mimeType);
    if (!extension) {
      return NextResponse.json({ error: "Fichier image requis (jpeg, png, webp, max 5 Mo).", code: "INVALID_FILE" }, { status: 400 });
    }

    const dir = getEventCoverDir(id);
    await ensureMediaDir(dir);

    const filePath = getEventCoverFilePath(id, extension);
    tmpPath = `${filePath}.tmp`;

    const bytes = new Uint8Array(await file.arrayBuffer());
    const inputBuffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    const bufferValidation = validateBuffer(bytes);
    if (!bufferValidation.ok) {
      return bufferValidation.response;
    }

    await sharp(inputBuffer)
      .resize(COVER_MAX_WIDTH, COVER_MAX_HEIGHT, {
        fit: sharp.fit.inside,
        withoutEnlargement: true,
      })
      .toFile(tmpPath);

    const relativePath = getEventCoverRelativePath(id, extension);

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: { coverImagePath: relativePath },
    });

    await fs.rename(tmpPath, filePath);
    tmpPath = null;

    // Nettoyer les anciens fichiers de couverture d'autres extensions
    try {
      const entries = await fs.readdir(dir);
      await Promise.all(
        entries
          .filter((entry) => entry.startsWith("cover.") && entry !== `cover.${extension}`)
          .map((entry) => fs.unlink(path.join(dir, entry)).catch(() => {}))
      );
    } catch {
      // Ignorer les erreurs de lecture du dossier
    }

    await safeCreateAuditLog({
      actorId: session.user.id,
      action: "EVENT_COVER_UPLOAD",
      entityType: "EVENT",
      entityId: updatedEvent.id,
      metadata: {
        coverImagePath: relativePath,
      },
    });

    return NextResponse.json(
      { data: { coverImagePath: relativePath } },
      { status: 201 }
    );
  } catch (error) {
    if (tmpPath) {
      try {
        await fs.unlink(tmpPath);
      } catch {
        // Le fichier temporaire n'existe pas ou a déjà été déplacé
      }
    }
    console.error("Upload cover error:", sanitizeError(error));
    return NextResponse.json({ error: "Une erreur est survenue lors de l'upload." }, { status: 500 });
  }
}
