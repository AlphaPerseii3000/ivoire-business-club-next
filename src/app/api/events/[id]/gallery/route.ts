import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeError } from "@/lib/sanitize-log";
import { safeCreateAuditLog } from "@/lib/audit-log";
import {
  getEventGalleryDir,
  getEventGalleryFilePath,
  getEventGalleryRelativePath,
} from "@/lib/media-path";
import { ensureMediaDir } from "@/lib/ensure-media-dir";
import sharp from "sharp";
import crypto from "crypto";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 Mo

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      return NextResponse.json({ error: "Événement introuvable." }, { status: 404 });
    }

    if (event.visibility === "PRIVATE") {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Accès non autorisé." }, { status: 401 });
      }
    }

    const photos = await prisma.eventGalleryPhoto.findMany({
      where: { eventId: id },
      orderBy: { createdAt: "desc" },
      include: {
        uploader: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    return NextResponse.json({ data: photos });
  } catch (error) {
    console.error("GET event gallery error:", sanitizeError(error));
    return NextResponse.json(
      { error: "Une erreur est survenue lors de la récupération des photos." },
      { status: 500 }
    );
  }
}

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

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      return NextResponse.json({ error: "Événement introuvable." }, { status: 404 });
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json(
        { error: "Fichier photo requis (jpeg, png, webp, max 10 Mo)." },
        { status: 400 }
      );
    }

    const file = formData.get("file");
    if (!file || typeof file === "string" || typeof (file as Blob).size !== "number") {
      return NextResponse.json(
        { error: "Fichier photo requis (jpeg, png, webp, max 10 Mo)." },
        { status: 400 }
      );
    }

    const caption = formData.get("caption")?.toString() || null;
    const fileBlob = file as File;

    if (!ALLOWED_MIME_TYPES.includes(fileBlob.type)) {
      return NextResponse.json(
        { error: "Format d'image non supporté (jpeg, png, webp uniquement)." },
        { status: 400 }
      );
    }

    const bytes = new Uint8Array(await fileBlob.arrayBuffer());

    if (fileBlob.size > MAX_FILE_SIZE || bytes.byteLength > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "La taille du fichier dépasse la limite autorisée de 10 Mo." },
        { status: 400 }
      );
    }

    const ext = EXTENSION_BY_MIME[file.type] || "jpg";
    const filename = `${crypto.randomUUID()}.${ext}`;

    const dir = getEventGalleryDir(id);
    await ensureMediaDir(dir);

    const filePathAbs = getEventGalleryFilePath(id, filename);
    tmpPath = `${filePathAbs}.tmp`;

    const inputBuffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    await sharp(inputBuffer)
      .resize(1200, 800, {
        fit: sharp.fit.inside,
        withoutEnlargement: true,
      })
      .toFile(tmpPath);

    const relativePath = getEventGalleryRelativePath(id, filename);

    const photo = await prisma.eventGalleryPhoto.create({
      data: {
        eventId: id,
        uploadedById: session.user.id,
        filePath: relativePath,
        caption,
      },
      include: {
        uploader: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    const fs = await import("fs/promises");
    await fs.rename(tmpPath, filePathAbs);
    tmpPath = null;

    await safeCreateAuditLog({
      actorId: session.user.id,
      action: "EVENT_GALLERY_PHOTO_UPLOAD",
      entityType: "EVENT_GALLERY_PHOTO",
      entityId: photo.id,
      metadata: { eventId: id, filePath: relativePath },
    });

    return NextResponse.json({ data: photo }, { status: 201 });
  } catch (error) {
    if (tmpPath) {
      try {
        const fs = await import("fs/promises");
        await fs.unlink(tmpPath);
      } catch {
        // Ignorer les erreurs d'invalidation temporaire
      }
    }
    console.error("POST event gallery error:", sanitizeError(error));
    return NextResponse.json(
      { error: "Une erreur est survenue lors de l'upload de la photo." },
      { status: 500 }
    );
  }
}
