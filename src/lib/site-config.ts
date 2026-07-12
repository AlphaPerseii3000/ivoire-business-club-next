/**
 * Configuration globale du site.
 * Centralise l'URL de base de l'application.
 */
const rawUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'https://www.ivoire-business-club.com';
const cleanUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
export const SITE_URL = cleanUrl.replace(/\/$/, '');
