import { test, expect } from './fixtures/auth';

const notificationTitle = process.env.E2E_NOTIFICATION_TITLE;

test.describe('Notifications', () => {
  test('displays unread notifications', async ({ bossPage }) => {
    await bossPage.goto('/dashboard/notifications');
    await expect(bossPage.getByRole('heading', { name: /vos notifications/i })).toBeVisible();

    if (notificationTitle) {
      await expect(bossPage.getByText(notificationTitle).first()).toBeVisible();
      await expect(bossPage.getByText(/non lu/i).first()).toBeVisible();
      return;
    }

    await expect(bossPage.getByText(/non lu/i).first().or(bossPage.getByText(/aucune notification/i))).toBeVisible();
  });

  test('marks notification as read after click', async ({ bossPage }) => {
    test.skip(!notificationTitle, 'Requires E2E_NOTIFICATION_TITLE for deterministic read-state assertion.');

    await bossPage.goto('/dashboard/notifications');
    const notification = bossPage.getByRole('link').filter({ hasText: notificationTitle! }).first();
    await expect(notification).toBeVisible();
    await expect(notification).toContainText(/non lu/i);
    await notification.click();

    await bossPage.goto('/dashboard/notifications');
    await expect(bossPage.getByRole('link').filter({ hasText: notificationTitle! }).first()).not.toContainText(/non lu/i);
  });
});
