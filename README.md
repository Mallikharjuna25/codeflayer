# ⚡ GenAI & LLM Hackathon Starter Kit (36-Hour Ready)

A resilient, domain-agnostic scaffold designed for fast-paced GenAI hackathons where problem statements are revealed on the spot.

---

## 🏗️ Architecture & Plumbing

1. **Multi-Provider LLM Cascade (`core/llm_client.py`)**:
   - **Tier 1:** Groq (`qwen/qwen3.8-27b`) for sub-second, low-cost responses.
   - **Tier 2 Fallback:** Google Gemini (`gemini-3.5-flash`, `gemini-flash-latest`) on 429/503/timeouts.
   - **JSON Mode & Healing:** Provider-level JSON enforcement + automated markdown fence removal and truncated brace repair.
   - **Fail-soft Availability:** Returns `SERVICE_UNAVAILABLE` when all endpoints are down—never crashes.
2. **Local RAG Pipeline (`core/rag.py`)**:
   - Local embeddings with `all-MiniLM-L6-v2` via `sentence-transformers` (zero API dependencies for vector indexing).
   - Local ChromaDB vector store with cosine distance filtering (`max_distance=0.70`).
3. **Structured Extraction (`core/extraction.py`)**:
   - Multimodal (Text or Image) schema extraction into validated Pydantic models.
   - Automatic 1-attempt feedback retry on schema validation failure.
4. **Two-Tier Safety Guardrails (`core/safety_scaffold.py`)**:
   - **Tier 0:** Fast (<5ms) regex/keyword scanner before any model or DB call.
   - **Tier 1:** Semantic LLM-based policy/triage classifier.
5. **Dual Presentation Shell**:
   - **Streamlit (`app.py`)**: Interactive UI with Chat, Extraction, and Knowledge Ingestion tabs.
   - **FastAPI (`api/main.py`)**: REST backend with `/health`, `/api/process`, and `/api/extract`.

---

## 🚀 Quickstart

### 1. Configure Environment
```bash
cp .env.example .env
# Edit .env with your GROQ_API_KEY and GEMINI_API_KEY
```

### 2. Run Streamlit UI
```bash
streamlit run app.py
```

### 3. Run FastAPI Backend
```bash
uvicorn api.main:app --reload --port 8000
```

### 4. Run Test Suite
```bash
pytest -v
```

---

## 🎯 DOMAIN LOGIC GOES HERE (Fill In Once PS is Revealed)

When the hackathon problem statement is announced, you only need to modify these 4 areas (plumbing is already done):

1. **Domain Knowledge (`data/knowledge/`)**:
   - Drop your domain documents (`.md` or `.txt`) into `data/knowledge/`.
   - Click **"Ingest / Refresh Knowledge Base"** in the Streamlit sidebar.
2. **Safety Patterns (`core/safety_scaffold.py`)**:
   - Add regex strings to `DEFAULT_RED_FLAG_PATTERNS` (e.g. medical emergencies, credit card fraud keywords, exam leaks).
   - Customize `DEFAULT_CLASSIFICATION_PROMPT` for semantic checks.
3. **Extraction Schema (`app.py` or `api/main.py`)**:
   - Replace `GenericItemSchema` with your domain's Pydantic model (e.g., `InvoiceSchema`, `PrescriptionSchema`, `ResumeSchema`).
4. **Agent Persona (`app.py` line 77 or `api/main.py` line 67)**:
   - Update `system_prompt` with domain-specific role and guidelines (e.g., "You are an empathetic cardiac recovery copilot...").

---

## 🏆 Pitch Day Talking Points
- **Resilience:** "We engineered a zero-downtime architecture: high-speed Groq with automatic fallback to Gemini, preventing any live demo crash."
- **Data Correctness:** "We enforce strict Pydantic validation with automatic feedback loops—the system fails loud on corrupted data rather than guessing."
- **Privacy & Latency:** "Embeddings are calculated locally with sentence-transformers; document search never leaves the server."
