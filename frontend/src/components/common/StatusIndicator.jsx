import React from 'react';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Zap,
  Radio,
  Clock,
  Sparkles,
  Layers
} from 'lucide-react';
import './StatusIndicator.css';

/**
 * StatusIndicator Component
 * @param {string} state - 'idle' | 'running' | 'processing' | 'healthy' | 'online' | 'warning' | 'degraded' | 'error' | 'blocked' | 'escalated' | 'offline'
 * @param {string} label - Display label (optional, defaults to state title)
 * @param {string} variant - 'pill' | 'badge' | 'dot' | 'detailed'
 * @param {string|number} metric - Optional metric to display (e.g., '18ms', '98%', '4/4')
 * @param {string} tooltip - Explanatory tooltip text
 * @param {boolean} pulse - Whether to display live pulsing animation
 */
export default function StatusIndicator({
  state = 'idle',
  label,
  variant = 'pill',
  metric,
  subtext,
  tooltip,
  pulse = true,
  className = ''
}) {
  const normalizeState = (s) => {
    const lower = (s || '').toLowerCase();
    if (['healthy', 'online', 'active', 'passed', 'success', 'approved', 'ready'].includes(lower)) return 'healthy';
    if (['running', 'processing', 'syncing', 'analyzing', 'indexing', 'loading', 'in_progress'].includes(lower)) return 'running';
    if (['warning', 'degraded', 'escalated', 'paused', 'pending'].includes(lower)) return 'warning';
    if (['error', 'failed', 'blocked', 'threat', 'intercepted', 'rejected'].includes(lower)) return 'error';
    if (['offline', 'disconnected', 'disabled'].includes(lower)) return 'offline';
    return 'idle';
  };

  const normalized = normalizeState(state);

  const getDefaultLabel = () => {
    switch (normalized) {
      case 'healthy':
        return 'Healthy / Connected';
      case 'running':
        return 'Processing...';
      case 'warning':
        return 'Attention Required';
      case 'error':
        return 'Blocked / Error';
      case 'offline':
        return 'Offline';
      case 'idle':
      default:
        return 'Idle';
    }
  };

  const displayLabel = label || getDefaultLabel();

  const getIcon = () => {
    switch (normalized) {
      case 'healthy':
        return <CheckCircle2 size={13} className="indicator-icon" />;
      case 'running':
        return <Loader2 size={13} className="indicator-icon spinner-icon" />;
      case 'warning':
        return <AlertTriangle size={13} className="indicator-icon" />;
      case 'error':
        return <ShieldAlert size={13} className="indicator-icon" />;
      case 'offline':
        return <Radio size={13} className="indicator-icon" />;
      case 'idle':
      default:
        return <Sparkles size={13} className="indicator-icon" />;
    }
  };

  if (variant === 'dot') {
    return (
      <span
        className={`status-indicator-dot-wrap state-${normalized} ${className}`}
        title={tooltip || displayLabel}
      >
        <span className={`status-dot ${pulse ? 'pulse-anim' : ''}`} />
        {label && <span className="status-dot-label">{label}</span>}
      </span>
    );
  }

  if (variant === 'detailed') {
    return (
      <div
        className={`status-indicator-detailed state-${normalized} ${className}`}
        title={tooltip || ''}
      >
        <div className="detailed-indicator-header">
          <div className="detailed-dot-icon">
            <span className={`status-dot ${pulse ? 'pulse-anim' : ''}`} />
            {getIcon()}
          </div>
          <div className="detailed-info-block">
            <span className="detailed-title">{displayLabel}</span>
            {subtext && <span className="detailed-subtext">{subtext}</span>}
          </div>
          {metric && <span className="detailed-metric-badge">{metric}</span>}
        </div>
      </div>
    );
  }

  // Default: 'pill' or 'badge'
  return (
    <div
      className={`status-indicator-pill state-${normalized} variant-${variant} ${className}`}
      title={tooltip || displayLabel}
    >
      <span className={`status-dot ${pulse ? 'pulse-anim' : ''}`} />
      {getIcon()}
      <span className="status-label">{displayLabel}</span>
      {metric && <span className="status-metric-chip">{metric}</span>}
    </div>
  );
}
