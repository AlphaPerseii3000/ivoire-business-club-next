import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { HeroVideoPlayer } from './hero-video-player';
import { ScrollVideoPlayer } from './scroll-video-player';

describe('Video Players Fallbacks', () => {
  let originalConnection: any;

  beforeEach(() => {
    if (typeof navigator !== 'undefined') {
      originalConnection = (navigator as any).connection;
    }
    vi.stubGlobal('innerWidth', 1024);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (typeof navigator !== 'undefined') {
      if (originalConnection) {
        Object.defineProperty(navigator, 'connection', {
          value: originalConnection,
          configurable: true,
        });
      } else {
        delete (navigator as any).connection;
      }
    }
  });

  it('HeroVideoPlayer renders video when connection is fast and width is large', () => {
    if (typeof navigator !== 'undefined') {
      Object.defineProperty(navigator, 'connection', {
        value: { effectiveType: '4g', saveData: false },
        configurable: true,
      });
    }
    vi.stubGlobal('innerWidth', 1200);

    render(<HeroVideoPlayer />);

    const video = screen.getByLabelText('IBC Hero video loops');
    expect(video).toBeInTheDocument();
    expect(screen.getByAltText('IBC Hero Background')).toBeInTheDocument();
  });

  it('HeroVideoPlayer falls back to static image when connection is slow (3g)', () => {
    if (typeof navigator !== 'undefined') {
      Object.defineProperty(navigator, 'connection', {
        value: { effectiveType: '3g', saveData: false },
        configurable: true,
      });
    }

    render(<HeroVideoPlayer />);

    const img = screen.getByAltText('IBC Hero Background');
    expect(img).toBeInTheDocument();
    const video = screen.getByLabelText('IBC Hero video loops');
    expect(video).toBeInTheDocument();
    expect(video).toHaveClass('opacity-0');
  });

  it('HeroVideoPlayer falls back to static image when width is small (mobile)', () => {
    if (typeof navigator !== 'undefined') {
      Object.defineProperty(navigator, 'connection', {
        value: { effectiveType: '4g', saveData: false },
        configurable: true,
      });
    }
    vi.stubGlobal('innerWidth', 600);

    render(<HeroVideoPlayer />);

    const img = screen.getByAltText('IBC Hero Background');
    expect(img).toBeInTheDocument();
  });

  it('ScrollVideoPlayer renders video when connection is fast and width is large', () => {
    if (typeof navigator !== 'undefined') {
      Object.defineProperty(navigator, 'connection', {
        value: { effectiveType: '4g', saveData: false },
        configurable: true,
      });
    }
    vi.stubGlobal('innerWidth', 1200);

    render(<ScrollVideoPlayer />);

    const video = screen.getByLabelText('Scroll controlled video');
    expect(video).toBeInTheDocument();
    expect(screen.queryByAltText('Fallback static scene')).not.toBeInTheDocument();
  });

  it('ScrollVideoPlayer falls back to static image when connection is slow (3g)', () => {
    if (typeof navigator !== 'undefined') {
      Object.defineProperty(navigator, 'connection', {
        value: { effectiveType: '3g', saveData: false },
        configurable: true,
      });
    }

    render(<ScrollVideoPlayer />);

    const img = screen.getByAltText('Fallback static scene');
    expect(img).toBeInTheDocument();
    expect(screen.queryByLabelText('Scroll controlled video')).not.toBeInTheDocument();
  });
});
