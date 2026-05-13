import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, unlink } from "fs/promises";
import path from "path";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("avatar") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Aucun fichier fourni" },
        { status: 400 }
      );
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Type de fichier non supporté. Utilisez JPEG, PNG ou WebP." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Le fichier est trop volumineux. Taille maximale : 2 Mo." },
        { status: 400 }
      );
    }

    // Get current user to check for existing avatar
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { image: true },
    });

    const ext = file.type.split("/")[1];
    const fileName = `${session.user.id}-${Date.now()}.${ext}`;
    const filePath = path.join(process.cwd(), "public", "avatars", fileName);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // Delete old avatar if it's a local file (not a Google OAuth URL)
    if (currentUser?.image?.startsWith("/avatars/")) {
      const oldFilePath = path.join(
        process.cwd(),
        "public",
        currentUser.image
      );
      try {
        await unlink(oldFilePath);
      } catch {
        // Ignore errors if old file doesn't exist
      }
    }

    const avatarUrl = `/avatars/${fileName}`;
    await prisma.user.update({
      where: { id: session.user.id },
      data: { image: avatarUrl },
    });

    return NextResponse.json({ data: { image: avatarUrl } });
  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}