import React, { useEffect, useState } from 'react';
import {
  Database,
  Globe,
  FileCode2,
  Terminal,
  Mail,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import './apg.css';

const TOOLS = [
  { id: 'database', label: 'Database', icon: Database, className: 'node-database', cx: 500, cy: 35 },
  { id: 'api',      label: 'API',      icon: Globe,    className: 'node-api',      cx: 910, cy: 250 },
  { id: 'files',    label: 'Files',    icon: FileCode2,className: 'node-files',    cx: 90,  cy: 250 },
  { id: 'code',     label: 'Code',     icon: Terminal, className: 'node-code',     cx: 780, cy: 430 },
  { id: 'email',    label: 'Email',    icon: Mail,     className: 'node-email',    cx: 780, cy: 80 },
  { id: 'cloud',    label: 'Cloud',    icon: Cloud,    className: 'node-cloud',    cx: 220, cy: 430 }
];

export default function GeminiOrb({
  currentState = 'idle', // 'idle' | 'analyzing' | 'approval_required' | 'blocked'
  activeTool = null,
  onToolSelect = () => {},
  onOpenReview = () => {},
  onOpenDecision = () => {}
}) {
  const [pulseProgress, setPulseProgress] = useState(0);

  // Animated pulse along the line when evaluating
  useEffect(() => {
    if (currentState === 'analyzing' || activeTool) {
      const interval = setInterval(() => {
        setPulseProgress((p) => (p >= 1 ? 0 : p + 0.08));
      }, 50);
      return () => clearInterval(interval);
    }
  }, [currentState, activeTool]);

  return (
    <div className={`orb-stage-wrapper state-${currentState}`}>
      {/* SVG Connecting Lines between Central Orb and Tool Nodes */}
      <svg className="tool-connections-svg" viewBox="0 0 1000 500" preserveAspectRatio="none">
        <defs>
          <linearGradient id="orbLineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#f472b6" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {TOOLS.map((t) => {
          const isToolActive = activeTool === t.id || (currentState === 'analyzing' && t.id === 'database');
          // Center of the canvas is (500, 250)
          const center = { x: 500, y: 250 };

          return (
            <g key={t.id}>
              {/* Static subtle connection path */}
              <line
                x1={center.x}
                y1={center.y}
                x2={t.cx}
                y2={t.cy}
                className={`connection-path-base ${isToolActive ? 'active' : ''}`}
              />

              {/* Animated energy pulse traveling from orb to tool */}
              {isToolActive && (
                <circle
                  cx={center.x + (t.cx - center.x) * pulseProgress}
                  cy={center.y + (t.cy - center.y) * pulseProgress}
                  r="3.5"
                  className="pulse-particle"
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* Floating Tool Nodes around the Orb */}
      {TOOLS.map((t) => {
        const Icon = t.icon;
        const isToolActive = activeTool === t.id || (currentState === 'analyzing' && t.id === 'database');

        return (
          <button
            key={t.id}
            className={`tool-node ${t.className} ${isToolActive ? 'active' : ''}`}
            onClick={() => onToolSelect(t.id)}
            title={`Connected Agent Tool: ${t.label}`}
          >
            <Icon size={14} />
            <span>{t.label}</span>
          </button>
        );
      })}

      {/* Center AI Intelligence Orb */}
      <div className="central-orb-container" title="Agent Permission Governor - Core Intelligence">
        {/* Deep ambient multi-stop blur glow */}
        <div className="orb-ambient-glow" />

        {/* Circulating subtle color waves / glow rings */}
        <div className="orb-glow-ring ring-outer" />
        <div className="orb-glow-ring ring-middle" />
        <div className="orb-glow-ring ring-inner" />

        {/* Core Living Gradient Sphere */}
        <div className="orb-sphere">
          {/* Subtle breathing specular highlight */}
          <div className="orb-inner-luminous-core" />
        </div>
      </div>
    </div>
  );
}
