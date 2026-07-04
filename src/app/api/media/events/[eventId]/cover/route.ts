import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeError } from "@/lib/sanitize-log";
import { getEventCoverFilePath } from "@/lib/media-path";
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
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return NextResponse.json({ error: "Couverture introuvable." }, { status: 404 });
    }

    if (event.visibility === "PRIVATE") {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Couverture introuvable." }, { status: 404 });
      }
    }

    if (!event.coverImagePath) {
      return NextResponse.json({ error: "Couverture introuvable." }, { status: 404 });
    }

    const ext = path.extname(event.coverImagePath);
    const filePath = getEventCoverFilePath(eventId, ext || ".jpg");

    const buffer = new Uint8Array(await fs.readFile(filePath));

    const contentType = getContentType(filePath);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Get cover media error:", sanitizeError(error));
    return NextResponse.json({ error: "Couverture introuvable." }, { status: 404 });
  }
}
