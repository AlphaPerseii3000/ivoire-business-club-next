import { expect, test } from '@playwright/test';

test.describe('Bank transfer subscription flow', () => {
  test.fixme('displays virement instructions from pricing flow', async ({ page }) => {
    // TODO: Navigate from /pricing to /pricing/virement for each tier.
    // TODO: Assert bank transfer instructions, amount, beneficiary, and reference are visible.
    // TODO: Verify instructions differ or include tier context for AFFRANCHI, GRAND_FRERE, and BOSS.
    await page.goto('/pricing/virement');
    await expect(page).toHaveURL(/\/pricing\/virement/);
  });

  test.fixme('records a member bank transfer request', async ({ page }) => {
    // TODO: Log in as a member and submit the virement confirmation/request form.
    // TODO: Attach any required proof/reference data.
    // TODO: Assert pending-payment or pending-validation status appears on dashboard.
    await page.goto('/pricing/virement');
    await expect(page).toHaveURL(/\/pricing\/virement/);
  });

  test.fixme('admin validates a pending bank transfer', async ({ page }) => {
    // TODO: Seed or create a pending virement request on the VPS database.
    // TODO: Log in as admin and open the relevant admin validation screen.
    // TODO: Approve the transfer and verify the member subscription tier/status updates.
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin/);
  });

  test.fixme('admin rejects an invalid bank transfer request', async ({ page }) => {
    // TODO: Seed or create an invalid/pending virement request.
    // TODO: Log in as admin, reject it with a reason, and verify the user-facing status/message.
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin/);
  });
});
