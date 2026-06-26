import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSendReminderEmail = vi.hoisted(() => vi.fn(async () => {}));
const mockUserFindMany = vi.hoisted(() => vi.fn());
const mockUserUpdate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/email", () => ({
  sendReminderEmail: mockSendReminderEmail,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: mockUserFindMany,
      update: mockUserUpdate,
    },
  },
}));

import {
  isWithinWindow,
  isSameUtcDate,
  determineReminderType,
  shouldProcessUser,
  sendRemindersToIncompleteUsers,
} from "./reminders.server";

function makeUser(
  overrides: Partial<{
    id: string;
    email: string;
    name: string | null;
    emailVerified: boolean;
    onboardingCompletedAt: Date | null;
    createdAt: Date;
    lastReminderSentAt: Date | null;
    reminderCount: number;
  }> = {}
) {
  const now = new Date("2026-06-26T09:00:00.000Z");
  return {
    id: "user-1",
    email: "test@example.com",
    name: "Jean",
    emailVerified: false,
    onboardingCompletedAt: null,
    createdAt: now,
    lastReminderSentAt: null,
    reminderCount: 0,
    ...overrides,
  };
}

describe("reminder window helpers", () => {
  it("detects age within ±12h window", () => {
    const now = new Date("2026-06-27T09:00:00.000Z");
    const createdAt = new Date("2026-06-26T09:00:00.000Z");
    expect(isWithinWindow(now, createdAt, 1)).toBe(true);
  });

  it("rejects ages outside the window", () => {
    const now = new Date("2026-06-27T09:00:00.000Z");
    const createdAt = new Date("2026-06-24T09:00:00.000Z");
    expect(isWithinWindow(now, createdAt, 1)).toBe(false);
  });

  it("matches same UTC date", () => {
    const a = new Date("2026-06-26T02:00:00.000Z");
    const b = new Date("2026-06-26T22:00:00.000Z");
    expect(isSameUtcDate(a, b)).toBe(true);
  });

  it("does not match different UTC dates", () => {
    const a = new Date("2026-06-26T22:00:00.000Z");
    const b = new Date("2026-06-27T02:00:00.000Z");
    expect(isSameUtcDate(a, b)).toBe(false);
  });
});

describe("determineReminderType", () => {
  it("returns EMAIL_VERIFICATION at J+1 if email is unverified", () => {
    const now = new Date("2026-06-27T09:00:00.000Z");
    const user = makeUser({
      emailVerified: false,
      createdAt: new Date("2026-06-26T09:00:00.000Z"),
    });
    expect(determineReminderType(user, now)).toBe("EMAIL_VERIFICATION");
  });

  it("returns null at J+1 if email is already verified", () => {
    const now = new Date("2026-06-27T09:00:00.000Z");
    const user = makeUser({
      emailVerified: true,
      onboardingCompletedAt: null,
      createdAt: new Date("2026-06-26T09:00:00.000Z"),
    });
    expect(determineReminderType(user, now)).toBe(null);
  });

  it("returns PROFILE_COMPLETION at J+3 if profile incomplete", () => {
    const now = new Date("2026-06-29T09:00:00.000Z");
    const user = makeUser({
      emailVerified: true,
      onboardingCompletedAt: null,
      createdAt: new Date("2026-06-26T09:00:00.000Z"),
    });
    expect(determineReminderType(user, now)).toBe("PROFILE_COMPLETION");
  });

  it("returns null at J+3 if profile already completed", () => {
    const now = new Date("2026-06-29T09:00:00.000Z");
    const user = makeUser({
      emailVerified: false,
      onboardingCompletedAt: new Date("2026-06-27T09:00:00.000Z"),
      createdAt: new Date("2026-06-26T09:00:00.000Z"),
    });
    expect(determineReminderType(user, now)).toBe(null);
  });

  it("returns FINAL_REMINDER at J+7 if anything is incomplete", () => {
    const now = new Date("2026-07-03T09:00:00.000Z");
    const user = makeUser({
      emailVerified: true,
      onboardingCompletedAt: null,
      createdAt: new Date("2026-06-26T09:00:00.000Z"),
    });
    expect(determineReminderType(user, now)).toBe("FINAL_REMINDER");
  });

  it("returns null outside any window", () => {
    const now = new Date("2026-06-28T09:00:00.000Z");
    const user = makeUser({
      emailVerified: false,
      onboardingCompletedAt: null,
      createdAt: new Date("2026-06-26T09:00:00.000Z"),
    });
    expect(determineReminderType(user, now)).toBe(null);
  });
});

describe("shouldProcessUser", () => {
  it("returns false for complete users", () => {
    const now = new Date("2026-06-27T09:00:00.000Z");
    const user = makeUser({
      emailVerified: true,
      onboardingCompletedAt: new Date("2026-06-26T09:00:00.000Z"),
      createdAt: new Date("2026-06-26T09:00:00.000Z"),
    });
    expect(shouldProcessUser(user, now)).toBe(false);
  });

  it("returns false for users older than 7 days", () => {
    const now = new Date("2026-07-04T09:00:00.000Z");
    const user = makeUser({
      createdAt: new Date("2026-06-26T08:00:00.000Z"),
    });
    expect(shouldProcessUser(user, now)).toBe(false);
  });

  it("returns false if already reminded today", () => {
    const now = new Date("2026-06-27T09:00:00.000Z");
    const user = makeUser({
      createdAt: new Date("2026-06-26T09:00:00.000Z"),
      lastReminderSentAt: now,
    });
    expect(shouldProcessUser(user, now)).toBe(false);
  });
});

