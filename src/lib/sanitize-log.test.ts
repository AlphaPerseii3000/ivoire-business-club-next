import { describe, it, expect } from "vitest";
import { sanitizeError, sanitizeForLog } from "./sanitize-log";

describe("sanitizeError", () => {
  it("returns error name without message details", () => {
    const error = new Error("Database connection failed with password=secret123");
    const result = sanitizeError(error);
    expect(result).toBe("Error: Error");
    expect(result).not.toContain("password");
    expect(result).not.toContain("secret123");
  });

  it("returns 'Error: TypeError' for TypeError", () => {
    const error = new TypeError("Cannot read property 'token' of undefined");
    const result = sanitizeError(error);
    expect(result).toBe("Error: TypeError");
    expect(result).not.toContain("token");
  });

  it("returns 'Unknown error' for non-Error values", () => {
    expect(sanitizeError("string error")).toBe("Unknown error");
    expect(sanitizeError(42)).toBe("Unknown error");
    expect(sanitizeError(null)).toBe("Unknown error");
    expect(sanitizeError(undefined)).toBe("Unknown error");
    expect(sanitizeError({ message: "oops" })).toBe("Unknown error");
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

    expect(result.email).toBe("user@example.com");
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

  it("handles empty objects", () => {
    const result = sanitizeForLog({});
    expect(result).toEqual({});
  });
});