import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  User,
  Trash2,
  Copy,
  Check,
  Zap,
  ShieldCheck,
  FileText,
  AlertCircle,
  MessageSquareCode
} from 'lucide-react';
import SpotlightCard from '../components/reactbits/SpotlightCard';

const PROMPT_SUGGESTIONS = [
  'What is the dual-provider resilience architecture in CODE_STORM?',
  'What are the key points to highlight when pitching to judges?',
  'How does local ChromaDB prevent downtime during network drops?',
  'Explain the Tier-0 safety scanning mechanism.'
];

export default function ChatPage() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Welcome to Halo Enterprise AI Copilot. I am connected to your local ChromaDB vector vault and the dual-provider Groq / Gemini inference cascade.\n\nAsk any question regarding system guidelines, domain architectures, or enterprise workflows.',
      provider: 'Halo Orchestrator',
      sources: ['sample_guidelines.md']
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (queryText) => {
    const textToSend = typeof queryText === 'string' ? queryText : inputQuery;
    if (!textToSend.trim() || isLoading) return;

    setInputQuery('');
    setMessages((prev) => [...prev, { role: 'user', content: textToSend.trim() }]);
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: textToSend.trim() })
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
          provider: data.provider_used || 'Groq Cloud',
          sources: data.sources || []
        }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Error: ${err.message}. Please verify the FastAPI backend is running on port 8000.`,
          provider: 'Error Sentinel',
          sources: []
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleClear = () => {
    setMessages([
      {
        role: 'assistant',
        content: 'Session cleared. Ready for your next query.',
        provider: 'System Orchestrator',
        sources: []
      }
    ]);
  };

  return (
    <div className="page-container">
      <div className="product-page-hero-card">
        <div className="product-hero-top">
          <div className="product-hero-icon-box">
            <MessageSquareCode size={22} />
          </div>
          <div className="product-hero-info">
            <div className="product-hero-title-row">
              <h1 className="product-hero-title">AI Copilot (RAG)</h1>
              <span className="product-hero-pill">Live</span>
            </div>
            <p className="product-hero-desc">
              Ground queries in local ChromaDB knowledge with sub-second latency and automatic Groq-to-Gemini failover.
            </p>
          </div>
          <div className="product-hero-actions">
            <button onClick={handleClear} className="pill-btn-secondary" title="Clear chat conversation">
              <Trash2 size={14} />
              <span>Clear Session</span>
            </button>
          </div>
        </div>
      </div>

      {/* Suggested Starter Chips */}
      <div className="prompt-chips-wrapper">
        <span className="chips-label">
          <Sparkles size={14} className="text-cyan" /> Quick Prompts:
        </span>
        <div className="chips-list">
          {PROMPT_SUGGESTIONS.map((suggestion, idx) => (
            <button
              key={idx}
              className="prompt-chip"
              onClick={() => handleSend(suggestion)}
              disabled={isLoading}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Window */}
      <SpotlightCard className="chat-spotlight-card" spotlightColor="rgba(37, 99, 235, 0.12)">
        <div className="chat-window-inner">
          <div className="messages-stream">
            {messages.map((m, idx) => {
              const isAssistant = m.role === 'assistant';
              return (
                <div key={idx} className={`message-row ${m.role}`}>
                  <div className={`avatar-box ${m.role}`}>
                    {isAssistant ? <Bot size={16} /> : <User size={16} />}
                  </div>

                  <div className={`message-bubble-v2 ${m.role}`}>
                    <div className="bubble-header-row">
                      <span className="sender-name">
                        {isAssistant ? 'Halo Copilot' : 'You'}
                      </span>
                      {isAssistant && (
                        <div className="bubble-actions">
                          <button
                            onClick={() => handleCopy(m.content, idx)}
                            className="copy-btn"
                            title="Copy response"
                          >
                            {copiedIdx === idx ? (
                              <span className="text-emerald flex-row gap-1">
                                <Check size={13} /> Copied
                              </span>
                            ) : (
                              <Copy size={13} />
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="bubble-text">{m.content}</div>

                    {isAssistant && (
                      <div className="bubble-meta-footer">
                        <div className="provider-indicator">
                          <Zap size={12} className="text-amber" />
                          <span>Provider:</span>
                          <strong className="provider-name">{m.provider}</strong>
                        </div>

                        {m.sources && m.sources.length > 0 && (
                          <div className="sources-list">
                            <span className="sources-label">Sources:</span>
                            {m.sources.map((s, sIdx) => (
                              <span key={sIdx} className="source-badge">
                                <FileText size={11} /> {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="message-row assistant">
                <div className="avatar-box assistant animate-pulse">
                  <Bot size={16} />
                </div>
                <div className="message-bubble-v2 assistant loading-bubble">
                  <div className="loading-dots">
                    <span className="dot" />
                    <span className="dot" />
                    <span className="dot" />
                  </div>
                  <span className="loading-label">
                    Retrieving vector chunks & synthesizing response...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(inputQuery);
            }}
            className="chat-input-bar"
          >
            <input
              type="text"
              className="chat-text-input"
              placeholder="Ask anything or request a solution blueprint..."
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              disabled={isLoading}
            />
            <button
              type="submit"
              className="chat-submit-btn"
              disabled={isLoading || !inputQuery.trim()}
            >
              <span>Send</span>
              <Send size={15} />
            </button>
          </form>
        </div>
      </SpotlightCard>
    </div>
  );
}
