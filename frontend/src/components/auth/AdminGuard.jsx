import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * AdminGuard: Restricts access strictly to Administrators.
 * Non-admin employees are automatically redirected to the Three-Tier AI Gateway Chatbot (/chat).
 */
export default function AdminGuard({ children }) {
  const { isAdmin } = useAuth();

  if (isAdmin) {
    return children;
  }

  return <Navigate to="/chat" replace />;
}
