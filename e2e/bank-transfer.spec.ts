import { test, expect, hasCredentials, seededIds } from './fixtures/auth';
import { selectors } from './helpers/selectors';

const tiers = [
  { testId: selectors.pricing.affranchiCard, label: /Affranchis|AFFRANCHI/i, price: /29/ },
  { testId: selectors.pricing.grandFrereCard, label: /Grands Frères|GRAND/i, price: /49/ },
  { testId: selectors.pricing.bossCard, label: /Boss|BOSS/i, price: /99/ },
];

test.describe('Bank transfer subscription flow', () => {
  test('displays the three pricing tiers with names, prices, and benefits', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.locator(selectors.pricing.grid)).toBeVisible();
    for (const tier of tiers) {
      const card = page.locator(tier.testId);
      await expect(card).toBeVisible();
      await expect(card).toContainText(tier.label);
      await expect(card).toContainText(tier.price);
      await expect(card.getByRole('listitem').first()).toBeVisible();
    }
  });

  test('displays virement instructions from pricing flow', async ({ memberPage }) => {
    await memberPage.goto('/pricing');
    await memberPage.locator(selectors.pricing.bossCard).getByRole('button', { name: /sélectionner/i }).click();
    await memberPage.locator(selectors.pricing.continueButton).click();
    await memberPage.waitForURL(/\/pricing\/virement\?tier=BOSS/);
    await expect(memberPage.locator(selectors.bankTransfer.instructions)).toBeVisible();
    await expect(memberPage.locator(selectors.bankTransfer.beneficiary)).toContainText(/KS Investment|KS/i);
    await expect(memberPage.locator(selectors.bankTransfer.amount)).toContainText(/99/);
    await expect(memberPage.locator(selectors.bankTransfer.reference).first()).toContainText(/IBC-/);
  });

  test('records a member bank transfer request as PENDING/TRIAL without double-submitting in production', async ({ memberPage }) => {
    await memberPage.goto('/pricing/virement?tier=AFFRANCHI');
    await expect(memberPage.locator(selectors.bankTransfer.instructions)).toBeVisible();
    await expect(memberPage.locator(selectors.bankTransfer.confirmButton)).toBeVisible();
    if (process.env.E2E_SUBMIT_TRANSFER === '1') {
      await memberPage.locator(selectors.bankTransfer.confirmButton).click();
      await expect(memberPage.locator(selectors.bankTransfer.confirmation)).toBeVisible();
      await memberPage.goto('/dashboard');
      await expect(memberPage.locator(selectors.dashboard.subscriptionStatus)).toContainText(/attente|essai|pending|trial/i);
    }
  });

  test('admin can view pending transfers and validation controls', async ({ adminPage }) => {
    await adminPage.goto('/admin/subscriptions');
    await expect(adminPage.getByRole('heading', { name: /validation des abonnements/i })).toBeVisible();
    await expect(adminPage.getByRole('region', { name: /virements en attente/i })).toBeVisible();
    if (seededIds.pendingSubscriptionId) {
      await expect(adminPage.locator(`[data-testid="actions-${seededIds.pendingSubscriptionId}"]`)).toContainText(/Valider|Refuser/i);
    }
  });

  test('admin rejection path is exposed for invalid pending transfers', async ({ adminPage }) => {
    test.skip(!hasCredentials('ADMIN'), 'Requires admin credentials.');
    await adminPage.goto('/admin/subscriptions');
    await expect(adminPage.getByText(/Virements en attente|Aucun virement en attente/i)).toBeVisible();
    await expect(adminPage.getByText(/Refuser|Aucun virement en attente/i).first()).toBeVisible();
  });
});
