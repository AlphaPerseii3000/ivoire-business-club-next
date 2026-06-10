'use client';

import React, { useEffect, useRef, useState } from 'react';

interface BlurRevealProps {
  children: React.ReactNode;
  className?: string;
  /** Delay in ms before the reveal starts once in viewport */
  delay?: number;
}

/**
 * Wraps content and reveals it with a blur-to-clear animation
 * when it enters the viewport via IntersectionObserver.
 */
export function BlurReveal({ children, className = '', delay = 0 }: BlurRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setIsRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsRevealed(true), delay);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ease-out ${
        isRevealed
          ? 'blur-0 opacity-100 translate-y-0'
          : 'blur-md opacity-0 translate-y-6'
      } ${className}`}
    >
      {children}
    </div>
  );
}