import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';
import DashboardPage from './pages/DashboardPage';
import ChatPage from './pages/ChatPage';
import ExtractPage from './pages/ExtractPage';
import KnowledgePage from './pages/KnowledgePage';
import ResiliencePage from './pages/ResiliencePage';
import PolicyPage from './pages/PolicyPage';
import AdminGuard from './components/auth/AdminGuard';
import CompanyUserBar from './components/auth/CompanyUserBar';
import './App.css';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            {/* Overview & 3-Tier AI Chatbot: Open to all users (Employees & Administrators) */}
            <Route path="/" element={<DashboardPage />} />
            <Route path="/chat" element={<ChatPage />} />

            {/* Administrator Only Features: Non-admin employees automatically redirected to /chat */}
            <Route
              path="/policy"
              element={
                <AdminGuard>
                  <PolicyPage />
                </AdminGuard>
              }
            />
            <Route
              path="/extract"
              element={
                <AdminGuard>
                  <ExtractPage />
                </AdminGuard>
              }
            />
            <Route
              path="/knowledge"
              element={
                <AdminGuard>
                  <KnowledgePage />
                </AdminGuard>
              }
            />
            <Route
              path="/resilience"
              element={
                <AdminGuard>
                  <ResiliencePage />
                </AdminGuard>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
        {/* Global Auth Toast Notifications */}
        <CompanyUserBar />
      </BrowserRouter>
    </AuthProvider>
  );
}
