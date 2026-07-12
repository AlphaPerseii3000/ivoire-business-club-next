import { prisma } from '@/lib/prisma';
import { sanitizeError } from '@/lib/sanitize-log';
import { SITE_URL } from '@/lib/site-config';

export const revalidate = 3600;

const siteUrl = SITE_URL;

function formatDate(date: Date | null): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function escapeMarkdown(text: string): string {
  return text.replace(/\n/g, ' ').trim();
}

export async function GET(): Promise<Response> {
  let articles: Array<{ title: string; slug: string; excerpt: string; publishedAt: Date | null }> = [];
  let events: Array<{ title: string; slug: string; description: string; startDate: Date }> = [];

  try {
    articles = await prisma.article.findMany({
      where: {
        published: true,
        visibility: 'PUBLIC',
        publishedAt: { lte: new Date() },
      },
      select: { title: true, slug: true, excerpt: true, publishedAt: true },
      orderBy: { publishedAt: 'desc' },
    });
  } catch (error) {
    console.error('Erreur llms-full.txt articles:', sanitizeError(error));
  }

  try {
    events = await prisma.event.findMany({
      where: { status: 'PUBLISHED' },
      select: { title: true, slug: true, description: true, startDate: true },
      orderBy: { startDate: 'desc' },
    });
  } catch (error) {
    console.error('Erreur llms-full.txt events:', sanitizeError(error));
  }

  let markdown = `# Ivoire Business Club — Contenu public complet\n\n`;

  markdown += `## Articles\n\n`;
  if (articles.length === 0) {
    markdown += `_Aucun article public disponible._\n\n`;
  } else {
    for (const article of articles) {
      markdown += `### ${article.title}\n`;
      markdown += `- URL : ${siteUrl}/articles/${article.slug}\n`;
      markdown += `- Date : ${formatDate(article.publishedAt)}\n`;
      markdown += `- Extrait : ${escapeMarkdown(article.excerpt)}\n\n`;
    }
  }

  markdown += `## Événements\n\n`;
  if (events.length === 0) {
    markdown += `_Aucun événement public disponible._\n\n`;
  } else {
    for (const event of events) {
      const descriptionPreview = event.description
        ? `${escapeMarkdown(event.description).slice(0, 500)}${escapeMarkdown(event.description).length > 500 ? '...' : ''}`
        : '';
      markdown += `### ${event.title}\n`;
      markdown += `- URL : ${siteUrl}/events/${event.slug}\n`;
      markdown += `- Date : ${formatDate(event.startDate)}\n`;
      markdown += `- Description : ${descriptionPreview}\n\n`;
    }
  }

  return new Response(markdown, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
