import { expect, test } from './fixtures/auth';

test.describe('Articles, SEO et Navigation', () => {
  test.setTimeout(90000);

  test('Test de navigation : le clic sur le lien Articles de la landing page mene a /articles', async ({ page }) => {
    await page.goto('/');
    
    // Find the link "Articles" in the header and click it
    const articlesLink = page.locator('header').getByRole('link', { name: /^articles$/i }).first();
    await expect(articlesLink).toBeVisible();
    await articlesLink.click();
    
    await page.waitForURL(/\/articles/);
    await expect(page).toHaveURL(/\/articles/);
    await expect(page.getByRole('heading', { name: /Le Catalogue IBC/i })).toBeVisible();
  });

  test('Test de la landing page : la section Derniers articles est visible et affiche les articles publics', async ({ page }) => {
    await page.goto('/');
    
    // Check if the section "Actualités & Conseils" / "Derniers articles" is visible
    const sectionTitle = page.getByRole('heading', { name: /Derniers articles/i });
    await expect(sectionTitle).toBeVisible();
    
    // The seeded public article should be visible in the section
    const publicArticleTitle = page.getByRole('heading', { name: /Guide de l'Investisseur Débutant/i });
    await expect(publicArticleTitle).toBeVisible();
  });

  test('Test de la Gate Premium : visiteur anonyme sur un article public vs premium', async ({ page }) => {
    // 1. Public article: readable entirely, gate is NOT visible
    await page.goto('/articles/guide-de-l-investisseur-debutant');
    
    // Title should be visible
    await expect(page.getByRole('heading', { name: "Guide de l'Investisseur Débutant" })).toBeVisible();
    
    // Content should be visible
    await expect(page.getByText("Ce guide couvre les bases fondamentales de l'investissement")).toBeVisible();
    
    // Premium gate should not be visible
    await expect(page.locator('[data-testid="gate-panel"]')).toHaveCount(0);

    // 2. Premium article: excerpt is visible, gate panel IS visible, premium content is NOT visible
    await page.goto('/articles/opportunites-immobilieres-a-abidjan');
    
    // Title should be visible
    await expect(page.getByRole('heading', { name: "Opportunités Immobilières à Abidjan" })).toBeVisible();
    
    // Excerpt should be visible
    await expect(page.getByText("Analyse complète du marché immobilier résidentiel")).toBeVisible();
    
    // Gate panel must be visible
    await expect(page.locator('[data-testid="gate-panel"]')).toBeVisible();
    await expect(page.getByText(/Cet article est réservé aux membres Premium/i)).toBeVisible();
    
    // Detailed content must not be visible
    await expect(page.getByText("Les quartiers en forte croissance comme Cocody")).toHaveCount(0);
  });

  test('Test des metadonnees SEO et JSON-LD sur la page de detail', async ({ page }) => {
    await page.goto('/articles/guide-de-l-investisseur-debutant');

    // 1. Verify Page Title
    await expect(page).toHaveTitle("Guide de l'Investisseur Débutant — Ivoire Business Club");

    // 2. Verify Meta tags
    const descriptionMeta = page.locator('meta[name="description"]');
    await expect(descriptionMeta).toHaveAttribute('content', "Découvrez les bases de l'investissement dans la sous-région ouest-africaine.");

    const ogTitleMeta = page.locator('meta[property="og:title"]');
    await expect(ogTitleMeta).toHaveAttribute('content', "Guide de l'Investisseur Débutant — Ivoire Business Club");

    const ogDescMeta = page.locator('meta[property="og:description"]');
    await expect(ogDescMeta).toHaveAttribute('content', "Découvrez les bases de l'investissement dans la sous-région ouest-africaine.");

    const ogTypeMeta = page.locator('meta[property="og:type"]');
    await expect(ogTypeMeta).toHaveAttribute('content', "article");

    const ogImageMeta = page.locator('meta[property="og:image"]');
    await expect(ogImageMeta).toHaveAttribute('content', /.*logo-ibc\.webp/);

    const ogLocaleMeta = page.locator('meta[property="og:locale"]');
    await expect(ogLocaleMeta).toHaveAttribute('content', "fr_FR");

    // 3. Verify JSON-LD script
    const jsonLdScript = page.locator('script[type="application/ld+json"]');
    await expect(jsonLdScript).toHaveCount(1);
    
    const jsonLdContent = await jsonLdScript.textContent();
    expect(jsonLdContent).not.toBeNull();
    
    const parsedJsonLd = JSON.parse(jsonLdContent!);
    expect(parsedJsonLd['@context']).toBe('https://schema.org');
    expect(parsedJsonLd['@type']).toBe('Article');
    expect(parsedJsonLd['headline']).toBe("Guide de l'Investisseur Débutant");
    expect(parsedJsonLd['description']).toBe("Découvrez les bases de l'investissement dans la sous-région ouest-africaine.");
    expect(parsedJsonLd['author']['@type']).toBe('Person');
    expect(parsedJsonLd['publisher']['@type']).toBe('Organization');
  });

  test('Test du sitemap XML : la route /sitemap.xml est accessible et contient les URLs des articles', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
    
    const headers = response.headers();
    expect(headers['content-type']).toContain('xml');
    
    const body = await response.text();
    // The sitemap should contain static paths and dynamic paths
    expect(body).toContain('/articles');
    expect(body).toContain('/pricing');
    expect(body).toContain('/articles/guide-de-l-investisseur-debutant');
    
    // Premium/Private articles should not be present in the public sitemap
    expect(body).not.toContain('/articles/opportunites-immobilieres-a-abidjan');
  });

  test('Test de la Gate Premium : membre abonne (AFFRANCHI) accede a un article premium', async ({ affranchiPage }) => {
    // AFFRANCHI has access to premium articles
    await affranchiPage.goto('/articles/opportunites-immobilieres-a-abidjan');
    
    // Title should be visible
    await expect(affranchiPage.getByRole('heading', { name: "Opportunités Immobilières à Abidjan" })).toBeVisible();
    
    // Detailed content (premium) should be visible
    await expect(affranchiPage.getByText(/Les quartiers en forte croissance comme Cocody/i).first()).toBeVisible();
    
    // Premium gate should NOT be visible
    await expect(affranchiPage.locator('[data-testid="gate-panel"]')).toHaveCount(0);
  });

  test('Test des reactions sur les articles : membre connecte peut reagir et toggle sa reaction', async ({ affranchiPage }) => {
    // Navigate to a public article page
    await affranchiPage.goto('/articles/guide-de-l-investisseur-debutant');

    // Wait for the reactions component header to be visible (longer timeout for Next.js compilation)
    const reactionHeading = affranchiPage.getByRole('heading', { name: /Réactions communautaires/i });
    await expect(reactionHeading).toBeVisible({ timeout: 15000 });

    // Get the LIKE button (represented by ThumbsUp/J'aime)
    const likeButton = affranchiPage.getByRole('button', { name: /J'aime/i });
    await expect(likeButton).toBeVisible();

    // Get the starting reaction count
    const initialText = await likeButton.innerText();
    const initialCount = parseInt(initialText.replace(/\D/g, '') || '0', 10);

    // Click to add a reaction
    await likeButton.click();

    // Count should increase by 1
    await expect(likeButton).toContainText(String(initialCount + 1));

    // Click again to toggle it off
    await likeButton.click();

    // Count should return to the initial count
    await expect(likeButton).toContainText(String(initialCount));
  });
});
