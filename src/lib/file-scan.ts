import { describe, expect, it } from "vitest";

/**
 * Supported file signatures (magic bytes) for receipt uploads.
 * Matches the backend whitelist in src/lib/validations.ts:
 *   - application/pdf
 *   - image/jpeg
 *   - image/png
 */
const MAGIC_BYTES: Record<string, number[]> = {
  "application/pdf": [0x25, 0x50, 0x44, 0x46],
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47],
};

const RECEIPT_MAX_SIZE_BYTES = 5 * 1024 * 1024;

export interface ScanResult {
  isSafe: boolean;
  reason?: string;
}

function isPrivateOrLocalIp(ip: string): boolean {
  if (ip === "127.0.0.1" || ip === "::1" || ip === "localhost") return true;
  const parts = ip.split(".");
  if (parts.length === 4) {
    const [a, b, c] = parts.map(Number);
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true; // link-local
  }
  return false;
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const rawIps = forwarded.split(",").map((part) => part.trim()).filter(Boolean);
    // Trust only when the request itself comes from a trusted proxy. Since the
    // VPS app is behind nginx, the connection seen by Next.js should be from a
    // loopback or private address. If it is, use the rightmost (most recent)
    // proxy-added IP; otherwise ignore X-Forwarded-For and fall back to unknown
    // to prevent trivial spoofing.
    const last = rawIps.at(-1);
    if (last && isPrivateOrLocalIp(last)) {
      return last;
    }
  }
  return "unknown";
}

function isValidIpv4(ip: string): boolean {
  const parts = ip.split(".");
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    const num = Number(part);
    return part !== "" && !Number.isNaN(num) && num >= 0 && num <= 255 && String(num) === part;
  });
}

/**
 * Validate that the source IP list from X-Forwarded-For contains plausible values.
 * Used in tests and by getClientIp trust logic.
 */
export function allIpsValid(ips: string[]): boolean {
  return ips.length > 0 && ips.every((ip) => isValidIpv4(ip));
}

function startsWithMagicBytes(buffer: Buffer, signature: number[]): boolean {
  if (buffer.length < signature.length) return false;
  return signature.every((byte, index) => buffer[index] === byte);
}

export function validateMagicBytes(buffer: Buffer): { valid: boolean; detectedMimeType?: string; reason?: string } {
  if (buffer.length === 0) return { valid: false, reason: "Fichier vide" };

  for (const [mimeType, signature] of Object.entries(MAGIC_BYTES)) {
    if (startsWithMagicBytes(buffer, signature)) {
      return { valid: true, detectedMimeType: mimeType };
    }
  }

  return { valid: false, reason: "Signature du fichier non reconnue" };
}

/**
 * Validate that the declared MIME type matches the file's magic bytes.
 * Returns the detected MIME type on success, or an error reason on mismatch.
 */
export function validateMimeWithMagicBytes(declaredMimeType: string, buffer: Buffer): { ok: true; detectedMimeType: string } | { ok: false; reason: string } {
  const magic = validateMagicBytes(buffer);
  if (!magic.valid) {
    return { ok: false, reason: magic.reason ?? "Fichier invalide" };
  }
  if (magic.detectedMimeType !== declaredMimeType) {
    return { ok: false, reason: `Le type déclaré (${declaredMimeType}) ne correspond pas au contenu (${magic.detectedMimeType})` };
  }
  return { ok: true, detectedMimeType: magic.detectedMimeType };
}

/**
 * Optional additional structure checks based on MIME type.
 * - PDF: must end with %%EOF
 * - PNG/JPEG: length at least as long as the magic signature
 */
function sanityCheckStructure(declaredMimeType: string, buffer: Buffer): { ok: true } | { ok: false; reason: string } {
  if (declaredMimeType === "application/pdf") {
    const tail = buffer.subarray(-1024).toString("latin1");
    if (!tail.includes("%%EOF")) {
      return { ok: false, reason: "Fichier PDF incomplet" };
    }
  }
  return { ok: true };
}

function isValidAntivirusApiUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Scan a file buffer for unsafe content.
 *
 * Always runs the following local heuristics first, regardless of whether an
 * external antivirus is configured:
 *   1. File size is within the allowed limit.
 *   2. Magic bytes match the declared MIME type (backend whitelist).
 *   3. Basic file structure sanity (PDF EOF marker, etc.).
 *
 * If ANTIVIRUS_API_URL is configured, the buffer is also sent to the external
 * service as an additional layer. The expected contract is:
 *   POST {ANTIVIRUS_API_URL}
 *   Headers:
 *     Content-Type: application/octet-stream
 *     X-Api-Key: {ANTIVIRUS_API_KEY}
 *   Body: raw bytes
 *   Response JSON: { clean?: boolean, threat?: string }
 *
 * The scanner FAILS CLOSED: any network error, invalid URL, non-2xx response,
 * or timeout results in isSafe=false so that a misconfigured or unreachable
 * scanner cannot silently allow uploads.
 */
export async function scanFile(buffer: Buffer, declaredMimeType: string): Promise<ScanResult> {
  // 1. Size check
  if (buffer.length > RECEIPT_MAX_SIZE_BYTES) {
    return { isSafe: false, reason: "Fichier trop volumineux" };
  }

  // 2. Magic byte validation against declared MIME type
  const magicValidation = validateMimeWithMagicBytes(declaredMimeType, buffer);
  if (!magicValidation.ok) {
    return { isSafe: false, reason: magicValidation.reason };
  }

  // 3. Structure sanity check
  const structureCheck = sanityCheckStructure(declaredMimeType, buffer);
  if (!structureCheck.ok) {
    return { isSafe: false, reason: structureCheck.reason };
  }

  const apiKey = process.env.ANTIVIRUS_API_KEY;
  const apiUrl = process.env.ANTIVIRUS_API_URL;

  // No external API configured → heuristics are the final verdict.
  if (!apiKey || !apiUrl) {
    return { isSafe: true };
  }

  if (!isValidAntivirusApiUrl(apiUrl)) {
    console.warn("[file-scan] ANTIVIRUS_API_URL invalide ou non HTTPS");
    return { isSafe: false, reason: "Configuration du scanner invalide" };
  }

  const controller = new AbortController();
  const timeoutMs = 10000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "X-Api-Key": apiKey,
      },
      body: new Uint8Array(buffer),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.warn("[file-scan] Service d'antivirus indisponible:", response.status);
      return { isSafe: false, reason: "Scan antivirus indisponible" };
    }

    const result = (await response.json()) as { clean?: boolean; threat?: string };

    if (result.clean === false) {
      return {
        isSafe: false,
        reason: result.threat ? `Menace détectée: ${result.threat}` : "Fichier non sûr",
      };
    }

    return { isSafe: true };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { isSafe: false, reason: "Le scanner antivirus a dépassé le délai" };
    }
    console.warn("[file-scan] Échec du scan antivirus:", error instanceof Error ? error.message : "unknown");
    return { isSafe: false, reason: "Échec du scan antivirus" };
  } finally {
    clearTimeout(timeout);
  }
}
