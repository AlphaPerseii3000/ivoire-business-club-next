import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = 'https://www.ivoire-business-club.com';
  const privateRoutes = ['/admin/*', '/dashboard/*', '/api/*', '/auth/*', '/onboarding/*'];

  return {
    rules: [
      { userAgent: 'GPTBot', allow: '/', disallow: privateRoutes },
      { userAgent: 'ClaudeBot', allow: '/', disallow: privateRoutes },
      { userAgent: 'PerplexityBot', allow: '/', disallow: privateRoutes },
      { userAgent: 'OAI-SearchBot', allow: '/', disallow: privateRoutes },
      { userAgent: 'Google-Extended', allow: '/', disallow: privateRoutes },
      { userAgent: '*', allow: '/', disallow: privateRoutes },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
