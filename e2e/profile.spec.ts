import { test, expect } from './fixtures/auth';

const editedName = process.env.E2E_PROFILE_EDIT_NAME ?? 'Membre E2E IBC';
const editedBio = process.env.E2E_PROFILE_EDIT_BIO ?? `Bio E2E mise à jour ${Date.now()}`;

test.describe('Profile', () => {
  test('displays profile info including name, bio and tags area', async ({ memberPage }) => {
    await memberPage.goto('/profile');
    await expect(memberPage.getByRole('heading', { name: /mon profil/i })).toBeVisible();
    const nameInput = memberPage.getByLabel(/nom complet/i);
    await expect(nameInput).toBeVisible();
    await expect(nameInput).not.toHaveValue('');
    await expect(memberPage.getByLabel(/bio/i)).toBeVisible();
    await expect(memberPage.getByText(/tags|secteurs|montants|localisations/i).first()).toBeVisible();
  });

  test('edits profile and persists after reload', async ({ memberPage }) => {
    test.skip(process.env.E2E_EDIT_PROFILE !== '1', 'Set E2E_EDIT_PROFILE=1 only when mutating the reusable member profile is allowed.');

    await memberPage.goto('/profile');
    await memberPage.getByLabel(/nom complet/i).fill(editedName);
    await memberPage.getByLabel(/bio/i).fill(editedBio);
    await memberPage.getByRole('button', { name: /sauvegarder/i }).click();
    await expect(memberPage.getByText(/profil mis à jour|succès/i).first()).toBeVisible();

    await memberPage.reload();
    await expect(memberPage.getByLabel(/nom complet/i)).toHaveValue(editedName);
    await expect(memberPage.getByLabel(/bio/i)).toHaveValue(editedBio);
  });
});
