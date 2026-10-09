import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Activity } from 'lucide-react';
import Lightspeed from '../reactbits/Lightspeed';
import './LightspeedHero.css';

export default function LightspeedHero({ orbState = 'idle' }) {
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

  // State-specific hyperspace flight parameters based on runtime governor
  const getFlightConfig = () => {
    switch (orbState) {
      case 'analyzing':
        return {
          speed: 2.2,
          intensity: 1.3,
          streakCount: 340,
          warpFactor: 1.4,
          primaryColor: '#00f0ff',
          secondaryColor: '#38bdf8',
          tertiaryColor: '#ffffff'
        };
      case 'approval_required':
        return {
          speed: 0.9,
          intensity: 1.1,
          streakCount: 260,
          warpFactor: 1.0,
          primaryColor: '#f59e0b',
          secondaryColor: '#fbbf24',
          tertiaryColor: '#fffbeb'
        };
      case 'blocked':
        return {
          speed: 0.5,
          intensity: 1.2,
          streakCount: 240,
          warpFactor: 0.8,
          primaryColor: '#f43f5e',
          secondaryColor: '#e11d48',
          tertiaryColor: '#ffe4e6'
        };
      case 'idle':
      default:
        return {
          speed: 1.0,
          intensity: 1.0,
          streakCount: 280,
          warpFactor: 1.0,
          primaryColor: '#00f0ff',
          secondaryColor: '#8b5cf6',
          tertiaryColor: '#ffffff'
        };
    }
  };

  const flight = getFlightConfig();

  return (
    <div className="lightspeed-hero-container">
      {/* Background 3D React Bits Pro Lightspeed Canvas */}
      <div className="lightspeed-canvas-layer">
        <Lightspeed
          speed={flight.speed}
          intensity={flight.intensity}
          streakCount={flight.streakCount}
          warpFactor={flight.warpFactor}
          primaryColor={flight.primaryColor}
          secondaryColor={flight.secondaryColor}
          tertiaryColor={flight.tertiaryColor}
          backgroundColor="#06070d"
        />
      </div>

      {/* Hero Title & Tool Metadata Stage */}
      <div className="lightspeed-hero-content-stage">
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
