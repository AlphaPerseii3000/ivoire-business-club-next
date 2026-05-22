import { beforeEach, describe, expect, it, vi } from "vitest";

const mockNextAuth = vi.hoisted(() => vi.fn(() => ({ handlers: { GET: vi.fn(), POST: vi.fn() }, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() })));
const mockCredentials = vi.hoisted(() => vi.fn((config) => ({ id: "credentials", ...config })));
const mockGoogle = vi.hoisted(() => vi.fn((config) => ({ id: "google", ...config })));
const mockFindUnique = vi.hoisted(() => vi.fn());
const mockCompare = vi.hoisted(() => vi.fn());

vi.mock("next-auth", () => ({ default: mockNextAuth }));
vi.mock("next-auth/providers/google", () => ({ default: mockGoogle }));
vi.mock("next-auth/providers/credentials", () => ({ default: mockCredentials }));
vi.mock("@auth/prisma-adapter", () => ({ PrismaAdapter: vi.fn(() => ({})) }));
vi.mock("bcryptjs", () => ({ default: { compare: mockCompare } }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique: mockFindUnique } } }));

async function loadAuthConfig() {
  vi.resetModules();
  await import("./auth");
  return mockNextAuth.mock.calls.at(-1)?.[0];
}

describe("auth.ts exports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindUnique.mockReset();
    mockCompare.mockReset();
  });

  it("exports handlers, auth, signIn, signOut", async () => {
    const { handlers, auth, signIn, signOut } = await import("./auth");
    expect(handlers).toBeDefined();
    expect(auth).toBeDefined();
    expect(signIn).toBeDefined();
    expect(signOut).toBeDefined();
  });

  it("keeps the Auth.js v5 single-object spread pattern", async () => {
    await loadAuthConfig();

    expect(mockNextAuth).toHaveBeenCalledTimes(1);
    expect(mockNextAuth.mock.calls[0]).toHaveLength(1);
  });

  it("refuses credentials sign-in for suspended users before password return", async () => {
    const config = await loadAuthConfig();
    const credentialsProvider = config.providers.find((provider: { id: string }) => provider.id === "credentials");
    mockFindUnique.mockResolvedValueOnce({
      id: "member-1",
      email: "member@example.com",
      name: "Awa",
      tier: "AFFRANCHI",
      role: "MEMBER",
      status: "SUSPENDED",
      passwordHash: "hash",
    });

    const result = await credentialsProvider.authorize({ email: "member@example.com", password: "password" });

    expect(result).toBeNull();
    expect(mockCompare).not.toHaveBeenCalled();
  });

  it("returns active credentials users with status claim input", async () => {
    const config = await loadAuthConfig();
    const credentialsProvider = config.providers.find((provider: { id: string }) => provider.id === "credentials");
    mockFindUnique.mockResolvedValueOnce({
      id: "member-1",
      email: "member@example.com",
      name: "Awa",
      tier: "BOSS",
      role: "MEMBER",
      status: "ACTIVE",
      passwordHash: "hash",
    });
    mockCompare.mockResolvedValueOnce(true);

    const result = await credentialsProvider.authorize({ email: "member@example.com", password: "password" });

    expect(result).toMatchObject({ id: "member-1", status: "ACTIVE", tier: "BOSS" });
  });

  it("refuses Google OAuth sign-in for suspended existing users", async () => {
    const config = await loadAuthConfig();
    mockFindUnique.mockResolvedValueOnce({ status: "SUSPENDED" });

    const result = await config.callbacks.signIn({ user: { email: "member@example.com" }, account: { provider: "google" } });

    expect(result).toBe(false);
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { email: "member@example.com" },
      select: { status: true },
    });
  });

  it("allows Google OAuth sign-in for active existing users", async () => {
    const config = await loadAuthConfig();
    mockFindUnique.mockResolvedValueOnce({ status: "ACTIVE" });

    const result = await config.callbacks.signIn({ user: { email: "member@example.com" }, account: { provider: "google" } });

    expect(result).toBe(true);
  });
});
