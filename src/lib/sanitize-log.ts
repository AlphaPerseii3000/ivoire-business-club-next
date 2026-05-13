const SENSITIVE_KEYS = ["password", "passwordhash", "token", "secret", "authorization", "cookie"];

export function sanitizeError(error: unknown): string {
  if (error instanceof Error) {
    // Return a safe version — the error name without message or stack that could contain sensitive data
    return `Error: ${error.name}`;
  }
  return "Unknown error";
}

export function sanitizeForLog(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEYS.some((k) => key.toLowerCase().includes(k))) {
      sanitized[key] = "[REDACTED]";
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}