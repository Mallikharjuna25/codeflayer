import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Activity } from 'lucide-react';
import Orb from '../reactbits/Orb';
import './OrbHero.css';

export default function OrbHero({ orbState = 'idle' }) {
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

  // State-specific orb configurations based on Governor runtime
  const getOrbConfig = () => {
    switch (orbState) {
      case 'analyzing':
        return {
          hue: 200,
          hoverIntensity: 0.65,
          rotateOnHover: true,
          forceHoverState: true
        };
      case 'approval_required':
        return {
          hue: 45,
          hoverIntensity: 0.6,
          rotateOnHover: true,
          forceHoverState: true
        };
      case 'blocked':
        return {
          hue: 340,
          hoverIntensity: 0.75,
          rotateOnHover: true,
          forceHoverState: true
        };
      case 'idle':
      default:
        return {
          hue: 0,
          hoverIntensity: 0.5,
          rotateOnHover: true,
          forceHoverState: false
        };
    }
  };

  const orbConfig = getOrbConfig();

  return (
    <div className="orb-hero-container">
      {/* Background 3D React Bits WebGL Orb Canvas */}
      <div className="orb-canvas-layer">
        <Orb
          hue={orbConfig.hue}
          hoverIntensity={orbConfig.hoverIntensity}
          rotateOnHover={orbConfig.rotateOnHover}
          forceHoverState={orbConfig.forceHoverState}
          backgroundColor="#06070d"
        />
      </div>

      {/* Hero Title & Tool Metadata Stage */}
      <div className="orb-hero-content-stage">
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
