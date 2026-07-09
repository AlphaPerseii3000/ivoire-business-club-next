import { describe, expect, it, vi } from "vitest";

import { scanFile, validateMagicBytes, validateMimeWithMagicBytes, getClientIp, allIpsValid } from "./file-scan";

const RECEIPT_MAX_SIZE_BYTES = 5 * 1024 * 1024;

function makeRequestWithXForwardedFor(forwarded: string): Request {
  return new Request("http://localhost/api/test", {
    headers: { "x-forwarded-for": forwarded },
  });
}

function makePrivateRequest(forwarded: string): Request {
  return new Request("http://localhost/api/test", {
    headers: { "x-forwarded-for": forwarded },
  });
}

describe("getClientIp", () => {
  it("uses the rightmost IP when the request comes from a trusted proxy", () => {
    // The last IP is the one added by the trusted nginx proxy (127.0.0.1 here).
    const req = makePrivateRequest("1.2.3.4, 5.6.7.8, 127.0.0.1");
    expect(getClientIp(req)).toBe("127.0.0.1");
  });

  it("ignores X-Forwarded-For when the last hop is not a trusted IP", () => {
    // Attacker sends a fake chain ending with a public IP.
    const req = makeRequestWithXForwardedFor("1.2.3.4, 5.6.7.8");
    expect(getClientIp(req)).toBe("unknown");
  });

  it("trusts private network ranges as proxy IPs", () => {
    const req = makeRequestWithXForwardedFor("203.0.113.5, 10.0.0.1");
    expect(getClientIp(req)).toBe("10.0.0.1");
  });

  it("trusts link-local addresses as proxy IPs", () => {
    const req = makeRequestWithXForwardedFor("1.2.3.4, 169.254.1.1");
    expect(getClientIp(req)).toBe("169.254.1.1");
  });

  it("falls back to unknown when X-Forwarded-For is missing", () => {
    const req = new Request("http://localhost/api/test");
    expect(getClientIp(req)).toBe("unknown");
  });
});

describe("allIpsValid", () => {
  it("accepts valid IPv4 addresses", () => {
    expect(allIpsValid(["1.2.3.4", "5.6.7.8"])).toBe(true);
  });

  it("rejects invalid values", () => {
    expect(allIpsValid(["not-an-ip", "1.2.3.4"])).toBe(false);
    expect(allIpsValid(["256.1.1.1"])).toBe(false);
    expect(allIpsValid([])).toBe(false);
  });
});

describe("validateMagicBytes", () => {
  it("accepts a valid PDF", () => {
    const pdf = Buffer.from("%PDF-1.4\ntrailer\n%%EOF");
    const result = validateMagicBytes(pdf);
    expect(result.valid).toBe(true);
    expect(result.detectedMimeType).toBe("application/pdf");
  });

  it("accepts a valid JPEG", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
    const result = validateMagicBytes(jpeg);
    expect(result.valid).toBe(true);
    expect(result.detectedMimeType).toBe("image/jpeg");
  });

  it("accepts a valid PNG", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const result = validateMagicBytes(png);
    expect(result.valid).toBe(true);
    expect(result.detectedMimeType).toBe("image/png");
  });

  it("rejects an .exe renamed as PDF", () => {
    const exe = Buffer.from("MZ\x90\x00\x03\x00\x00\x00");
    const result = validateMagicBytes(exe);
    expect(result.valid).toBe(false);
  });

  it("rejects an empty buffer", () => {
    expect(validateMagicBytes(Buffer.from([])).valid).toBe(false);
  });
});

describe("validateMimeWithMagicBytes", () => {
  it("passes when declared type matches content", () => {
    const pdf = Buffer.from("%PDF-1.4\ntrailer\n%%EOF");
    const result = validateMimeWithMagicBytes("application/pdf", pdf);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.detectedMimeType).toBe("application/pdf");
    }
  });

  it("fails when declared type mismatches content", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const result = validateMimeWithMagicBytes("application/pdf", png);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("ne correspond pas");
    }
  });
});

describe("scanFile", () => {
  it("rejects an oversized file", async () => {
    const big = Buffer.alloc(RECEIPT_MAX_SIZE_BYTES + 1, 0x25);
    const result = await scanFile(big, "application/pdf");
    expect(result.isSafe).toBe(false);
    expect(result.reason).toContain("volumineux");
  });

  it("rejects a .exe renamed as PDF", async () => {
    const exe = Buffer.from("MZ\x90\x00\x03\x00\x00\x00");
    const result = await scanFile(exe, "application/pdf");
    expect(result.isSafe).toBe(false);
  });

  it("rejects an incomplete PDF missing %%EOF", async () => {
    const pdf = Buffer.from("%PDF-1.4\n1 0 obj\nendobj");
    const result = await scanFile(pdf, "application/pdf");
    expect(result.isSafe).toBe(false);
    expect(result.reason).toContain("PDF incomplet");
  });

  it("accepts a valid PDF when no external scanner is configured", async () => {
    delete process.env.ANTIVIRUS_API_KEY;
    delete process.env.ANTIVIRUS_API_URL;
    const pdf = Buffer.from("%PDF-1.4\ntrailer\n%%EOF");
    const result = await scanFile(pdf, "application/pdf");
    expect(result.isSafe).toBe(true);
  });

  it("accepts a valid JPEG when no external scanner is configured", async () => {
    delete process.env.ANTIVIRUS_API_KEY;
    delete process.env.ANTIVIRUS_API_URL;
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
    const result = await scanFile(jpeg, "image/jpeg");
    expect(result.isSafe).toBe(true);
  });

  it("fails closed when the external scanner times out", async () => {
    process.env.ANTIVIRUS_API_KEY = "test-key";
    process.env.ANTIVIRUS_API_URL = "https://example.com/scan";

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async (_input, init) => {
      return new Promise((_resolve, reject) => {
        const signal = init?.signal as AbortSignal | undefined;
        if (signal?.aborted) {
          reject(new DOMException("Aborted", "AbortError"));
          return;
        }
        const listener = () => reject(new DOMException("Aborted", "AbortError"));
        signal?.addEventListener("abort", listener, { once: true });
      });
    }) as typeof fetch;

    const pdf = Buffer.from("%PDF-1.4\ntrailer\n%%EOF");
    const result = await scanFile(pdf, "application/pdf");
    expect(result.isSafe).toBe(false);
    expect(result.reason).toContain("Échec du scan antivirus");

    globalThis.fetch = originalFetch;
    delete process.env.ANTIVIRUS_API_KEY;
    delete process.env.ANTIVIRUS_API_URL;
  }, 15_000);
});
