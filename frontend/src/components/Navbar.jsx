import React, { useEffect, useState } from 'react';

export default function Navbar() {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('http://localhost:8000/health');
        if (res.ok) setIsOnline(true);
        else setIsOnline(false);
      } catch (err) {
        setIsOnline(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="navbar">
      <div className="brand">
        <span className="brand-logo">CODE_STORM</span>
        <span className="brand-tag">GenAI Platform</span>
      </div>

      <div className="nav-badges">
        <div className="model-pill">
          Groq: <span>qwen3.8-27b</span>
        </div>
        <div className="model-pill">
          Gemini: <span>3.5-flash</span>
        </div>
        <div className="status-badge">
          <span className={`status-dot ${isOnline ? 'online' : 'offline'}`}></span>
          {isOnline ? 'Backend Connected' : 'Connecting to API (Port 8000)...'}
        </div>
      </div>
    </header>
  );
}
