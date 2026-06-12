import { expect, test } from '@playwright/test';

test.describe('Admin flows', () => {
  test.fixme('logs in as an administrator and opens the admin panel', async ({ page }) => {
    // TODO: Log in with a seeded admin credentials account.
    // TODO: Navigate to /admin and assert admin navigation/dashboard widgets are visible.
    // TODO: Verify non-admin accounts are redirected or denied access to /admin.
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin/);
  });

  test.fixme('verifies a submitted opportunity', async ({ page }) => {
    // TODO: Seed or submit a pending opportunity from a member account.
    // TODO: Log in as admin and approve/verify the opportunity.
    // TODO: Assert the opportunity appears as verified to eligible members.
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin/);
  });

  test.fixme('rejects or requests changes for an opportunity', async ({ page }) => {
    // TODO: Seed a pending opportunity that should be rejected or sent back for changes.
    // TODO: Log in as admin, apply rejection/change request, and assert member notification/status.
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin/);
  });

  test.fixme('manages member subscription tier and status', async ({ page }) => {
    // TODO: Log in as admin and locate a seeded member account.
    // TODO: Change subscription tier between AFFRANCHI, GRAND_FRERE, and BOSS.
    // TODO: Verify dashboard access and premium gates reflect the updated tier.
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin/);
  });
});
