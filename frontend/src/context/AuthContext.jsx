import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Default static fallback directory for offline resilience
export const DEFAULT_COMPANIES = [
  {
    id: 'org-acme-corp-001',
    name: 'Acme Corporation',
    slug: 'acme',
    tagline: 'Primary Enterprise Workspace',
    users: [
      {
        id: 'usr-alice-admin-001',
        email: 'admin@acme.com',
        full_name: 'Alice Administrator',
        role: 'company_admin',
        role_label: 'Company Admin',
        badge_color: 'purple',
        description: 'Full workspace governance, policy publishing, agent registration & key lifecycle management',
        initials: 'AA',
        demo_password: 'admin123',
        key_privileges: ['Publish Policies', 'Revoke Agent Keys', 'Manage Workspace', 'View All Audit Logs']
      },
      {
        id: 'usr-sam-security-002',
        email: 'security@acme.com',
        full_name: 'Sam Security Manager',
        role: 'security_manager',
        role_label: 'Security Manager',
        badge_color: 'amber',
        description: 'DevSecOps reviewer, human approval gatekeeper & cryptographic audit ledger verification',
        initials: 'SS',
        demo_password: 'sec123',
        key_privileges: ['Review Paused Actions', 'Verify SHA-256 Ledger', 'Upload Policy Sources', 'Inspect Telemetry']
      },
      {
        id: 'usr-elena-analyst-003',
        email: 'analyst@acme.com',
        full_name: 'Elena Employee',
        role: 'employee',
        role_label: 'Business Analyst',
        badge_color: 'cyan',
        description: 'Standard enterprise business employee, triggers governed reporting & data analysis workflows',
        initials: 'EE',
        demo_password: 'analyst123',
        key_privileges: ['Run Sales Queries', 'Synthesize Reports', 'Propose Agent Actions']
      }
    ]
  },
  {
    id: 'org-beta-labs-002',
    name: 'Beta Labs',
    slug: 'beta',
    tagline: 'Multi-Tenant Sandbox Workspace',
    users: [
      {
        id: 'usr-bob-beta-004',
        email: 'admin@beta.com',
        full_name: 'Bob Beta Admin',
        role: 'company_admin',
        role_label: 'Company Admin',
        badge_color: 'purple',
        description: 'Multi-tenant administrator for secondary subsidiary operations',
        initials: 'BA',
        demo_password: 'beta123',
        key_privileges: ['Beta Workspace Administration', 'Sub-tenant Policy Control']
      }
    ]
  }
];

const AuthContext = createContext(null);
const STORAGE_KEY = 'halo_auth_session';

export function AuthProvider({ children }) {
  const [companies, setCompanies] = useState(DEFAULT_COMPANIES);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentCompany, setCurrentCompany] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [notification, setNotification] = useState(null);

  // Helper to show temporary notification toasts
  const notify = useCallback((msg, type = 'success') => {
    setNotification({ msg, type, id: Date.now() });
    setTimeout(() => {
      setNotification((curr) => (curr && curr.id === notification?.id ? null : curr));
    }, 3800);
  }, [notification?.id]);

  // Fetch updated company user directory from backend
  const fetchCompanies = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:8000/api/auth/demo-accounts');
      if (res.ok) {
        const data = await res.json();
        if (data.companies && data.companies.length > 0) {
          setCompanies(data.companies);
        }
      }
    } catch {
      // Fallback already preloaded
    }
  }, []);

  // Initialize session from localStorage or seed default user
  useEffect(() => {
    fetchCompanies();

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.token && parsed.user && parsed.company) {
          setCurrentUser(parsed.user);
          setCurrentCompany(parsed.company);
          setToken(parsed.token);
          return;
        }
      }
    } catch {
      // localStorage parsing error, fallback to initial default
    }

    // Default to Alice Administrator in Acme Corporation so user has instant interactive privileges
    const defaultCompany = DEFAULT_COMPANIES[0];
    const defaultUser = defaultCompany.users[0];
    setCurrentUser(defaultUser);
    setCurrentCompany({
      id: defaultCompany.id,
      name: defaultCompany.name,
      slug: defaultCompany.slug,
      role: defaultUser.role
    });
  }, [fetchCompanies]);

  // Standard login with email + password against FastAPI backend
  const login = useCallback(async (email, password) => {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const res = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const message = errData.detail || 'Invalid email or password.';
        setLoginError(message);
        setIsLoggingIn(false);
        return { success: false, error: message };
      }

      const data = await res.json();
      const primaryWorkspace = data.workspaces && data.workspaces[0] ? data.workspaces[0] : null;

      // Find user metadata (role badge, initials, etc.) from our companies list
      let userMeta = {};
      for (const comp of companies) {
        const match = comp.users?.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
        if (match) {
          userMeta = match;
          break;
        }
      }

      const completeUser = {
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.full_name,
        role: primaryWorkspace ? primaryWorkspace.role : userMeta.role || 'employee',
        role_label: userMeta.role_label || (primaryWorkspace?.role ? primaryWorkspace.role.replace('_', ' ').toUpperCase() : 'Member'),
        badge_color: userMeta.badge_color || 'cyan',
        description: userMeta.description || 'Authenticated company member',
        initials: userMeta.initials || data.user.full_name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
      };

      setCurrentUser(completeUser);
      setCurrentCompany(primaryWorkspace);
      setToken(data.access_token);

      // Save to localStorage
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            token: data.access_token,
            user: completeUser,
            company: primaryWorkspace
          })
        );
      } catch {
        // LocalStorage fallback
      }

      setIsLoggingIn(false);
      setLoginModalOpen(false);
      notify(`Welcome back, ${completeUser.full_name} (${primaryWorkspace?.name || 'Workspace'})!`, 'success');
      return { success: true, user: completeUser, company: primaryWorkspace };
    } catch {
      const msg = 'Unable to connect to backend login service. Is server running on port 8000?';
      setLoginError(msg);
      setIsLoggingIn(false);
      return { success: false, error: msg };
    }
  }, [companies, notify]);

  // Instant 1-click Quick Login as any company user
  const quickLoginAs = useCallback(async (userObj, companyObj) => {
    const password = userObj.demo_password || 'admin123';
    return await login(userObj.email, password);
  }, [login]);

  // Log out current user
  const logout = useCallback(() => {
    setCurrentUser(null);
    setCurrentCompany(null);
    setToken(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    notify('Signed out successfully.', 'info');
  }, [notify]);

  // Switch company context (if user has access)
  const switchCompany = useCallback((companyId) => {
    const targetComp = companies.find((c) => c.id === companyId);
    if (!targetComp) return;

    if (currentUser) {
      // Find matching user in target company or default to its admin
      const matchingUser = targetComp.users.find((u) => u.email === currentUser.email) || targetComp.users[0];
      if (matchingUser) {
        quickLoginAs(matchingUser, targetComp);
      }
    }
  }, [companies, currentUser, quickLoginAs]);

  const value = {
    companies,
    currentUser,
    currentCompany,
    token,
    isAuthenticated: Boolean(currentUser),
    isLoggingIn,
    loginError,
    loginModalOpen,
    notification,
    setLoginModalOpen,
    login,
    quickLoginAs,
    logout,
    switchCompany,
    fetchCompanies,
    notify
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
