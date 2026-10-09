import React from 'react';
import { Link } from 'react-router-dom';
import {
  Zap,
  ShieldCheck,
  Database,
  ScanSearch,
  MessageSquareCode,
  Building2,
  Lock,
  ArrowUpRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Footer() {
  const { isAdmin } = useAuth();
  return (
    <footer className="enterprise-footer">
      <div className="footer-container">
        <div className="footer-top-grid">
          {/* Brand Info */}
          <div className="footer-brand-col">
            <div className="footer-brand-row">
              <div className="footer-halo-icon">
                <Zap size={16} />
              </div>
              <span className="footer-logo">HALO</span>
              <span className="footer-tag">AGENTIC GOVERNOR</span>
            </div>
            <p className="footer-desc">
              One calm intelligence across every tool. A runtime intelligence layer that governs every action before it reaches the real world.
            </p>
            <div className="footer-status-pill">
              <span className="pulse-dot active" />
              <span>SLA Target: 99.98% System Availability</span>
            </div>
          </div>

          {/* Module Links */}
          <div className="footer-links-col">
            <h4 className="footer-heading">Platform Modules</h4>
            <ul className="footer-links-list">
              <li>
                <Link to="/chat">
                  <MessageSquareCode size={14} /> AI Chatbot (3-Tier Gateway)
                </Link>
              </li>
              {isAdmin && (
                <>
                  <li>
                    <Link to="/policy">
                      <ScanSearch size={14} /> Policy Management (.md)
                    </Link>
                  </li>
                  <li>
                    <Link to="/extract">
                      <ScanSearch size={14} /> Multimodal Vision Studio
                    </Link>
                  </li>
                  <li>
                    <Link to="/knowledge">
                      <Database size={14} /> ChromaDB Vector Vault
                    </Link>
                  </li>
                  <li>
                    <Link to="/resilience">
                      <ShieldCheck size={14} /> Cascade Failover Sentinel
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Architecture Pillars */}
          <div className="footer-links-col">
            <h4 className="footer-heading">Architecture Pillars</h4>
            <ul className="footer-links-list">
              <li>
                <span className="footer-static-item">
                  <Zap size={14} className="text-amber" /> Groq LPU Sub-350ms Inference
                </span>
              </li>
              <li>
                <span className="footer-static-item">
                  <ShieldCheck size={14} className="text-emerald" /> Google Gemini Fallback Cascade
                </span>
              </li>
              <li>
                <span className="footer-static-item">
                  <Database size={14} className="text-purple" /> Local ChromaDB Vector Vault
                </span>
              </li>
              <li>
                <span className="footer-static-item">
                  <Lock size={14} className="text-cyan" /> Tier-0 Pre-Flight Security Guard
                </span>
              </li>
            </ul>
          </div>

          {/* Compliance & Trust */}
          <div className="footer-links-col">
            <h4 className="footer-heading">Enterprise Trust</h4>
            <div className="footer-trust-card">
              <div className="trust-card-title">100% Data Sovereignty</div>
              <p className="trust-card-text">
                Sensitive guidelines, records, and policies are indexed locally using sentence-transformers,
                guaranteeing zero external cloud vector SaaS exposure.
              </p>
            </div>
          </div>
        </div>

        <div className="footer-bottom-row">
          <div className="footer-copy">
            © {new Date().getFullYear()} HALO Intelligence. Developed for high-reliability organizational workloads.
          </div>
          <div className="footer-sublinks">
            <span className="footer-badge">FastAPI</span>
            <span className="footer-badge">React 19</span>
            <span className="footer-badge">Groq</span>
            <span className="footer-badge">Gemini</span>
            <span className="footer-badge">ChromaDB</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
