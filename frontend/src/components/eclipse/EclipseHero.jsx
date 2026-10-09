import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Activity } from 'lucide-react';
import Eclipse from '../reactbits/Eclipse';
import './EclipseHero.css';

export default function EclipseHero({ orbState = 'idle' }) {
  const navigate = useNavigate();

  const handleLaunchChat = (e) => {
    e.stopPropagation();
    navigate('/chat');
  };

  const handleScrollTelemetry = (e) => {
    e.stopPropagation();
    const el = document.querySelector('.orb-status-display') || document.querySelector('.apg-architecture-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // State-specific Eclipse configurations reflecting Governor runtime telemetry
  const getEclipseConfig = () => {
    switch (orbState) {
      case 'analyzing':
        return {
          radius: 0.40,
          speed: 1.4,
          turbulence: 1.6,
          coronaSpread: 0.44,
          colorShift: 0.35 // Electric cyan / deep blue plasma
        };
      case 'approval_required':
        return {
          radius: 0.43,
          speed: 1.1,
          turbulence: 1.4,
          coronaSpread: 0.42,
          colorShift: 0.65 // Solar flare amber / golden corona
        };
      case 'blocked':
        return {
          radius: 0.45,
          speed: 1.8,
          turbulence: 2.0,
          coronaSpread: 0.50,
          colorShift: 0.95 // Crimson threat interceptor corona
        };
      case 'idle':
      default:
        return {
          radius: 0.42,
          speed: 0.8,
          turbulence: 1.2,
          coronaSpread: 0.38,
          colorShift: 0.0 // Base spectral violet / cyan / gold corona
        };
    }
  };

  const config = getEclipseConfig();

  return (
    <div className="eclipse-hero-container">
      {/* Background 3D React Bits Pro WebGL Eclipse */}
      <div className="eclipse-canvas-layer">
        <Eclipse
          radius={config.radius}
          speed={config.speed}
          turbulence={config.turbulence}
          coronaSpread={config.coronaSpread}
          colorShift={config.colorShift}
          backgroundColor="#06070d"
        />
      </div>

      {/* Hero Title & Tool Metadata Stage */}
      <div className="eclipse-hero-content-stage">
        <div className="halo-title-block">
          {/* Badge Identifier */}
          <div className="halo-badge-pill">
            <span className="halo-badge-tag">PS-54</span>
            <span className="halo-badge-text">Secure AI Agent Tool Gateway</span>
          </div>

          {/* Main Tool Title */}
          <h1 className="halo-title-name">HALO</h1>

          {/* Subtitle / Product Role */}
          <h2 className="halo-title-tagline">
            Autonomous Runtime Intelligence &amp; Permission Governor
          </h2>

          {/* Explanatory Context */}
          <p className="halo-title-description">
            A runtime security checkpoint that inspects, contextualizes, and intercepts every action before an AI agent accesses tools, databases, or APIs.
          </p>

          {/* Action Buttons */}
          <div className="halo-title-actions">
            <button
              type="button"
              className="halo-btn-primary"
              onClick={handleLaunchChat}
            >
              <span>Launch 3-Tier Gateway</span>
              <ArrowRight size={15} />
            </button>
            <button
              type="button"
              className="halo-btn-secondary"
              onClick={handleScrollTelemetry}
            >
              <Activity size={15} className="text-cyan" />
              <span>Live Architecture</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
