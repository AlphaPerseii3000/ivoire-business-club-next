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
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [useFallback, setUseFallback] = useState(true);
  const [isVisible, setIsVisible] = useState(false);

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

  // IntersectionObserver to pause rAF when off-screen
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Scroll-driven video scrubbing
  useEffect(() => {
    if (useFallback) return;
    if (!isVisible) return;

    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    let targetTime = 0;
    let currentTime = 0;
    let animationFrameId: number | null = null;
    let isLooping = false;

    const updateVideoFrame = () => {
      if (video.readyState >= 2 && video.duration) {
        // Smooth interpolation toward target
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

      // Hero is at the top — progress maps from 0 (hero fully visible) to 1 (hero scrolled out)
      // When hero top is at viewport top → progress = 0
      // When hero bottom reaches viewport top → progress = 1
      if (rect.bottom > 0) {
        const progress = Math.max(
          0,
          Math.min(1, -rect.top / (rect.height - viewportHeight * 0.5))
        );
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
    init();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      video.removeEventListener('loadedmetadata', init);
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [useFallback, isVisible]);

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

      {/* Scroll-driven video — no autoplay, seeks based on scroll position */}
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