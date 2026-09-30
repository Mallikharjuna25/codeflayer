import React from 'react';
import './reactbits.css';

export default function ShinyText({
  text,
  disabled = false,
  speed = 4,
  className = '',
  shimmerColor = '#ffffff'
}) {
  const animationDuration = `${speed}s`;

  return (
    <span
      className={`shiny-text ${disabled ? 'disabled' : ''} ${className}`}
      style={{
        animationDuration,
        '--shimmer-color': shimmerColor,
      }}
    >
      {text}
    </span>
  );
}
