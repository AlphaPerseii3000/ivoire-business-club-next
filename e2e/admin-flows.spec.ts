import { test, expect, hasCredentials } from './fixtures/auth';

const managedMemberLookup = process.env.E2E_ADMIN_MANAGED_MEMBER_EMAIL ?? process.env.E2E_ADMIN_MANAGED_MEMBER_NAME;

test.describe('Admin flows', () => {
  test('admin accesses dashboard kanban with visible columns', async ({ adminPage }) => {
    await adminPage.goto('/admin/opportunities');
    await expect(adminPage.getByRole('heading', { name: /workflow de vérification/i })).toBeVisible();
    await expect(adminPage.getByText(/en attente|pending/i).first()).toBeVisible();
    await expect(adminPage.getByText(/en cours|vérifié|verified|refusé|rejected/i).first()).toBeVisible();
  });

  test('admin manages members by suspending and reactivating a seeded member', async ({ adminPage }) => {
    test.skip(!managedMemberLookup, 'Requires E2E_ADMIN_MANAGED_MEMBER_EMAIL or E2E_ADMIN_MANAGED_MEMBER_NAME for safe member status mutation.');

    await adminPage.goto('/admin/members');
    await expect(adminPage.getByRole('heading', { name: /membres/i })).toBeVisible();
    const row = adminPage.getByRole('row').filter({ hasText: managedMemberLookup! }).first();
    await expect(row).toBeVisible();

    const reactivateButton = row.getByRole('button', { name: /réactiver/i });
    if (await reactivateButton.isVisible().catch(() => false)) {
      await reactivateButton.click();
      await expect(row.getByText(/compte réactivé|actif/i).first()).toBeVisible();
      await adminPage.reload();
    }

    const refreshedRow = adminPage.getByRole('row').filter({ hasText: managedMemberLookup! }).first();
    await refreshedRow.getByRole('button', { name: /suspendre/i }).click();
    await adminPage.getByRole('button', { name: /confirmer la suspension/i }).click();
    await expect(adminPage.getByText(/compte suspendu|suspendu/i).first()).toBeVisible();

    await adminPage.reload();
    const suspendedRow = adminPage.getByRole('row').filter({ hasText: managedMemberLookup! }).first();
    await suspendedRow.getByRole('button', { name: /réactiver/i }).click();
    await expect(adminPage.getByText(/compte réactivé|actif/i).first()).toBeVisible();
  });

  test('admin consults audit logs with filters', async ({ adminPage }) => {
    await adminPage.goto('/admin/audit');
    await expect(adminPage.getByRole('heading', { name: /journal d.audit/i })).toBeVisible();
    await expect(adminPage.getByRole('heading', { name: /filtres/i })).toBeVisible();

    await adminPage.getByLabel(/action/i).fill(process.env.E2E_AUDIT_ACTION_FILTER ?? 'SUBSCRIPTION');
    await adminPage.getByRole('button', { name: /filtrer/i }).click();
    await expect(adminPage).toHaveURL(/\/admin\/audit\?/);
    await expect(adminPage.getByText(/événement|aucun événement|journal d.audit/i).first()).toBeVisible();
  });

  test('non-admin member is redirected or denied from admin routes', async ({ memberPage }) => {
    test.skip(!hasCredentials('MEMBER') && !hasCredentials('AFFRANCHI'), 'Requires member credentials.');
    await memberPage.goto('/admin');
    await expect(memberPage).toHaveURL(/\/dashboard(?:\?.*)?$/);
    await expect(memberPage.getByRole('heading', { name: /bienvenue|dashboard|tableau de bord/i }).or(memberPage.locator('[data-testid="dashboard-page"]'))).toBeVisible();
  });
});
