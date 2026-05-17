import { describe, expect, it } from "vitest";

import {
  DOCUMENT_MAX_SIZE_BYTES,
  documentCompleteSchema,
  documentPresignSchema,
} from "./validations";

describe("document validation", () => {
  it("accepts PDF and supported images under 10 MB", () => {
    for (const mimeType of ["application/pdf", "image/jpeg", "image/png", "image/webp"]) {
      const result = documentPresignSchema.safeParse({
        fileName: "document.pdf",
        mimeType,
        size: 1024,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects unsupported file types", () => {
    const result = documentPresignSchema.safeParse({
      fileName: "document.exe",
      mimeType: "application/x-msdownload",
      size: 1024,
    });
    expect(result.success).toBe(false);
  });

  it("rejects files over 10 MB", () => {
    const result = documentPresignSchema.safeParse({
      fileName: "document.pdf",
      mimeType: "application/pdf",
      size: DOCUMENT_MAX_SIZE_BYTES + 1,
    });
    expect(result.success).toBe(false);
  });

  it("requires R2 metadata when confirming uploads", () => {
    const result = documentCompleteSchema.safeParse({
      r2Key: "opportunities/opp/documents/file.pdf",
      fileName: "file.pdf",
      originalName: "Titre foncier.pdf",
      mimeType: "application/pdf",
      size: 2048,
    });
    expect(result.success).toBe(true);
  });
});
