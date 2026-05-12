import { describe, it, expect, vi } from "vitest";

// Mock next-auth before importing auth.ts
vi.mock("next-auth", () => ({
  default: vi.fn(() => ({
    handlers: { GET: vi.fn(), POST: vi.fn() },
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
}));

vi.mock("next-auth/providers/google", () => ({
  default: vi.fn(() => ({ id: "google" })),
}));

vi.mock("next-auth/providers/credentials", () => ({
  default: vi.fn(() => ({ id: "credentials" })),
}));

vi.mock("@auth/prisma-adapter", () => ({
  PrismaAdapter: vi.fn(() => ({})),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

describe("auth.ts exports", () => {
  it("exports handlers, auth, signIn, signOut", async () => {
    const { handlers, auth, signIn, signOut } = await import("./auth");
    expect(handlers).toBeDefined();
    expect(auth).toBeDefined();
    expect(signIn).toBeDefined();
    expect(signOut).toBeDefined();
  });
});
