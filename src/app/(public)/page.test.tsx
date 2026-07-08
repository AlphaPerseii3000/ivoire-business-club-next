import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HomePage, { metadata } from './page';
import { getNextPublishedEvent } from '@/lib/event-server-utils';

const mockGetNextPublishedEvent = getNextPublishedEvent as ReturnType<typeof vi.fn>;

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

vi.mock('@/lib/event-server-utils', () => ({
  getNextPublishedEvent: vi.fn(),
  getMomentsIbcPhotos: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/components/features/events/NextEventCard', () => ({
  NextEventCard: ({ event }: { event: { title: string } }) => <div data-testid="next-event-card">{event.title}</div>,
}));

vi.mock('@/components/features/events/EventPopup', () => ({
  EventPopup: () => <div data-testid="event-popup" />,
}));

vi.mock('@/components/ui/scroll-video-player', () => ({
  ScrollVideoPlayer: () => <div data-testid="scroll-video-player" />,
}));
vi.mock('@/components/ui/hero-video-player', () => ({
  HeroVideoPlayer: () => <div data-testid="hero-video-player" />,
}));

describe('HomePage SEO & Rendering', () => {
  it('has correct French SEO title and description', () => {
    expect(metadata.title).toBe('Ivoire Business Club — Club business & investissement Côte d’Ivoire');
    expect(metadata.description).toContain('Ivoire Business Club');
    expect(metadata.description).toContain('Abidjan');
    expect(metadata.openGraph?.title).toBe('Ivoire Business Club — Club business & investissement Côte d’Ivoire');
    expect(metadata.openGraph?.locale).toBe('fr_FR');
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders server-side resolved homepage components', async () => {
    mockGetNextPublishedEvent.mockResolvedValue(null);
    const resolvedJSX = await HomePage();
    render(resolvedJSX);

    expect(screen.getByTestId('scroll-video-player')).toBeInTheDocument();
    expect(screen.getByText('Bâtir son futur en Afrique')).toBeInTheDocument();
    expect(screen.getByText('Comment ça marche ?')).toBeInTheDocument();
    
    const headings = screen.getAllByRole('heading', { level: 2 });
    const successWallHeading = headings.find(h => h.textContent === 'Le Mur des Succès');
    expect(successWallHeading).toBeDefined();
  });

  it('renders NextEventCard when a next event exists', async () => {
    mockGetNextPublishedEvent.mockResolvedValue({
      id: 'evt-1',
      slug: 'lancement-reseau-ibc',
      title: 'Lancement Réseau IBC',
      startDate: new Date('2026-07-15T10:00:00Z'),
      endDate: null,
      location: 'Abidjan, Cocody',
      coverImagePath: null,
    });

    const resolvedJSX = await HomePage();
    render(resolvedJSX);

    expect(screen.getByTestId('next-event-card')).toBeInTheDocument();
    expect(screen.getByText('Lancement Réseau IBC')).toBeInTheDocument();
  });

  it('does not render NextEventCard nor EventPopup when no next event exists', async () => {
    mockGetNextPublishedEvent.mockResolvedValue(null);

    const resolvedJSX = await HomePage();
    render(resolvedJSX);

    expect(screen.queryByTestId('next-event-card')).not.toBeInTheDocument();
    expect(screen.queryByTestId('event-popup')).not.toBeInTheDocument();
  });
});
