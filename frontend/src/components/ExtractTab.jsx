import React, { useState } from 'react';

export default function ExtractTab() {
  const [mode, setMode] = useState('text');
  const [textInput, setTextInput] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [extractedData, setExtractedData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

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
        setErrorMsg(data.error || 'Extraction failed to conform to schema.');
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

  return (
    <div className="glass-card">
      <div className="card-header">
        <h2 className="card-title">📷 Multimodal Structured Extraction</h2>
        <p className="card-subtitle">
          Extract strictly validated Pydantic JSON from unstructured text or uploaded images with 1-attempt error feedback.
        </p>
      </div>

      <div className="mode-toggle">
        <button
          className={`toggle-btn ${mode === 'text' ? 'active' : ''}`}
          onClick={() => { setMode('text'); setErrorMsg(''); }}
        >
          📝 Text Input
        </button>
        <button
          className={`toggle-btn ${mode === 'image' ? 'active' : ''}`}
          onClick={() => { setMode('image'); setErrorMsg(''); }}
        >
          🖼️ Image / Document Upload
        </button>
      </div>

      <div className="extract-grid">
        <div>
          {mode === 'text' ? (
            <div>
              <textarea
                rows={10}
                className="chat-input"
                style={{ width: '100%', resize: 'vertical' }}
                placeholder="Paste unorganized text, resume, invoice details, or patient notes here..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
              />
              <div style={{ marginTop: '1rem' }}>
                <button
                  className="primary-btn"
                  onClick={handleExtractText}
                  disabled={isProcessing || !textInput.trim()}
                >
                  {isProcessing ? '⚡ Extracting with Schema...' : 'Run Extraction ➜'}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label className="dropzone" style={{ display: 'block' }}>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📤</div>
                <div style={{ fontWeight: 600 }}>Click to browse or drop document image</div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.35rem' }}>
                  Supports PNG, JPG (Invoices, IDs, Prescription Strips, Forms)
                </div>
              </label>

              {previewUrl && (
                <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                  <img
                    src={previewUrl}
                    alt="Preview"
                    style={{ maxHeight: '180px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                  <div style={{ marginTop: '0.75rem' }}>
                    <button
                      className="primary-btn"
                      onClick={handleExtractImage}
                      disabled={isProcessing}
                      style={{ margin: '0 auto' }}
                    >
                      {isProcessing ? '⚡ Auditing Vision...' : 'Extract Data from Image ➜'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <h4 style={{ marginBottom: '0.75rem', color: '#cbd5e1' }}>Validated Pydantic Output:</h4>
          {errorMsg && (
            <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '8px', color: '#fee2e2', fontSize: '0.9rem' }}>
              ⚠️ {errorMsg}
            </div>
          )}

          {extractedData ? (
            <pre className="json-display">
              {JSON.stringify(extractedData, null, 2)}
            </pre>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px', color: '#64748b' }}>
              Awaiting extraction. Output will appear here as formatted JSON.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
