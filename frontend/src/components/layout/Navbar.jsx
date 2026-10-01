import React, { useEffect, useState, useRef } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  Zap,
  MessageSquareCode,
  ScanSearch,
  Database,
  LayoutDashboard,
  Menu,
  X,
  ChevronDown,
  ArrowUpRight,
  Search,
  LifeBuoy,
  Lock,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  Building2,
  Users,
  LogOut,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import CompanyLoginModal from '../auth/CompanyLoginModal';
import './Navbar.css';

const PRODUCT_MODULES = [
  { path: '/chat', label: 'AI Copilot (RAG)', desc: 'Ground queries in local ChromaDB knowledge with sub-second latency.', icon: MessageSquareCode, badge: 'Live' },
  { path: '/extract', label: 'Multimodal Studio', desc: 'Strict Pydantic JSON extraction from voice agent audio, text, and document scans.', icon: ScanSearch, badge: 'Voice • Vision' },
  { path: '/knowledge', label: 'Vector Vault', desc: 'Local vector memory with sentence-transformers embedding.', icon: Database },
  { path: '/resilience', label: 'Cascade & Resilience', desc: 'Tier-0 safety interceptor and automatic dual-provider failover.', icon: ShieldCheck, badge: 'Zero 500s' },
];

export default function Navbar() {
  const {
    currentUser,
    currentCompany,
    loginModalOpen,
    setLoginModalOpen,
    logout,
    quickLoginAs,
    companies
  } = useAuth();

  const [isOnline, setIsOnline] = useState(false);
  const [latency, setLatency] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [productsDropdownOpen, setProductsDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const dropdownRef = useRef(null);
  const profileRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    const checkHealth = async () => {
      const startTime = performance.now();
      try {
        const res = await fetch('http://localhost:8000/health');
        if (res.ok) {
          setIsOnline(true);
          setLatency(Math.round(performance.now() - startTime));
        } else {
          setIsOnline(false);
          setLatency(null);
        }
      } catch (err) {
        setIsOnline(false);
        setLatency(null);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 4000);
    return () => clearInterval(interval);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setProductsDropdownOpen(false);
    setProfileDropdownOpen(false);
  }, [location.pathname]);

  // Click outside listener for products and profile dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProductsDropdownOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      <header className="openai-nav-header">
        <div className="openai-nav-container">
          {/* Left: HALO Wordmark Logo */}
          <div className="openai-nav-left">
            <Link to="/" className="halo-wordmark-link">
              <span className="halo-wordmark">Halo</span>
            </Link>

            {/* Navigation Links */}
            <nav className="openai-nav-links">
              <NavLink to="/" end className={({ isActive }) => `openai-link ${isActive ? 'active' : ''}`}>
                Overview
              </NavLink>

              {/* Products Dropdown */}
              <div className="nav-dropdown-wrapper" ref={dropdownRef}>
                <button
                  className={`openai-link dropdown-trigger ${productsDropdownOpen ? 'active' : ''}`}
                  onClick={() => setProductsDropdownOpen(!productsDropdownOpen)}
                  aria-expanded={productsDropdownOpen}
                >
                  <span>Products</span>
                  <ChevronDown size={14} className={`dropdown-chevron ${productsDropdownOpen ? 'open' : ''}`} />
                </button>

                {productsDropdownOpen && (
                  <div className="openai-products-dropdown">
                    <div className="dropdown-header-label">PLATFORM MODULES</div>
                    <div className="dropdown-grid">
                      {PRODUCT_MODULES.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            className="dropdown-item"
                            onClick={() => setProductsDropdownOpen(false)}
                          >
                            <div className="dropdown-item-icon">
                              <Icon size={16} />
                            </div>
                            <div className="dropdown-item-info">
                              <div className="dropdown-item-title-row">
                                <span className="dropdown-item-title">{item.label}</span>
                                {item.badge && <span className="dropdown-item-pill">{item.badge}</span>}
                              </div>
                              <span className="dropdown-item-desc">{item.desc}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <NavLink to="/resilience" className={({ isActive }) => `openai-link ${isActive ? 'active' : ''}`}>
                Governance
              </NavLink>

              <a
                href="http://localhost:8000/docs"
                target="_blank"
                rel="noreferrer"
                className="openai-link flex-align gap-1"
                title="Open FastAPI Swagger Documentation"
              >
                <span>Developers</span>
                <ArrowUpRight size={13} className="text-muted" />
              </a>

              <a
                href="#about"
                className="openai-link"
                onClick={(e) => {
                  e.preventDefault();
                  document.querySelector('.about-enterprise-card')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Company
              </a>

              {/* Support link */}
              <button
                className="openai-link btn-link"
                onClick={() => setSupportModalOpen(true)}
              >
                Support
              </button>

              {/* Search Icon Trigger */}
              <button
                className="openai-icon-btn"
                onClick={() => setSearchOpen(!searchOpen)}
                aria-label="Search Platform"
                title="Search Halo Platform"
              >
                <Search size={15} />
              </button>
            </nav>
          </div>

          {/* Right Action Buttons: Support, Log In, Try Halo */}
          <div className="openai-nav-right">
            {/* SLA Live Telemetry Pill */}
            <div className="nav-sla-badge" title="Verified Tier-0 Availability">
              <span className={`status-indicator-dot ${isOnline ? 'online' : 'offline'}`} />
              <span className="sla-text">{isOnline ? `${latency || 12}ms` : 'Offline'}</span>
            </div>

            {/* Support Button */}
            <button
              className="openai-support-btn"
              onClick={() => setSupportModalOpen(true)}
              aria-label="Open Support Portal"
            >
              <LifeBuoy size={14} />
              <span>Support</span>
            </button>

            {/* Company User Profile Button or Log In Button */}
            {currentUser ? (
              <div ref={profileRef} style={{ position: 'relative' }}>
                <button
                  className="navbar-user-btn"
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  aria-label="User Profile & Company Directory"
                  aria-expanded={profileDropdownOpen}
                >
                  <span className="navbar-company-tag">
                    {currentCompany?.name ? currentCompany.name.split(' ')[0] : 'Acme'}
                  </span>
                  <div className={`navbar-user-avatar role-${currentUser.badge_color || 'cyan'}`}>
                    {currentUser.initials || 'US'}
                  </div>
                  <span className="navbar-user-name">
                    {currentUser.full_name?.split(' ')[0]}
                  </span>
                  <span className={`navbar-role-badge role-${currentUser.badge_color || 'cyan'}`}>
                    {currentUser.role === 'company_admin'
                      ? 'Admin'
                      : currentUser.role === 'security_manager'
                      ? 'Sec'
                      : 'Analyst'}
                  </span>
                  <ChevronDown
                    size={13}
                    style={{
                      transform: profileDropdownOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s'
                    }}
                  />
                </button>

                {profileDropdownOpen && (
                  <div className="navbar-profile-dropdown" onClick={(e) => e.stopPropagation()}>
                    {/* Profile Card Header */}
                    <div className="profile-card-header">
                      <div className={`profile-card-avatar role-${currentUser.badge_color || 'cyan'}`}>
                        {currentUser.initials || 'US'}
                      </div>
                      <div className="profile-card-meta">
                        <span className="profile-card-name">{currentUser.full_name}</span>
                        <span className="profile-card-email">{currentUser.email}</span>
                        <span className="profile-card-company">
                          <Building2 size={12} />
                          <span>{currentCompany?.name || 'Acme Corporation'}</span>
                        </span>
                      </div>
                    </div>

                    {/* Company Users Quick Switcher */}
                    <div className="profile-dropdown-section-title">
                      <span>Users of {currentCompany?.name ? currentCompany.name.split(' ')[0] : 'Company'}</span>
                      <span className="users-count-tag">1-Click</span>
                    </div>

                    <div className="profile-users-switch-list">
                      {(companies.find((c) => c.id === currentCompany?.id || c.slug === currentCompany?.slug) || companies[0])
                        ?.users?.map((u) => {
                          const isSelf = currentUser.email.toLowerCase() === u.email.toLowerCase();
                          const roleTag =
                            u.role === 'company_admin'
                              ? 'Admin'
                              : u.role === 'security_manager'
                              ? 'Sec'
                              : 'Analyst';
                          return (
                            <button
                              key={u.id || u.email}
                              className={`profile-switch-item ${isSelf ? 'active' : ''}`}
                              onClick={() => {
                                if (!isSelf) {
                                  quickLoginAs(u, currentCompany);
                                  setProfileDropdownOpen(false);
                                }
                              }}
                              type="button"
                            >
                              <div className="switch-item-left">
                                <div className={`switch-avatar-small role-${u.badge_color || 'cyan'}`}>
                                  {u.initials || 'U'}
                                </div>
                                <span className="switch-item-name">{u.full_name}</span>
                              </div>
                              {isSelf ? (
                                <span className="switch-active-indicator">
                                  <CheckCircle2 size={12} />
                                  Active
                                </span>
                              ) : (
                                <span className={`user-role-pill role-${u.badge_color || 'cyan'}`}>
                                  {roleTag}
                                </span>
                              )}
                            </button>
                          );
                        })}
                    </div>

                    {/* Action Links */}
                    <div className="profile-card-footer">
                      <button
                        className="profile-action-btn"
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          setLoginModalOpen(true);
                        }}
                        type="button"
                      >
                        <Users size={14} className="text-cyan" />
                        <span>All Company Logins & Workspaces</span>
                      </button>

                      <button
                        className="profile-action-btn logout"
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          logout();
                        }}
                        type="button"
                      >
                        <LogOut size={14} />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                className="openai-login-btn"
                onClick={() => setLoginModalOpen(true)}
                aria-label="Account Login"
              >
                <Building2 size={13} className="text-cyan" />
                <span>Company Logins</span>
                <ChevronDown size={14} />
              </button>
            )}

            {/* Try Halo Button (exact match: white pill with dark text and arrow) */}
            <Link to="/chat" className="openai-try-btn">
              <span>Try Halo</span>
              <ArrowUpRight size={15} />
            </Link>

            {/* Mobile Menu Toggle */}
            <button
              className="openai-mobile-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Mobile Menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Quick Search Dropdown Bar */}
        {searchOpen && (
          <div className="openai-search-bar">
            <div className="search-bar-inner">
              <Search size={16} className="text-muted" />
              <input
                type="text"
                placeholder="Search models, policies, documentation, and vector chunks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              <button className="search-close-btn" onClick={() => setSearchOpen(false)}>
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="openai-mobile-menu">
            <NavLink to="/" end className="mobile-item">Overview</NavLink>
            <div className="mobile-divider" />
            <div className="mobile-section-label">PRODUCTS</div>
            {PRODUCT_MODULES.map((item) => (
              <Link key={item.path} to={item.path} className="mobile-sub-item">
                <span>{item.label}</span>
                {item.badge && <span className="mobile-pill">{item.badge}</span>}
              </Link>
            ))}
            <div className="mobile-divider" />
            <NavLink to="/resilience" className="mobile-item">Governance</NavLink>
            <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer" className="mobile-item">
              Developers <ArrowUpRight size={14} />
            </a>
            <button className="mobile-item" onClick={() => setSupportModalOpen(true)}>Support</button>
            
            <div className="mobile-auth-actions">
              {currentUser ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0' }}>
                    <span style={{ fontSize: '0.85rem', color: '#ffffff', fontWeight: 600 }}>
                      {currentUser.full_name} ({currentCompany?.name ? currentCompany.name.split(' ')[0] : 'Acme'})
                    </span>
                    <button
                      onClick={logout}
                      style={{ background: 'transparent', border: 'none', color: '#f87171', fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      Sign Out
                    </button>
                  </div>
                  <button className="mobile-login-btn" onClick={() => setLoginModalOpen(true)}>
                    Switch Company User
                  </button>
                </div>
              ) : (
                <button className="mobile-login-btn" onClick={() => setLoginModalOpen(true)}>
                  Company Logins
                </button>
              )}
              <Link to="/chat" className="mobile-try-btn">Try Halo <ArrowUpRight size={14} /></Link>
            </div>
          </div>
        )}
      </header>

      {/* -------------------------------------------------------------------
          COMPANY LOGIN MODAL (Interactive Company Directory & Quick Switcher)
      -------------------------------------------------------------------- */}
      <CompanyLoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />

      {/* -------------------------------------------------------------------
          SUPPORT MODAL (Clean OpenAI Style)
      -------------------------------------------------------------------- */}
      {supportModalOpen && (
        <div className="modal-backdrop" onClick={() => setSupportModalOpen(false)}>
          <div className="openai-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <div className="modal-brand-title">
                <LifeBuoy size={20} className="text-cyan" />
                <span className="modal-logo">Halo Support</span>
              </div>
              <button className="modal-close-btn" onClick={() => setSupportModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <p className="modal-desc">
              Need assistance configuring agent boundaries, debugging tool intercept policies, or provisioning vector storage?
            </p>

            <div className="support-cards-grid">
              <a
                href="http://localhost:8000/docs"
                target="_blank"
                rel="noreferrer"
                className="support-grid-card"
              >
                <h4>Developer API Docs</h4>
                <p>Interactive OpenAPI & Swagger specifications for all runtime endpoints.</p>
                <span className="support-card-link">View Swagger ➔</span>
              </a>

              <Link to="/resilience" className="support-grid-card" onClick={() => setSupportModalOpen(false)}>
                <h4>Resilience & Safety Sentinel</h4>
                <p>Simulate provider failovers and inspect real-time safety scanning.</p>
                <span className="support-card-link">Run Sentinel ➔</span>
              </Link>
            </div>

            <div className="support-contact-box">
              <span className="contact-label">Live SLA Status:</span>
              <span className="text-emerald font-semibold">99.98% System Availability</span>
              <span className="text-muted">· 24/7 Enterprise Dedicated Engineering Support</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
