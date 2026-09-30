import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Database,
  ScanSearch,
  Lock,
  Layers,
  CheckCircle2,
  Activity
} from 'lucide-react';
import ShinyText from './ShinyText';
import StarBorder from './StarBorder';
import './Hero21.css';

export default function Hero21({
  badgeText = "Introducing Halo Enterprise Intelligence • Dual-Provider Cascade v1.0",
  title = "Sovereign Enterprise AI Powered by Halo",
  quote = "“In the storm of cloud disruptions, Halo stands as the sovereign beacon—delivering sub-second reasoning with zero downtime.”",
  primaryCtaText = "Launch Halo Copilot",
  primaryCtaLink = "/chat",
  secondaryCtaText = "Multimodal Studio",
  secondaryCtaLink = "/extract"
}) {
  const canvasRef = useRef(null);

  // Mesh gradient shader animation with subtle grain color flow
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let t = 0;

    let width = (canvas.width = canvas.parentElement.offsetWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement.offsetHeight || 680);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.offsetWidth;
      height = canvas.height = canvas.parentElement.offsetHeight;
    };
    window.addEventListener('resize', handleResize);

    const drawMesh = () => {
      t += 0.006;
      ctx.clearRect(0, 0, width, height);

      // Base gradient
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#ffffff');
      bgGrad.addColorStop(0.5, '#f0f7ff');
      bgGrad.addColorStop(1, '#e0f2fe');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Radial blob 1 (Royal Blue wave)
      const x1 = width * 0.35 + Math.sin(t) * 120;
      const y1 = height * 0.45 + Math.cos(t * 0.8) * 60;
      const r1 = Math.max(width, height) * 0.42;
      const grad1 = ctx.createRadialGradient(x1, y1, 0, x1, y1, r1);
      grad1.addColorStop(0, 'rgba(37, 99, 235, 0.14)');
      grad1.addColorStop(0.6, 'rgba(59, 130, 246, 0.05)');
      grad1.addColorStop(1, 'transparent');
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, width, height);

      // Radial blob 2 (Cyan wave)
      const x2 = width * 0.72 + Math.cos(t * 0.9) * 100;
      const y2 = height * 0.32 + Math.sin(t * 1.1) * 70;
      const r2 = Math.max(width, height) * 0.38;
      const grad2 = ctx.createRadialGradient(x2, y2, 0, x2, y2, r2);
      grad2.addColorStop(0, 'rgba(2, 132, 199, 0.12)');
      grad2.addColorStop(0.6, 'rgba(14, 165, 233, 0.04)');
      grad2.addColorStop(1, 'transparent');
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, width, height);

      // Radial blob 3 (Soft Indigo core)
      const x3 = width * 0.5 + Math.sin(t * 0.7) * 80;
      const y3 = height * 0.7 + Math.cos(t) * 50;
      const r3 = Math.max(width, height) * 0.35;
      const grad3 = ctx.createRadialGradient(x3, y3, 0, x3, y3, r3);
      grad3.addColorStop(0, 'rgba(99, 102, 241, 0.08)');
      grad3.addColorStop(1, 'transparent');
      ctx.fillStyle = grad3;
      ctx.fillRect(0, 0, width, height);

      animationFrameId = requestAnimationFrame(drawMesh);
    };

    drawMesh();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="hero21-container">
      {/* Theme-aware MeshGradient Shader Canvas */}
      <canvas ref={canvasRef} className="hero21-mesh-canvas" />

      {/* Grained Texture Overlay */}
      <div className="hero21-grain-overlay" />

      <div className="hero21-content">
        {/* Top Announcement Badge */}
        <div className="hero21-badge">
          <Sparkles size={13} className="text-cyan" />
          <span>{badgeText}</span>
        </div>

        {/* Centered Headline */}
        <h1 className="hero21-title">
          {title.split('Halo')[0]}
          <ShinyText text="Halo" shimmerColor="#1d4ed8" className="halo-glow-text" />
          {title.split('Halo')[1] || ''}
        </h1>

        {/* Project Quote */}
        <blockquote className="hero21-quote">
          {quote}
        </blockquote>

        {/* CTA Buttons */}
        <div className="hero21-actions">
          <Link to={primaryCtaLink}>
            <StarBorder color="#2563eb" speed="3s">
              <span className="star-btn-inner">
                {primaryCtaText} <ArrowRight size={16} />
              </span>
            </StarBorder>
          </Link>

          <Link to={secondaryCtaLink} className="hero21-secondary-btn">
            <ScanSearch size={16} className="text-cyan" />
            <span>{secondaryCtaText}</span>
          </Link>

          <Link to="/resilience" className="hero21-ghost-btn">
            <ShieldCheck size={16} className="text-emerald" />
            <span>Resilience Cascade</span>
          </Link>
        </div>

        {/* 3D Visual Centerpiece: Halo Intelligence Core */}
        <div className="hero21-image-stage">
          <div className="hero21-image-frame">
            <img
              src="/halo-hero.jpg"
              alt="Halo Enterprise AI Intelligence Core"
              className="hero21-img"
            />
            <div className="hero21-frame-glass-edge" />

            {/* Overlaid Floating Status Chips */}
            <div className="hero21-chip chip-top-left">
              <Zap size={14} className="text-amber" />
              <span>Groq LPUs • &lt;350ms</span>
            </div>

            <div className="hero21-chip chip-top-right">
              <ShieldCheck size={14} className="text-emerald" />
              <span>99.98% Zero-Crash SLA</span>
            </div>

            <div className="hero21-chip chip-bottom-center">
              <Database size={14} className="text-purple" />
              <span>100% On-Premise Vector Vault</span>
            </div>
          </div>
        </div>

        {/* Key Trust Signals Strip */}
        <div className="hero21-trust-strip">
          <div className="trust-item">
            <CheckCircle2 size={16} className="text-emerald" />
            <span>Zero Cloud Data Egress for Local Vectors</span>
          </div>
          <div className="trust-item">
            <CheckCircle2 size={16} className="text-emerald" />
            <span>Tier-0 Pre-Flight Prompt Injection Defense</span>
          </div>
          <div className="trust-item">
            <CheckCircle2 size={16} className="text-emerald" />
            <span>Automated Groq &rarr; Gemini Failover Cascade</span>
          </div>
        </div>
      </div>
    </div>
  );
}
