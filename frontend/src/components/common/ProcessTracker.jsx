import React from 'react';
import {
  CheckCircle2,
  Loader2,
  AlertCircle,
  Clock,
  Layers,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import './ProcessTracker.css';

/**
 * ProcessTracker Component
 * Shows real-time multi-step progress for an active or completed process.
 * @param {string} title - Process title (e.g. "Vector Vault Ingestion Pipeline")
 * @param {Array<string>} steps - Step labels (e.g. ["Ingesting .md Files", "Chunking Sentences", "Generating Embeddings", "Committing to ChromaDB"])
 * @param {number} currentStep - 0-indexed current active step
 * @param {string} status - 'running' | 'completed' | 'failed' | 'idle'
 * @param {string} summary - Current step description or outcome summary
 * @param {string} duration - Optional elapsed time string
 */
export default function ProcessTracker({
  title,
  steps = [],
  currentStep = 0,
  status = 'running',
  summary,
  duration,
  className = ''
}) {
  if (!steps || steps.length === 0) return null;

  return (
    <div className={`process-tracker-card status-${status} ${className}`}>
      <div className="process-tracker-header">
        <div className="process-header-title-wrap">
          <div className="process-icon-wrap">
            {status === 'running' ? (
              <Loader2 size={15} className="process-spinner" />
            ) : status === 'completed' ? (
              <CheckCircle2 size={15} className="process-success-icon" />
            ) : status === 'failed' ? (
              <AlertCircle size={15} className="process-error-icon" />
            ) : (
              <Layers size={15} className="process-idle-icon" />
            )}
          </div>
          <div>
            <span className="process-title">{title}</span>
            {summary && <span className="process-summary">{summary}</span>}
          </div>
        </div>

        <div className="process-meta-badges">
          {duration && (
            <span className="process-time-badge">
              <Clock size={11} />
              {duration}
            </span>
          )}
          <span className={`process-status-tag tag-${status}`}>
            {status === 'running'
              ? `Step ${currentStep + 1} of ${steps.length}`
              : status === 'completed'
              ? 'Complete (100%)'
              : status === 'failed'
              ? 'Failed'
              : 'Standby'}
          </span>
        </div>
      </div>

      {/* Steps Visual Chain */}
      <div className="process-steps-track">
        {steps.map((stepLabel, idx) => {
          const isDone = status === 'completed' || idx < currentStep;
          const isCurrent = status === 'running' && idx === currentStep;
          const isFailed = status === 'failed' && idx === currentStep;
          const isPending = idx > currentStep;

          return (
            <React.Fragment key={idx}>
              <div
                className={`process-step-node ${
                  isDone
                    ? 'node-done'
                    : isCurrent
                    ? 'node-current'
                    : isFailed
                    ? 'node-failed'
                    : 'node-pending'
                }`}
                title={stepLabel}
              >
                <div className="node-circle">
                  {isDone ? (
                    <CheckCircle2 size={12} />
                  ) : isCurrent ? (
                    <Loader2 size={12} className="node-spinner" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>
                <span className="node-label">{stepLabel}</span>
              </div>

              {idx < steps.length - 1 && (
                <div
                  className={`process-step-connector ${
                    idx < currentStep ? 'conn-done' : 'conn-pending'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
