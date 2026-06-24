import { prisma } from '@/lib/prisma';
import { sanitizeError } from '@/lib/sanitize-log';
import { MetadataRoute } from 'next';

export const revalidate = 3600;

const siteUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.ivoire-business-club.com').replace(/\/$/, '');
const staticDate = new Date('2026-06-14T00:00:00Z');

type SitemapEntry = MetadataRoute.Sitemap[number];

// Date de dernière modification stable pour les routes statiques afin d'optimiser le budget de crawl.
function makeStaticRoute(path: string, priority: number, changeFrequency: SitemapEntry['changeFrequency'] = 'daily'): SitemapEntry {
  return {
    url: `${siteUrl}${path}`,
    lastModified: staticDate,
    changeFrequency,
    priority,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Routes publiques statiques à destination des moteurs de recherche.
  const staticRoutes: SitemapEntry[] = [
    makeStaticRoute('/', 1.0),
    makeStaticRoute('/articles', 0.8),
    makeStaticRoute('/events', 0.8),
    makeStaticRoute('/experts', 0.8),
    makeStaticRoute('/partners', 0.8),
    makeStaticRoute('/opportunities', 0.8),
    makeStaticRoute('/business-abidjan', 0.8),
    makeStaticRoute('/actualites', 0.8),
    makeStaticRoute('/pricing', 0.8, 'monthly'),
  ];

  // Récupération des articles publiés et visibles publiquement.
  let articleRoutes: SitemapEntry[] = [];
  try {
    const publicArticles = await prisma.article.findMany({
      where: {
        published: true,
        visibility: 'PUBLIC',
        publishedAt: { lte: new Date() },
      },
      select: { slug: true, updatedAt: true },
    });
    articleRoutes = publicArticles.map((article) => ({
      url: `${siteUrl}/articles/${article.slug}`,
      lastModified: article.updatedAt ? new Date(article.updatedAt) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));
  } catch (error) {
    console.error('Erreur lors de la récupération des articles pour le sitemap :', sanitizeError(error));
  }

  // Récupération des événements publiés.
  let eventRoutes: SitemapEntry[] = [];
  try {
    const publishedEvents = await prisma.event.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true, updatedAt: true },
    });
    eventRoutes = publishedEvents.map((event) => ({
      url: `${siteUrl}/events/${event.slug}`,
      lastModified: event.updatedAt ? new Date(event.updatedAt) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));
  } catch (error) {
    console.error('Erreur lors de la récupération des événements pour le sitemap :', sanitizeError(error));
  }

  // Récupération des experts publiés.
  let expertRoutes: SitemapEntry[] = [];
  try {
    const publishedExperts = await prisma.expert.findMany({
      where: { isPublished: true },
      select: { slug: true, updatedAt: true },
    });
    expertRoutes = publishedExperts.map((expert) => ({
      url: `${siteUrl}/experts/${expert.slug}`,
      lastModified: expert.updatedAt ? new Date(expert.updatedAt) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));
  } catch (error) {
    console.error('Erreur lors de la récupération des experts pour le sitemap :', sanitizeError(error));
  }

  // Récupération des entreprises partenaires publiées.
  let companyRoutes: SitemapEntry[] = [];
  try {
    const publishedCompanies = await prisma.company.findMany({
      where: { isPublished: true },
      select: { slug: true, updatedAt: true },
    });
    companyRoutes = publishedCompanies.map((company) => ({
      url: `${siteUrl}/partners/${company.slug}`,
      lastModified: company.updatedAt ? new Date(company.updatedAt) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));
  } catch (error) {
    console.error('Erreur lors de la récupération des entreprises pour le sitemap :', sanitizeError(error));
  }

  return [...staticRoutes, ...articleRoutes, ...eventRoutes, ...expertRoutes, ...companyRoutes];
}
