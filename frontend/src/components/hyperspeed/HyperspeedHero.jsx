import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Activity } from 'lucide-react';
import Hyperspeed from '../reactbits/Hyperspeed';
import './HyperspeedHero.css';

export default function HyperspeedHero() {
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

  return (
    <div className="hyperspeed-hero-container">
      {/* Background 3D Hyperspeed WebGL Canvas */}
      <div className="hyperspeed-canvas-layer">
        <Hyperspeed
          curve="winding"
          curvature={1}
          speed={1}
          boost={3}
          fov={90}
          boostFov={130}
          lanes={3}
          roadWidth={10}
          medianWidth={2}
          density={40}
          trailLength={1}
          lightSize={1}
          poles={20}
          dust={100}
          glow={0.6}
          reflections={0.5}
          roadOpacity={0.1}
          steer={0.35}
          tailColors={['#d856bf', '#6750a2', '#c247ac']}
          headColors={['#03b3c3', '#0e5ea5', '#324555']}
          poleColors={['#03b3c3']}
          interactive
        />
      </div>

      {/* Title Content Stage - Aligned Properly as a Tool Title */}
      <div className="hyperspeed-hero-content-stage">
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
