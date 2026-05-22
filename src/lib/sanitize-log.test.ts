import { describe, it, expect } from "vitest";
import { sanitizeError, sanitizeForLog } from "./sanitize-log";

describe("sanitizeError", () => {
  it("returns error name with truncated message", () => {
    const error = new Error("Database connection failed with password=secret123");
    const result = sanitizeError(error);
    expect(result).toContain("Error");
    // Message is included but truncated — sensitive content may appear in message
    // so callers should still avoid logging sanitizeError output as-is in production
    expect(result.length).toBeLessThanOrEqual(200 + "Error: Error: ".length);
  });

  it("returns 'Error: TypeError: ...' for TypeError with message", () => {
    const error = new TypeError("Cannot read property 'token' of undefined");
    const result = sanitizeError(error);
    expect(result).toContain("TypeError");
    expect(result.length).toBeLessThanOrEqual(200 + "Error: TypeError: ".length);
  });

  it("returns 'Unknown error' for non-Error values", () => {
    expect(sanitizeError("string error")).toBe("Unknown error");
    expect(sanitizeError(42)).toBe("Unknown error");
    expect(sanitizeError(null)).toBe("Unknown error");
    expect(sanitizeError(undefined)).toBe("Unknown error");
    expect(sanitizeError({ message: "oops" })).toBe("Unknown error");
  });

  it("truncates long error messages to 200 chars", () => {
    const longMessage = "x".repeat(500);
    const error = new Error(longMessage);
    const result = sanitizeError(error);
    // Result should be "Error: Error: " + first 200 chars of message
    const messagePart = result.replace("Error: Error: ", "");
    expect(messagePart.length).toBeLessThanOrEqual(200);
  });

  it("handles Error with empty message", () => {
    const error = new Error("");
    const result = sanitizeError(error);
    expect(result).toBe("Error: Error");
  });
});

describe("sanitizeForLog", () => {
  it("redacts values for sensitive keys (password, passwordHash, token, secret, authorization, cookie)", () => {
    const data = {
      email: "user@example.com",
      password: "my-secret-password",
      passwordHash: "$2a$12$hash",
      token: "abc123token",
      secret: "super-secret-value",
      authorization: "Bearer xyz",
      cookie: "session=abc123",
    };
    const result = sanitizeForLog(data);

    expect(result.email).toBe("[REDACTED]");
    expect(result.password).toBe("[REDACTED]");
    expect(result.passwordHash).toBe("[REDACTED]");
    expect(result.token).toBe("[REDACTED]");
    expect(result.secret).toBe("[REDACTED]");
    expect(result.authorization).toBe("[REDACTED]");
    expect(result.cookie).toBe("[REDACTED]");
  });

  it("preserves non-sensitive keys and values", () => {
    const data = {
      userId: "user-123",
      action: "login",
      timestamp: "2026-05-13",
    };
    const result = sanitizeForLog(data);

    expect(result.userId).toBe("user-123");
    expect(result.action).toBe("login");
    expect(result.timestamp).toBe("2026-05-13");
  });

  it("is case-insensitive for key matching", () => {
    const data = {
      Password: "secret",
      PASSWORDHASH: "$hash",
      AccessToken: "tok123",
      SecretKey: "keyval",
    };
    const result = sanitizeForLog(data);

    expect(result.Password).toBe("[REDACTED]");
    expect(result.PASSWORDHASH).toBe("[REDACTED]");
    expect(result.AccessToken).toBe("[REDACTED]");
    expect(result.SecretKey).toBe("[REDACTED]");
  });

  it("redacts audit-specific sensitive metadata keys", () => {
    const result = sanitizeForLog({
      r2Key: "opportunities/opp/doc.pdf",
      signedUrl: "https://signed.example.com",
      publicUrl: "https://public.example.com",
      fileName: "secret.pdf",
      originalName: "passport.pdf",
      description: "sensitive description",
      adminNote: "private note",
      nested: { email: "admin@example.com", token: "tok" },
    });

    expect(result.r2Key).toBe("[REDACTED]");
    expect(result.signedUrl).toBe("[REDACTED]");
    expect(result.publicUrl).toBe("[REDACTED]");
    expect(result.fileName).toBe("[REDACTED]");
    expect(result.originalName).toBe("[REDACTED]");
    expect(result.description).toBe("[REDACTED]");
    expect(result.adminNote).toBe("[REDACTED]");
    expect((result.nested as Record<string, unknown>).email).toBe("[REDACTED]");
    expect((result.nested as Record<string, unknown>).token).toBe("[REDACTED]");
  });

  it("handles empty objects", () => {
    const result = sanitizeForLog({});
    expect(result).toEqual({});
  });

  it("recursively sanitizes nested objects", () => {
    const data = {
      user: {
        name: "Alice",
        password: "secret123",
      },
      metadata: {
        level1: {
          token: "nested-token",
          value: "ok",
        },
      },
    };
    const result = sanitizeForLog(data) as Record<string, unknown>;
    expect((result.user as Record<string, unknown>).name).toBe("Alice");
    expect((result.user as Record<string, unknown>).password).toBe("[REDACTED]");
    const meta = result.metadata as Record<string, unknown>;
    const l1 = meta.level1 as Record<string, unknown>;
    expect(l1.token).toBe("[REDACTED]");
    expect(l1.value).toBe("ok");
  });

  it("stops at max depth to prevent infinite recursion", () => {
    const deep: Record<string, unknown> = { name: "level0" };
    let current = deep;
    for (let i = 1; i <= 6; i++) {
      current.child = { name: `level${i}` } as Record<string, unknown>;
      current = current.child as Record<string, unknown>;
    }
    const result = sanitizeForLog(deep);
    // At depth 5, nested object should be truncated
    let level = result;
    for (let i = 0; i < 5; i++) {
      level = (level as Record<string, unknown>).child as Record<string, unknown>;
    }
    expect(level).toEqual({ _truncated: "[MAX_DEPTH_EXCEEDED]" });
  });
});