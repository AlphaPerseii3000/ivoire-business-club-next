const SENSITIVE_KEYS = [
  "password",
  "passwordhash",
  "token",
  "secret",
  "authorization",
  "cookie",
  "r2key",
  "signedurl",
  "publicurl",
  "downloadurl",
  "previewurl",
  "email",
  "filename",
  "originalname",
  "description",
  "note",
  "adminnote",
  "rejectionnote",
];
const MAX_DEPTH = 5;
const MAX_STRING_LENGTH = 300;

export function sanitizeError(error: unknown): string {
  if (error instanceof Error) {
    // Include the error name and a sanitized message (truncate to avoid log injection)
    const message = error.message ? `: ${error.message.slice(0, 200)}` : "";
    return `Error: ${error.name}${message}`;
  }
  return "Unknown error";
}

function isSensitiveKey(key: string) {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  return SENSITIVE_KEYS.some((sensitiveKey) => normalized.includes(sensitiveKey));
}

export function sanitizeForLog(data: Record<string, unknown>, depth = 0): Record<string, unknown> {
  if (depth >= MAX_DEPTH) {
    return { _truncated: "[MAX_DEPTH_EXCEEDED]" };
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (isSensitiveKey(key)) {
      sanitized[key] = "[REDACTED]";
    } else if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      sanitized[key] = sanitizeForLog(value as Record<string, unknown>, depth + 1);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) => {
        if (item !== null && typeof item === "object" && !Array.isArray(item)) {
          return sanitizeForLog(item as Record<string, unknown>, depth + 1);
        }
        if (typeof item === "string" && item.length > MAX_STRING_LENGTH) {
          return `${item.slice(0, MAX_STRING_LENGTH)}…`;
        }
        return item;
      });
    } else if (typeof value === "string" && value.length > MAX_STRING_LENGTH) {
      sanitized[key] = `${value.slice(0, MAX_STRING_LENGTH)}…`;
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}
