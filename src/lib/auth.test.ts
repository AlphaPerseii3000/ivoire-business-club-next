import { beforeEach, describe, expect, it, vi } from "vitest";

const mockNextAuth = vi.hoisted(() => vi.fn(() => ({ handlers: { GET: vi.fn(), POST: vi.fn() }, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() })));
const mockCredentials = vi.hoisted(() => vi.fn((config) => ({ id: "credentials", ...config })));
const mockGoogle = vi.hoisted(() => vi.fn((config) => ({ id: "google", ...config })));
const mockFindUnique = vi.hoisted(() => vi.fn());
const mockUpdate = vi.hoisted(() => vi.fn());
const mockCompare = vi.hoisted(() => vi.fn());
const mockAdapterCreateUser = vi.hoisted(() => vi.fn(async (user) => user));
const mockSendWelcomeEmail = vi.hoisted(() => vi.fn(async () => {}));
const mockSanitizeError = vi.hoisted(() => vi.fn(() => "Error"));

type CredentialsProviderConfig = {
  id: string;
  authorize: (credentials: { email: string; password: string }) => Promise<unknown>;
};

type TestAuthConfig = {
  providers: Array<{ id: string } | CredentialsProviderConfig>;
  callbacks: {
    signIn: (args: { user: { email?: string }; account: { provider: string } }) => Promise<boolean>;
  };
  adapter: {
    createUser: (user: Record<string, unknown>) => Promise<Record<string, unknown>>;
  };
};

vi.mock("next-auth", () => ({ default: mockNextAuth }));
vi.mock("next-auth/providers/google", () => ({ default: mockGoogle }));
vi.mock("next-auth/providers/credentials", () => ({ default: mockCredentials }));
vi.mock("@auth/prisma-adapter", () => ({ PrismaAdapter: vi.fn(() => ({ createUser: mockAdapterCreateUser })) }));
vi.mock("bcryptjs", () => ({ default: { compare: mockCompare } }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique: mockFindUnique, update: mockUpdate } } }));
vi.mock("@/lib/email", () => ({ sendWelcomeEmail: mockSendWelcomeEmail }));
vi.mock("@/lib/sanitize-log", () => ({ sanitizeError: mockSanitizeError }));

async function loadAuthConfig() {
  vi.resetModules();
  await import("./auth");
  const calls = mockNextAuth.mock.calls as unknown as Array<[TestAuthConfig]>;
  const config = calls.at(-1)?.[0];
  if (!config) throw new Error("NextAuth config was not captured");
  return config;
}

function getCredentialsProvider(config: TestAuthConfig) {
  const provider = config.providers.find((item): item is CredentialsProviderConfig => item.id === "credentials" && "authorize" in item);
  if (!provider) throw new Error("Credentials provider was not captured");
  return provider;
}

describe("auth.ts exports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindUnique.mockReset();
    mockUpdate.mockReset();
    mockCompare.mockReset();
    mockAdapterCreateUser.mockClear();
    mockSendWelcomeEmail.mockClear();
    mockSanitizeError.mockClear();
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
    const credentialsProvider = getCredentialsProvider(config);
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
    const credentialsProvider = getCredentialsProvider(config);
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
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("promotes configured bootstrap admins during credentials authorization", async () => {
    const config = await loadAuthConfig();
    const credentialsProvider = getCredentialsProvider(config);
    mockFindUnique.mockResolvedValueOnce({
      id: "admin-1",
      email: "berseth.j@gmail.com",
      name: "Jonathan",
      tier: "AFFRANCHI",
      role: "MEMBER",
      status: "ACTIVE",
      passwordHash: "hash",
    });
    mockCompare.mockResolvedValueOnce(true);

    const result = await credentialsProvider.authorize({ email: "berseth.j@gmail.com", password: "password" });

    expect(result).toMatchObject({ id: "admin-1", role: "ADMIN" });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "admin-1" },
      data: { role: "ADMIN" },
    });
  });

  it("refuses Google OAuth sign-in for suspended existing users", async () => {
    const config = await loadAuthConfig();
    mockFindUnique.mockResolvedValueOnce({ status: "SUSPENDED" });

    const result = await config.callbacks.signIn({ user: { email: "member@example.com" }, account: { provider: "google" } });

    expect(result).toBe(false);
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { email: "member@example.com" },
      select: { id: true, role: true, status: true, createdAt: true },
    });
  });

  it("allows Google OAuth sign-in for active existing users", async () => {
    const config = await loadAuthConfig();
    mockFindUnique.mockResolvedValueOnce({ id: "member-1", role: "MEMBER", status: "ACTIVE" });

    const result = await config.callbacks.signIn({ user: { email: "member@example.com" }, account: { provider: "google" } });

    expect(result).toBe(true);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("promotes configured bootstrap admins during Google OAuth sign-in", async () => {
    const config = await loadAuthConfig();
    mockFindUnique.mockResolvedValueOnce({ id: "admin-1", role: "MEMBER", status: "ACTIVE" });

    const result = await config.callbacks.signIn({ user: { email: "berseth.j@gmail.com" }, account: { provider: "google" } });

    expect(result).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "admin-1" },
      data: { role: "ADMIN" },
    });
  });

  it("sends welcome email for newly created Google OAuth user", async () => {
    const config = await loadAuthConfig();
    mockFindUnique.mockResolvedValueOnce({ id: "member-2", role: "MEMBER", status: "ACTIVE", createdAt: new Date() });

    const result = await config.callbacks.signIn({
      user: { email: "new-google@example.com", name: "New Google User" },
      account: { provider: "google" },
    });

    expect(result).toBe(true);
    expect(mockSendWelcomeEmail).toHaveBeenCalledWith({
      to: "new-google@example.com",
      name: "New Google User",
      tier: "AFFRANCHI",
    });
  });

  it("does NOT send welcome email for existing Google OAuth user (createdAt > 60s)", async () => {
    const config = await loadAuthConfig();
    mockFindUnique.mockResolvedValueOnce({ id: "member-3", role: "MEMBER", status: "ACTIVE", createdAt: new Date(Date.now() - 120_000) });

    const result = await config.callbacks.signIn({
      user: { email: "existing-google@example.com", name: "Existing Google User" },
      account: { provider: "google" },
    });

    expect(result).toBe(true);
    expect(mockSendWelcomeEmail).not.toHaveBeenCalled();
  });

  it("normalizes null emailVerified before Auth.js creates a Prisma user", async () => {
    const config = await loadAuthConfig();

    const result = await config.adapter.createUser({
      email: "member@example.com",
      emailVerified: null,
      name: "Awa",
      image: "https://example.com/avatar.png",
    });

    expect(mockAdapterCreateUser).toHaveBeenCalledWith({
      email: "member@example.com",
      emailVerified: false,
      name: "Awa",
      image: "https://example.com/avatar.png",
      role: "MEMBER",
    });
    expect(result).toMatchObject({ emailVerified: false });
  });

  it("assigns ADMIN when Auth.js creates the bootstrap admin via OAuth", async () => {
    const config = await loadAuthConfig();

    const result = await config.adapter.createUser({
      email: "berseth.j@gmail.com",
      emailVerified: null,
      name: "Jonathan",
      image: null,
    });

    expect(mockAdapterCreateUser).toHaveBeenCalledWith({
      email: "berseth.j@gmail.com",
      emailVerified: false,
      name: "Jonathan",
      image: null,
      role: "ADMIN",
    });
    expect(result).toMatchObject({ role: "ADMIN" });
  });
});
