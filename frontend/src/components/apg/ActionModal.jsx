import React from 'react';
import { X, ShieldAlert, AlertTriangle, CheckCircle, Lock } from 'lucide-react';
import './apg.css';

export default function ActionModal({ isOpen, mode, onClose, onApprove, onReject }) {
  if (!isOpen) return null;

  return (
    <div className="apg-modal-backdrop" onClick={onClose}>
      <div className="apg-modal-card" onClick={(e) => e.stopPropagation()}>
        {mode === 'review' ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.2)', border: '1px solid rgba(245, 158, 11, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>Human Approval Required</h3>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>High-Risk Operation Intercepted</span>
                </div>
              </div>
              <button onClick={onClose} style={{ background: 'transparent', color: '#64748b', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '1.2rem', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                Intercepted Action:
              </div>
              <code style={{ fontSize: '1rem', color: '#fde68a', fontFamily: 'var(--font-mono)' }}>
                execute_payment(amount: $450)
              </code>
              <p style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '0.75rem', lineHeight: '1.5' }}>
                The Governor detected a financial transaction exceeding automated limits ($250.00). In accordance with Policy <strong>FIN-AUTH-LEVEL-2</strong>, a human supervisor must confirm before execution.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={onReject}
                style={{ padding: '0.65rem 1.25rem', borderRadius: '10px', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.35)', color: '#fca5a5', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                Reject Action
              </button>
              <button
                onClick={onApprove}
                style={{ padding: '0.65rem 1.4rem', borderRadius: '10px', background: 'linear-gradient(135deg, #059669, #10b981)', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                Approve & Execute
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(244, 63, 94, 0.2)', border: '1px solid rgba(244, 63, 94, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f43f5e' }}>
                  <Lock size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>Governor Decision: Blocked</h3>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Security Boundary Enforced</span>
                </div>
              </div>
              <button onClick={onClose} style={{ background: 'transparent', color: '#64748b', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '1.2rem', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                Enforcement Trigger:
              </div>
              <div style={{ fontSize: '0.95rem', color: '#fca5a5', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                Untrusted provenance + policy violation
              </div>
              <p style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '0.75rem', lineHeight: '1.5' }}>
                Action blocked under Tier-0 safety scaffold. The tool call attempted unvetted egress on customer PII tables without cryptographic provenance verification. Zero data was leaked.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={onClose}
                style={{ padding: '0.65rem 1.4rem', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
