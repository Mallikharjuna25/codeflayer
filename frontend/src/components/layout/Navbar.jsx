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
  Lock,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  Building2,
  Users,
  LogOut,
  UserCheck,
  FileText,
  Bot
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import CompanyLoginModal from '../auth/CompanyLoginModal';
import { apiUrl } from '../../lib/api';
import './Navbar.css';

const ALL_PRODUCT_MODULES = [
  {
    path: '/chat',
    label: 'AI Chatbot (3-Tier Gateway)',
    desc: 'Autonomous 3-tier security gate: Tier 0 (<1ms regex/blacklist), Tier 1 (blast radius), Tier 2 (ChromaDB + Groq/Gemini cascade).',
    icon: Bot,
    badge: '3-Tier Gateway',
    forAll: true
  },
  {
    path: '/policy',
    label: 'Policy Management (.md)',
    desc: 'Live Markdown policy editor and ChromaDB re-indexing. Direct in-browser policy compiling.',
    icon: FileText,
    badge: '👑 Admin Live Sync',
    adminOnly: true
  },
  {
    path: '/extract',
    label: 'Multimodal Studio',
    desc: 'Strict Pydantic JSON extraction from voice agent audio, text, and document scans.',
    icon: ScanSearch,
    badge: 'Voice • Vision',
    adminOnly: true
  },
  {
    path: '/knowledge',
    label: 'Vector Vault',
    desc: 'Local vector memory with sentence-transformers embedding.',
    icon: Database,
    badge: 'ChromaDB',
    adminOnly: true
  },
  {
    path: '/resilience',
    label: 'Cascade & Resilience',
    desc: 'Tier-0 safety interceptor and automatic dual-provider failover.',
    icon: ShieldCheck,
    badge: 'Zero 500s',
    adminOnly: true
  },
];

export default function Navbar() {
  const {
    currentUser,
    currentCompany,
    loginModalOpen,
    setLoginModalOpen,
    logout,
    quickLoginAs,
    companies,
    isAdmin
  } = useAuth();

  const [isOnline, setIsOnline] = useState(false);
  const [latency, setLatency] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [productsDropdownOpen, setProductsDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const dropdownRef = useRef(null);
  const profileRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    const checkHealth = async () => {
      const startTime = performance.now();
      try {
        const res = await fetch(apiUrl('/health'));
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

  // Filter products based on role
  const displayModules = ALL_PRODUCT_MODULES.filter((m) => isAdmin || m.forAll);

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

              {/* For Non-Admins (Employees): Direct Link to 3-Tier AI Chatbot Only */}
              {!isAdmin && (
                <NavLink
                  to="/chat"
                  className={({ isActive }) => `openai-link flex-align gap-1 ${isActive ? 'active' : ''}`}
                  style={{ color: '#38bdf8', fontWeight: 600 }}
                >
                  <Bot size={14} className="text-cyan" />
                  <span>AI Chatbot (3-Tier Gateway)</span>
                </NavLink>
              )}

              {/* Administrator Only Navigation: All Features Dropdown, Policy .md, and Governance */}
              {isAdmin && (
                <>
                  <NavLink
                    to="/chat"
                    className={({ isActive }) => `openai-link flex-align gap-1 ${isActive ? 'active' : ''}`}
                  >
                    <Bot size={14} className="text-cyan" />
                    <span>AI Chatbot</span>
                  </NavLink>

                  <div className="nav-dropdown-wrapper" ref={dropdownRef}>
                    <button
                      className={`openai-link dropdown-trigger ${productsDropdownOpen ? 'active' : ''}`}
                      onClick={() => setProductsDropdownOpen(!productsDropdownOpen)}
                      aria-expanded={productsDropdownOpen}
                    >
                      <span>All Features</span>
                      <ChevronDown size={14} className={`dropdown-chevron ${productsDropdownOpen ? 'open' : ''}`} />
                    </button>

                    {productsDropdownOpen && (
                      <div className="openai-products-dropdown">
                        <div className="dropdown-header-label">
                          ADMINISTRATOR PLATFORM MODULES
                        </div>
                        <div className="dropdown-grid">
                          {ALL_PRODUCT_MODULES.map((item) => {
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

                  <NavLink
                    to="/policy"
                    className={({ isActive }) => `openai-link flex-align gap-1 ${isActive ? 'active' : ''}`}
                    style={{ color: '#d8b4fe', fontWeight: 600 }}
                    title="Edit and Live-Publish Policy Markdown Document"
                  >
                    <FileText size={14} className="text-purple" />
                    <span>Policy (.md)</span>
                    <span style={{ fontSize: '0.65rem', background: 'rgba(168,85,247,0.2)', padding: '0.1rem 0.35rem', borderRadius: '4px', border: '1px solid rgba(168,85,247,0.4)' }}>
                      Admin
                    </span>
                  </NavLink>

                  <NavLink to="/resilience" className={({ isActive }) => `openai-link ${isActive ? 'active' : ''}`}>
                    Governance
                  </NavLink>
                </>
              )}

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

          {/* Right Action Buttons: Live Telemetry, Company Logins, Try Halo */}
          <div className="openai-nav-right">
            {/* SLA Live Telemetry Pill */}
            <div className="nav-sla-badge" title="Verified Tier-0 Availability">
              <span className={`status-indicator-dot ${isOnline ? 'online' : 'offline'}`} />
              <span className="sla-text">{isOnline ? `${latency || 12}ms` : 'Offline'}</span>
            </div>

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
            
            {!isAdmin ? (
              <NavLink to="/chat" className="mobile-item" style={{ color: '#38bdf8', fontWeight: 600 }}>
                AI Chatbot (3-Tier Gateway)
              </NavLink>
            ) : (
              <>
                <div className="mobile-divider" />
                <div className="mobile-section-label">ADMINISTRATOR MODULES</div>
                {ALL_PRODUCT_MODULES.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className="mobile-sub-item"
                  >
                    <span>{item.label}</span>
                    {item.badge && <span className="mobile-pill">{item.badge}</span>}
                  </Link>
                ))}
                <div className="mobile-divider" />
                <NavLink to="/resilience" className="mobile-item">Governance</NavLink>
              </>
            )}
            
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
    </>
  );
}
