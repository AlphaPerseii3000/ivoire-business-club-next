'use client';

import React from 'react';

interface ShinyTextProps {
  text: string;
  disabled?: boolean;
  speed?: number;
  className?: string;
  color?: string;
  shineColor?: string;
  delay?: number;
  spread?: number;
  yoyo?: boolean;
  pauseOnHover?: boolean;
  direction?: 'left' | 'right';
}

export function ShinyText({
  text,
  disabled = false,
  speed = 2,
  className = '',
  color = '#b5b5b5',
  shineColor = '#ffffff',
  delay = 0,
  spread = 120,
  yoyo = false,
  pauseOnHover = false,
  direction = 'left',
}: ShinyTextProps) {
  const styles: React.CSSProperties = {
    backgroundImage: `linear-gradient(${
      direction === 'left' ? '120deg' : '240deg'
    }, ${color} 40%, ${shineColor} 50%, ${color} 60%)`,
    backgroundSize: `${spread * 2}px 100%`,
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    display: 'inline-block',
    animationDuration: `${speed}s`,
    animationDelay: `${delay}s`,
    animationIterationCount: 'infinite',
    animationTimingFunction: 'linear',
    ...(disabled ? { color, WebkitTextFillColor: 'initial' } : {}),
  };

  return (
    <span
      style={styles}
      className={`shiny-text ${disabled ? 'disabled' : ''} ${
        pauseOnHover ? 'pause-on-hover' : ''
      } ${className}`}
    >
      {text}
    </span>
  );
}
