# ⚡ CODE_STORM — Full-Stack GenAI Hackathon Platform

A high-performance, enterprise-grade GenAI application scaffold built for 36-hour hackathons. Features a modern **React (Vite + Vanilla CSS)** frontend, a **FastAPI** backend, **ChromaDB** local vector search, and a zero-downtime **Groq + Gemini multi-provider cascade**.

---

## 🏛️ Project Structure

```
CODE_STORM/
├── backend/
│   ├── api/
│   │   └── main.py              # FastAPI endpoints (/health, /api/process, /api/extract, /api/rag/*)
│   ├── core/
│   │   ├── llm_client.py        # Dual Groq + Gemini resilience cascade (retries, timeouts, JSON healing)
│   │   ├── rag.py               # Local ChromaDB vector retrieval (sentence-transformers all-MiniLM-L6-v2)
│   │   ├── extraction.py        # Pydantic structured extraction (text & image) with feedback retry
│   │   └── safety_scaffold.py   # Two-tier safety guards (Tier 0 regex + Tier 1 semantic)
│   ├── data/
│   │   └── knowledge/           # Drop domain documents (.md / .txt) here
│   ├── tests/                   # Pytest test suite (10/10 passing)
│   ├── config.py                # Model cascades & API key sanitizer
│   ├── requirements.txt         # Python dependencies
│   └── .env.example
│
├── frontend/                    # Pure React + Vite + Vanilla CSS (zero external bloat)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx       # Real-time backend status pulse & active model badges
│   │   │   ├── ChatTab.jsx      # AI Assistant chat thread with source grounding citations
│   │   │   ├── ExtractTab.jsx   # Drag & drop image/text structured extractor & JSON viewer
│   │   │   └── KnowledgeTab.jsx # Knowledge base chunk stats & 1-click re-indexing
│   │   ├── App.jsx              # Tab navigation & layout
│   │   ├── App.css              # Custom Vanilla CSS: Glassmorphism, sleek dark mode, glow effects
│   │   ├── index.css            # Typography & design tokens
│   │   └── main.jsx
│   ├── package.json             # Minimal dependencies: standard React + Vite only
│   └── vite.config.js
│
├── .gitignore                   # Ignores .env, node_modules/, chroma_store/, .venv/
├── README.md                    # Project pitch, architecture & domain pivot guide
└── SETUP_INSTRUCTIONS.md        # Step-by-step teammate guide with exact links & terminal outputs
```

---

## 🚀 Quick Run Commands

See **[SETUP_INSTRUCTIONS.md](file:///d:/Python/project/eldercare-copilot/hackathon_starter_kit/SETUP_INSTRUCTIONS.md)** for a step-by-step guide with expected terminal outputs and API key setup.

### 1. Start Backend (Terminal 1)
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # On Windows
pip install -r requirements.txt
uvicorn api.main:app --reload --port 8000
```

### 2. Start Frontend (Terminal 2)
```bash
cd frontend
npm install
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 🎯 4-Step Hackathon Pivot (When Problem Statement Drops)

When the problem statement is announced, do not touch the plumbing. Only update these 4 spots:

1. **Knowledge Documents:** Drop problem statement guidelines (`.md`/`.txt`) into `backend/data/knowledge/` and click *"Re-Index"* in the web UI.
2. **Safety Scanner:** In `backend/core/safety_scaffold.py`, add 3–5 domain regex words into `DEFAULT_RED_FLAG_PATTERNS`.
3. **Pydantic Schema:** In `backend/api/main.py` line 43, update `DefaultExtractSchema` with the fields you need to extract.
4. **Assistant Persona:** In `backend/api/main.py` line 78, tune `system_prompt` to fit the domain's persona.

---

## 🏆 Pitch Day Talking Points
- **Zero Downtime Resilience:** High-speed Groq inference (`qwen/qwen3.8-27b`) with automatic failover to Google Gemini (`gemini-3.5-flash`), eliminating live demo crashes.
- **Data Correctness:** Pydantic schema validation with automatic 1-attempt feedback correction—the system fails loud on corrupted data rather than guessing.
- **Privacy & Latency:** Embeddings are calculated locally with `all-MiniLM-L6-v2`; document retrieval never leaves the server.
- **Modern Full-Stack Design:** Decoupled FastAPI backend and lightning-fast (<200ms) React frontend with pure Vanilla CSS.
