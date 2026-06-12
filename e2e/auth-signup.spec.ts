import { expect, test } from '@playwright/test';

const tiers = [
  { name: 'AFFRANCHI', price: '€29' },
  { name: 'GRAND_FRERE', price: '€49' },
  { name: 'BOSS', price: '€99' },
] as const;

test.describe('Auth signup flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/signup');
  });

  for (const tier of tiers) {
    test.fixme(`signs up a new ${tier.name} member`, async ({ page }) => {
      // TODO: Create or provision a unique test user for the production VPS database.
      // TODO: Select the ${tier.name} tier (${tier.price}) during signup.
      // TODO: Complete credentials signup and verify the expected redirect/payment step.
      // TODO: Assert the member lands on /dashboard with the correct tier displayed.
      await expect(page).toHaveURL(/\/auth\/signup/);
    });
  }

  test.fixme('supports Google OAuth signup entry point', async ({ page }) => {
    // TODO: Verify Google OAuth button is visible and initiates Auth.js v5 OAuth flow.
    // TODO: Use a dedicated test OAuth account or mocked/staged OAuth flow if available.
    await expect(page.getByRole('button', { name: /google/i })).toBeVisible();
  });

  test.fixme('validates required signup fields and duplicate credentials', async ({ page }) => {
    // TODO: Submit an empty signup form and assert validation messages.
    // TODO: Attempt signup with an existing email and assert duplicate-account feedback.
    await expect(page).toHaveURL(/\/auth\/signup/);
  });
});
