import { describe, expect, it } from "vitest";

import { canManageDocuments } from "./document-access";

describe("document authorization", () => {
  it("allows the opportunity author", () => {
    expect(canManageDocuments({ userId: "user-1", role: "MEMBER" }, "user-1")).toBe(true);
  });

  it("allows admins", () => {
    expect(canManageDocuments({ userId: "admin-1", role: "ADMIN" }, "user-1")).toBe(true);
  });

  it("rejects non-author members", () => {
    expect(canManageDocuments({ userId: "user-2", role: "MEMBER" }, "user-1")).toBe(false);
  });
});
