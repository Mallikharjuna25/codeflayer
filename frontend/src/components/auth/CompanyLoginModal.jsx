import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  Building2,
  Users,
  CheckCircle2,
  KeyRound,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './CompanyAuth.css';

export default function CompanyLoginModal({ isOpen, onClose }) {
  const {
    companies,
    currentUser,
    currentCompany,
    login,
    quickLoginAs,
    isLoggingIn,
    loginError
  } = useAuth();

  const [activeTabCompanyId, setActiveTabCompanyId] = useState(null);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [actionLoadingEmail, setActionLoadingEmail] = useState(null);

  const selectedCompanyId =
    activeTabCompanyId ||
    currentCompany?.id ||
    (companies[0] ? companies[0].id : '');

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeCompany = companies.find((c) => c.id === selectedCompanyId) || companies[0];

  const handleQuickLogin = async (user) => {
    setActionLoadingEmail(user.email);
    try {
      await quickLoginAs(user, activeCompany);
      onClose();
    } finally {
      setActionLoadingEmail(null);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!emailInput || !passwordInput) return;
    const res = await login(emailInput, passwordInput);
    if (res.success) {
      onClose();
    }
  };

  const handleFillCredentials = (user) => {
    setEmailInput(user.email);
    setPasswordInput(user.demo_password || 'admin123');
    setShowManualForm(true);
  };

  return (
    <div className="auth-modal-backdrop" onClick={onClose}>
      <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="auth-modal-header">
          <div className="auth-header-left">
            <div className="auth-title-badge-row">
              <span className="auth-logo-text">Halo</span>
              <span className="auth-sub-pill">Company Logins</span>
            </div>
            <p className="auth-modal-desc">
              Select an enterprise company workspace and sign in as an authorized user to manage policies, approvals, and autonomous agent actions.
            </p>
          </div>
          <button className="auth-close-btn" onClick={onClose} aria-label="Close Login Modal">
            <X size={18} />
          </button>
        </div>

        {/* Company Workspace Switcher Tabs */}
        <div className="company-tabs-container">
          <div className="company-tabs-label">
            <Building2 size={13} />
            <span>Select Company Workspace</span>
          </div>
          <div className="company-tabs-list">
            {companies.map((comp) => {
              const isActive = comp.id === selectedCompanyId;
              const userCount = comp.users ? comp.users.length : 0;
              return (
                <button
                  key={comp.id}
                  className={`company-tab-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveTabCompanyId(comp.id)}
                  type="button"
                >
                  <div className="company-tab-name-wrap">
                    <Building2 size={15} />
                    <span>{comp.name}</span>
                  </div>
                  <span className="company-tab-badge">
                    {userCount} {userCount === 1 ? 'user' : 'users'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Error Banner */}
        {loginError && (
          <div className="auth-error-banner">
            <AlertCircle size={16} />
            <span>{loginError}</span>
          </div>
        )}

        {/* Users Section Header */}
        <div className="users-section-header">
          <div className="users-section-title">
            <Users size={14} />
            <span>Authorized Users for {activeCompany?.name}</span>
          </div>
          <span className="users-count-tag">1-Click Sign In Available</span>
        </div>

        {/* Company Users Grid */}
        <div className="company-users-grid">
          {activeCompany?.users && activeCompany.users.map((user) => {
            const isCurrent = currentUser?.email?.toLowerCase() === user.email.toLowerCase();
            const roleClass = `role-${user.badge_color || 'cyan'}`;
            const isThisLoading = actionLoadingEmail === user.email;

            return (
              <div
                key={user.id || user.email}
                className={`company-user-card ${roleClass} ${isCurrent ? 'current-user' : ''}`}
              >
                <div className="user-card-left">
                  {/* Avatar */}
                  <div className={`user-avatar-circle ${roleClass}`}>
                    {user.initials || 'US'}
                  </div>

                  {/* Info */}
                  <div className="user-card-info">
                    <div className="user-name-role-row">
                      <span className="user-full-name">{user.full_name}</span>
                      <span className={`user-role-pill ${roleClass}`}>
                        {user.role === 'company_admin' && '👑 '}
                        {user.role === 'security_manager' && '🛡️ '}
                        {user.role === 'employee' && '📊 '}
                        {user.role_label || user.role}
                      </span>
                    </div>

                    <span className="user-email-text">{user.email}</span>
                    <span className="user-desc-text">{user.description}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="user-card-actions">
                  {isCurrent ? (
                    <div className="quick-signin-btn active-now">
                      <CheckCircle2 size={14} />
                      <span>Active Session</span>
                    </div>
                  ) : (
                    <button
                      className="quick-signin-btn"
                      onClick={() => handleQuickLogin(user)}
                      disabled={isLoggingIn}
                      type="button"
                      title={`Quick log in as ${user.full_name}`}
                    >
                      {isThisLoading ? (
                        <>
                          <Sparkles size={14} className="animate-spin" />
                          <span>Signing in...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} className="text-cyan" />
                          <span>Log in as {user.full_name.split(' ')[0]}</span>
                        </>
                      )}
                    </button>
                  )}

                  <div
                    className="credential-hint cursor-pointer"
                    onClick={() => handleFillCredentials(user)}
                    title="Click to copy into custom form"
                  >
                    Pass: {user.demo_password || 'admin123'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Manual Credentials Toggle */}
        <button
          className="manual-login-toggle-btn"
          onClick={() => setShowManualForm(!showManualForm)}
          type="button"
        >
          <div className="flex-align gap-2">
            <KeyRound size={15} />
            <span>Or sign in with custom email and password</span>
          </div>
          {showManualForm ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {/* Manual Credentials Form */}
        {showManualForm && (
          <form className="manual-login-form" onSubmit={handleManualSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="auth-email-input">
                Company Email Address
              </label>
              <div className="form-input-wrapper">
                <input
                  id="auth-email-input"
                  type="email"
                  className="form-input"
                  placeholder="admin@acme.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="auth-password-input">
                Password
              </label>
              <div className="form-input-wrapper">
                <input
                  id="auth-password-input"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="pw-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="form-submit-btn"
              disabled={isLoggingIn || !emailInput || !passwordInput}
            >
              {isLoggingIn ? (
                <>
                  <Sparkles size={16} className="animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <Lock size={15} />
                  <span>Sign In to {activeCompany?.name}</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="auth-modal-footer">
          <div className="auth-security-notice">
            <ShieldCheck size={14} className="text-emerald" />
            <span>Zero-Trust Enterprise Access Control · HMAC-SHA256 Token</span>
          </div>
          <span>Multi-Tenant Isolated</span>
        </div>
      </div>
    </div>
  );
}
