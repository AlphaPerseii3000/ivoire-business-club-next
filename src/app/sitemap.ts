import { prisma } from '@/lib/prisma';
import { MetadataRoute } from 'next';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://ivoirebusinessclub.com').replace(/\/$/, '');

  // Fetch all published articles with visibility PUBLIC
  let publicArticles: { slug: string; updatedAt: Date | null }[] = [];
  try {
    publicArticles = await prisma.article.findMany({
      where: {
        published: true,
        visibility: 'PUBLIC',
        publishedAt: {
          lte: new Date(),
        },
      },
      select: {
        slug: true,
        updatedAt: true,
      },
    });
  } catch (error) {
    console.error('Error fetching articles for sitemap:', error);
  }

  // Use a stable modified date for static routes to optimize crawling budget
  const staticDate = new Date('2026-06-14T00:00:00Z');

  // Static routes
  const routes = [
    {
      url: siteUrl,
      lastModified: staticDate,
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    {
      url: `${siteUrl}/articles`,
      lastModified: staticDate,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
    {
      url: `${siteUrl}/pricing`,
      lastModified: staticDate,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
  ];

  // Dynamic article routes
  const articleRoutes = publicArticles.map((article) => ({
    url: `${siteUrl}/articles/${article.slug}`,
    lastModified: article.updatedAt ? new Date(article.updatedAt) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  return [...routes, ...articleRoutes];
}
