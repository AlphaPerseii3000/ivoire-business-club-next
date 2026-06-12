import { test, expect, hasCredentials, seededIds } from './fixtures/auth';
import { selectors } from './helpers/selectors';

test.describe('Premium access gates', () => {
  test('blocks an AFFRANCHI member from accessing BOSS-only deals', async ({ affranchiPage }) => {
    test.skip(!seededIds.bossOpportunityId, 'Requires E2E_BOSS_OPPORTUNITY_ID.');
    await affranchiPage.goto(`/dashboard/opportunities/${seededIds.bossOpportunityId}`);
    await expect(affranchiPage.locator(selectors.opportunities.tierGate)).toBeVisible();
    await expect(affranchiPage.locator(selectors.premium.upgradeCta)).toHaveAttribute('href', /\/pricing/);
    await expect(affranchiPage.locator('body')).not.toContainText(process.env.E2E_BOSS_SENSITIVE_TEXT ?? 'E2E_BOSS_SENSITIVE_TEXT_NOT_SET');
  });

  test('allows a BOSS member to access BOSS-only deals', async ({ bossPage }) => {
    test.skip(!seededIds.bossOpportunityId, 'Requires E2E_BOSS_OPPORTUNITY_ID.');
    await bossPage.goto(`/dashboard/opportunities/${seededIds.bossOpportunityId}`);
    await expect(bossPage.locator(selectors.opportunities.tierGate)).toHaveCount(0);
    await expect(bossPage.locator(selectors.opportunities.title).or(bossPage.getByRole('heading').first())).toBeVisible();
    await expect(bossPage.getByText(/documents juridiques|contacter|intérêt/i).first()).toBeVisible();
  });

  test('shows upgrade path from AFFRANCHI to higher tiers', async ({ affranchiPage }) => {
    test.skip(!seededIds.bossOpportunityId, 'Requires E2E_BOSS_OPPORTUNITY_ID.');
    await affranchiPage.goto(`/dashboard/opportunities/${seededIds.bossOpportunityId}`);
    await affranchiPage.locator(selectors.premium.upgradeCta).click();
    await affranchiPage.waitForURL(/\/pricing/);
    await expect(affranchiPage.locator(selectors.pricing.grandFrereCard)).toContainText(/49/);
    await expect(affranchiPage.locator(selectors.pricing.bossCard)).toContainText(/99/);
  });

  test('blocks dashboard premium areas for inactive subscriptions', async ({ page }) => {
    test.skip(!hasCredentials('CANCELLED'), 'Requires E2E_CANCELLED_EMAIL/PASSWORD for inactive subscription coverage.');
    const { loginAs, getAccount } = await import('./fixtures/auth');
    await loginAs(page, getAccount('CANCELLED'));
    await page.goto('/dashboard/opportunities');
    await expect(page.locator(selectors.premium.blockedPanel)).toBeVisible();
    await page.goto('/dashboard/matching');
    await expect(page.locator(selectors.premium.blockedPanel)).toBeVisible();
  });
});
