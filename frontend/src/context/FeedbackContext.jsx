import React, { createContext, useContext, useState, useCallback } from 'react';

const FeedbackContext = createContext(null);

export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [activeProcesses, setActiveProcesses] = useState({});

  // Toast notification dispatcher
  const notify = useCallback((type, title, message, duration = 4500, action = null) => {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const newToast = {
      id,
      type, // 'success' | 'error' | 'warning' | 'info' | 'process'
      title,
      message,
      duration,
      action,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };

    setToasts((prev) => [newToast, ...prev.slice(0, 4)]);

    if (duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, duration);
    }
    return id;
  }, []);

  const notifySuccess = useCallback((title, message, duration = 4000, action = null) => {
    return notify('success', title, message, duration, action);
  }, [notify]);

  const notifyError = useCallback((title, message, duration = 6000, action = null) => {
    return notify('error', title, message, duration, action);
  }, [notify]);

  const notifyWarning = useCallback((title, message, duration = 5000, action = null) => {
    return notify('warning', title, message, duration, action);
  }, [notify]);

  const notifyInfo = useCallback((title, message, duration = 4000, action = null) => {
    return notify('info', title, message, duration, action);
  }, [notify]);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Process State Tracker dispatcher
  const startProcess = useCallback((processId, { name, steps = [], currentStep = 0, meta = {} }) => {
    setActiveProcesses((prev) => ({
      ...prev,
      [processId]: {
        id: processId,
        name,
        steps,
        currentStep,
        status: 'running', // 'idle' | 'running' | 'completed' | 'failed'
        progress: steps.length > 0 ? Math.round(((currentStep + 1) / steps.length) * 100) : 10,
        meta,
        startedAt: Date.now(),
        updatedAt: Date.now(),
        message: steps[currentStep] || 'Starting process...'
      }
    }));
  }, []);

  const updateProcess = useCallback((processId, { currentStep, status = 'running', message, meta = {} }) => {
    setActiveProcesses((prev) => {
      const current = prev[processId];
      if (!current) return prev;
      const stepIdx = currentStep !== undefined ? currentStep : current.currentStep;
      const totalSteps = current.steps?.length || 1;
      const progress = status === 'completed' ? 100 : Math.round(((stepIdx + 1) / totalSteps) * 100);

      return {
        ...prev,
        [processId]: {
          ...current,
          currentStep: stepIdx,
          status,
          progress,
          message: message || current.steps?.[stepIdx] || current.message,
          meta: { ...current.meta, ...meta },
          updatedAt: Date.now()
        }
      };
    });
  }, []);

  const finishProcess = useCallback((processId, { status = 'completed', message, meta = {} }) => {
    setActiveProcesses((prev) => {
      const current = prev[processId];
      if (!current) return prev;
      return {
        ...prev,
        [processId]: {
          ...current,
          status,
          progress: status === 'completed' ? 100 : current.progress,
          message: message || (status === 'completed' ? 'Process completed successfully.' : 'Process failed.'),
          meta: { ...current.meta, ...meta },
          completedAt: Date.now()
        }
      };
    });

    // Auto-remove process from active tray after 6 seconds
    setTimeout(() => {
      setActiveProcesses((prev) => {
        const copy = { ...prev };
        delete copy[processId];
        return copy;
      });
    }, 6000);
  }, []);

  return (
    <FeedbackContext.Provider
      value={{
        toasts,
        activeProcesses,
        notify,
        notifySuccess,
        notifyError,
        notifyWarning,
        notifyInfo,
        dismissToast,
        startProcess,
        updateProcess,
        finishProcess
      }}
    >
      {children}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within a FeedbackProvider');
  }
  return context;
}
