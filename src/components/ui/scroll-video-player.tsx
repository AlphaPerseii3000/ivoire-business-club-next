'use client';

import React, { useEffect, useRef, useState } from 'react';

interface ScrollVideoPlayerProps {
  videoUrl?: string;
  fallbackImageUrl?: string;
  className?: string;
}

export function ScrollVideoPlayer({
  videoUrl = '/animated-network-lines-abidjan.mp4',
  fallbackImageUrl = '/hero-background-ibc-next.webp',
  className = '',
}: ScrollVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [useFallback, setUseFallback] = useState(true);

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

  useEffect(() => {
    if (useFallback) return;

    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    let targetTime = 0;
    let currentTime = 0;
    let animationFrameId: number;
    let isLooping = false;

    const updateVideoFrame = () => {
      if (video.readyState >= 2 && video.duration) {
        currentTime += (targetTime - currentTime) * 0.15;

        if (Math.abs(currentTime - video.currentTime) > 0.01) {
          video.currentTime = currentTime;
        }
      }

      if (Math.abs(currentTime - targetTime) > 0.001) {
        animationFrameId = requestAnimationFrame(updateVideoFrame);
      } else {
        isLooping = false;
      }
    };

    const handleScroll = () => {
      const rect = container.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      if (rect.top < viewportHeight && rect.bottom > 0) {
        const progress = Math.max(0, Math.min(1, (viewportHeight - rect.top) / (rect.height + viewportHeight)));
        if (video.duration) {
          targetTime = progress * video.duration;
          if (!isLooping) {
            isLooping = true;
            animationFrameId = requestAnimationFrame(updateVideoFrame);
          }
        }
      }
    };

    const init = () => {
      handleScroll();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    video.addEventListener('loadedmetadata', init);

    if (video.readyState >= 1) {
      init();
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      video.removeEventListener('loadedmetadata', init);
      cancelAnimationFrame(animationFrameId);
    };
  }, [useFallback]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full bg-[#090D16] ${useFallback ? 'h-[50vh]' : 'h-[150vh]'} ${className}`}
    >
      {useFallback ? (
        <div className="relative w-full h-full overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-b from-[#090D16] via-transparent to-[#090D16]" />
          <img
            src={fallbackImageUrl}
            alt="Fallback static scene"
            className="w-full h-full object-cover opacity-75 animate-fade-in"
          />
        </div>
      ) : (
        <div className="sticky top-0 w-full h-screen overflow-hidden flex items-center justify-center">
          {/* Gradients de transition */}
          <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-b from-[#090D16] via-transparent to-[#090D16]" />
          <video
            ref={videoRef}
            src={videoUrl}
            muted
            playsInline
            preload="auto"
            onError={() => setUseFallback(true)}
            className="w-full h-full object-cover opacity-70"
            aria-label="Scroll controlled video"
          />
        </div>
      )}
    </div>
  );
}
