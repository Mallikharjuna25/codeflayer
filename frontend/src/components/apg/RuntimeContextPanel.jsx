import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Shield,
  Layers,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileCheck
} from 'lucide-react';
import './apg.css';

export default function RuntimeContextPanel({ contextData }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const data = contextData || {
    intent: 'Analyze Q3 sales',
    currentAction: 'read_sales_database',
    provenance: 'Internal / Verified',
    risk: 'LOW',
    decision: 'ALLOW',
    intentAlignment: 'High (98.4%)',
    rolePermission: 'data_analyst_tier_2',
    previousActions: '3 read operations in session',
    blastRadius: 'Read-only, 0 external egress',
    policyMatched: 'POL-DATA-GOV-04',
    riskScore: '0.12 (Minimal)',
    decisionReason: 'Authenticated agent role with verified read-only scope matches governance policy.'
  };

  const getDecisionBadgeClass = (d) => {
    if (d === 'ALLOW') return 'text-emerald';
    if (d === 'BLOCKED') return 'text-rose';
    return 'text-amber';
  };

  return (
    <div className="runtime-context-card">
      {/* Compact Top Bar */}
      <div className="runtime-compact-bar" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="runtime-compact-metrics">
          <div className="runtime-kv">
            <span className="runtime-k">Intent:</span>
            <span className="runtime-v">{data.intent}</span>
          </div>
          <div className="runtime-kv">
            <span className="runtime-k">Current Action:</span>
            <span className="runtime-v">{data.currentAction}</span>
          </div>
          <div className="runtime-kv">
            <span className="runtime-k">Provenance:</span>
            <span className="runtime-v">{data.provenance}</span>
          </div>
          <div className="runtime-kv">
            <span className="runtime-k">Risk:</span>
            <span className="runtime-v text-cyan">{data.risk}</span>
          </div>
          <div className="runtime-kv">
            <span className="runtime-k">Decision:</span>
            <span className={`runtime-v ${getDecisionBadgeClass(data.decision)}`}>
              {data.decision}
            </span>
          </div>
        </div>

        <button className="runtime-toggle-btn" aria-expanded={isExpanded}>
          <span>{isExpanded ? 'Hide Details' : 'Runtime Context'}</span>
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Expanded Deep Governance Panel */}
      {isExpanded && (
        <div className="runtime-expanded-body">
          <div className="runtime-deep-grid">
            <div className="deep-item">
              <span className="deep-label">Intent Alignment</span>
              <span className="deep-val">{data.intentAlignment}</span>
            </div>
            <div className="deep-item">
              <span className="deep-label">Role Permission</span>
              <span className="deep-val">{data.rolePermission}</span>
            </div>
            <div className="deep-item">
              <span className="deep-label">Data Provenance</span>
              <span className="deep-val">{data.provenance}</span>
            </div>
            <div className="deep-item">
              <span className="deep-label">Previous Actions</span>
              <span className="deep-val">{data.previousActions}</span>
            </div>
            <div className="deep-item">
              <span className="deep-label">Blast Radius</span>
              <span className="deep-val">{data.blastRadius}</span>
            </div>
            <div className="deep-item">
              <span className="deep-label">Policy Matched</span>
              <span className="deep-val text-purple">{data.policyMatched}</span>
            </div>
            <div className="deep-item">
              <span className="deep-label">Risk Score</span>
              <span className="deep-val">{data.riskScore}</span>
            </div>
            <div className="deep-item">
              <span className="deep-label">Governor Outcome</span>
              <span className={`deep-val ${getDecisionBadgeClass(data.decision)}`}>
                {data.decision}
              </span>
            </div>
          </div>

          <div className="decision-reason-box">
            <strong>Decision Reason: </strong>
            <span>{data.decisionReason}</span>
          </div>
        </div>
      )}
    </div>
  );
}
