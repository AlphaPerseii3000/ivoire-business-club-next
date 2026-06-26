import { prisma } from "@/lib/prisma";
import { sendReminderEmail } from "@/lib/email";
import { sanitizeError } from "@/lib/sanitize-log";

export const REMINDER_TYPES = [
  "EMAIL_VERIFICATION",
  "PROFILE_COMPLETION",
  "FINAL_REMINDER",
] as const;

export type ReminderType = (typeof REMINDER_TYPES)[number];

export type ReminderUser = {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  onboardingCompletedAt: Date | null;
  createdAt: Date;
  lastReminderSentAt: Date | null;
  reminderCount: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_MS = 12 * 60 * 60 * 1000;
const MAX_AGE_DAYS = 7;

function floorDays(ms: number): number {
  return Math.floor(ms / DAY_MS);
}

export function isWithinWindow(
  now: Date,
  createdAt: Date,
  targetAgeDays: number
): boolean {
  const ageMs = now.getTime() - createdAt.getTime();
  const targetMs = targetAgeDays * DAY_MS;
  return Math.abs(ageMs - targetMs) <= WINDOW_MS;
}

export function isSameUtcDate(a: Date | null, b: Date | null): boolean {
  if (!a || !b) return false;
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

export function determineReminderType(
  user: Pick<
    ReminderUser,
    "emailVerified" | "onboardingCompletedAt" | "createdAt"
  >,
  now: Date
): ReminderType | null {
  // J+1: email verification only if still unverified
  if (
    user.emailVerified === false &&
    isWithinWindow(now, user.createdAt, 1)
  ) {
    return "EMAIL_VERIFICATION";
  }

  // J+3: profile completion only if still incomplete
  if (
    user.onboardingCompletedAt === null &&
    isWithinWindow(now, user.createdAt, 3)
  ) {
    return "PROFILE_COMPLETION";
  }

  // J+7: final reminder if anything is still incomplete
  if (
    isWithinWindow(now, user.createdAt, 7) &&
    (user.emailVerified === false || user.onboardingCompletedAt === null)
  ) {
    return "FINAL_REMINDER";
  }

  return null;
}

export function shouldProcessUser(
  user: Pick<
    ReminderUser,
    "emailVerified" | "onboardingCompletedAt" | "createdAt" | "lastReminderSentAt"
  >,
  now: Date
): { type: ReminderType } | false {
  if (user.emailVerified === true && user.onboardingCompletedAt !== null) {
    return false;
  }

  const ageMs = now.getTime() - user.createdAt.getTime();
  if (floorDays(ageMs) > MAX_AGE_DAYS) {
    return false;
  }

  if (isSameUtcDate(user.lastReminderSentAt, now)) {
    return false;
  }

  const type = determineReminderType(user, now);
  if (!type) {
    return false;
  }

  return { type };
}

export async function findIncompleteUsersForReminders(now: Date): Promise<ReminderUser[]> {
  const cutoff = new Date(now.getTime() - MAX_AGE_DAYS * DAY_MS - WINDOW_MS);

  const users = await prisma.user.findMany({
    where: {
      createdAt: { gte: cutoff },
      OR: [{ emailVerified: false }, { onboardingCompletedAt: null }],
    },
    select: {
      id: true,
      email: true,
      name: true,
      emailVerified: true,
      onboardingCompletedAt: true,
      createdAt: true,
      lastReminderSentAt: true,
      reminderCount: true,
    },
  });

  return users;
}

export type ReminderResult = {
  processed: number;
  sent: number;
  skipped: number;
  errors: number;
};

export async function sendRemindersToIncompleteUsers(
  now: Date = new Date()
): Promise<ReminderResult> {
  const users = await findIncompleteUsersForReminders(now);

  let processed = 0;
  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const user of users) {
    const decision = shouldProcessUser(user, now);
    if (!decision) {
      skipped++;
      continue;
    }

    processed++;

    try {
      await sendReminderEmail({
        to: user.email,
        name: user.name,
        type: decision.type,
      });

      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastReminderSentAt: now,
          reminderCount: { increment: 1 },
        },
      });

      sent++;
    } catch (error) {
      errors++;
      console.error(
        `[reminders.server] Failed to send reminder to user ${user.id}:`,
        sanitizeError(error)
      );
    }
  }

  return { processed, sent, skipped, errors };
}
