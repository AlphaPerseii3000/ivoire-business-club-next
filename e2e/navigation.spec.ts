import { expect, test } from '@playwright/test';
import { test as authTest } from './fixtures/auth';
import { selectors } from './helpers/selectors';

for (const route of ['/dashboard', '/profile', '/settings']) {
  test(`unauthenticated users are redirected from ${route} to signin`, async ({ page }) => {
    await page.goto(route);
    await expect(page).toHaveURL(/\/auth\/signin/);
    await expect(page.locator(selectors.auth.emailInput)).toBeVisible();
  });
}

authTest('authenticated user visiting signin is redirected to dashboard', async ({ memberPage }) => {
  await memberPage.goto('/auth/signin');
  await expect(memberPage).toHaveURL(/\/dashboard(?:\?.*)?$/);
  await expect(memberPage.locator(selectors.dashboard.root).or(memberPage.getByRole('heading', { name: /bienvenue/i }))).toBeVisible();
});
