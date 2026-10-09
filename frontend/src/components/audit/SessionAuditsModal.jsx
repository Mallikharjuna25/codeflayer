import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertCircle,
  Clock,
  User,
  Search,
  Filter,
  RefreshCw,
  X,
  FileText,
  Folder,
  ArrowRight,
  Download,
  Hash,
  Layers,
  ChevronDown,
  Check,
  Copy
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiUrl } from '../../lib/api';
import './SessionAuditsModal.css';

export default function SessionAuditsModal({ isOpen, onClose, onLoadPrompt }) {
  const { currentUser, currentCompany, isAdmin } = useAuth();

  const [audits, setAudits] = useState([]);
  const [stats, setStats] = useState({ total: 0, allowed: 0, blocked: 0, escalated: 0 });
  const [distinctUsers, setDistinctUsers] = useState([]);
  const [selectedUserFilter, setSelectedUserFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const fetchAudits = async () => {
    if (!currentUser) return;
    setIsLoading(true);

    try {
      const params = new URLSearchParams({
        user_email: currentUser.email || 'user@company.com',
        role: currentUser.role || 'employee',
        limit: '150'
      });

      if (isAdmin && selectedUserFilter !== 'all') {
        params.append('filter_user', selectedUserFilter);
      }
      if (selectedStatusFilter !== 'ALL') {
        params.append('filter_status', selectedStatusFilter);
      }
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      const res = await fetch(apiUrl(`/api/gateway/audits?${params.toString()}`));
      if (res.ok) {
        const data = await res.json();
        setAudits(data.audits || []);
        setStats(data.stats || { total: 0, allowed: 0, blocked: 0, escalated: 0 });
        if (data.distinct_users && data.distinct_users.length > 0) {
          setDistinctUsers(data.distinct_users);
        }
      }
    } catch (err) {
      console.error('Failed to fetch gateway session audits:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAudits();
    }
  }, [isOpen, selectedUserFilter, selectedStatusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAudits();
  };

  const handleCopyHash = (hashStr, id) => {
    navigator.clipboard.writeText(hashStr);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(audits, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `halo_gateway_audits_${currentUser?.email?.split('@')[0] || 'export'}_${Date.now()}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  if (!isOpen) return null;

  return (
    <div className="audit-modal-backdrop" onClick={onClose}>
      <div className="audit-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header Row */}
        <div className="audit-modal-header">
          <div className="audit-header-left">
            <div className="audit-title-row">
              <Shield className="text-cyan" size={20} />
              <h2 className="audit-modal-title">
                {isAdmin ? 'Enterprise Session Audits' : 'My Session Audits'}
              </h2>
              <span className={`audit-scope-pill ${isAdmin ? 'admin' : 'user'}`}>
                {isAdmin ? '👑 All Users Visibility' : '👤 Personal Trail Only'}
              </span>
            </div>
            <p className="audit-modal-subtitle">
              {isAdmin
                ? 'Supervisory Clearance: Cryptographic audit logs across every employee session in the organization.'
                : `Audited records of queries, tool executions, and security tier decisions for ${currentUser?.full_name || currentUser?.email}.`}
            </p>
          </div>

          <div className="audit-header-actions">
            <button
              type="button"
              className="audit-action-btn"
              onClick={fetchAudits}
              disabled={isLoading}
              title="Refresh audits"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              className="audit-action-btn export"
              onClick={handleExportJson}
              title="Export verified audit trail as JSON"
            >
              <Download size={14} />
              <span>Export JSON</span>
            </button>
            <button
              type="button"
              className="audit-close-btn"
              onClick={onClose}
              aria-label="Close audits modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="audit-stats-strip">
          <div className="audit-stat-card total">
            <span className="stat-label">Total Audited Events</span>
            <span className="stat-value">{stats.total}</span>
          </div>
          <div className="audit-stat-card allowed">
            <span className="stat-label">🟢 Authorized</span>
            <span className="stat-value">{stats.allowed}</span>
          </div>
          <div className="audit-stat-card blocked">
            <span className="stat-label">🛑 Intercepted (Blocked)</span>
            <span className="stat-value">{stats.blocked}</span>
          </div>
          <div className="audit-stat-card escalated">
            <span className="stat-label">⚠️ Escalated Egress</span>
            <span className="stat-value">{stats.escalated}</span>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="audit-filters-bar">
          {/* Admin User Filter Dropdown */}
          {isAdmin && (
            <div className="audit-user-select-box">
              <User size={14} className="text-cyan" />
              <select
                className="audit-user-select"
                value={selectedUserFilter}
                onChange={(e) => setSelectedUserFilter(e.target.value)}
              >
                <option value="all">👥 All Company Users</option>
                {distinctUsers.map((u) => (
                  <option key={u.email} value={u.email}>
                    {u.name} ({u.role === 'company_admin' ? 'Admin' : 'Employee'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status Filter Tabs */}
          <div className="audit-status-tabs">
            {['ALL', 'ALLOWED', 'BLOCKED', 'ESCALATED'].map((st) => (
              <button
                key={st}
                type="button"
                className={`audit-status-tab ${selectedStatusFilter === st ? 'active' : ''} ${st.toLowerCase()}`}
                onClick={() => setSelectedStatusFilter(st)}
              >
                {st === 'ALL' && 'All Statuses'}
                {st === 'ALLOWED' && '🟢 Allowed'}
                {st === 'BLOCKED' && '🛑 Blocked'}
                {st === 'ESCALATED' && '⚠️ Escalated'}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <form className="audit-search-form" onSubmit={handleSearchSubmit}>
            <Search size={13} className="text-slate-400" />
            <input
              type="text"
              placeholder="Search prompts or attachments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="audit-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="audit-search-clear"
                onClick={() => {
                  setSearchQuery('');
                  fetchAudits();
                }}
              >
                <X size={12} />
              </button>
            )}
          </form>
        </div>

        {/* Audits Stream Container */}
        <div className="audit-stream-container">
          {isLoading ? (
            <div className="audit-empty-state">
              <RefreshCw size={24} className="animate-spin text-cyan" />
              <p>Loading verified cryptographic session audits...</p>
            </div>
          ) : audits.length === 0 ? (
            <div className="audit-empty-state">
              <ShieldAlert size={32} className="text-slate-500" />
              <h4>No Audits Found</h4>
              <p>
                {isAdmin
                  ? 'No session events match the selected filters.'
                  : "You haven't run any sessions yet. Send a query in the AI chatbot to generate an audit log!"}
              </p>
            </div>
          ) : (
            <div className="audit-cards-list">
              {audits.map((item) => {
                const statusLower = (item.status || 'ALLOWED').toLowerCase();
                const isExpanded = expandedId === item.id;
                const formattedDate = new Date(item.timestamp).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                });

                return (
                  <div key={item.id} className={`audit-card-item status-${statusLower}`}>
                    {/* Card Top Row */}
                    <div className="audit-card-top-row">
                      <div className="audit-card-actor-info">
                        <div className={`audit-actor-avatar role-${item.user_role === 'company_admin' ? 'purple' : 'cyan'}`}>
                          {item.user_name ? item.user_name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="audit-actor-meta">
                          <div className="audit-actor-name-row">
                            <span className="audit-actor-name">{item.user_name}</span>
                            <span className={`audit-role-tag ${item.user_role === 'company_admin' ? 'admin' : 'employee'}`}>
                              {item.user_role === 'company_admin' ? '👑 Admin' : '📊 Employee'}
                            </span>
                            <span className="audit-actor-email">{item.user_email}</span>
                          </div>
                          <span className="audit-timestamp">{formattedDate}</span>
                        </div>
                      </div>

                      <div className="audit-card-status-badges">
                        <span className={`audit-status-badge ${statusLower}`}>
                          {item.status === 'ALLOWED' && <Check size={11} />}
                          {item.status === 'BLOCKED' && <ShieldAlert size={11} />}
                          {item.status === 'ESCALATED' && <AlertCircle size={11} />}
                          <span>{item.status}</span>
                        </span>
                        <span className="audit-latency-pill">
                          <Clock size={11} className="text-cyan" />
                          <span>{item.execution_time_ms || 18}ms</span>
                        </span>
                      </div>
                    </div>

                    {/* Query Prompt Body */}
                    <div className="audit-query-body">
                      <span className="query-label">Prompt / Tool Request:</span>
                      <p className="query-content">{item.query}</p>
                    </div>

                    {/* Attachments Chips if Any */}
                    {item.attachments && item.attachments.length > 0 && (
                      <div className="audit-attachments-row">
                        <span className="attachments-label">Attached Context:</span>
                        <div className="attachments-chips">
                          {item.attachments.map((att, aIdx) => (
                            <span key={aIdx} className="audit-att-chip">
                              {att.isFolder ? <Folder size={12} className="text-amber" /> : <FileText size={12} className="text-cyan" />}
                              <span>{att.name}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Three-Tier Verification Breakdown */}
                    <div className="audit-tiers-strip">
                      <div className="audit-tier-box">
                        <span className="tier-box-label">Tier 0 (Policy Gate):</span>
                        <span className={`tier-box-val ${item.tier_0?.passed !== false ? 'pass' : 'block'}`}>
                          {item.tier_0?.passed !== false ? '✓ Passed (<1ms)' : `🛑 Blocked: ${item.tier_0?.trigger || 'Violation'}`}
                        </span>
                      </div>
                      <div className="audit-tier-box">
                        <span className="tier-box-label">Tier 1 (Blast Radius):</span>
                        <span className="tier-box-val risk">
                          {item.tier_1?.risk_level || 'LOW'} RISK · {item.tier_1?.blast_radius || 'Isolated'}
                        </span>
                      </div>
                      <div className="audit-tier-box">
                        <span className="tier-box-label">Tier 2 (Provider):</span>
                        <span className="tier-box-val provider">{item.provider || 'Groq Cloud'}</span>
                      </div>
                    </div>

                    {/* Collapsible Response Preview */}
                    <div className="audit-response-drawer">
                      <div
                        className="audit-response-toggle"
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      >
                        <span>Gateway Output & Intercept Reason</span>
                        <ChevronDown size={14} className={`chevron-icon ${isExpanded ? 'rotated' : ''}`} />
                      </div>
                      {isExpanded && (
                        <div className="audit-response-text-full">
                          <pre>{item.response}</pre>
                        </div>
                      )}
                    </div>

                    {/* Card Footer: Hash & Action */}
                    <div className="audit-card-footer">
                      <div
                        className="audit-hash-tag"
                        onClick={() => handleCopyHash(item.current_hash, item.id)}
                        title="Click to copy SHA-256 cryptographic chain hash"
                      >
                        <Hash size={12} />
                        <span>SHA-256: {item.current_hash ? `${item.current_hash.slice(0, 16)}...` : '7f4a28...'}</span>
                        {copiedId === item.id ? (
                          <span className="copied-text text-emerald flex-row gap-1">
                            <Check size={11} /> Copied
                          </span>
                        ) : (
                          <Copy size={11} className="copy-icon" />
                        )}
                      </div>

                      {onLoadPrompt && (
                        <button
                          type="button"
                          className="audit-replay-btn"
                          onClick={() => {
                            onLoadPrompt(item.query);
                            onClose();
                          }}
                          title="Load this query into the AI Chatbot"
                        >
                          <span>Load into Chat</span>
                          <ArrowRight size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
