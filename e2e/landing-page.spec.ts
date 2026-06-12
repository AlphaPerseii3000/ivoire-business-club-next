import { expect, test } from '@playwright/test';
import { selectors } from './helpers/selectors';

test.describe('Landing page', () => {
  test('public deal teasers are visible without authentication', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /aperçu des opportunités/i })).toBeVisible();
    await expect(page.locator(selectors.opportunities.card).first().or(page.getByText(/aucun teaser vérifié/i))).toBeVisible();
  });

  test('three pricing tiers are displayed', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/€29|29\s*€/i).first()).toBeVisible();
    await expect(page.getByText(/€49|49\s*€/i).first()).toBeVisible();
    await expect(page.getByText(/€99|99\s*€/i).first()).toBeVisible();
  });

  test('CTA signup and pricing links work', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /rejoins le club/i }).first().click();
    await expect(page).toHaveURL(/\/auth\/signup/);

    await page.goto('/');
    await page.getByRole('link', { name: /tarifs/i }).click();
    await expect(page).toHaveURL(/\/#pricing$/);
    await expect(page.getByRole('heading', { name: /nos offres/i }).or(page.getByText(/adhésion au club/i))).toBeVisible();
  });

  test('responsive mobile viewport keeps signup CTA and pricing visible', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /bâtir son futur/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /rejoins le club/i }).first()).toBeVisible();
    await page.locator('#pricing').scrollIntoViewIfNeeded();
    await expect(page.locator(selectors.pricing.grid)).toBeVisible();
  });
});
