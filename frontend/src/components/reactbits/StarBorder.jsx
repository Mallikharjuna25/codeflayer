import React from 'react';
import './reactbits.css';

export default function StarBorder({
  as: Component = 'button',
  className = '',
  color = '#06b6d4',
  speed = '4s',
  children,
  ...props
}) {
  return (
    <Component className={`star-border-container ${className}`} {...props}>
      <div
        className="star-border-gradient"
        style={{
          background: `radial-gradient(circle, ${color} 0%, transparent 65%)`,
          animationDuration: speed,
        }}
      />
      <div className="star-border-inner">{children}</div>
    </Component>
  );
}
