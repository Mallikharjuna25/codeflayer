import React from 'react';
import { useFeedback } from '../../context/FeedbackContext';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  Sparkles,
  ArrowRight,
  Clock
} from 'lucide-react';
import './FeedbackToasts.css';

export default function FeedbackToasts() {
  const { toasts, dismissToast } = useFeedback();

  if (!toasts || toasts.length === 0) return null;

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="toast-icon success" size={20} />;
      case 'error':
        return <AlertCircle className="toast-icon error" size={20} />;
      case 'warning':
        return <AlertTriangle className="toast-icon warning" size={20} />;
      case 'info':
      default:
        return <Info className="toast-icon info" size={20} />;
    }
  };

  return (
    <div className="feedback-toasts-container" role="region" aria-label="Notifications">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`feedback-toast-card toast-${toast.type} animate-toast-slide-in`}
        >
          <div className="toast-glow-accent" />
          
          <div className="toast-content-wrapper">
            <div className="toast-icon-box">{getIcon(toast.type)}</div>
            
            <div className="toast-text-box">
              <div className="toast-header-line">
                <span className="toast-title">{toast.title}</span>
                <span className="toast-time">
                  <Clock size={11} style={{ marginRight: '3px', opacity: 0.7 }} />
                  {toast.timestamp}
                </span>
              </div>
              <p className="toast-message">{toast.message}</p>

              {toast.action && (
                <button
                  className="toast-action-btn"
                  onClick={() => {
                    toast.action.onClick?.();
                    dismissToast(toast.id);
                  }}
                >
                  {toast.action.label}
                  <ArrowRight size={13} />
                </button>
              )}
            </div>

            <button
              className="toast-dismiss-btn"
              onClick={() => dismissToast(toast.id)}
              aria-label="Close notification"
            >
              <X size={16} />
            </button>
          </div>

          {toast.duration > 0 && (
            <div
              className="toast-progress-bar"
              style={{ animationDuration: `${toast.duration}ms` }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
