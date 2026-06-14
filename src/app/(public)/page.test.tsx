import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import HomePage, { metadata } from './page';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    opportunity: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'opp-1',
          title: 'Terrain à Cocody',
          category: 'IMMOBILIER',
          author: { location: 'Abidjan' },
        },
      ]),
    },
    article: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'art-1',
          title: 'Guide de l\'Investisseur',
          slug: 'guide-de-l-investisseur',
          excerpt: 'Un extrait...',
          category: 'Conseils',
          publishedAt: new Date('2026-06-11T12:00:00Z'),
        },
      ]),
    },
  },
}));

vi.mock('@/components/ui/scroll-video-player', () => ({
  ScrollVideoPlayer: () => <div data-testid="scroll-video-player" />,
}));
vi.mock('@/components/ui/hero-video-player', () => ({
  HeroVideoPlayer: () => <div data-testid="hero-video-player" />,
}));

describe('HomePage SEO & Rendering', () => {
  it('has correct French SEO title and description', () => {
    expect(metadata.title).toBe('Ivoire Business Club — Bâtir son futur en Afrique');
    expect(metadata.description).toContain('IBC');
    expect(metadata.openGraph?.title).toBe('Ivoire Business Club — Bâtir son futur en Afrique');
    expect(metadata.openGraph?.locale).toBe('fr_FR');
  });

  it('renders server-side resolved homepage components', async () => {
    const resolvedJSX = await HomePage();
    render(resolvedJSX);

    expect(screen.getByTestId('scroll-video-player')).toBeInTheDocument();
    expect(screen.getByText('Bâtir son futur en Afrique')).toBeInTheDocument();
    expect(screen.getByText('Comment ça marche ?')).toBeInTheDocument();
    
    const headings = screen.getAllByRole('heading', { level: 2 });
    const successWallHeading = headings.find(h => h.textContent === 'Le Mur des Succès');
    expect(successWallHeading).toBeDefined();
  });
});
