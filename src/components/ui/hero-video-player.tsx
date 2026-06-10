'use client';

import React, { useEffect, useState, useRef } from 'react';

interface HeroVideoPlayerProps {
  videoUrl?: string;
  fallbackImageUrl?: string;
  className?: string;
}

export function HeroVideoPlayer({
  videoUrl = '/animated-hero-section.mp4',
  fallbackImageUrl = '/hero-background-ibc-next-with-blue-vignette.webp',
  className = '',
}: HeroVideoPlayerProps) {
  const [useFallback, setUseFallback] = useState(true);
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Connection, prefers-reduced-motion and screen size performance check
    const checkPerformance = () => {
      if (typeof window !== 'undefined') {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
        const conn = (navigator as any).connection;
        if (conn) {
          if (conn.saveData) return true;
          const type = conn.effectiveType;
          if (type === '2g' || type === '3g' || type === 'slow-2g') return true;
        }
        // Fall back on small screens/mobile devices to optimize loading
        if (window.innerWidth < 768) return true;
      }
      return false;
    };

    setUseFallback(checkPerformance());
  }, []);

  return (
    <div className={`relative w-full h-full overflow-hidden bg-black ${className}`}>
      {/* Top Black-to-transparent Overlay */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#090D16] to-transparent z-10 pointer-events-none" />

      {/* Fallback image and video stay mounted to avoid visual flickers during video load or error. */}
      <img
        src={fallbackImageUrl}
        alt="IBC Hero Background"
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
          useFallback || !videoReady ? 'opacity-75' : 'opacity-0'
        }`}
      />

      <video
        ref={videoRef}
        src={videoUrl}
        autoPlay={!useFallback}
        loop
        muted
        playsInline
        preload={useFallback ? 'none' : 'metadata'}
        onCanPlay={() => setVideoReady(true)}
        onError={() => setUseFallback(true)}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
          useFallback || !videoReady ? 'opacity-0' : 'opacity-70'
        }`}
        aria-label="IBC Hero video loops"
      />

      {/* Bottom Black-to-transparent Overlay */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#090D16] to-transparent z-10 pointer-events-none" />
    </div>
  );
}
