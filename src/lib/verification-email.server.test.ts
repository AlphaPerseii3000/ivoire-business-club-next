import { describe, it, expect, vi, beforeEach } from "vitest";

const mockVerificationTokenFindFirst = vi.hoisted(() => vi.fn());
const mockVerificationTokenDeleteMany = vi.hoisted(() => vi.fn());
const mockVerificationTokenCreate = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockSendEmailVerificationEmail = vi.hoisted(() => vi.fn());
const mockSanitizeError = vi.hoisted(() => vi.fn((e: unknown) => (e instanceof Error ? e.message : "Unknown error")));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    verificationToken: {
      findFirst: mockVerificationTokenFindFirst,
      deleteMany: mockVerificationTokenDeleteMany,
      create: mockVerificationTokenCreate,
    },
  },
}));

vi.mock("@/lib/email", () => ({
  sendEmailVerificationEmail: mockSendEmailVerificationEmail,
}));

vi.mock("@/lib/sanitize-log", () => ({
  sanitizeError: mockSanitizeError,
}));

async function loadModule() {
  vi.resetModules();
  return import("./verification-email.server");
}

describe("verification-email.server", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserFindUnique.mockReset();
    mockVerificationTokenFindFirst.mockReset();
  });

  it("returns already-verified when the user email is verified", async () => {
    mockUserFindUnique.mockResolvedValueOnce({
      id: "user-1",
      email: "verified@example.com",
      name: "Verified User",
      emailVerified: true,
    });

    const { sendVerificationEmailToUser } = await loadModule();
    const result = await sendVerificationEmailToUser("user-1");

    expect(result).toEqual({ sent: false, reason: "already-verified" });
    expect(mockVerificationTokenFindFirst).not.toHaveBeenCalled();
    expect(mockSendEmailVerificationEmail).not.toHaveBeenCalled();
  });

  it("sends a verification email when no previous token exists", async () => {
    mockUserFindUnique.mockResolvedValueOnce({
      id: "user-2",
      email: "unverified@example.com",
      name: "Unverified User",
      emailVerified: false,
    });
    mockVerificationTokenFindFirst.mockResolvedValueOnce(null);
    mockSendEmailVerificationEmail.mockResolvedValueOnce(undefined);

    const { sendVerificationEmailToUser } = await loadModule();
    const result = await sendVerificationEmailToUser("user-2");

    expect(result).toEqual({ sent: true, reason: "sent" });
    expect(mockVerificationTokenDeleteMany).toHaveBeenCalledWith({
      where: { userId: "user-2" },
    });
    expect(mockVerificationTokenCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-2",
          token: expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
      })
    );
    expect(mockSendEmailVerificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "unverified@example.com",
        name: "Unverified User",
        token: expect.stringMatching(/^[a-f0-9]{64}$/),
      })
    );
  });

  it("allows resend exactly 24 hours after the previous token", async () => {
    mockUserFindUnique.mockResolvedValueOnce({
      id: "user-boundary",
      email: "exact@example.com",
      name: "Exact Boundary User",
      emailVerified: false,
    });
    mockVerificationTokenFindFirst.mockResolvedValueOnce({
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000 - 1),
    });
    mockSendEmailVerificationEmail.mockResolvedValueOnce(undefined);

    const { sendVerificationEmailToUser } = await loadModule();
    const result = await sendVerificationEmailToUser("user-boundary");

    expect(result).toEqual({ sent: true, reason: "sent" });
    expect(mockVerificationTokenDeleteMany).toHaveBeenCalledWith({
      where: { userId: "user-boundary" },
    });
    expect(mockSendEmailVerificationEmail).toHaveBeenCalled();
  });

  it("rate-limits when a token was created within the last 24 hours", async () => {
    mockUserFindUnique.mockResolvedValueOnce({
      id: "user-3",
      email: "recent@example.com",
      name: "Recent User",
      emailVerified: false,
    });
    mockVerificationTokenFindFirst.mockResolvedValueOnce({
      createdAt: new Date(Date.now() - 60 * 60 * 1000),
    });

    const { sendVerificationEmailToUser } = await loadModule();
    const result = await sendVerificationEmailToUser("user-3");

    expect(result).toEqual({ sent: false, reason: "rate-limited" });
    expect(mockVerificationTokenDeleteMany).not.toHaveBeenCalled();
    expect(mockSendEmailVerificationEmail).not.toHaveBeenCalled();
  });

  it("sends a new email when the previous token is older than 24 hours", async () => {
    mockUserFindUnique.mockResolvedValueOnce({
      id: "user-4",
      email: "oldtoken@example.com",
      name: "Old Token User",
      emailVerified: false,
    });
    mockVerificationTokenFindFirst.mockResolvedValueOnce({
      createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
    });
    mockSendEmailVerificationEmail.mockResolvedValueOnce(undefined);

    const { sendVerificationEmailToUser } = await loadModule();
    const result = await sendVerificationEmailToUser("user-4");

    expect(result).toEqual({ sent: true, reason: "sent" });
    expect(mockVerificationTokenDeleteMany).toHaveBeenCalledWith({
      where: { userId: "user-4" },
    });
    expect(mockSendEmailVerificationEmail).toHaveBeenCalled();
  });

  it("throws when the user does not exist", async () => {
    mockUserFindUnique.mockResolvedValueOnce(null);

    const { sendVerificationEmailToUser } = await loadModule();
    await expect(sendVerificationEmailToUser("missing-user")).rejects.toThrow(
      "Utilisateur non trouvé"
    );
  });

  it("cleans up the created token if email sending fails", async () => {
    mockUserFindUnique.mockResolvedValueOnce({
      id: "user-5",
      email: "fails@example.com",
      name: "Fails User",
      emailVerified: false,
    });
    mockVerificationTokenFindFirst.mockResolvedValueOnce(null);
    mockSendEmailVerificationEmail.mockRejectedValueOnce(new Error("SMTP down"));

    const { sendVerificationEmailToUser } = await loadModule();
    await expect(sendVerificationEmailToUser("user-5")).rejects.toThrow(
      "Impossible d'envoyer l'email de vérification"
    );

    expect(mockVerificationTokenDeleteMany).toHaveBeenCalledTimes(2);
    const secondCall = mockVerificationTokenDeleteMany.mock.calls[1];
    expect(secondCall[0]).toMatchObject({ where: expect.objectContaining({ token: expect.stringMatching(/^[a-f0-9]{64}$/) }) });
  });
});
