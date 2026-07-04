import { NextResponse } from "next/server";

export const COVER_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const COVER_MAX_SIZE_BYTES = 5 * 1024 * 1024;
export const COVER_MAX_WIDTH = 1920;
export const COVER_MAX_HEIGHT = 1080;

export type CoverMimeType = (typeof COVER_ALLOWED_TYPES)[number];

export const EXTENSION_BY_MIME: Record<CoverMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const MIME_BY_EXTENSION: Record<string, CoverMimeType> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export function getExtensionFromMime(mimeType: string): string | null {
  return EXTENSION_BY_MIME[mimeType as CoverMimeType] ?? null;
}

function matchesMagicBytes(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;

  const jpegSignature = [0xff, 0xd8, 0xff];
  const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const webpRiffSignature = [0x52, 0x49, 0x46, 0x46];
  const webpSignature = [0x57, 0x45, 0x42, 0x50];

  const startsWith = (signature: number[]) =>
    signature.every((byte, index) => bytes[index] === byte);

  if (startsWith(jpegSignature)) return true;
  if (startsWith(pngSignature)) return true;

  if (startsWith(webpRiffSignature)) {
    return webpSignature.every((byte, index) => bytes[8 + index] === byte);
  }

  return false;
}

export function validateFile(file: { type: string; size: number }):
  | { ok: true; mimeType: CoverMimeType }
  | { ok: false; error: string; status?: number } {
  if (!COVER_ALLOWED_TYPES.includes(file.type as CoverMimeType)) {
    return { ok: false, error: "Fichier image requis (jpeg, png, webp, max 5 Mo)." };
  }
  if (file.size > COVER_MAX_SIZE_BYTES) {
    return { ok: false, error: "Fichier image requis (jpeg, png, webp, max 5 Mo)." };
  }
  return { ok: true, mimeType: file.type as CoverMimeType };
}

export function validateBuffer(bytes: Uint8Array): { ok: true } | { ok: false; response: NextResponse } {
  if (bytes.byteLength > COVER_MAX_SIZE_BYTES) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Fichier image requis (jpeg, png, webp, max 5 Mo).", code: "INVALID_FILE" },
        { status: 400 }
      ),
    };
  }

  if (!matchesMagicBytes(bytes)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Format d'image non valide.", code: "INVALID_FILE" }, { status: 400 }),
    };
  }

  return { ok: true };
}
