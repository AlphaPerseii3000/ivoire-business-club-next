'use client';

import React, { useEffect, useState, useRef } from 'react';

interface HeroVideoPlayerProps {
  videoUrl?: string;
  fallbackImageUrl?: string;
  className?: string;
  /** External scroll progress 0–1, drives video scrubbing */
  scrollProgress?: number;
}

export function HeroVideoPlayer({
  videoUrl = '/animated-hero-section.mp4',
  fallbackImageUrl = '/hero-background-ibc-next-with-blue-vignette.webp',
  className = '',
  scrollProgress,
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

  // Scroll-driven video scrubbing — driven by external scrollProgress prop
  useEffect(() => {
    if (useFallback) return;
    if (!isVisible) return;
    if (scrollProgress === undefined) return;

    const video = videoRef.current;
    if (!video) return;

    let animationFrameId: number | null = null;
    let isLooping = false;
    let currentTime = 0;

    const updateVideoFrame = () => {
      if (video.readyState >= 2 && video.duration) {
        const targetTime = scrollProgress * video.duration;
        currentTime += (targetTime - currentTime) * 0.15;

        if (Math.abs(currentTime - video.currentTime) > 0.01) {
          video.currentTime = currentTime;
        }

        // Keep looping until close enough
        if (Math.abs(currentTime - targetTime) > 0.001) {
          animationFrameId = requestAnimationFrame(updateVideoFrame);
        } else {
          isLooping = false;
        }
      }
    };

    if (!isLooping) {
      isLooping = true;
      animationFrameId = requestAnimationFrame(updateVideoFrame);
    }

    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [useFallback, isVisible, scrollProgress]);

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

      {/* Scroll-driven video — seeks based on scrollProgress prop */}
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