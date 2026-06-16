import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDocumentExtension } from "@/lib/r2";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * Resolve the persistent uploads directory.
 * In production on the VPS: /var/www/ibc/shared/uploads/articles
 * (symlinked into public/uploads → shared/uploads)
 * In development: <project>/public/uploads/articles
 */
function getUploadDir(): string {
  const sharedDir = "/var/www/ibc/shared/uploads/articles";
  if (process.env.NODE_ENV === "production") {
    return sharedDir;
  }
  return path.join(process.cwd(), "public", "uploads", "articles");
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user as { role?: string }).role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }

    if (!file.name || !file.type) {
      return NextResponse.json({ error: "Fichier invalide ou corrompu" }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Type de fichier non supporté. Utilisez JPEG, PNG, WebP ou GIF." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Le fichier est trop volumineux. Taille maximale : 5 Mo." },
        { status: 400 }
      );
    }

    const rawExtension = getDocumentExtension(file.name, file.type);
    const extension = rawExtension ? rawExtension.toLowerCase() : "";
    const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif"];

    if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
      return NextResponse.json(
        { error: "Extension de fichier non supportée. Utilisez JPEG, PNG, WebP ou GIF." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uuid = crypto.randomUUID();
    const fileName = `${uuid}.${extension}`;

    // Always store locally on the VPS persistent directory
    const uploadDir = getUploadDir();
    await mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    const localUrl = `/uploads/articles/${fileName}`;
    return NextResponse.json({ data: { url: localUrl } }, { status: 201 });
  } catch (error) {
    console.error("Article image upload error:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
