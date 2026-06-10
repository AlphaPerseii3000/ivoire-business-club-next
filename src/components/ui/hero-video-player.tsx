'use client';

import React, { useEffect, useState, useRef, useImperativeHandle, forwardRef } from 'react';

interface HeroVideoPlayerProps {
  videoUrl?: string;
  fallbackImageUrl?: string;
  className?: string;
}

export interface HeroVideoPlayerHandle {
  scrub: (progress: number) => void;
}

export const HeroVideoPlayer = forwardRef<HeroVideoPlayerHandle, HeroVideoPlayerProps>(
  function HeroVideoPlayer(
    {
      videoUrl = '/animated-hero-section.mp4',
      fallbackImageUrl = '/hero-background-ibc-next-with-blue-vignette.webp',
      className = '',
    },
    ref
  ) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [useFallback, setUseFallback] = useState(true);

    // Expose imperative scrub method to parent
    useImperativeHandle(ref, () => ({
      scrub(progress: number) {
        const video = videoRef.current;
        if (!video || !video.duration || video.readyState < 2) return;
        const targetTime = progress * video.duration;
        if (Math.abs(video.currentTime - targetTime) > 0.03) {
          video.currentTime = targetTime;
        }
      },
    }));

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
        }
        return false;
      };

      setUseFallback(checkPerformance());
    }, []);

    return (
      <div className={`relative w-full h-full overflow-hidden bg-black ${className}`}>
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
);