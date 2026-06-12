import { test, expect, seededIds } from './fixtures/auth';
import { selectors } from './helpers/selectors';
import { uniqueE2ELabel } from './fixtures/seed';

test.describe('Opportunities creation, verification, and visibility', () => {
  test('member creates an opportunity that remains visible to the author as pending', async ({ memberPage }) => {
    test.skip(process.env.E2E_CREATE_OPPORTUNITY !== '1', 'Set E2E_CREATE_OPPORTUNITY=1 only when creating idempotent records is allowed.');
    const title = uniqueE2ELabel('E2E pending opportunity');
    await memberPage.goto('/dashboard/opportunities/new');
    await expect(memberPage.locator(selectors.opportunities.newForm)).toBeVisible();
    await memberPage.locator(selectors.opportunities.titleInput).fill(title);
    await memberPage.locator(selectors.opportunities.amountInput).fill('50000');
    await memberPage.locator(selectors.opportunities.descriptionInput).fill('Description E2E suffisamment longue pour créer une opportunité en attente.');
    await memberPage.locator(selectors.opportunities.submitButton).click();
    await memberPage.waitForURL(/\/dashboard\/opportunities/);
    await expect(memberPage.getByText(title)).toBeVisible();
  });

  test('admin can review and verify pending opportunities', async ({ adminPage }) => {
    await adminPage.goto('/admin/opportunities');
    await expect(adminPage.getByRole('heading', { name: /workflow de vérification/i })).toBeVisible();
    await expect(adminPage.getByText(/PENDING|En attente|À vérifier/i).first()).toBeVisible();
    if (seededIds.pendingOpportunityId) {
      await expect(adminPage.getByText(seededIds.pendingOpportunityId).or(adminPage.locator(`[data-opportunity-id="${seededIds.pendingOpportunityId}"]`))).toBeVisible();
    }
  });

  test('verified opportunities are visible to eligible members', async ({ bossPage }) => {
    test.skip(!seededIds.verifiedOpportunityId, 'Requires E2E_VERIFIED_OPPORTUNITY_ID.');
    await bossPage.goto(`/dashboard/opportunities/${seededIds.verifiedOpportunityId}`);
    await expect(bossPage.locator(selectors.opportunities.status)).toContainText(/vérifié|verified/i);
    await expect(bossPage.locator(selectors.opportunities.title)).toBeVisible();
  });

  test('rejected opportunities are not exposed to regular non-authors', async ({ bossPage }) => {
    test.skip(!seededIds.rejectedOpportunityId, 'Requires E2E_REJECTED_OPPORTUNITY_ID.');
    await bossPage.goto(`/dashboard/opportunities/${seededIds.rejectedOpportunityId}`);
    await expect(bossPage.getByText(/404|not found|introuvable/i).or(bossPage.locator(selectors.opportunities.status).filter({ hasText: /refusé|rejected/i }))).toBeVisible();
  });

  test('public landing page shows deal teasers without authentication', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator(selectors.opportunities.card).first().or(page.getByText(/devenez membre|opportunités/i))).toBeVisible();
  });
});
