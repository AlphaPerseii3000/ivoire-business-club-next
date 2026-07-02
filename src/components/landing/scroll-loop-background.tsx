'use client';

import React, { useEffect, useRef, useState } from 'react';

interface ScrollLoopBackgroundProps {
  threshold?: number;
  opacity?: number;
}

export function ScrollLoopBackground({
  threshold = 2800,
  opacity = 0.2,
}: ScrollLoopBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleScroll = () => {
      const currentScroll = window.scrollY;
      const isPastThreshold = currentScroll >= threshold;

      setIsActive(isPastThreshold);

      if (isPastThreshold) {
        if (video.paused) {
          video.play().catch((err) => {
            console.log('Autoplay blocked or video loading:', err);
          });
        }
      } else {
        if (!video.paused) {
          video.pause();
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Run once on mount to set initial state
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [threshold]);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#090D16]">
      <video
        ref={videoRef}
        src="/Ivoire_business_club_loop_compressed.mp4"
        muted
        playsInline
        loop
        preload="auto"
        style={{ opacity: isActive ? opacity : 0 }}
        className="w-full h-full object-cover transition-opacity duration-1000"
      />
      {/* Dark vignette overlay to ensure text contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#090D16] via-[#090D16]/80 to-[#090D16]" />
    </div>
  );
}

export default ScrollLoopBackground;
