const SENSITIVE_KEYS = ["password", "passwordhash", "token", "secret", "authorization", "cookie"];
const MAX_DEPTH = 5;

export function sanitizeError(error: unknown): string {
  if (error instanceof Error) {
    // Include the error name and a sanitized message (truncate to avoid log injection)
    const message = error.message ? `: ${error.message.slice(0, 200)}` : "";
    return `Error: ${error.name}${message}`;
  }
  return "Unknown error";
}

export function sanitizeForLog(data: Record<string, unknown>, depth = 0): Record<string, unknown> {
  if (depth >= MAX_DEPTH) {
    return { _truncated: "[MAX_DEPTH_EXCEEDED]" };
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEYS.some((k) => key.toLowerCase().includes(k))) {
      sanitized[key] = "[REDACTED]";
    } else if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      sanitized[key] = sanitizeForLog(value as Record<string, unknown>, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}