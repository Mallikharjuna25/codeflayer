import React from 'react';
import { Activity, Clock, ShieldCheck, ShieldAlert, AlertTriangle } from 'lucide-react';
import './apg.css';

const DEFAULT_ACTIONS = [
  {
    time: '09:41',
    action: 'Read Sales DB',
    status: 'ALLOWED',
    tool: 'database',
    risk: 'LOW',
    reason: 'Verified read query against allowed partition.'
  },
  {
    time: '09:42',
    action: 'Read HR DB',
    status: 'BLOCKED',
    tool: 'database',
    risk: 'HIGH',
    reason: 'Role restriction: Agent lacks HR clearance.'
  },
  {
    time: '09:42',
    action: 'Export Customer PII',
    status: 'BLOCKED',
    tool: 'files',
    risk: 'CRITICAL',
    reason: 'Untrusted provenance + policy violation (PII Exfiltration).'
  },
  {
    time: '09:43',
    action: 'Send Report',
    status: 'REVIEW',
    tool: 'email',
    risk: 'MEDIUM',
    reason: 'External email recipient requires human supervisor signoff.'
  }
];

export default function ActionTimeline({ actions = DEFAULT_ACTIONS, onSelectAction = () => {} }) {
  const getBadgeClass = (status) => {
    if (status === 'ALLOWED') return 'badge-allowed';
    if (status === 'BLOCKED') return 'badge-blocked';
    return 'badge-review';
  };

  const getStatusIcon = (status) => {
    if (status === 'ALLOWED') return '✓ ALLOWED';
    if (status === 'BLOCKED') return '✕ BLOCKED';
    return '◉ REVIEW';
  };

  return (
    <div className="timeline-section">
      <div className="timeline-header-row">
        <div className="timeline-title">
          <Activity size={14} className="text-cyan" />
          <span>Flight Recorder · Runtime Activity Stream</span>
        </div>
        <span className="text-sub" style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
          4 Events Logged
        </span>
      </div>

      <div className="timeline-recorder-card">
        {actions.map((item, idx) => (
          <div
            key={idx}
            className="timeline-row"
            onClick={() => onSelectAction(item)}
            title="Click to inspect governance telemetry"
          >
            <span className="timeline-time">{item.time}</span>
            <span className="timeline-action">{item.action}</span>
            <span className={`timeline-badge ${getBadgeClass(item.status)}`}>
              {getStatusIcon(item.status)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