describe("sendRemindersToIncompleteUsers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends EMAIL_VERIFICATION at J+1, PROFILE_COMPLETION at J+3, FINAL_REMINDER at J+7", async () => {
    const now = new Date("2026-07-03T09:00:00.000Z");

    mockUserFindMany.mockResolvedValue([
      makeUser({
        id: "u1",
        emailVerified: false,
        createdAt: new Date("2026-07-02T09:00:00.000Z"),
      }),
      makeUser({
        id: "u2",
        emailVerified: true,
        onboardingCompletedAt: null,
        createdAt: new Date("2026-06-30T09:00:00.000Z"),
      }),
      makeUser({
        id: "u3",
        emailVerified: false,
        onboardingCompletedAt: null,
        createdAt: new Date("2026-06-26T09:00:00.000Z"),
      }),
    ]);

    const result = await sendRemindersToIncompleteUsers(now);

    expect(result.processed).toBe(3);
    expect(result.sent).toBe(3);
    expect(mockSendReminderEmail).toHaveBeenCalledTimes(3);
    expect(mockUserUpdate).toHaveBeenCalledTimes(3);
    expect(mockSendReminderEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "test@example.com",
        type: "EMAIL_VERIFICATION",
      })
    );
    expect(mockSendReminderEmail).toHaveBeenCalledWith(
      expect.objectContaining({ type: "PROFILE_COMPLETION" })
    );
    expect(mockSendReminderEmail).toHaveBeenCalledWith(
      expect.objectContaining({ type: "FINAL_REMINDER" })
    );
  });

  it("only sends PROFILE_COMPLETION / FINAL_REMINDER when email is verified", async () => {
    const now = new Date("2026-07-03T09:00:00.000Z");

    mockUserFindMany.mockResolvedValue([
      makeUser({
        id: "u1",
        emailVerified: true,
        onboardingCompletedAt: null,
        createdAt: new Date("2026-06-30T09:00:00.000Z"),
      }),
      makeUser({
        id: "u2",
        emailVerified: true,
        onboardingCompletedAt: null,
        createdAt: new Date("2026-06-26T09:00:00.000Z"),
      }),
    ]);

    const result = await sendRemindersToIncompleteUsers(now);

    expect(result.processed).toBe(2);
    expect(result.sent).toBe(2);
    expect(mockSendReminderEmail).toHaveBeenCalledTimes(2);
    const types = mockSendReminderEmail.mock.calls.map(
      (call) => (call[0] as { type: string }).type
    );
    expect(types).not.toContain("EMAIL_VERIFICATION");
  });

  it("does not send duplicate emails same day", async () => {
    const base = new Date("2026-06-26T09:00:00.000Z");
    const now = new Date("2026-06-27T09:00:00.000Z");

    mockUserFindMany.mockResolvedValue([
      makeUser({
        id: "u1",
        emailVerified: false,
        createdAt: base,
        lastReminderSentAt: now,
      }),
    ]);

    const result = await sendRemindersToIncompleteUsers(now);

    expect(result.processed).toBe(0);
    expect(result.sent).toBe(0);
    expect(result.skipped).toBe(1);
    expect(mockSendReminderEmail).not.toHaveBeenCalled();
  });

  it("ignores users older than 7 days", async () => {
    const now = new Date("2026-07-04T09:00:00.000Z");

    mockUserFindMany.mockResolvedValue([
      makeUser({
        id: "u1",
        emailVerified: false,
        createdAt: new Date("2026-06-26T08:00:00.000Z"),
      }),
    ]);

    const result = await sendRemindersToIncompleteUsers(now);

    expect(result.processed).toBe(0);
    expect(result.sent).toBe(0);
    expect(mockSendReminderEmail).not.toHaveBeenCalled();
  });

  it("continues batch when a single email fails", async () => {
    const now = new Date("2026-07-03T09:00:00.000Z");

    mockSendReminderEmail
      .mockRejectedValueOnce(new Error("SMTP down"))
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);

    mockUserFindMany.mockResolvedValue([
      makeUser({
        id: "u1",
        emailVerified: false,
        createdAt: new Date("2026-07-02T09:00:00.000Z"),
      }),
      makeUser({
        id: "u2",
        emailVerified: true,
        onboardingCompletedAt: null,
        createdAt: new Date("2026-06-30T09:00:00.000Z"),
      }),
      makeUser({
        id: "u3",
        emailVerified: false,
        onboardingCompletedAt: null,
        createdAt: new Date("2026-06-26T09:00:00.000Z"),
      }),
    ]);

    const result = await sendRemindersToIncompleteUsers(now);

    expect(result.processed).toBe(3);
    expect(result.sent).toBe(2);
    expect(result.errors).toBe(1);
    expect(mockUserUpdate).toHaveBeenCalledTimes(2);
  });
});
