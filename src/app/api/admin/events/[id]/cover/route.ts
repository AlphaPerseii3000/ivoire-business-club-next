import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeError } from "@/lib/sanitize-log";
import { safeCreateAuditLog } from "@/lib/audit-log";
import { getEventCoverFilePath, getEventCoverRelativePath, getEventCoverDir } from "@/lib/media-path";
import { ensureMediaDir } from "@/lib/ensure-media-dir";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";

const COVER_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const COVER_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const COVER_MAX_WIDTH = 1920;
const COVER_MAX_HEIGHT = 1080;

type CoverMimeType = (typeof COVER_ALLOWED_TYPES)[number];

const EXTENSION_BY_MIME: Record<CoverMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const MIME_BY_EXTENSION: Record<string, CoverMimeType> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function getExtensionFromMime(mimeType: string): string | null {
  return EXTENSION_BY_MIME[mimeType as CoverMimeType] ?? null;
}

function validateFile(file: { type: string; size: number }): { ok: true; mimeType: CoverMimeType } | { ok: false; error: string } {
  if (!COVER_ALLOWED_TYPES.includes(file.type as CoverMimeType)) {
    return { ok: false, error: "Fichier image requis (jpeg, png, webp, max 5 Mo)." };
  }
  if (file.size > COVER_MAX_SIZE_BYTES) {
    return { ok: false, error: "Fichier image requis (jpeg, png, webp, max 5 Mo)." };
  }
  return { ok: true, mimeType: file.type as CoverMimeType };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }
    if ((session.user as any).role !== "ADMIN") {
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

    // Nettoyer les anciens fichiers de couverture pour éviter les orphelins en cas de changement d'extension
    try {
      const entries = await fs.readdir(dir);
      await Promise.all(
        entries
          .filter((entry) => entry.startsWith("cover."))
          .map((entry) => fs.unlink(path.join(dir, entry)).catch(() => {}))
      );
    } catch {
      // Ignorer les erreurs de lecture du dossier
    }

    const filePath = getEventCoverFilePath(id, extension);

    const bytes = new Uint8Array(await file.arrayBuffer());
    const inputBuffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    await sharp(inputBuffer)
      .resize(COVER_MAX_WIDTH, COVER_MAX_HEIGHT, {
        fit: sharp.fit.inside,
        withoutEnlargement: true,
      })
      .toFile(filePath);

    const relativePath = getEventCoverRelativePath(id, extension);

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: { coverImagePath: relativePath },
    });

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
    console.error("Upload cover error:", sanitizeError(error));
    return NextResponse.json({ error: "Une erreur est survenue lors de l'upload." }, { status: 500 });
  }
}

export { COVER_ALLOWED_TYPES, COVER_MAX_SIZE_BYTES, MIME_BY_EXTENSION };
