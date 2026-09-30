import React, { useState, useEffect } from 'react';

export default function KnowledgeTab() {
  const [chunkCount, setChunkCount] = useState(0);
  const [isIngesting, setIsIngesting] = useState(false);
  const [statusNote, setStatusNote] = useState('');

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
        setStatusNote(`✅ Successfully indexed ${data.chunks_ingested} chunks!`);
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

  return (
    <div className="glass-card">
      <div className="card-header">
        <h2 className="card-title">📚 Local Vector Knowledge Base</h2>
        <p className="card-subtitle">
          Embeddings powered by local sentence-transformers (all-MiniLM-L6-v2) stored in persistent ChromaDB.
        </p>
      </div>

      <div className="stats-banner">
        <div className="stat-box">
          <div className="stat-num">{chunkCount}</div>
          <div className="stat-label">Vector Chunks in ChromaDB</div>
        </div>
        <div className="stat-box">
          <div className="stat-num" style={{ color: '#8b5cf6' }}>0.70</div>
          <div className="stat-label">Max Cosine Distance Threshold</div>
        </div>
        <div className="stat-box">
          <div className="stat-num" style={{ color: '#10b981' }}>100%</div>
          <div className="stat-label">Local Processing (Zero Cloud Cost)</div>
        </div>
      </div>

      <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-glass)', marginBottom: '1.5rem' }}>
        <h4 style={{ color: '#f8fafc', marginBottom: '0.5rem' }}>📁 Document Directory: <code>backend/data/knowledge/</code></h4>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.6' }}>
          When the hackathon problem statement is announced, simply drop your guidelines, policies, medical handbooks, or legal contracts (as <code>.md</code> or <code>.txt</code> files) into the folder and click below:
        </p>
        <div style={{ marginTop: '1.25rem' }}>
          <button
            className="primary-btn"
            onClick={handleReindex}
            disabled={isIngesting}
          >
            {isIngesting ? '⏳ Ingesting & Embedding Locally...' : '🔄 Re-Index Knowledge Base Now'}
          </button>
        </div>
        {statusNote && (
          <div style={{ marginTop: '1rem', fontSize: '0.9rem', fontWeight: 500 }}>
            {statusNote}
          </div>
        )}
      </div>
    </div>
  );
}
