import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Save,
  Upload,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Eye,
  Edit3,
  Lock,
  Layers,
  ArrowRight,
  Database
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SpotlightCard from '../components/reactbits/SpotlightCard';
import { apiUrl } from '../lib/api';
import './PolicyPage.css';

const DEFAULT_SAMPLE_POLICY = `# Corporate Data Governance & Tool Access Policy

## Section 1: Agent Role Authorizations & Scope
1.1 Data Analyst agents are authorized to perform read operations on sales databases (demo-sales) for regional reporting.
1.2 Customer Support agents are strictly forbidden from querying sales databases or accessing payroll partitions.
1.3 Support bots may only query and triage support tickets (support_tickets).

## Section 2: Blast Radius & Egress Boundaries
2.1 All internal report deliveries within company perimeters are authorized automatically.
2.2 Any report sharing to external email recipients (egress) requires supervisor approval before release.
2.3 Mass data export operations exceeding 50 records trigger automated blast-radius containment.

## Section 3: Destructive Operation Blacklist (Tier 0)
3.1 The Gateway strictly intercepts and blocks any tool call containing SQL mutations (DROP TABLE, TRUNCATE, DELETE FROM).
3.2 System file manipulation (rm -rf, chmod 777, accessing /etc/passwd or .env files) is immediately terminated.
3.3 PII exfiltration (customer credit cards, SSNs, personal records) is blocked with zero tokens spent.
`;

