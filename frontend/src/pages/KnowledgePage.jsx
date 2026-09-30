import React, { useState, useEffect } from 'react';
import {
  Database,
  RefreshCw,
  FolderGit2,
  FileCode,
  Search,
  CheckCircle2,
  Sparkles,
  Layers,
  ArrowRight,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import SpotlightCard from '../components/reactbits/SpotlightCard';
import CountUp from '../components/reactbits/CountUp';

export default function KnowledgePage() {
  const [chunkCount, setChunkCount] = useState(0);
  const [isIngesting, setIsIngesting] = useState(false);
  const [statusNote, setStatusNote] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [testResults, setTestResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/rag/stats');
      if (res.ok) {
        const data = await res.json();
        setChunkCount(data.total_chunks || 0);
      }
    } catch (err) {
      console.warn('Could not fetch RAG stats:', err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleReindex = async () => {
    setIsIngesting(true);
    setStatusNote('');
    try {
      const res = await fetch('http://localhost:8000/api/rag/ingest', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setStatusNote(`✅ Successfully indexed ${data.chunks_ingested} chunks into local ChromaDB!`);
        fetchStats();
      } else {
        setStatusNote('⚠️ Ingestion completed with 0 new chunks.');
      }
    } catch (err) {
      setStatusNote(`❌ Ingestion failed: ${err.message}`);
    } finally {
      setIsIngesting(false);
    }
  };

  const handleTestSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      // Test search via query endpoint
      const res = await fetch('http://localhost:8000/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery.trim() })
      });
      const data = await res.json();
      setTestResults(data);
    } catch (err) {
      setTestResults({ error: err.message });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="page-container">
      <div className="product-page-hero-card">
        <div className="product-hero-top">
          <div className="product-hero-icon-box">
            <Database size={22} />
          </div>
          <div className="product-hero-info">
            <div className="product-hero-title-row">
              <h1 className="product-hero-title">Vector Vault</h1>
              <span className="product-hero-pill">ChromaDB</span>
            </div>
            <p className="product-hero-desc">
              Local vector memory with sentence-transformers embeddings and zero external SaaS latency.
            </p>
          </div>
          <div className="product-hero-actions">
            <button
              onClick={handleReindex}
              className="primary-action-btn"
              disabled={isIngesting}
            >
              <RefreshCw size={14} className={isIngesting ? 'animate-spin' : ''} />
              <span>{isIngesting ? 'Ingesting Chunks...' : 'Re-Index Knowledge Base'}</span>
            </button>
          </div>
        </div>
      </div>

      {statusNote && (
        <div className="status-notification-banner">
          <span>{statusNote}</span>
        </div>
      )}

      {/* Stats Overview */}
      <div className="stats-grid-3">
        <SpotlightCard className="knowledge-stat-card" spotlightColor="rgba(37, 99, 235, 0.15)">
          <div className="stat-icon-wrapper text-cyan">
            <Database size={24} />
          </div>
          <div className="stat-large-num">
            <CountUp to={chunkCount} duration={1.2} />
          </div>
          <div className="stat-sublabel">Total Chunks in ChromaDB</div>
          <p className="stat-footnote">Persistent local vector collection</p>
        </SpotlightCard>

        <SpotlightCard className="knowledge-stat-card" spotlightColor="rgba(99, 102, 241, 0.15)">
          <div className="stat-icon-wrapper text-purple">
            <Layers size={24} />
          </div>
          <div className="stat-large-num">
            <span>0.70</span>
          </div>
          <div className="stat-sublabel">Cosine Distance Threshold</div>
          <p className="stat-footnote">Filters out irrelevant semantic noise</p>
        </SpotlightCard>

        <SpotlightCard className="knowledge-stat-card" spotlightColor="rgba(5, 150, 105, 0.15)">
          <div className="stat-icon-wrapper text-emerald">
            <ShieldCheck size={24} />
          </div>
          <div className="stat-large-num">
            <span>100%</span>
          </div>
          <div className="stat-sublabel">Local Zero-Cloud Dependency</div>
          <p className="stat-footnote">Operates without external cloud DB costs</p>
        </SpotlightCard>
      </div>

      {/* Two Column Layout: Document Store + Semantic Retrieval Playground */}
      <div className="knowledge-sections-grid">
        {/* Left: Active Knowledge Store */}
        <SpotlightCard className="panel-card" spotlightColor="rgba(6, 182, 212, 0.12)">
          <div className="panel-card-header">
            <div>
              <h3 className="box-title flex-row gap-2">
                <FolderGit2 size={18} className="text-cyan" />
                Active Knowledge Documents
              </h3>
              <p className="panel-card-sub">
                Target directory: <code>backend/data/knowledge/</code>
              </p>
            </div>
          </div>

          <div className="document-list">
            <div className="doc-item">
              <div className="doc-icon">
                <FileCode size={20} className="text-purple" />
              </div>
              <div className="doc-details">
                <div className="doc-name">sample_guidelines.md</div>
                <div className="doc-meta">
                  Markdown Spec • Multi-provider resilience, ChromaDB, Pitch points
                </div>
              </div>
              <span className="doc-status-badge">Indexed</span>
            </div>
          </div>

          <div className="instruction-box">
            <h4 className="instruction-title">How to expand domain knowledge:</h4>
            <ol className="instruction-steps">
              <li>Save new <code>.md</code> or <code>.txt</code> files into <code>backend/data/knowledge/</code>.</li>
              <li>Click the <strong>"Re-Index Knowledge Base"</strong> button above.</li>
              <li>The backend chunks documents into overlapping sections and computes local embeddings in seconds.</li>
            </ol>
          </div>
        </SpotlightCard>

        {/* Right: Semantic Similarity Playground */}
        <SpotlightCard className="panel-card" spotlightColor="rgba(139, 92, 246, 0.12)">
          <div className="panel-card-header">
            <div>
              <h3 className="box-title flex-row gap-2">
                <Search size={18} className="text-purple" />
                Semantic Similarity Search Playground
              </h3>
              <p className="panel-card-sub">
                Test query retrieval against the local vector database.
              </p>
            </div>
          </div>

          <form onSubmit={handleTestSearch} className="search-test-form">
            <div className="search-input-group">
              <input
                type="text"
                className="search-test-input"
                placeholder="Type query e.g. 'How does Groq failover work?'"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button
                type="submit"
                className="primary-action-btn"
                disabled={isSearching || !searchQuery.trim()}
              >
                {isSearching ? 'Retrieving...' : 'Test Search'}
              </button>
            </div>
          </form>

          {testResults && (
            <div className="search-result-display">
              <div className="result-header">
                <span className="result-provider">
                  Provider: <strong>{testResults.provider_used || 'Local Chroma'}</strong>
                </span>
                {testResults.sources && testResults.sources.length > 0 && (
                  <span className="result-sources">
                    Sources: {testResults.sources.join(', ')}
                  </span>
                )}
              </div>
              <div className="result-body">{testResults.response}</div>
            </div>
          )}

          {!testResults && (
            <div className="empty-search-state">
              <Sparkles size={32} className="text-sub mb-2" />
              <p>Execute a search query above to inspect live vector retrieval results.</p>
            </div>
          )}
        </SpotlightCard>
      </div>
    </div>
  );
}
