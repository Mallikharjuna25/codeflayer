import React, { useState } from 'react';
import {
  Building2,
  Users,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  LogOut,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './CompanyAuth.css';

export default function CompanyUserBar() {
  const {
    currentUser,
    currentCompany,
    companies,
    quickLoginAs,
    switchCompany,
    logout,
    setLoginModalOpen,
    notification
  } = useAuth();

  const [collapsed, setCollapsed] = useState(false);

  // Find the active company object
  const activeCompany =
    companies.find((c) => c.id === currentCompany?.id || c.slug === currentCompany?.slug) ||
    companies[0];

  const handleUserClick = (user) => {
    if (currentUser?.email?.toLowerCase() === user.email.toLowerCase()) return;
    quickLoginAs(user, activeCompany);
  };

  const handleToggleCompany = () => {
    if (!companies || companies.length < 2) {
      setLoginModalOpen(true);
      return;
    }
    const otherCompany = companies.find((c) => c.id !== activeCompany.id) || companies[0];
    switchCompany(otherCompany.id);
  };

  return (
    <>
      {/* Toast Notification if present */}
      {notification && (
        <div className={`auth-toast-notification ${notification.type}`}>
          <CheckCircle2 size={16} className="text-emerald" />
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Floating Company Logins Dock */}
      <div className="company-quickbar-dock">
        {collapsed ? (
          <div className="quickbar-pill-card" style={{ padding: '0.35rem 0.75rem' }}>
            <div
              className="quickbar-company-info"
              onClick={() => setLoginModalOpen(true)}
              title="Click to view company directory & logins"
            >
              <Building2 size={13} className="text-cyan" />
              <span>{activeCompany?.name ? activeCompany.name.split(' ')[0] : 'Acme'}</span>
            </div>
            {currentUser && (
              <span className={`user-role-pill role-${currentUser.badge_color || 'cyan'}`} style={{ fontSize: '0.65rem' }}>
                {currentUser.role === 'company_admin' ? '👑 Admin' : currentUser.role === 'security_manager' ? '🛡️ Sec' : '📊 Analyst'}
              </span>
            )}
            <button
              className="quickbar-expand-btn"
              onClick={() => setCollapsed(false)}
              title="Expand Company Logins Bar"
              type="button"
            >
              <ChevronUp size={14} />
            </button>
          </div>
        ) : (
          <div className="quickbar-pill-card">
            {/* Company Workspace Indicator */}
            <div
              className="quickbar-company-info"
              onClick={() => setLoginModalOpen(true)}
              title="Click to view company directory & logins"
            >
              <Building2 size={14} className="text-cyan" />
              <span>{activeCompany?.name || 'Acme Corporation'}</span>
            </div>

            <div className="quickbar-divider" />

            {/* Quick-Switch Buttons for Users of this Company */}
            <div className="quickbar-users-buttons">
              {activeCompany?.users &&
                activeCompany.users.map((user) => {
                  const isActive = currentUser?.email?.toLowerCase() === user.email.toLowerCase();
                  const firstName = user.full_name.split(' ')[0];
                  const roleIcon =
                    user.role === 'company_admin'
                      ? '👑'
                      : user.role === 'security_manager'
                      ? '🛡️'
                      : '📊';

                  return (
                    <button
                      key={user.id || user.email}
                      className={`quickbar-user-btn ${isActive ? 'active' : ''}`}
                      onClick={() => handleUserClick(user)}
                      type="button"
                      title={`Switch active user to ${user.full_name} (${user.role_label || user.role})`}
                    >
                      <span>{roleIcon}</span>
                      <span>{firstName}</span>
                      {isActive && <CheckCircle2 size={11} className="text-emerald" />}
                    </button>
                  );
                })}
            </div>

            <div className="quickbar-divider" />

            {/* Switch Company / Open Full Directory */}
            <button
              className="quickbar-user-btn"
              onClick={() => setLoginModalOpen(true)}
              type="button"
              title="Open Full Company Directory & Logins"
            >
              <Users size={12} />
              <span>All Logins</span>
            </button>

            {/* Sign Out */}
            {currentUser && (
              <button
                className="quickbar-expand-btn"
                onClick={logout}
                title="Log out"
                type="button"
              >
                <LogOut size={13} />
              </button>
            )}

            {/* Collapse toggle */}
            <button
              className="quickbar-expand-btn"
              onClick={() => setCollapsed(true)}
              title="Minimize Logins Dock"
              type="button"
            >
              <ChevronDown size={14} />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
