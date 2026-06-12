import { test, expect } from './fixtures/auth';

const reviewOpportunityId = process.env.E2E_REVIEW_OPPORTUNITY_ID;
const revieweeMemberId = process.env.E2E_REVIEWEE_MEMBER_ID;
const reviewComment = process.env.E2E_REVIEW_COMMENT ?? `Avis E2E ${Date.now()} — échange fiable et professionnel.`;

test.describe('Reviews and reputation', () => {
  test('creating a review with rating and comment is visible on recipient profile', async ({ memberPage }) => {
    test.skip(process.env.E2E_CREATE_REVIEW !== '1', 'Set E2E_CREATE_REVIEW=1 only when creating an idempotent review is allowed.');
    test.skip(!reviewOpportunityId || !revieweeMemberId, 'Requires E2E_REVIEW_OPPORTUNITY_ID and E2E_REVIEWEE_MEMBER_ID.');

    await memberPage.goto(`/dashboard/opportunities/${reviewOpportunityId}`);
    await expect(memberPage.getByRole('heading', { name: /laisser un avis/i })).toBeVisible();
    await memberPage.getByRole('radio', { name: /5 étoiles/i }).click();
    await memberPage.getByLabel(/commentaire/i).fill(reviewComment);
    await memberPage.getByRole('button', { name: /soumettre mon avis/i }).click();
    await expect(memberPage.getByText(/avis a été enregistré/i)).toBeVisible();

    await memberPage.goto(`/members/${revieweeMemberId}`);
    await expect(memberPage.getByText(reviewComment).first()).toBeVisible();
  });

  test('IBC reliability score is updated after review', async ({ memberPage }) => {
    const targetMemberId = revieweeMemberId ?? process.env.E2E_REPUTATION_MEMBER_ID;
    test.skip(!targetMemberId, 'Requires E2E_REVIEWEE_MEMBER_ID or E2E_REPUTATION_MEMBER_ID.');

    await memberPage.goto(`/members/${targetMemberId}`);
    await expect(memberPage.getByText(/score de fiabilité|avis reçu|réputation|avis et réputation/i).first()).toBeVisible();
    await expect(memberPage.getByText(/\d+(?:[,.]\d+)?\s*\/\s*5|aucun avis|avis reçu/i).first()).toBeVisible();
  });
});
