import React, { useState, useRef, useEffect } from 'react';

export default function ChatTab() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Welcome to the CODE_STORM AI Copilot. Ask questions regarding our verified guidelines, domain knowledge, or real-time workflows.',
      provider: 'System',
      sources: []
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputQuery.trim() || isLoading) return;

    const userText = inputQuery.trim();
    setInputQuery('');
    setMessages((prev) => [...prev, { role: 'user', content: userText }]);
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userText })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server responded with ${response.status}`);
      }

      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.response,
          provider: data.provider_used,
          sources: data.sources || []
        }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Error: ${err.message}. Please make sure the FastAPI backend is running on port 8000.`,
          provider: 'Error',
          sources: []
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-card">
      <div className="card-header">
        <h2 className="card-title">💬 AI Domain Copilot</h2>
        <p className="card-subtitle">
          Real-time RAG query engine with Tier 0 security scanner and Groq/Gemini multi-provider fallback.
        </p>
      </div>

      <div className="chat-window">
        <div className="messages-list">
          {messages.map((m, idx) => (
            <div key={idx} className={`message-bubble ${m.role}`}>
              <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>

              {m.role === 'assistant' && (
                <div className="bubble-meta">
                  <span>⚡ Served by: <strong>{m.provider}</strong></span>
                  {m.sources && m.sources.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {m.sources.map((s, sIdx) => (
                        <span key={sIdx} className="source-tag">📄 {s}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="message-bubble assistant" style={{ fontStyle: 'italic', color: '#94a3b8' }}>
              ⚡ Consulting verified guidelines & synthesizing response...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSend} className="chat-input-area">
          <input
            type="text"
            className="chat-input"
            placeholder="Ask a question or enter a task prompt..."
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            disabled={isLoading}
          />
          <button type="submit" className="primary-btn" disabled={isLoading || !inputQuery.trim()}>
            Send ➜
          </button>
        </form>
      </div>
    </div>
  );
}
