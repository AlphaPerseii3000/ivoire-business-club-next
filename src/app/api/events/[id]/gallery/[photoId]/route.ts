import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeError } from "@/lib/sanitize-log";
import { safeCreateAuditLog } from "@/lib/audit-log";
import { getMediaStoragePath } from "@/lib/media-path";
import fs from "fs/promises";
import path from "path";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  try {
    const { id, photoId } = await params;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }

    const photo = await prisma.eventGalleryPhoto.findUnique({
      where: { id: photoId },
    });

    if (!photo || photo.eventId !== id) {
      return NextResponse.json({ error: "Photo introuvable." }, { status: 404 });
    }

    const userRole = (session.user as { role?: string }).role;
    const isAdmin = userRole === "ADMIN";
    const isOwner = photo.uploadedById === session.user.id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: "Action non autorisée." }, { status: 403 });
    }

    // Supprimer le fichier physique s'il existe
    if (photo.filePath) {
      try {
        const absolutePath = path.join(getMediaStoragePath(), photo.filePath.replace(/^\//, ""));
        await fs.unlink(absolutePath);
      } catch {
        // Ignorer silencieusement si le fichier n'existe plus sur disque
      }
    }

    await prisma.eventGalleryPhoto.delete({
      where: { id: photoId },
    });

    await safeCreateAuditLog({
      actorId: session.user.id,
      action: "EVENT_GALLERY_PHOTO_DELETE",
      entityType: "EVENT_GALLERY_PHOTO",
      entityId: photoId,
      metadata: { eventId: id, deletedBy: session.user.id, isAdmin },
    });

    return NextResponse.json({ success: true, message: "Photo supprimée avec succès." });
  } catch (error) {
    console.error("DELETE event gallery photo error:", sanitizeError(error));
    return NextResponse.json(
      { error: "Une erreur est survenue lors de la suppression de la photo." },
      { status: 500 }
    );
  }
}
