import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMissingR2Env, uploadObjectToS3, createPublicDocumentUrl, getDocumentExtension } from "@/lib/r2";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

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

    const missingR2 = getMissingR2Env();

    if (missingR2.length === 0) {
      // S3/R2 is configured: Upload to cloud
      const r2Key = `articles/${fileName}`;
      await uploadObjectToS3(r2Key, buffer, file.type);
      const publicUrl = createPublicDocumentUrl(r2Key);
      return NextResponse.json({ data: { url: publicUrl } }, { status: 201 });
    } else {
      // Local fallback for development environment only
      if (process.env.NODE_ENV === "production") {
        console.error("Production upload failed: S3/R2 configuration is incomplete:", missingR2);
        return NextResponse.json(
          { error: "Le stockage cloud R2 n'est pas configuré en production." },
          { status: 500 }
        );
      }

      try {
        const uploadDir = path.join(process.cwd(), "public", "uploads", "articles");
        await mkdir(uploadDir, { recursive: true });
        const filePath = path.join(uploadDir, fileName);
        await writeFile(filePath, buffer);

        const localUrl = `/uploads/articles/${fileName}`;
        return NextResponse.json({ data: { url: localUrl } }, { status: 201 });
      } catch (fsError) {
        console.error("Local file system write error:", fsError);
        return NextResponse.json(
          { error: "Échec de l'écriture locale de l'image de couverture." },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    console.error("Article image upload error:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
