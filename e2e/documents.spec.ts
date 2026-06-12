import { test, expect, seededIds } from './fixtures/auth';
import { selectors } from './helpers/selectors';

test.describe('Documents upload and permissions', () => {
  test('uploads or stages a member document from the opportunity form', async ({ memberPage }) => {
    await memberPage.goto('/dashboard/opportunities/new');
    await expect(memberPage.locator(selectors.documents.section)).toBeVisible();
    await expect(memberPage.locator(selectors.documents.uploadButton)).toBeVisible();
    if (process.env.E2E_UPLOAD_DOCUMENT === '1') {
      const buffer = Buffer.from('%PDF-1.4\n% E2E safe PDF fixture\n');
      await memberPage.locator(selectors.documents.uploadInput).setInputFiles({
        name: 'ibc-e2e-document.pdf',
        mimeType: 'application/pdf',
        buffer,
      });
      await expect(memberPage.getByText(/ibc-e2e-document\.pdf|document prêt/i)).toBeVisible();
    }
  });

  test('prevents unauthorized users from viewing private documents', async ({ memberPage, request }) => {
    test.skip(!seededIds.opportunityWithDocumentId || !seededIds.privateDocumentId, 'Requires E2E_OPPORTUNITY_WITH_DOCUMENT_ID and E2E_PRIVATE_DOCUMENT_ID.');
    const response = await request.get(`/api/opportunities/${seededIds.opportunityWithDocumentId}/documents/${seededIds.privateDocumentId}/preview`);
    expect([401, 403, 404]).toContain(response.status());
    await memberPage.goto(`/dashboard/opportunities/${seededIds.opportunityWithDocumentId}`);
    await expect(memberPage.locator(selectors.documents.hiddenMetadata).or(memberPage.getByText(/accès|réservé|introuvable/i))).toBeVisible();
  });

  test('allows admins to review uploaded documents', async ({ adminPage }) => {
    await adminPage.goto('/admin/opportunities');
    await expect(adminPage.getByRole('heading', { name: /workflow de vérification/i })).toBeVisible();
    await expect(adminPage.getByText(/document|documents|Aucun/i).first()).toBeVisible();
  });

  test('validates file type restrictions before upload', async ({ memberPage }) => {
    await memberPage.goto('/dashboard/opportunities/new');
    await memberPage.locator(selectors.documents.uploadInput).setInputFiles({
      name: 'unsupported.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('not a legal document'),
    });
    await expect(memberPage.getByText(/type de fichier non supporté/i)).toBeVisible();
  });
});
