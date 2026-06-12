import { expect } from '@playwright/test';
import { getAccount, hasCredentials, loginAs, test } from './fixtures/auth';
import { selectors } from './helpers/selectors';

test.describe('Account deletion RGPD', () => {
  test('request account deletion, confirm, and account is anonymized/inaccessible', async ({ page }) => {
    test.skip(process.env.E2E_DELETE_ACCOUNT !== '1', 'Set E2E_DELETE_ACCOUNT=1 only for a disposable account prepared for deletion.');
    test.skip(!hasCredentials('CANCELLED'), 'Requires disposable E2E_CANCELLED_EMAIL/PASSWORD credentials.');

    const disposableAccount = getAccount('CANCELLED');
    await loginAs(page, disposableAccount);
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: /paramètres/i })).toBeVisible();

    await page.getByRole('button', { name: /^supprimer mon compte$/i }).click();
    await expect(page.getByRole('dialog', { name: /supprimer mon compte/i })).toBeVisible();
    await page.getByLabel(/tapez/i).fill('SUPPRIMER');
    await page.getByRole('button', { name: /supprimer définitivement/i }).click();

    await expect(page).toHaveURL(/\/$|\/auth\/signin/);

    await page.goto('/auth/signin');
    await page.locator(selectors.auth.emailInput).fill(disposableAccount.email);
    await page.locator(selectors.auth.passwordInput).fill(disposableAccount.password);
    await page.locator(selectors.auth.signinButton).click();
    await expect(page.locator(selectors.auth.authError).or(page.getByText(/identifiants|invalide|erreur|incorrect/i).first())).toBeVisible();
  });
});
