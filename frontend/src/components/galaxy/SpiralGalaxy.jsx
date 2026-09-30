import React, { useEffect, useRef, useState } from 'react';
import './SpiralGalaxy.css';
import { RotateCw, Shield, Zap, Sparkles, ArrowRight, Check } from 'lucide-react';

export default function SpiralGalaxy({
  onStateToggle,
  currentState = 'halo', // 'governance' | 'halo'
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const animFrameRef = useRef(null);
  const particlesRef = useRef([]);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, isHovering: false });
  const warpPulseRef = useRef(0);
  const rotationRef = useRef(0);

  const [activeView, setActiveView] = useState(currentState); // 'governance' or 'halo'

  // Initialize or re-create particles
  const initGalaxy = (width, height) => {
    const particles = [];
    const count = Math.min(2200, Math.floor((width * height) / 380));
    const arms = 2; // Two distinct sweeping spiral arms matching the visual reference
    const maxRadius = Math.min(width, height) * 0.42;

    for (let i = 0; i < count; i++) {
      // Arms assignment: 0 or 1 with some stray field stars
      const isFieldStar = Math.random() < 0.12;
      const arm = i % arms;
      const armAngle = (arm * 2 * Math.PI) / arms;

      // Distance distribution: power curve so more stars concentrate in the dense core
      const distanceRatio = Math.pow(Math.random(), 1.8);
      const r = distanceRatio * maxRadius;

      // Logarithmic spiral angle: theta = armAngle + spiralTightness * r + gaussian offset
      const spiralTightness = 0.0075;
      const spread = (1 - Math.exp(-r / 70)) * 0.45;
      const angleOffset = (Math.random() - 0.5) * spread;
      const theta = isFieldStar
        ? Math.random() * Math.PI * 2
        : armAngle + r * spiralTightness + angleOffset;

      // Color palette matching reference:
      // Core: bright incandescent white and warm amber/gold
      // Arms: dual-tone cool cyan/sapphire and warm starlight peach
      let colorType;
      const roll = Math.random();
      if (r < maxRadius * 0.22) {
        colorType = roll < 0.6 ? 'white' : 'gold';
      } else if (arm === 0) {
        colorType = roll < 0.65 ? 'cyan' : roll < 0.85 ? 'white' : 'gold';
      } else {
        colorType = roll < 0.6 ? 'gold' : roll < 0.85 ? 'white' : 'cyan';
      }

      particles.push({
        r,
        baseR: r,
        theta,
        speed: (0.0018 + 0.0035 / (1 + r * 0.02)) * (0.8 + Math.random() * 0.4),
        size: Math.random() < 0.08 ? Math.random() * 2.5 + 1.8 : Math.random() * 1.5 + 0.6,
        baseAlpha: Math.random() * 0.5 + 0.5,
        twinkleSpeed: Math.random() * 0.04 + 0.01,
        twinklePhase: Math.random() * Math.PI * 2,
        colorType,
        z: (Math.random() - 0.5) * 60,
      });
    }

    particlesRef.current = particles;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    let width = (canvas.width = container.clientWidth);
    let height = (canvas.height = container.clientHeight);

    initGalaxy(width, height);

    const handleResize = () => {
      if (!container || !canvas) return;
      width = canvas.width = container.clientWidth;
      height = canvas.height = container.clientHeight;
      initGalaxy(width, height);
    };

    window.addEventListener('resize', handleResize);

    // Mouse movement for 3D tilt & parallax
    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
      const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
      mouseRef.current.targetX = x * 0.35;
      mouseRef.current.targetY = y * 0.35;
      mouseRef.current.isHovering = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.targetX = 0;
      mouseRef.current.targetY = 0;
      mouseRef.current.isHovering = false;
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);

    // Animation Loop
    let lastTime = performance.now();
    const render = (time) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      // Smooth mouse interpolation
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.06;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.06;

      // Handle warp pulse decay
      if (warpPulseRef.current > 0.001) {
        warpPulseRef.current *= 0.94;
      } else {
        warpPulseRef.current = 0;
      }

      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      // 1. Draw central galactic core bloom
      const coreGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        Math.min(width, height) * 0.35
      );
      coreGradient.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
      coreGradient.addColorStop(0.12, 'rgba(254, 215, 170, 0.3)');
      coreGradient.addColorStop(0.28, 'rgba(56, 189, 248, 0.15)');
      coreGradient.addColorStop(0.6, 'rgba(99, 102, 241, 0.06)');
      coreGradient.addColorStop(1, 'transparent');

      ctx.fillStyle = coreGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, Math.min(width, height) * 0.35, 0, Math.PI * 2);
      ctx.fill();

      // 2. Draw supermassive bright core center
      const innerCore = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 38);
      innerCore.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
      innerCore.addColorStop(0.35, 'rgba(255, 247, 237, 0.85)');
      innerCore.addColorStop(0.7, 'rgba(251, 191, 36, 0.35)');
      innerCore.addColorStop(1, 'transparent');

      ctx.fillStyle = innerCore;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 38, 0, Math.PI * 2);
      ctx.fill();

      // 3. Render and update particles
      ctx.save();
      ctx.translate(centerX, centerY);

      // Subtle 3D tilt perspective from mouse
      const tiltX = mouseRef.current.y * 0.3;
      const tiltY = mouseRef.current.x * 0.3;
      ctx.transform(1, tiltY * 0.15, tiltX * 0.15, 0.85, 0, 0);

      rotationRef.current += 0.0015;

      const particles = particlesRef.current;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Orbit update
        p.theta += p.speed;
        p.twinklePhase += p.twinkleSpeed;

        // Apply warp pulse expansion
        const effectiveR = p.baseR * (1 + warpPulseRef.current * 0.5);

        // Coordinates
        const currentTheta = p.theta + rotationRef.current;
        const x = Math.cos(currentTheta) * effectiveR;
        const y = Math.sin(currentTheta) * effectiveR;

        // Alpha calculation with twinkling
        const twinkle = Math.sin(p.twinklePhase) * 0.25;
        const alpha = Math.max(0.1, Math.min(1, p.baseAlpha + twinkle));

        // Determine particle color
        let fillStyle;
        if (p.colorType === 'white') {
          fillStyle = `rgba(255, 255, 255, ${alpha})`;
        } else if (p.colorType === 'gold') {
          fillStyle = `rgba(251, 146, 60, ${alpha * 0.9})`;
        } else {
          // Cyan / Sky
          fillStyle = `rgba(56, 189, 248, ${alpha * 0.9})`;
        }

        ctx.fillStyle = fillStyle;
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Extra specular bloom on bright stars
        if (p.size > 2.2) {
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.4})`;
          ctx.beginPath();
          ctx.arc(x, y, p.size * 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // Trigger cosmic burst pulse & toggle view
  const triggerGalaxyPulse = () => {
    warpPulseRef.current = 0.85; // explosive warp expansion
    const nextView = activeView === 'halo' ? 'governance' : 'halo';
    setActiveView(nextView);
    onStateToggle?.(nextView);
  };

  const handleReload = (e) => {
    e.stopPropagation();
    warpPulseRef.current = 1.2;
    rotationRef.current += 0.5;
  };

  return (
    <div
      ref={containerRef}
      className="spiral-galaxy-hero-container"
      onClick={triggerGalaxyPulse}
      title="Click anywhere to toggle Halo Intelligence & Governance view"
    >
      {/* Background Star Canvas */}
      <canvas ref={canvasRef} className="galaxy-canvas" />

      {/* Hero Content Stage matching OpenAI GPT/Astra visual hierarchy */}
      <div className="galaxy-hero-content-stage">
        {/* Left Big Typography */}
        <div className="galaxy-flank-text flank-left">
          <div className="hero-flank-badge">
            <Zap size={13} className="text-cyan animate-pulse" />
            <span>CORE INTELLIGENCE</span>
          </div>
          <h1 className="flank-huge-title glow-cyan">HALO</h1>
          <p className="flank-tagline">Autonomous Runtime Intelligence</p>
        </div>

        {/* Center Invisible Target or Floating Prompt */}
        <div className="galaxy-center-hub">
          <div className="galaxy-interaction-pill">
            <Sparkles size={13} className="text-amber" />
            <span>Click to switch view</span>
          </div>
        </div>

        {/* Right Big Typography */}
        <div className="galaxy-flank-text flank-right">
          <div className="hero-flank-badge badge-purple">
            <Shield size={13} className="text-purple" />
            <span>TIER-0 SAFETY</span>
          </div>
          <h1 className="flank-huge-title glow-purple">Astra</h1>
          <p className="flank-tagline">Agentic AI Governance Layer</p>
        </div>
      </div>

      {/* Quote Banner Docked Seamlessly at Bottom of Galaxy */}
      <div className="galaxy-quote-dock">
        <div className="galaxy-quote-text">
          &ldquo;One calm intelligence across every tool.&rdquo;
        </div>
        <div className="galaxy-quote-sub">
          <span className="quote-product">Agent Permission Governor</span>
          <span className="quote-sep">·</span>
          <span>A runtime intelligence layer that governs every action before it reaches the real world.</span>
        </div>
        <div className="galaxy-purpose-strip">
          Every action evaluated · Every permission contextualized · Nothing executes silently.
        </div>
      </div>

      {/* Bottom Right Replay / Burst Button (Exact OpenAI visual match) */}
      <button
        className="galaxy-replay-btn"
        onClick={handleReload}
        title="Replay Galaxy Warp Burst"
        aria-label="Replay Galaxy Animation"
      >
        <RotateCw size={17} />
      </button>
    </div>
  );
}
