import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';
import DashboardPage from './pages/DashboardPage';
import ChatPage from './pages/ChatPage';
import ExtractPage from './pages/ExtractPage';
import KnowledgePage from './pages/KnowledgePage';
import ResiliencePage from './pages/ResiliencePage';
import CompanyUserBar from './components/auth/CompanyUserBar';
import './App.css';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/extract" element={<ExtractPage />} />
            <Route path="/knowledge" element={<KnowledgePage />} />
            <Route path="/resilience" element={<ResiliencePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
        {/* Persistent Floating Company User Switcher */}
        <CompanyUserBar />
      </BrowserRouter>
    </AuthProvider>
  );
}
