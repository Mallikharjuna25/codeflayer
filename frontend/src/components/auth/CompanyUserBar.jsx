import React from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './CompanyAuth.css';

export default function CompanyUserBar() {
  const { notification, dismissNotification } = useAuth();

  if (!notification) return null;

  return (
    <div className={`auth-toast-notification ${notification.type}`}>
      <div className="toast-content-wrapper">
        <CheckCircle2 size={16} className="text-emerald shrink-0" />
        <span className="toast-text">{notification.msg}</span>
      </div>
      <button
        className="toast-dismiss-btn"
        onClick={dismissNotification}
        aria-label="Dismiss Notification"
        type="button"
      >
        <X size={13} />
      </button>
    </div>
  );
}