export default function PolicyPage() {
  const { currentUser, isAdmin, notify } = useAuth();
  const [policyContent, setPolicyContent] = useState('');
  const [filename, setFilename] = useState('sample_guidelines.md');
  const [totalChunks, setTotalChunks] = useState(0);
  const [lastModified, setLastModified] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('editor'); // 'editor' | 'preview'
  const [saveSuccess, setSaveSuccess] = useState(null);

  // Fetch current policy markdown on mount
  useEffect(() => {
    const fetchCurrentPolicy = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(apiUrl('/api/policy/current-md'));
        if (res.ok) {
          const data = await res.json();
          setPolicyContent(data.content || DEFAULT_SAMPLE_POLICY);
          setFilename(data.filename || 'sample_guidelines.md');
          setTotalChunks(data.total_chunks || 4);
          setLastModified(data.last_modified || 'Just now');
        } else {
          setPolicyContent(DEFAULT_SAMPLE_POLICY);
        }
      } catch {
        setPolicyContent(DEFAULT_SAMPLE_POLICY);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCurrentPolicy();
  }, []);

  // Save policy and re-index into ChromaDB
  const handleSavePolicy = async () => {
    if (!policyContent.trim()) {
      alert('Policy content cannot be empty.');
      return;
    }

    setIsSaving(true);
    setSaveSuccess(null);

    try {
      const res = await fetch(apiUrl('/api/policy/update-md'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: policyContent,
          filename: filename,
          change_summary: `Updated by ${currentUser?.full_name || 'Administrator'} via web policy editor`
        })
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      setSaveSuccess({
        message: data.message || 'Policy successfully updated and active across all Gateway Tiers!',
        chunks: data.chunks_ingested || totalChunks
      });
      setTotalChunks(data.chunks_ingested || totalChunks);
      notify('Policy .md file saved and re-indexed into 3-Tier Gateway!', 'success');
    } catch (err) {
      alert(`Failed to save policy: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Upload local markdown file
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setPolicyContent(content);
        setFilename(file.name);
        notify(`Loaded '${file.name}' into editor. Click 'Save & Publish' to activate.`, 'info');
      }
    };
    reader.readAsText(file);
  };

  // Non-Admin Permission Gate
  if (!isAdmin) {
    return (
      <div className="page-container">
        <SpotlightCard className="policy-access-denied-card" spotlightColor="rgba(239, 68, 68, 0.15)">
          <div className="access-denied-icon">
            <Lock size={32} className="text-rose" />
          </div>
          <h2 className="access-denied-title">Administrator Clearance Required</h2>
          <p className="access-denied-desc">
            You are currently authenticated as{' '}
            <span className="badge-user-role">{currentUser?.role_label || 'Enterprise Employee'}</span> (
            <code>{currentUser?.email}</code>). Under zero-trust RBAC, policy document modification and rule compilation
            are restricted exclusively to <strong>Company Administrators</strong>.
          </p>
          <div className="access-denied-notice">
            <ShieldCheck size={16} className="text-cyan" />
            <span>As an authorized employee, you are provisioned to interact via the 3-Tier AI Gateway Chatbot.</span>
          </div>
          <div className="access-denied-actions">
            <Link to="/chat" className="pill-btn-primary">
              <span>Open AI Chatbot (3-Tier Gateway)</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </SpotlightCard>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Hero Card */}
      <div className="product-page-hero-card">
        <div className="product-hero-top">
          <div className="product-hero-icon-box">
            <FileText size={22} className="text-purple" />
          </div>
          <div className="product-hero-info">
            <div className="product-hero-title-row">
              <h1 className="product-hero-title">Policy Document Management</h1>
              <span className="product-hero-pill" style={{ background: 'rgba(168, 85, 247, 0.15)', borderColor: 'rgba(168, 85, 247, 0.35)', color: '#d8b4fe' }}>
                Admin Clearance
              </span>
            </div>
            <p className="product-hero-desc">
              Live Markdown policy editor for the Halo 3-Tier Agent Gateway. Modifying this document immediately updates Tier-0 deterministic rules and ChromaDB vector embeddings.
            </p>
          </div>
          <div className="product-hero-actions">
            <label className="pill-btn-secondary cursor-pointer" title="Upload local .md file">
              <Upload size={14} />
              <span>Upload .md</span>
              <input type="file" accept=".md,.txt" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
            <button
              onClick={handleSavePolicy}
              disabled={isSaving}
              className="pill-btn-primary"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
            >
              <Save size={14} />
              <span>{isSaving ? 'Compiling & Indexing...' : 'Save & Publish to Gateway'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Success Banner */}
      {saveSuccess && (
        <div className="policy-save-alert">
          <CheckCircle2 size={18} className="text-emerald shrink-0" />
          <div className="policy-save-alert-text">
            <strong>Policy Active: </strong>
            <span>{saveSuccess.message}</span>
            <span className="policy-save-meta"> ({saveSuccess.chunks} vector chunks indexed)</span>
          </div>
        </div>
      )}

      {/* Editor Main Card */}
      <SpotlightCard className="policy-editor-card" spotlightColor="rgba(168, 85, 247, 0.12)">
        {/* Editor Toolbar */}
        <div className="policy-toolbar">
          <div className="toolbar-left">
            <div className="file-tag">
              <FileText size={14} className="text-purple" />
              <span>{filename}</span>
            </div>
            <div className="vector-stat-tag">
              <Database size={13} className="text-cyan" />
              <span>{totalChunks} Chunks Synced</span>
            </div>
          </div>

          <div className="toolbar-tabs">
            <button
              className={`toolbar-tab-btn ${activeTab === 'editor' ? 'active' : ''}`}
              onClick={() => setActiveTab('editor')}
              type="button"
            >
              <Edit3 size={13} />
              <span>Markdown Editor</span>
            </button>
            <button
              className={`toolbar-tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
              onClick={() => setActiveTab('preview')}
              type="button"
            >
              <Eye size={13} />
              <span>Gateway Rules Preview</span>
            </button>
            <button
              className="toolbar-tab-btn"
              onClick={() => setPolicyContent(DEFAULT_SAMPLE_POLICY)}
              title="Reset to default template"
              type="button"
            >
              <RotateCcw size={13} />
              <span>Template</span>
            </button>
          </div>
        </div>

        {/* Editor Workspace */}
        {isLoading ? (
          <div className="policy-loading-box">
            <Sparkles size={20} className="animate-spin text-purple" />
            <span>Loading active policy document from server storage...</span>
          </div>
        ) : activeTab === 'editor' ? (
          <div className="policy-editor-wrapper">
            <textarea
              className="policy-markdown-textarea"
              value={policyContent}
              onChange={(e) => setPolicyContent(e.target.value)}
              placeholder="# Enter corporate policy markdown rules here..."
              spellCheck={false}
            />
          </div>
        ) : (
          <div className="policy-preview-wrapper">
            <div className="policy-preview-content">
              {policyContent.split('\n\n').map((block, idx) => {
                if (block.startsWith('# ')) {
                  return <h2 key={idx} className="preview-h1">{block.replace('# ', '')}</h2>;
                } else if (block.startsWith('## ')) {
                  return <h3 key={idx} className="preview-h2">{block.replace('## ', '')}</h3>;
                } else {
                  return (
                    <div key={idx} className="preview-paragraph">
                      {block.split('\n').map((line, lidx) => (
                        <p key={lidx}>{line}</p>
                      ))}
                    </div>
                  );
                }
              })}
            </div>
          </div>
        )}

        {/* Editor Bottom Meta */}
        <div className="policy-editor-footer">
          <div className="editor-status-item">
            <ShieldCheck size={13} className="text-emerald" />
            <span>Enforced by Tier 0 Deterministic Gate + Tier 2 Vector Grounding</span>
          </div>
          <div className="editor-status-item text-muted">
            <span>Last Modified: {lastModified}</span>
          </div>
        </div>
      </SpotlightCard>
    </div>
  );
}
