import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeError } from "@/lib/sanitize-log";
import { getEventGalleryFilePath } from "@/lib/media-path";
import fs from "fs/promises";
import path from "path";

const MIME_BY_EXTENSION: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_BY_EXTENSION[ext] ?? "application/octet-stream";
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ eventId: string; filename: string }> }
) {
  try {
    const { eventId, filename } = await params;

    // Assainissement basique du filename pour éviter Path Traversal
    const safeFilename = path.basename(filename);
    if (!safeFilename || safeFilename !== filename) {
      return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
    }

    if (event.visibility === "PRIVATE") {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
      }
    }

    const filePath = getEventGalleryFilePath(eventId, safeFilename);

    let buffer: Uint8Array;
    try {
      buffer = new Uint8Array(await fs.readFile(filePath));
    } catch {
      return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
    }

    const contentType = getContentType(filePath);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Get gallery media error:", sanitizeError(error));
    return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  }
}
