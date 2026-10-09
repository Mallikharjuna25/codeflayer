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

  // Standard login with email + password + optional specified role
  const login = useCallback(async (email, password = 'password123', specifiedRole = null) => {
    setIsLoggingIn(true);
    setLoginError(null);
    const cleanEmail = email.trim().toLowerCase();

    // Check for valid name@company.com format
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      const err = 'Please enter a valid company email in name@company.com format.';
      setLoginError(err);
      setIsLoggingIn(false);
      return { success: false, error: err };
    }

    try {
      const res = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: password || 'admin123' })
      });

      let userData = null;
      let primaryWorkspace = null;
      let accessToken = 'token_' + Date.now();

      if (res.ok) {
        const data = await res.json();
        userData = data.user;
        primaryWorkspace = data.workspaces && data.workspaces[0] ? data.workspaces[0] : null;
        accessToken = data.access_token || accessToken;
      }

      // Determine role: specifiedRole takes priority if provided
      let finalRole = specifiedRole;
      if (!finalRole) {
        // Find user metadata if matching email exists
        for (const comp of companies) {
          const match = comp.users?.find((u) => u.email.toLowerCase() === cleanEmail);
          if (match) {
            finalRole = match.role;
            if (!primaryWorkspace) {
              primaryWorkspace = { id: comp.id, name: comp.name, slug: comp.slug, role: match.role };
            }
            break;
          }
        }
      }

      if (!finalRole) {
        // If email contains 'admin', default to company_admin, otherwise employee
        finalRole = cleanEmail.startsWith('admin') ? 'company_admin' : 'employee';
      }

      // Determine organization from email domain or fallback
      const domain = cleanEmail.split('@')[1] || 'company.com';
      const companySlug = domain.split('.')[0];
      const matchingCompany = companies.find((c) => c.slug === companySlug || cleanEmail.endsWith(`@${c.slug}.com`));

      if (!primaryWorkspace) {
        primaryWorkspace = matchingCompany ? {
          id: matchingCompany.id,
          name: matchingCompany.name,
          slug: matchingCompany.slug,
          role: finalRole
        } : {
          id: `org-${companySlug}-001`,
          name: `${companySlug.charAt(0).toUpperCase() + companySlug.slice(1)} Enterprise`,
          slug: companySlug,
          role: finalRole
        };
      }

      const isAdmin = finalRole === 'company_admin';
      const namePart = cleanEmail.split('@')[0];
      const displayName = userData?.full_name || namePart.replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      const initials = displayName.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase() || 'US';

      const completeUser = {
        id: userData?.id || `usr-${Date.now()}`,
        email: cleanEmail,
        full_name: displayName,
        role: finalRole,
        role_label: isAdmin ? 'Company Administrator' : 'Enterprise Employee',
        badge_color: isAdmin ? 'purple' : 'cyan',
        description: isAdmin
          ? 'Full administrative governance, policy updating & system oversight'
          : 'Authenticated employee, access restricted strictly to 3-Tier AI Gateway Chatbot',
        initials: initials
      };

      setCurrentUser(completeUser);
      setCurrentCompany(primaryWorkspace);
      setToken(accessToken);

      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            token: accessToken,
            user: completeUser,
            company: primaryWorkspace
          })
        );
      } catch {
        // Storage fallback
      }

      setIsLoggingIn(false);
      setLoginModalOpen(false);
      notify(`Authenticated as ${completeUser.full_name} (${completeUser.role_label})!`, 'success');
      return { success: true, user: completeUser, company: primaryWorkspace };
    } catch {
      // Local fallback for offline mode
      const finalRole = specifiedRole || (cleanEmail.startsWith('admin') ? 'company_admin' : 'employee');
      const isAdmin = finalRole === 'company_admin';
      const namePart = cleanEmail.split('@')[0];
      const displayName = namePart.replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

      const fallbackUser = {
        id: `usr-${Date.now()}`,
        email: cleanEmail,
        full_name: displayName,
        role: finalRole,
        role_label: isAdmin ? 'Company Administrator' : 'Enterprise Employee',
        badge_color: isAdmin ? 'purple' : 'cyan',
        description: isAdmin
          ? 'Full administrative governance, policy updating & system oversight'
          : 'Authenticated employee, access restricted strictly to 3-Tier AI Gateway Chatbot',
        initials: displayName.slice(0, 2).toUpperCase()
      };

      const fallbackOrg = {
        id: 'org-acme-corp-001',
        name: 'Acme Corporation',
        slug: 'acme',
        role: finalRole
      };

      setCurrentUser(fallbackUser);
      setCurrentCompany(fallbackOrg);
      setToken('offline_token');

      setIsLoggingIn(false);
      setLoginModalOpen(false);
      notify(`Authenticated as ${fallbackUser.full_name} (${fallbackUser.role_label})!`, 'success');
      return { success: true, user: fallbackUser, company: fallbackOrg };
    }
  }, [companies, notify]);

  // Instant 1-click Quick Login as any company user
  const quickLoginAs = useCallback(async (userObj, companyObj) => {
    const password = userObj.demo_password || 'admin123';
    return await login(userObj.email, password, userObj.role);
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
      const matchingUser = targetComp.users?.find((u) => u.email === currentUser.email) || targetComp.users?.[0];
      if (matchingUser) {
        quickLoginAs(matchingUser, targetComp);
      }
    }
  }, [companies, currentUser, quickLoginAs]);

  const isAdmin = Boolean(currentUser?.role === 'company_admin');

  const value = {
    companies,
    currentUser,
    currentCompany,
    token,
    isAdmin,
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
    notify,
    dismissNotification: () => setNotification(null)
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
