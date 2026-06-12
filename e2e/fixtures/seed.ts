export type SeededTestData = {
  accounts: {
    admin: string;
    affranchi: string;
    grandFrere: string;
    boss: string;
    cancelled?: string;
  };
  opportunities: {
    bossOnlyVerified?: string;
    verifiedWithDocument?: string;
    pendingForAdminReview?: string;
    rejectedForVisibility?: string;
  };
};

/**
 * Production VPS E2E strategy:
 * - Do not seed or truncate the production database from tests.
 * - Use pre-created, durable test accounts and fixture records referenced by env vars.
 * - Mutating tests must create uniquely named records and leave them safe to ignore, or run
 *   only against a local/staging BASE_URL where cleanup is allowed.
 */
export const seedPolicy = {
  productionSeeding: false,
  idempotentRecordsOnly: true,
  envFile: 'e2e/.env.test',
} as const;

export function uniqueE2ELabel(prefix: string) {
  return `${prefix} ${new Date().toISOString()} ${Math.random().toString(36).slice(2, 8)}`;
}

export function isLocalBaseURL(baseURL?: string) {
  const value = baseURL ?? process.env.BASE_URL ?? '';
  return /localhost|127\.0\.0\.1/.test(value);
}
