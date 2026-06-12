import { expect, test as base, type Page } from '@playwright/test';
import { selectors } from '../helpers/selectors';

type TestAccount = {
  email: string;
  password: string;
  displayName?: string;
};

type AuthFixtures = {
  adminPage: Page;
  memberPage: Page;
  affranchiPage: Page;
  bossPage: Page;
};

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required E2E environment variable: ${name}`);
  }
  return value;
}

export function hasCredentials(prefix: 'ADMIN' | 'MEMBER' | 'AFFRANCHI' | 'BOSS' | 'GRANDFRERE' | 'CANCELLED'): boolean {
  return Boolean(process.env[`E2E_${prefix}_EMAIL`] && process.env[`E2E_${prefix}_PASSWORD`]);
}

export function getAccount(prefix: 'ADMIN' | 'MEMBER' | 'AFFRANCHI' | 'BOSS' | 'GRANDFRERE' | 'CANCELLED'): TestAccount {
  return {
    email: requiredEnv(`E2E_${prefix}_EMAIL`),
    password: requiredEnv(`E2E_${prefix}_PASSWORD`),
    displayName: process.env[`E2E_${prefix}_NAME`],
  };
}

export const seededIds = {
  bossOpportunityId: process.env.E2E_BOSS_OPPORTUNITY_ID,
  verifiedOpportunityId: process.env.E2E_VERIFIED_OPPORTUNITY_ID,
  pendingOpportunityId: process.env.E2E_PENDING_OPPORTUNITY_ID,
  rejectedOpportunityId: process.env.E2E_REJECTED_OPPORTUNITY_ID,
  opportunityWithDocumentId: process.env.E2E_OPPORTUNITY_WITH_DOCUMENT_ID,
  privateDocumentId: process.env.E2E_PRIVATE_DOCUMENT_ID,
  pendingSubscriptionId: process.env.E2E_PENDING_SUBSCRIPTION_ID,
} as const;

export async function loginAs(page: Page, account: TestAccount) {
  await page.goto('/auth/signin');
  await page.locator(selectors.auth.emailInput).fill(account.email);
  await page.locator(selectors.auth.passwordInput).fill(account.password);
  await page.locator(selectors.auth.signinButton).click();
  await page.waitForURL(/\/dashboard(?:\?.*)?$/, { timeout: 15_000 });
  await expect(page.locator(selectors.dashboard.root).or(page.getByRole('heading', { name: /bienvenue/i }))).toBeVisible();
}

async function loginFixture(page: Page, prefix: 'ADMIN' | 'MEMBER' | 'AFFRANCHI' | 'BOSS') {
  await loginAs(page, getAccount(prefix));
  return page;
}

export const test = base.extend<AuthFixtures>({
  adminPage: async ({ page }, use) => {
    await loginFixture(page, 'ADMIN');
    await use(page);
  },
  memberPage: async ({ page }, use) => {
    await loginFixture(page, hasCredentials('MEMBER') ? 'MEMBER' : 'AFFRANCHI');
    await use(page);
  },
  affranchiPage: async ({ page }, use) => {
    await loginFixture(page, 'AFFRANCHI');
    await use(page);
  },
  bossPage: async ({ page }, use) => {
    await loginFixture(page, 'BOSS');
    await use(page);
  },
});

export { expect };
