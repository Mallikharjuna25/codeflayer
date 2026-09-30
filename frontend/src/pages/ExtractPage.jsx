import React, { useState } from 'react';
import {
  ScanSearch,
  FileText,
  Image as ImageIcon,
  UploadCloud,
  CheckCircle,
  Copy,
  Check,
  Download,
  AlertTriangle,
  Sparkles,
  Layers
} from 'lucide-react';
import SpotlightCard from '../components/reactbits/SpotlightCard';

const SAMPLE_TEXTS = {
  project: `Project Name: HealthPulse AI Diagnostic Sentinel.
Category: Healthcare & Clinical Workflow.
Key Details: The platform ingests real-time ECG telemetry and patient electronic health records.
It uses an offline edge model for arrhythmia detection with an emergency cascade to specialized cardiologists.
Validated with 98.4% diagnostic precision across 1,200 simulated clinical trials.`,
  incident: `Entity: Cloud-Infra Sentinel Alpha.
Category: DevOps & Infrastructure Resilience.
Key Points:
- Detected a 429 rate limit spike on primary LLM endpoints at 04:12 UTC.
- Seamlessly activated the Google Gemini backup cascade within 84ms.
- Zero customer requests were dropped; system recovered to primary provider at 04:25 UTC.
- Confidence score in automated self-healing protocol stands at 0.96.`
};

