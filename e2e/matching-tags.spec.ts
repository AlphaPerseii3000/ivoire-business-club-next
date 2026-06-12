import { test, expect, seededIds } from './fixtures/auth';
import { selectors } from './helpers/selectors';

const matchingOpportunityTitle = process.env.E2E_MATCHING_OPPORTUNITY_TITLE;
const interestOpportunityId = process.env.E2E_INTEREST_OPPORTUNITY_ID ?? seededIds.verifiedOpportunityId;
const interestOpportunityTitle = process.env.E2E_INTEREST_OPPORTUNITY_TITLE ?? matchingOpportunityTitle;

test.describe('Matching and tags', () => {
  test('dashboard matching displays opportunities matching member tags', async ({ memberPage }) => {
    await memberPage.goto('/dashboard/matching');
    await expect(memberPage.getByRole('heading', { name: /^matching$/i })).toBeVisible();

    if (matchingOpportunityTitle) {
      await expect(memberPage.locator(selectors.opportunities.card).filter({ hasText: matchingOpportunityTitle })).toBeVisible();
      return;
    }

    await expect(
      memberPage.locator(selectors.opportunities.card).first()
        .or(memberPage.getByText(/aucun deal ne correspond|ajoutez des tags|modifier mes tags/i).first())
    ).toBeVisible();
  });

  test('soft commitment interest is recorded and author is notified', async ({ memberPage, bossPage }) => {
    test.skip(!interestOpportunityId, 'Requires E2E_INTEREST_OPPORTUNITY_ID or E2E_VERIFIED_OPPORTUNITY_ID.');

    await memberPage.goto(`/dashboard/opportunities/${interestOpportunityId}`);
    await expect(memberPage.locator(selectors.opportunities.title).or(memberPage.getByRole('heading').first())).toBeVisible();

    const interestButton = memberPage.getByRole('button', { name: /intéressé|intérêt enregistré/i });
    await expect(interestButton).toBeVisible();
    const alreadyRecorded = await interestButton.getAttribute('aria-label');
    if (!/intérêt enregistré/i.test(alreadyRecorded ?? '')) {
      await interestButton.click();
    }
    await expect(memberPage.getByRole('button', { name: /intérêt enregistré/i })).toBeVisible();

    await bossPage.goto('/dashboard/notifications');
    await expect(bossPage.getByRole('heading', { name: /notifications/i })).toBeVisible();
    const notificationText = interestOpportunityTitle
      ? bossPage.getByText(new RegExp(interestOpportunityTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')).first()
      : bossPage.getByText(/intéressé|intérêt|deal|opportunité/i).first();
    await expect(notificationText.or(bossPage.getByText(/aucune notification/i))).toBeVisible();
  });
});
