// Centralized API Base URL configuration supporting local dev, Vercel, and Render deployments
const getApiBaseUrl = () => {
  // 1. Explicit environment variable if configured
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  // 2. Intelligent browser runtime detection:
  // If running on a live hosted domain (e.g. *.vercel.app), auto-route to live Render backend
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return 'https://codeflayer-backend.onrender.com';
    }
  }

  // 3. Fallback for local machine development
  return 'http://localhost:8000';
};

export const API_BASE_URL = getApiBaseUrl().replace(/\/+$/, '');

export function apiUrl(path = '') {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}
