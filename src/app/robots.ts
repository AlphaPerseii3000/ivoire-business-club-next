import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/*', '/dashboard/*', '/api/*', '/auth/*', '/onboarding/*'],
    },
    sitemap: 'https://www.ivoire-business-club.com/sitemap.xml',
  };
}
