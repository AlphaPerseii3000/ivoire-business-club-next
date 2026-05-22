import { beforeEach, describe, expect, it, vi } from "vitest";

import { ACCOUNT_SUSPENDED_REDIRECT, requireActiveAuthenticatedUser } from "./account-status";

const mockAuth = vi.hoisted(() => vi.fn());
const mockFindUnique = vi.hoisted(() => vi.fn());
const mockRedirect = vi.hoisted(() => vi.fn((url: string) => {
  throw new Error(`redirect:${url}`);
}));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique: mockFindUnique } } }));
vi.mock("next/navigation", () => ({ redirect: mockRedirect }));

describe("requireActiveAuthenticatedUser", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("redirects unauthenticated users to sign-in", async () => {
    mockAuth.mockResolvedValueOnce(null);

    await expect(requireActiveAuthenticatedUser()).rejects.toThrow("redirect:/auth/signin");
  });

  it("redirects suspended users to the suspended sign-in error", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "member-1" } });
    mockFindUnique.mockResolvedValueOnce({ id: "member-1", status: "SUSPENDED" });

    await expect(requireActiveAuthenticatedUser()).rejects.toThrow(`redirect:${ACCOUNT_SUSPENDED_REDIRECT}`);
  });

  it("returns the session for active users", async () => {
    const session = { user: { id: "member-1" } };
    mockAuth.mockResolvedValueOnce(session);
    mockFindUnique.mockResolvedValueOnce({ id: "member-1", status: "ACTIVE" });

    await expect(requireActiveAuthenticatedUser()).resolves.toBe(session);
  });
});
