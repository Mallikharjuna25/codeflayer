'use client';

import React, { useEffect, useRef } from 'react';
import './Lightspeed.css';

export default function Lightspeed({
  speed = 1.0,
  intensity = 1.0,
  streakCount = 280,
  rotation = 0,
  primaryColor = '#00f0ff',
  secondaryColor = '#8b5cf6',
  tertiaryColor = '#ffffff',
  backgroundColor = '#06070d',
  warpFactor = 1.0,
  className = '',
  style = {},
  children
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = 0;
    let height = 0;
    let dpr = 1;

    // Mouse coordinates for dynamic steering
    let targetCenterX = 0;
    let targetCenterY = 0;
    let currentCenterX = 0;
    let currentCenterY = 0;

    const handleResize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = container.clientWidth || 300;
      height = container.clientHeight || 300;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.scale(dpr, dpr);
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    currentCenterX = width * 0.5;
    currentCenterY = height * 0.5;
    targetCenterX = currentCenterX;
    targetCenterY = currentCenterY;

    // Star pool
    const maxDepth = 1000;
    const stars = [];

    const colorPalette = [primaryColor, secondaryColor, tertiaryColor];

    const createStar = (initialZ) => {
      // Cylindrical distribution with perspective dispersal
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.pow(Math.random(), 0.6) * Math.max(width, height) * 0.9;
      return {
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        z: initialZ !== undefined ? initialZ : Math.random() * maxDepth,
        prevZ: initialZ !== undefined ? initialZ : Math.random() * maxDepth,
        size: Math.random() * 1.5 + 0.8,
        color: colorPalette[Math.floor(Math.random() * colorPalette.length)],
        opacity: Math.random() * 0.5 + 0.5
      };
    };

    for (let i = 0; i < streakCount; i++) {
      stars.push(createStar(Math.random() * maxDepth));
    }

    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / width - 0.5;
      const relY = (e.clientY - rect.top) / height - 0.5;
      // Slight vanishing point shift with steering
      targetCenterX = width * 0.5 + relX * 90;
      targetCenterY = height * 0.5 + relY * 60;
    };

    const handleMouseLeave = () => {
      targetCenterX = width * 0.5;
      targetCenterY = height * 0.5;
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);

    let lastTime = performance.now();

    const render = (time) => {
      animationFrameId = requestAnimationFrame(render);
      const dt = Math.min((time - lastTime) * 0.001, 0.1);
      lastTime = time;

      // Smooth steering damping
      currentCenterX += (targetCenterX - currentCenterX) * 0.06;
      currentCenterY += (targetCenterY - currentCenterY) * 0.06;

      // Clear with background color
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);

      // Radial warp ambient glow in center
      const gradient = ctx.createRadialGradient(
        currentCenterX,
        currentCenterY,
        0,
        currentCenterX,
        currentCenterY,
        Math.max(width, height) * 0.65
      );
      gradient.addColorStop(0, 'rgba(0, 240, 255, 0.08)');
      gradient.addColorStop(0.35, 'rgba(139, 92, 246, 0.04)');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Additive blending for searing luminous hyper-streaks
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      const baseSpeed = 480 * speed;
      const streakMultiplier = (18 + speed * 12) * warpFactor;
      const fov = 340;

      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        star.prevZ = star.z;
        star.z -= baseSpeed * dt;

        if (star.z <= 2) {
          // Reset star at maximum depth
          const recycled = createStar(maxDepth);
          star.x = recycled.x;
          star.y = recycled.y;
          star.z = maxDepth;
          star.prevZ = maxDepth + baseSpeed * dt;
          star.color = recycled.color;
          star.opacity = recycled.opacity;
          continue;
        }

        // 3D perspective projection
        const kCurr = fov / star.z;
        const kPrev = fov / Math.min(star.prevZ + streakMultiplier, maxDepth * 1.5);

        const currX = star.x * kCurr + currentCenterX;
        const currY = star.y * kCurr + currentCenterY;
        const prevX = star.x * kPrev + currentCenterX;
        const prevY = star.y * kPrev + currentCenterY;

        // Skip if outside viewport boundaries
        if (
          (currX < -50 && prevX < -50) ||
          (currX > width + 50 && prevX > width + 50) ||
          (currY < -50 && prevY < -50) ||
          (currY > height + 50 && prevY > height + 50)
        ) {
          continue;
        }

        // Distance alpha falloff
        const depthRatio = 1 - star.z / maxDepth;
        const alpha = Math.min(1, Math.max(0, depthRatio * star.opacity * intensity));
        const lineWidth = Math.max(0.6, (1.8 * kCurr * 0.28 + star.size * 0.5) * intensity);

        // Draw luminous hyperspace streak
        const streakGrad = ctx.createLinearGradient(prevX, prevY, currX, currY);
        streakGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        streakGrad.addColorStop(0.3, star.color);
        streakGrad.addColorStop(1, '#ffffff');

        ctx.strokeStyle = streakGrad;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(currX, currY);
        ctx.stroke();

        // Bright star head spark
        if (depthRatio > 0.4) {
          const headRadius = lineWidth * 0.9;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(currX, currY, headRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [
    speed,
    intensity,
    streakCount,
    rotation,
    primaryColor,
    secondaryColor,
    tertiaryColor,
    backgroundColor,
    warpFactor
  ]);

  return (
    <div ref={containerRef} className={`lightspeed-container ${className}`} style={style}>
      <canvas ref={canvasRef} className="lightspeed-canvas" />
      {children && <div className="lightspeed-content">{children}</div>}
    </div>
  );
}
