'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  ease?: string;
  splitType?: 'chars' | 'words';
  from?: gsap.TweenVars;
  to?: gsap.TweenVars;
  threshold?: number;
  rootMargin?: string;
  textAlign?: 'left' | 'center' | 'right';
  tag?: 'p' | 'h1' | 'h2' | 'h3' | 'span';
  onLetterAnimationComplete?: () => void;
}

export function SplitText({
  text = '',
  className = '',
  delay = 50,
  duration = 1.25,
  ease = 'power3.out',
  splitType = 'chars',
  from = { opacity: 0, y: 40 },
  to = { opacity: 1, y: 0 },
  threshold = 0.1,
  rootMargin = '-100px',
  textAlign = 'center',
  tag: Tag = 'p',
  onLetterAnimationComplete,
}: SplitTextProps) {
  const containerRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(container);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin]);

  useGSAP(() => {
    if (!inView || !containerRef.current) return;

    const elements = containerRef.current.querySelectorAll('.split-item');
    if (!elements.length) return;

    setIsInitialized(true);

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      gsap.set(elements, to);
      gsap.set(containerRef.current, { opacity: 1 });
      if (onLetterAnimationComplete) {
        onLetterAnimationComplete();
      }
      return;
    }

    gsap.set(containerRef.current, { opacity: 1 });
    gsap.fromTo(
      elements,
      from,
      {
        ...to,
        ease,
        duration,
        stagger: delay / 1000,
        onComplete: () => {
          if (onLetterAnimationComplete) {
            onLetterAnimationComplete();
          }
        },
      }
    );
  }, { scope: containerRef, dependencies: [inView, text] });

  const items = splitType === 'words' ? text.split(' ') : text.split('');

  return (
    <Tag
      ref={containerRef as any}
      className={`split-text-container ${isInitialized ? '' : 'split-text-preinit'} ${className}`}
      style={{ textAlign, display: 'inline-block' }}
    >
      {items.map((item, idx) => {
        const isSpace = item === ' ';
        const initialOpacity = typeof from.opacity === 'number' ? from.opacity : 0;
        const initialY = typeof from.y === 'number' ? from.y : 40;
        return (
          <span
            key={idx}
            className="split-item inline-block"
            style={{
              whiteSpace: isSpace ? 'pre' : 'normal',
              opacity: inView ? undefined : initialOpacity,
              transform: inView ? undefined : `translateY(${initialY}px)`,
            }}
          >
            {isSpace ? ' ' : item}
            {splitType === 'words' && idx < items.length - 1 ? '\u00A0' : ''}
          </span>
        );
      })}
    </Tag>
  );
}
export default SplitText;
