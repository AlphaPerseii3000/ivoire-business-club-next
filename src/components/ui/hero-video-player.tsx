'use client';

import React, { useEffect, useState, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';

interface HeroVideoPlayerProps {
  videoUrl?: string;
  fallbackImageUrl?: string;
  className?: string;
}

export interface HeroVideoPlayerHandle {
  playForward: () => void;
  playBackward: () => void;
  pause: () => void;
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
    const isMobileRef = useRef(false);

    // Reverse playback state
    const rewindRafRef = useRef<number | null>(null);
    const isRewindingRef = useRef(false);

    const stopRewind = useCallback(() => {
      if (rewindRafRef.current !== null) {
        cancelAnimationFrame(rewindRafRef.current);
        rewindRafRef.current = null;
      }
      isRewindingRef.current = false;
    }, []);

    // Reverse playback: manually seek backwards frame-by-frame at ~0.75x speed
    const rewindTick = useCallback(() => {
      const video = videoRef.current;
      if (!video || !isRewindingRef.current) return;

      // 1x speed = 1 second of video per second of real time
      // At 60fps that's ~0.0167s per frame
      const decrement = 1 / 60;
      const newTime = Math.max(0, video.currentTime - decrement);

      if (newTime <= 0) {
        video.currentTime = 0;
        stopRewind();
        return;
      }

      video.currentTime = newTime;
      rewindRafRef.current = requestAnimationFrame(rewindTick);
    }, [stopRewind]);

    useImperativeHandle(ref, () => ({
      playForward() {
        const video = videoRef.current;
        if (!video || video.readyState < 2 || isMobileRef.current) return;

        // Stop any active rewind
        stopRewind();

        video.playbackRate = 1;
        if (video.paused) {
          video.play().catch(() => setUseFallback(true));
        }
      },
      playBackward() {
        const video = videoRef.current;
        if (!video || video.readyState < 2 || isMobileRef.current) return;

        // Pause native playback first
        if (!video.paused) {
          video.pause();
        }

        // Stop any previous rewind loop
        stopRewind();

        isRewindingRef.current = true;
        rewindRafRef.current = requestAnimationFrame(rewindTick);
      },
      pause() {
        const video = videoRef.current;
        if (!video || isMobileRef.current) return;

        stopRewind();

        if (!video.paused) {
          video.pause();
        }
      },
    }));

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        stopRewind();
      };
    }, [stopRewind]);

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

      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      isMobileRef.current = isMobile;
      setUseFallback(checkPerformance());
    }, []);

    const handleVideoReady = useCallback(() => {
      const video = videoRef.current;
      if (!video) return;
      if (isMobileRef.current && video.readyState >= 3) {
        video.playbackRate = 1;
        video.play().catch(() => setUseFallback(true));
      }
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

        {/* Video: forward native at 0.75x, rewind via rAF frame-by-frame */}
        <video
          ref={videoRef}
          src={videoUrl}
          muted
          playsInline
          preload="auto"
          loop={isMobileRef.current}
          onError={() => setUseFallback(true)}
          onCanPlay={handleVideoReady}
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