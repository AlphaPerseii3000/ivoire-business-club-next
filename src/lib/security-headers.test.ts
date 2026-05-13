import { describe, it, expect } from "vitest";
import { NextResponse } from "next/server";
import { withSecurityHeaders } from "./security-headers";

describe("withSecurityHeaders", () => {
  it("sets all required security headers on a response", () => {
    const response = NextResponse.next();
    withSecurityHeaders(response);

    expect(response.headers.get("Strict-Transport-Security")).toBe(
      "max-age=63072000; includeSubDomains; preload"
    );
    expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin"
    );
    expect(response.headers.get("Permissions-Policy")).toBe(
      "camera=(), microphone=(), geolocation=()"
    );
    expect(response.headers.get("Content-Security-Policy")).toBeDefined();
  });

  it("sets HSTS header with includeSubDomains and preload", () => {
    const response = NextResponse.next();
    withSecurityHeaders(response);

    const hsts = response.headers.get("Strict-Transport-Security");
    expect(hsts).toContain("includeSubDomains");
    expect(hsts).toContain("preload");
    expect(hsts).toContain("max-age=63072000");
  });

  it("sets CSP header with frame-ancestors none", () => {
    const response = NextResponse.next();
    withSecurityHeaders(response);

    const csp = response.headers.get("Content-Security-Policy");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it("sets CSP header with default-src self", () => {
    const response = NextResponse.next();
    withSecurityHeaders(response);

    const csp = response.headers.get("Content-Security-Policy");
    expect(csp).toContain("default-src 'self'");
  });

  it("sets Permissions-Policy restricting camera, microphone, and geolocation", () => {
    const response = NextResponse.next();
    withSecurityHeaders(response);

    const pp = response.headers.get("Permissions-Policy");
    expect(pp).toContain("camera=()");
    expect(pp).toContain("microphone=()");
    expect(pp).toContain("geolocation=()");
  });

  it("returns the response for chaining", () => {
    const response = NextResponse.next();
    const result = withSecurityHeaders(response);
    expect(result).toBe(response);
  });
});