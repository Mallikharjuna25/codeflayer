import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import RuntimeContextPanel from '../components/apg/RuntimeContextPanel';
import ActionTimeline from '../components/apg/ActionTimeline';
import ActionModal from '../components/apg/ActionModal';
import {
  Shield,
  Zap,
  Play,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ArrowRight,
  ArrowUpRight,
  Eye,
  Sliders,
  Sparkles,
  MessageSquareCode,
  ScanSearch,
  Database,
  ShieldCheck,
  ShieldAlert,
  Cpu,
  Layers,
  Bot,
  UserCheck,
  Terminal,
  Users,
  FileText
} from 'lucide-react';
import OrbHero from '../components/orb/OrbHero';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const { currentUser, currentCompany, isAdmin, setLoginModalOpen } = useAuth();
  const [orbState, setOrbState] = useState('idle'); // 'idle' | 'analyzing' | 'approval_required' | 'blocked'
  const [activeTool, setActiveTool] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [modalMode, setModalMode] = useState(null); // 'review' | 'decision' | null

  // Context data corresponding to current state
  const [runtimeContext, setRuntimeContext] = useState({
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
  });

  const handleStateChange = (newState) => {
    setOrbState(newState);
    if (newState === 'idle') {
      setActiveTool(null);
      setRuntimeContext({
        intent: 'Ready for agent task',
        currentAction: 'idle_monitoring',
        provenance: 'System / Standing',
        risk: 'ZERO',
        decision: 'STANDBY',
        intentAlignment: '100%',
        rolePermission: 'supervisor_active',
        previousActions: 'Flight recorder active',
        blastRadius: 'None',
        policyMatched: 'POL-SYS-READY',
        riskScore: '0.00',
        decisionReason: 'Governor standing by. Continuous provenance validation armed.'
      });
    } else if (newState === 'analyzing') {
      setActiveTool('database');
      setRuntimeContext({
        intent: 'Analyze Q3 sales',
        currentAction: 'read_sales_database',
        provenance: 'Internal / Verified',
        risk: 'LOW',
        decision: 'EVALUATING',
        intentAlignment: 'High (98.4%)',
        rolePermission: 'data_analyst_tier_2',
        previousActions: '3 read operations in session',
        blastRadius: 'Read-only, 0 external egress',
        policyMatched: 'POL-DATA-GOV-04',
        riskScore: '0.12 (Minimal)',
        decisionReason: 'Evaluating intent, provenance token, and partition blast radius.'
      });
    } else if (newState === 'approval_required') {
      setActiveTool('api');
      setRuntimeContext({
        intent: 'Execute vendor invoice payout',
        currentAction: 'execute_payment(amount: $450)',
        provenance: 'External / Partner API',
        risk: 'HIGH',
        decision: 'HOLD',
        intentAlignment: 'Moderate (82.1%)',
        rolePermission: 'finance_agent_std',
        previousActions: '1 payment draft',
        blastRadius: '$450.00 financial transaction',
        policyMatched: 'FIN-AUTH-LEVEL-2',
        riskScore: '0.74 (Elevated)',
        decisionReason: 'Amount exceeds automated threshold ($250). Human supervisor signoff required.'
      });
    } else if (newState === 'blocked') {
      setActiveTool('files');
      setRuntimeContext({
        intent: 'Bulk export telemetry',
        currentAction: 'export_customer_pii',
        provenance: 'Untrusted / Injected Prompt',
        risk: 'CRITICAL',
        decision: 'BLOCKED',
        intentAlignment: 'Discrepancy (12.3%)',
        rolePermission: 'unauthorized_egress',
        previousActions: 'Probing restricted directory',
        blastRadius: 'Entire customer PII table',
        policyMatched: 'POL-TIER0-EXFIL',
        riskScore: '0.98 (Critical Threat)',
        decisionReason: 'Untrusted provenance + policy violation. Intercepted locally at Tier-0.'
      });
    }
  };

  const handleToolSelect = (toolId) => {
    setActiveTool(toolId);
    setOrbState('analyzing');
    setTimeout(() => {
      setOrbState('idle');
      setActiveTool(null);
    }, 2500);
  };

  const runLiveSimulation = () => {
    setIsSimulating(true);
    handleStateChange('analyzing');

    setTimeout(() => {
      handleStateChange('approval_required');
      setTimeout(() => {
        setIsSimulating(false);
      }, 1000);
    }, 2000);
  };

  const handleSelectTimelineAction = (item) => {
    if (item.status === 'ALLOWED') {
      handleStateChange('idle');
    } else if (item.status === 'BLOCKED') {
      handleStateChange('blocked');
    } else {
      handleStateChange('approval_required');
    }
  };

  return (
    <div className="apg-main-viewport">
      {/* -------------------------------------------------------------------
          1. REACT BITS ORB HERO
             Interactive 3D WebGL glowing Orb dynamically reacting to governance state
      -------------------------------------------------------------------- */}
      <OrbHero orbState={orbState} />

      {/* -------------------------------------------------------------------
          2. INTERACTION STATE DISPLAY
      -------------------------------------------------------------------- */}
      <div className="orb-status-display">
        {orbState === 'idle' && (
          <div>
            <div className="status-main-label">Ready</div>
            <div className="status-sub-label">Governor active · Continuous background orchestration</div>
          </div>
        )}

        {orbState === 'analyzing' && (
          <div>
            <div className="status-main-label">
              <span className="dot animate-pulse text-cyan">●</span> Evaluating action...
            </div>
            <div className="status-sub-label">Intent · Provenance · Risk · Policy</div>
          </div>
        )}

        {orbState === 'approval_required' && (
          <div>
            <div className="status-main-label text-amber">
              <AlertTriangle size={20} /> Human approval required
            </div>
            <div className="status-sub-label">
              <code>execute_payment(amount: $450)</code>
            </div>
            <div className="status-action-row">
              <button className="status-action-btn review" onClick={() => setModalMode('review')}>
                Review Action ➔
              </button>
            </div>
          </div>
        )}

        {orbState === 'blocked' && (
          <div>
            <div className="status-main-label text-rose">
              <Lock size={20} /> Action blocked
            </div>
            <div className="status-sub-label">
              Reason: <code>Untrusted provenance + policy violation</code>
            </div>
            <div className="status-action-row">
              <button className="status-action-btn decision" onClick={() => setModalMode('decision')}>
                View Decision ➔
              </button>
            </div>
          </div>
        )}
      </div>

      {/* -------------------------------------------------------------------
          4. INTERACTION STATE SELECTOR BAR (Simulator)
      -------------------------------------------------------------------- */}
      <div className="state-selector-bar">
        <button
          className={`state-pill-btn ${orbState === 'idle' ? 'active' : ''}`}
          onClick={() => handleStateChange('idle')}
        >
          <span>Ready</span>
        </button>
        <button
          className={`state-pill-btn ${orbState === 'analyzing' ? 'active' : ''}`}
          onClick={() => handleStateChange('analyzing')}
        >
          <span>Evaluating...</span>
        </button>
        <button
          className={`state-pill-btn ${orbState === 'approval_required' ? 'active' : ''}`}
          onClick={() => handleStateChange('approval_required')}
        >
          <span>Approval Required</span>
        </button>
        <button
          className={`state-pill-btn ${orbState === 'blocked' ? 'active' : ''}`}
          onClick={() => handleStateChange('blocked')}
        >
          <span>Blocked</span>
        </button>

        <button
          className="state-pill-btn"
          onClick={runLiveSimulation}
          disabled={isSimulating}
          style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', marginLeft: '0.4rem', paddingLeft: '0.8rem' }}
        >
          <Play size={12} className="text-cyan" />
          <span>{isSimulating ? 'Simulating...' : 'Run Live Drill'}</span>
        </button>
      </div>

      {/* -------------------------------------------------------------------
          PLATFORM MODULES & ROLE ACCESS OVERVIEW
      -------------------------------------------------------------------- */}
      <div className="home-modules-section">
        {/* Workspace Session Role Context Banner */}
        <div
          style={{
            background: isAdmin
              ? 'linear-gradient(90deg, rgba(168, 85, 247, 0.12), rgba(59, 130, 246, 0.08))'
              : 'linear-gradient(90deg, rgba(6, 182, 212, 0.12), rgba(59, 130, 246, 0.06))',
            border: isAdmin
              ? '1px solid rgba(168, 85, 247, 0.25)'
              : '1px solid rgba(6, 182, 212, 0.25)',
            borderRadius: '12px',
            padding: '0.85rem 1.25rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: isAdmin ? 'rgba(168, 85, 247, 0.2)' : 'rgba(6, 182, 212, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isAdmin ? '#d8b4fe' : '#67e8f9'
              }}
            >
              {isAdmin ? <ShieldCheck size={18} /> : <Bot size={18} />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff' }}>
                  {currentUser?.full_name || 'Authenticated User'}
                </span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '9999px',
                    fontWeight: 600,
                    background: isAdmin ? 'rgba(168, 85, 247, 0.25)' : 'rgba(6, 182, 212, 0.25)',
                    color: isAdmin ? '#d8b4fe' : '#67e8f9',
                    border: isAdmin ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid rgba(6, 182, 212, 0.4)'
                  }}
                >
                  {isAdmin ? '👑 Administrator' : '📊 Employee'}
                </span>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>({currentUser?.email})</span>
              </div>
              <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                {isAdmin
                  ? 'Clearance: Full platform access & direct in-browser policy .md file editing.'
                  : 'Clearance: Governed end-user — Authorized exclusively to use the Three-Tier AI Gateway Chatbot.'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {isAdmin ? (
              <Link
                to="/policy"
                style={{
                  fontSize: '0.8rem',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '8px',
                  background: 'rgba(168, 85, 247, 0.2)',
                  border: '1px solid rgba(168, 85, 247, 0.4)',
                  color: '#e9d5ff',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontWeight: 600
                }}
              >
                <FileText size={13} />
                <span>Edit Policy .md</span>
              </Link>
            ) : (
              <Link
                to="/chat"
                style={{
                  fontSize: '0.8rem',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '8px',
                  background: 'rgba(6, 182, 212, 0.2)',
                  border: '1px solid rgba(6, 182, 212, 0.4)',
                  color: '#a5f3fc',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontWeight: 600
                }}
              >
                <Bot size={13} />
                <span>Open 3-Tier Chatbot</span>
              </Link>
            )}
            <button
              onClick={() => setLoginModalOpen(true)}
              style={{
                fontSize: '0.8rem',
                padding: '0.4rem 0.75rem',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#cbd5e1',
                cursor: 'pointer'
              }}
            >
              Switch Role
            </button>
          </div>
        </div>

        <div className="home-modules-header">
          <span className="dropdown-header-label">PLATFORM MODULES</span>
          <span className="home-modules-sub">Core capabilities powered by Halo governance runtime</span>
        </div>

        <div className="home-modules-grid">
          {/* Module 1: AI Chatbot (Three-Tier Gateway) - Featured for Everyone */}
          <Link
            to="/chat"
            className="home-module-card"
            style={{
              borderColor: 'rgba(6, 182, 212, 0.35)',
              background: 'linear-gradient(145deg, rgba(6, 182, 212, 0.08), rgba(15, 23, 42, 0.6))'
            }}
          >
            <div className="dropdown-item-icon" style={{ background: 'rgba(6, 182, 212, 0.2)', color: '#38bdf8' }}>
              <Bot size={18} />
            </div>
            <div className="dropdown-item-info">
              <div className="dropdown-item-title-row">
                <span className="dropdown-item-title">AI Chatbot (3-Tier Gateway)</span>
                <span className="dropdown-item-pill" style={{ background: 'rgba(6, 182, 212, 0.2)', color: '#67e8f9' }}>
                  {isAdmin ? 'Active' : 'Authorized Tool'}
                </span>
              </div>
              <span className="dropdown-item-desc">
                Inline 3-tier security gate: Tier 0 (&lt;1ms local regex), Tier 1 (blast radius/provenance), Tier 2 (ChromaDB + Groq/Gemini cascade).
              </span>
            </div>
            <ArrowUpRight size={14} className="home-card-arrow" />
          </Link>

          {/* Administrator Only Modules: Completely omitted for non-admin employees */}
          {isAdmin && (
            <>
              {/* Module 2: Policy Management (.md) */}
              <Link
                to="/policy"
                className="home-module-card"
                style={{
                  borderColor: 'rgba(168, 85, 247, 0.35)',
                  background: 'linear-gradient(145deg, rgba(168, 85, 247, 0.08), rgba(15, 23, 42, 0.6))'
                }}
              >
                <div className="dropdown-item-icon" style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#d8b4fe' }}>
                  <FileText size={18} />
                </div>
                <div className="dropdown-item-info">
                  <div className="dropdown-item-title-row">
                    <span className="dropdown-item-title">Policy Management (.md)</span>
                    <span className="dropdown-item-pill" style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#d8b4fe' }}>
                      👑 Admin Live Editor
                    </span>
                  </div>
                  <span className="dropdown-item-desc">
                    Live Markdown policy editor and ChromaDB re-indexing. Update corporate security rules directly via website.
                  </span>
                </div>
                <ArrowUpRight size={14} className="home-card-arrow" />
              </Link>

              {/* Module 3: Multimodal Studio */}
              <Link to="/extract" className="home-module-card">
                <div className="dropdown-item-icon">
                  <ScanSearch size={18} />
                </div>
                <div className="dropdown-item-info">
                  <div className="dropdown-item-title-row">
                    <span className="dropdown-item-title">Multimodal Studio</span>
                    <span className="dropdown-item-pill">Voice • Vision</span>
                  </div>
                  <span className="dropdown-item-desc">
                    Strict Pydantic JSON extraction from voice agent audio, text, and document scans.
                  </span>
                </div>
                <ArrowUpRight size={14} className="home-card-arrow" />
              </Link>

              {/* Module 4: Vector Vault */}
              <Link to="/knowledge" className="home-module-card">
                <div className="dropdown-item-icon">
                  <Database size={18} />
                </div>
                <div className="dropdown-item-info">
                  <div className="dropdown-item-title-row">
                    <span className="dropdown-item-title">Vector Vault</span>
                    <span className="dropdown-item-pill">ChromaDB</span>
                  </div>
                  <span className="dropdown-item-desc">
                    Local vector memory with sentence-transformers embedding.
                  </span>
                </div>
                <ArrowUpRight size={14} className="home-card-arrow" />
              </Link>

              {/* Module 5: Cascade & Resilience */}
              <Link to="/resilience" className="home-module-card">
                <div className="dropdown-item-icon">
                  <ShieldCheck size={18} />
                </div>
                <div className="dropdown-item-info">
                  <div className="dropdown-item-title-row">
                    <span className="dropdown-item-title">Cascade & Resilience</span>
                    <span className="dropdown-item-pill">Zero 500s</span>
                  </div>
                  <span className="dropdown-item-desc">
                    Tier-0 safety interceptor and automatic dual-provider failover.
                  </span>
                </div>
                <ArrowUpRight size={14} className="home-card-arrow" />
              </Link>
            </>
          )}
        </div>
      </div>

      {/* -------------------------------------------------------------------
          5. RUNTIME GOVERNANCE CONTEXT PANEL (Compact & Expandable)
      -------------------------------------------------------------------- */}
      <RuntimeContextPanel contextData={runtimeContext} />

      {/* -------------------------------------------------------------------
          6. ACTION TIMELINE (Flight Recorder)
      -------------------------------------------------------------------- */}
      <ActionTimeline onSelectAction={handleSelectTimelineAction} />

      {/* -------------------------------------------------------------------
          8. MULTI-TIER ARCHITECTURE SPECIFICATION & ENTERPRISE ROLES
      -------------------------------------------------------------------- */}
      <section className="about-enterprise-card enterprise-arch-section">
        <div className="arch-section-header">
          <div className="dropdown-header-label">ZERO-DOWNTIME RUNTIME ARCHITECTURE</div>
          <h2 className="arch-section-title">Multi-Tier Permission & Inference Hierarchy</h2>
          <p className="arch-section-desc">
            Halo operates as an inline permission governor and multi-LLM cascade that intercepts, validates, and routes every autonomous agent operation before real-world execution.
          </p>
        </div>

        <div className="arch-tiers-grid">
          {/* Tier 0 */}
          <div className="arch-tier-card">
            <div className="arch-tier-top">
              <div className="dropdown-item-icon">
                <ShieldAlert size={18} />
              </div>
              <div className="arch-tier-badge-group">
                <span className="dropdown-item-pill">Tier 0</span>
                <span className="arch-latency-tag">&lt;1ms Local CPU</span>
              </div>
            </div>
            <h3 className="arch-tier-title">Pre-Flight Safety Shield</h3>
            <p className="arch-tier-desc">
              Executes in memory locally before any cloud API dispatch. Scans prompt inputs for prompt injection, jailbreaks, data exfiltration patterns, and dangerous SQL mutations without consuming LLM tokens.
            </p>
            <div className="arch-tier-specs">
              <div className="arch-spec-item">
                <span className="spec-label">Latency:</span>
                <strong className="spec-value">0.8ms average</strong>
              </div>
              <div className="arch-spec-item">
                <span className="spec-label">Cost:</span>
                <strong className="spec-value">$0.00 (Zero tokens)</strong>
              </div>
            </div>
          </div>

          {/* Tier 1 */}
          <div className="arch-tier-card">
            <div className="arch-tier-top">
              <div className="dropdown-item-icon">
                <Zap size={18} />
              </div>
              <div className="arch-tier-badge-group">
                <span className="dropdown-item-pill">Tier 1</span>
                <span className="arch-latency-tag">&lt;350ms TTFT</span>
              </div>
            </div>
            <h3 className="arch-tier-title">Primary Ultra-Fast Inference (Groq)</h3>
            <p className="arch-tier-desc">
              Powers conversational synthesis and tool calling using high-throughput Groq LPUs running Llama-3-70B/8B. Delivers immediate streaming tokens for responsive copilot interactions.
            </p>
            <div className="arch-tier-specs">
              <div className="arch-spec-item">
                <span className="spec-label">Throughput:</span>
                <strong className="spec-value">350+ tokens/sec</strong>
              </div>
              <div className="arch-spec-item">
                <span className="spec-label">Failover SLA:</span>
                <strong className="spec-value">Automatic 84ms handover</strong>
              </div>
            </div>
          </div>

          {/* Tier 2 */}
          <div className="arch-tier-card">
            <div className="arch-tier-top">
              <div className="dropdown-item-icon">
                <Cpu size={18} />
              </div>
              <div className="arch-tier-badge-group">
                <span className="dropdown-item-pill">Tier 2</span>
                <span className="arch-latency-tag">Zero 500 Errors</span>
              </div>
            </div>
            <h3 className="arch-tier-title">Cascade Failover & Vision (Gemini)</h3>
            <p className="arch-tier-desc">
              Autonomous secondary provider powered by Google Gemini 1.5/2.0 Flash & Pro. Instantly activates when primary endpoints encounter rate limits (429) or timeouts, ensuring zero customer downtime.
            </p>
            <div className="arch-tier-specs">
              <div className="arch-spec-item">
                <span className="spec-label">Context Window:</span>
                <strong className="spec-value">1,000,000+ tokens</strong>
              </div>
              <div className="arch-spec-item">
                <span className="spec-label">Multimodal:</span>
                <strong className="spec-value">Vision & schema dump</strong>
              </div>
            </div>
          </div>

          {/* Vector Vault */}
          <div className="arch-tier-card">
            <div className="arch-tier-top">
              <div className="dropdown-item-icon">
                <Database size={18} />
              </div>
              <div className="arch-tier-badge-group">
                <span className="dropdown-item-pill">Vault</span>
                <span className="arch-latency-tag">100% Sovereignty</span>
              </div>
            </div>
            <h3 className="arch-tier-title">Persistent Local Memory (ChromaDB)</h3>
            <p className="arch-tier-desc">
              Local vector repository embedding enterprise policies and specifications using sentence-transformers (all-MiniLM-L6-v2). Zero external cloud vector SaaS risk, complete offline resilience.
            </p>
            <div className="arch-tier-specs">
              <div className="arch-spec-item">
                <span className="spec-label">Embedding:</span>
                <strong className="spec-value">all-MiniLM-L6-v2</strong>
              </div>
              <div className="arch-spec-item">
                <span className="spec-label">Threshold:</span>
                <strong className="spec-value">0.70 Cosine distance</strong>
              </div>
            </div>
          </div>
        </div>

        {/* -------------------------------------------------------------------
            ENTERPRISE USER PERSONAS & ECOSYSTEM ROLES
        -------------------------------------------------------------------- */}
        <div className="arch-users-section">
          <div className="arch-section-header mt-4">
            <div className="dropdown-header-label">ENTERPRISE ECOSYSTEM & USER ROLES</div>
            <h2 className="arch-section-title">Who Uses Halo Across the Organization</h2>
            <p className="arch-section-desc">
              From autonomous agent swarms to human compliance officers, Halo provides tailored interfaces, governance guarantees, and actionable controls for every role.
            </p>
          </div>

          <div className="arch-users-grid">
            {/* User 1: Autonomous AI Agents */}
            <div className="arch-user-card">
              <div className="user-card-header">
                <div className="user-icon-box">
                  <Bot size={20} />
                </div>
                <div>
                  <h4 className="user-role-title">Autonomous AI Agents</h4>
                  <span className="user-role-badge">Autonomous Runtime Actor</span>
                </div>
              </div>
              <p className="user-role-desc">
                Agent instances executing multi-step workflows across databases, APIs, and file systems. Governed by real-time intent alignment, caller provenance checks, and blast radius isolation.
              </p>
              <ul className="user-role-features">
                <li><CheckCircle2 size={13} className="text-cyan shrink-0" /> Evaluated against POL-DATA-GOV before every tool call</li>
                <li><CheckCircle2 size={13} className="text-cyan shrink-0" /> Immediate fail-safe suspension if risk score exceeds 0.70</li>
              </ul>
            </div>

            {/* User 2: Human Supervisors */}
            <div className="arch-user-card">
              <div className="user-card-header">
                <div className="user-icon-box">
                  <UserCheck size={20} />
                </div>
                <div>
                  <h4 className="user-role-title">Human Supervisors & Approvers</h4>
                  <span className="user-role-badge">Human-in-the-Loop Authority</span>
                </div>
              </div>
              <p className="user-role-desc">
                Operations managers and compliance officers who review high-risk agent decisions in real-time. Actions exceeding automated dollar thresholds ($250) or accessing sensitive PII trigger immediate review modals.
              </p>
              <ul className="user-role-features">
                <li><CheckCircle2 size={13} className="text-cyan shrink-0" /> 1-click Approve or Block with full provenance context</li>
                <li><CheckCircle2 size={13} className="text-cyan shrink-0" /> Transparent audit explanation for every flagged execution</li>
              </ul>
            </div>

            {/* User 3: DevSecOps */}
            <div className="arch-user-card">
              <div className="user-card-header">
                <div className="user-icon-box">
                  <Terminal size={20} />
                </div>
                <div>
                  <h4 className="user-role-title">DevSecOps & Platform Engineers</h4>
                  <span className="user-role-badge">Infrastructure Custodian</span>
                </div>
              </div>
              <p className="user-role-desc">
                Security and infrastructure architects who configure Tier-0 safety regex rules, monitor dual-provider latency and failover SLA, and inspect immutable audit logs in the Flight Recorder.
              </p>
              <ul className="user-role-features">
                <li><CheckCircle2 size={13} className="text-cyan shrink-0" /> Live Swagger API documentation at <code>/docs</code></li>
                <li><CheckCircle2 size={13} className="text-cyan shrink-0" /> Health probes for ChromaDB collections and Groq/Gemini tiers</li>
              </ul>
            </div>

            {/* User 4: Enterprise Knowledge Workers */}
            <div className="arch-user-card">
              <div className="user-card-header">
                <div className="user-icon-box">
                  <Users size={20} />
                </div>
                <div>
                  <h4 className="user-role-title">Knowledge Workers & Analysts</h4>
                  <span className="user-role-badge">End-User Consumer</span>
                </div>
              </div>
              <p className="user-role-desc">
                Employees who interact through Halo Copilot and Multimodal Studio to extract Pydantic schemas, summarize guidelines, and query internal knowledge bases with zero downtime and guaranteed data isolation.
              </p>
              <ul className="user-role-features">
                <li><CheckCircle2 size={13} className="text-cyan shrink-0" /> Sub-second vector retrieval with citations</li>
                <li><CheckCircle2 size={13} className="text-cyan shrink-0" /> 99.98% availability backed by Groq ➔ Gemini dual cascade</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------
          9. ACTION MODAL
      -------------------------------------------------------------------- */}
      <ActionModal
        isOpen={modalMode !== null}
        mode={modalMode}
        onClose={() => setModalMode(null)}
        onApprove={() => {
          setModalMode(null);
          handleStateChange('idle');
        }}
        onReject={() => {
          setModalMode(null);
          handleStateChange('blocked');
        }}
      />
    </div>
  );
}
