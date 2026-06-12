import { test, expect, getAccount, hasCredentials } from './fixtures/auth';
import { selectors } from './helpers/selectors';
import { uniqueE2ELabel } from './fixtures/seed';

test.describe('Auth signup and signin flows', () => {
  test('validates required signup fields', async ({ page }) => {
    await page.goto('/auth/signup');
    await page.locator(selectors.auth.signupButton).click();
    await expect(page.getByText(/email invalide/i)).toBeVisible();
    await expect(page.getByText(/mot de passe.*8 caractères/i)).toBeVisible();
    await expect(page.getByText(/nom.*2 caractères/i)).toBeVisible();
  });

  test('signs up a new AFFRANCHI member with unique credentials', async ({ page }, testInfo) => {
    test.skip(!process.env.E2E_ENABLE_SIGNUP_CREATE, 'Set E2E_ENABLE_SIGNUP_CREATE=1 only on environments where creating a unique user is allowed.');
    const email = `e2e-${Date.now()}-${testInfo.workerIndex}@example.com`;
    await page.goto('/auth/signup');
    await page.locator(selectors.auth.nameInput).fill(uniqueE2ELabel('E2E AFFRANCHI'));
    await page.locator(selectors.auth.emailInput).fill(email);
    await page.locator(selectors.auth.passwordInput).fill(process.env.E2E_NEW_USER_PASSWORD ?? 'E2E-Password-123!');
    await page.locator(selectors.auth.signupButton).click();
    await page.waitForURL(/\/dashboard(?:\?.*)?$/, { timeout: 20_000 });
    await expect(page.locator(selectors.dashboard.tier)).toContainText(/Affranchi|AFFRANCHI/i);
  });

  test('shows duplicate-account feedback for an existing email', async ({ page }) => {
    test.skip(!hasCredentials('AFFRANCHI'), 'Requires E2E_AFFRANCHI_EMAIL/PASSWORD.');
    await page.goto('/auth/signup');
    await page.locator(selectors.auth.nameInput).fill('Duplicate E2E');
    await page.locator(selectors.auth.emailInput).fill(getAccount('AFFRANCHI').email);
    await page.locator(selectors.auth.passwordInput).fill('E2E-Password-123!');
    await page.locator(selectors.auth.signupButton).click();
    await expect(page.locator(selectors.auth.authError)).toContainText(/existe|déjà|compte/i);
  });

  test('signs in with valid credentials and shows dashboard tier', async ({ memberPage }) => {
    await expect(memberPage).toHaveURL(/\/dashboard/);
    await expect(memberPage.locator(selectors.dashboard.userName)).toBeVisible();
    await expect(memberPage.locator(selectors.dashboard.tier)).toBeVisible();
  });

  test('rejects invalid signin without revealing whether email exists', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.locator(selectors.auth.emailInput).fill('missing-e2e-user@example.com');
    await page.locator(selectors.auth.passwordInput).fill('wrong-password');
    await page.locator(selectors.auth.signinButton).click();
    await expect(page.locator(selectors.auth.authError)).toContainText(/email ou mot de passe incorrect/i);
    await expect(page.locator(selectors.auth.authError)).not.toContainText(/n.existe pas|introuvable/i);
  });

  test('shows Google OAuth signup entry point', async ({ page }) => {
    await page.goto('/auth/signup');
    await expect(page.locator(selectors.auth.googleButton)).toBeVisible();
    await expect(page.locator(selectors.auth.googleButton)).toContainText(/google/i);
  });

  test('redirects unauthenticated protected routes to signin', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL(/\/auth\/signin/);
  });

  test('redirects authenticated users away from signin', async ({ memberPage }) => {
    await memberPage.goto('/auth/signin');
    await memberPage.waitForURL(/\/dashboard/);
  });
});
