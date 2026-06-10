'use client';

import React, { useEffect, useRef, useCallback } from 'react';

interface HeroVideoPlayerProps {
  videoUrl?: string;
  fallbackImageUrl?: string;
  className?: string;
}

/**
 * Scroll-driven hero video player.
 * Uses a wrapperRef callback so the parent can provide the scroll container
 * without prop-driven re-renders. All video scrubbing is imperative via refs.
 */
export function HeroVideoPlayer({
  videoUrl = '/animated-hero-section.mp4',
  fallbackImageUrl = '/hero-background-ibc-next-with-blue-vignette.webp',
  className = '',
}: HeroVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [useFallback, setUseFallback] = React.useState(true);

  useEffect(() => {
    const checkPerformance = () => {
      if (typeof window !== 'undefined') {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
        const conn = (navigator as any).connection;
        if (conn) {
          if (conn.saveData) return true;
          const type = conn.effectiveType;
          if (type === '2g' || type === '3g' || type === 'slow-2g') return true;
        }
        if (window.innerWidth < 768) return true;
      }
      return false;
    };

    setUseFallback(checkPerformance());
  }, []);

  // Expose imperative scrub method via ref
  const scrub = useCallback((progress: number) => {
    const video = videoRef.current;
    if (!video || !video.duration || video.readyState < 2) return;
    const targetTime = progress * video.duration;
    // Direct seek — no rAF loop, no interpolation, just snap to frame
    if (Math.abs(video.currentTime - targetTime) > 0.03) {
      video.currentTime = targetTime;
    }
  }, []);

  // Register this player with the parent via DOM dataset
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    // Store scrub function on the DOM element for the parent to call imperatively
    (container as any).__heroVideoScrub = scrub;
    return () => {
      delete (container as any).__heroVideoScrub;
    };
  }, [scrub]);

  return (
    <div ref={containerRef} className={`relative w-full h-full overflow-hidden bg-black ${className}`}>
      {/* Top Black-to-transparent Overlay */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#090D16] to-transparent z-10 pointer-events-none" />

      {/* Fallback image — always mounted, opacity transitions */}
      <img
        src={fallbackImageUrl}
        alt="IBC Hero Background"
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
          useFallback ? 'opacity-75' : 'opacity-0'
        }`}
      />

      {/* Scroll-driven video — seeks based on scroll position */}
      <video
        ref={videoRef}
        src={videoUrl}
        muted
        playsInline
        preload="auto"
        onError={() => setUseFallback(true)}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
          useFallback ? 'opacity-0' : 'opacity-70'
        }`}
        aria-label="Scroll-driven hero video"
      />

      {/* Bottom Black-to-transparent Overlay */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#090D16] to-transparent z-10 pointer-events-none" />
    </div>
  );
}