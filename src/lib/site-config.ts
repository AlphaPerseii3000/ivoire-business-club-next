/**
 * Configuration globale du site.
 * Centralise l'URL de base de l'application.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'https://www.ivoire-business-club.com'
).replace(/\/$/, '');