export default function ExtractPage() {
  const [mode, setMode] = useState('text');
  const [textInput, setTextInput] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [extractedData, setExtractedData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setExtractedData(null);
      setErrorMsg('');
    }
  };

  const handleExtractText = async () => {
    if (!textInput.trim() || isProcessing) return;
    setIsProcessing(true);
    setErrorMsg('');
    setExtractedData(null);

    try {
      const res = await fetch('http://localhost:8000/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textInput })
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setExtractedData(data.extracted);
      } else {
        setErrorMsg(data.error || 'Extraction failed to conform to target schema.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Connection to API failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExtractImage = async () => {
    if (!selectedFile || isProcessing) return;
    setIsProcessing(true);
    setErrorMsg('');
    setExtractedData(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch('http://localhost:8000/api/extract/image', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setExtractedData(data.extracted);
      } else {
        setErrorMsg(data.error || 'Multimodal extraction failed.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Connection to API failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const loadSample = (sampleKey) => {
    setMode('text');
    setTextInput(SAMPLE_TEXTS[sampleKey]);
    setErrorMsg('');
    setExtractedData(null);
  };

  const handleCopyJson = () => {
    if (!extractedData) return;
    navigator.clipboard.writeText(JSON.stringify(extractedData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJson = () => {
    if (!extractedData) return;
    const blob = new Blob([JSON.stringify(extractedData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extracted_${extractedData.entity_name || 'data'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-container">
      <div className="product-page-hero-card">
        <div className="product-hero-top">
          <div className="product-hero-icon-box">
            <ScanSearch size={22} />
          </div>
          <div className="product-hero-info">
            <div className="product-hero-title-row">
              <h1 className="product-hero-title">Multimodal Studio</h1>
              <span className="product-hero-pill">Pydantic</span>
            </div>
            <p className="product-hero-desc">
              Strict Pydantic JSON extraction from unstructured text and multimodal document scans.
            </p>
          </div>
        </div>
      </div>

      {/* Mode Switcher & Presets */}
      <div className="extract-toolbar">
        <div className="mode-pill-selector">
          <button
            className={`mode-btn ${mode === 'text' ? 'active' : ''}`}
            onClick={() => {
              setMode('text');
              setErrorMsg('');
            }}
          >
            <FileText size={15} /> Text Input
          </button>
          <button
            className={`mode-btn ${mode === 'image' ? 'active' : ''}`}
            onClick={() => {
              setMode('image');
              setErrorMsg('');
            }}
          >
            <ImageIcon size={15} /> Document Image / Vision
          </button>
        </div>

        {mode === 'text' && (
          <div className="sample-presets">
            <span className="preset-label">Presets:</span>
            <button onClick={() => loadSample('project')} className="preset-chip">
              💡 Project Spec
            </button>
            <button onClick={() => loadSample('incident')} className="preset-chip">
              🛡️ Incident Report
            </button>
          </div>
        )}
      </div>

      <div className="extract-grid-v2">
        {/* Left Column: Input Source */}
        <SpotlightCard className="extract-card" spotlightColor="rgba(37, 99, 235, 0.12)">
          <div className="card-box-header">
            <h3 className="box-title">
              {mode === 'text' ? 'Unstructured Text Source' : 'Upload Document Scan'}
            </h3>
            <span className="box-badge">Target: DefaultExtractSchema</span>
          </div>

          {mode === 'text' ? (
            <div className="input-block">
              <textarea
                rows={11}
                className="extract-textarea"
                placeholder="Paste unstructured notes, requirements, specs, resumes, or logs here..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
              />
              <div className="action-row">
                <button
                  className="primary-action-btn"
                  onClick={handleExtractText}
                  disabled={isProcessing || !textInput.trim()}
                >
                  <Sparkles size={16} />
                  <span>{isProcessing ? 'Validating Schema...' : 'Run Extraction'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="input-block">
              <label className="upload-dropzone">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                <div className="dropzone-icon">
                  <UploadCloud size={36} className="text-cyan" />
                </div>
                <div className="dropzone-text">Click or drag image file here</div>
                <div className="dropzone-sub">Supports PNG, JPG (Forms, Invoices, Screenshots)</div>
              </label>

              {previewUrl && (
                <div className="preview-container">
                  <img src={previewUrl} alt="Document Preview" className="preview-img" />
                  <div className="action-row mt-3">
                    <button
                      className="primary-action-btn"
                      onClick={handleExtractImage}
                      disabled={isProcessing}
                    >
                      <Sparkles size={16} />
                      <span>{isProcessing ? 'Analyzing Vision...' : 'Extract From Image'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </SpotlightCard>

        {/* Right Column: Output & Structured Inspector */}
        <SpotlightCard className="extract-card" spotlightColor="rgba(139, 92, 246, 0.12)">
          <div className="card-box-header">
            <h3 className="box-title">Validated Pydantic Output</h3>
            {extractedData && (
              <div className="output-actions">
                <button onClick={handleCopyJson} className="tiny-btn" title="Copy raw JSON">
                  {copied ? <Check size={13} className="text-emerald" /> : <Copy size={13} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button onClick={handleDownloadJson} className="tiny-btn" title="Download JSON file">
                  <Download size={13} />
                  <span>Download</span>
                </button>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="error-alert">
              <AlertTriangle size={18} className="text-rose" />
              <div>
                <strong>Extraction Error:</strong>
                <p>{errorMsg}</p>
              </div>
            </div>
          )}

          {extractedData ? (
            <div className="output-content">
              {/* Visual Card Summary */}
              <div className="extracted-summary-card">
                <div className="summary-row">
                  <div>
                    <span className="summary-label">Entity Name</span>
                    <h4 className="summary-value text-cyan">{extractedData.entity_name}</h4>
                  </div>
                  <div>
                    <span className="summary-label">Category</span>
                    <span className="category-pill">{extractedData.category}</span>
                  </div>
                  <div>
                    <span className="summary-label">Confidence</span>
                    <span className="confidence-pill">
                      {(extractedData.confidence_score * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                {extractedData.key_points && extractedData.key_points.length > 0 && (
                  <div className="key-points-block">
                    <span className="summary-label">Extracted Key Points:</span>
                    <ul className="key-points-list">
                      {extractedData.key_points.map((pt, pIdx) => (
                        <li key={pIdx}>
                          <CheckCircle size={14} className="text-emerald shrink-0" />
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Raw JSON Accordion/Display */}
              <div className="raw-json-wrapper">
                <span className="json-label">Pydantic Schema Dump:</span>
                <pre className="json-pre-box">
                  {JSON.stringify(extractedData, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="awaiting-state">
              <div className="awaiting-icon">
                <Layers size={40} className="text-sub" />
              </div>
              <h4 className="awaiting-title">No Extraction Active</h4>
              <p className="awaiting-desc">
                Select a preset or upload an image and click "Run Extraction" to inspect parsed Pydantic structures.
              </p>
            </div>
          )}
        </SpotlightCard>
      </div>
    </div>
  );
}
