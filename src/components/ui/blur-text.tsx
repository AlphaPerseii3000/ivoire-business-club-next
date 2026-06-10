'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';

interface BlurTextProps {
  text: string;
  animateBy?: 'words' | 'letters';
  direction?: 'top' | 'bottom';
  delay?: number;
  stepDuration?: number;
  threshold?: number;
  rootMargin?: string;
  className?: string;
  onAnimationComplete?: () => void;
}

export function BlurText({
  text = '',
  animateBy = 'words',
  direction = 'top',
  delay = 200,
  stepDuration = 0.35,
  threshold = 0.1,
  rootMargin = '0px',
  className = '',
  onAnimationComplete,
}: BlurTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, {
    once: true,
    amount: threshold,
    margin: rootMargin as any,
  });

  const elements = animateBy === 'words' ? text.split(' ') : text.split('');
  const [prefersReducedMotion] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  );
  const [isMounted, setIsMounted] = useState(false);

  const savedCb = useRef(onAnimationComplete);
  useEffect(() => {
    savedCb.current = onAnimationComplete;
  }, [onAnimationComplete]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : stepDuration,
        delayChildren: prefersReducedMotion ? 0 : delay / 1000,
      },
    },
  };

  const itemVariants = {
    hidden: {
      filter: prefersReducedMotion ? 'blur(0px)' : 'blur(10px)',
      opacity: prefersReducedMotion ? 1 : 0,
      y: prefersReducedMotion ? 0 : direction === 'top' ? -20 : 20,
    },
    visible: {
      filter: 'blur(0px)',
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0 : stepDuration,
        ease: 'easeOut' as any,
      },
    },
  };

  useEffect(() => {
    if (isMounted && isInView && savedCb.current) {
      const totalDelay = prefersReducedMotion
        ? 0
        : (delay / 1000) + (elements.length * stepDuration);
      const timer = setTimeout(() => {
        if (savedCb.current) savedCb.current();
      }, totalDelay * 1000);
      return () => clearTimeout(timer);
    }
  }, [isMounted, isInView, elements.length, delay, stepDuration, prefersReducedMotion]);

  if (!isMounted) {
    return <div className={`inline-block ${className}`}>{text}</div>;
  }

  return (
    <motion.div
      ref={containerRef}
      className={`inline-block ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
    >
      {elements.map((element, index) => {
        const isSpace = element === ' ';
        return (
          <motion.span
            key={index}
            variants={itemVariants}
            className="inline-block"
            style={{
              whiteSpace: isSpace ? 'pre' : 'normal',
            }}
          >
            {isSpace ? ' ' : element}
            {animateBy === 'words' && index < elements.length - 1 ? '\u00A0' : ''}
          </motion.span>
        );
      })}
    </motion.div>
  );
}

export default BlurText;
