# 📋 Complete Team Setup & Run Guide — CODE_STORM

This document is the step-by-step instructions for all team members. Follow these steps sequentially to get both the Python FastAPI backend and the React frontend running smoothly on your laptop.

---

## 🔑 Step 1: Obtain Free API Keys (Before the Event)

You need two free API keys. Get them now so you don't face login issues at the venue:

### A. Groq API Key (Sub-second LLM Inference)
1. Go to **[https://console.groq.com/keys](https://console.groq.com/keys)**
2. Sign in with Google or GitHub.
3. Click **"Create API Key"**, give it a name (e.g. `Hackathon-Key`), and click **Submit**.
4. Copy the key (it starts with `gsk_...`).

### B. Google Gemini API Key (Multimodal Vision Fallback)
1. Go to **[https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)**
2. Sign in with your Google account.
3. Click **"Create API Key"** (choose "Create API key in new project" if prompted).
4. Copy the key (it starts with `AIzaSy...` or `AQ...`).

---

## 💻 Step 2: Clone the Repository

Open your terminal (PowerShell, Command Prompt, or Terminal) and run:

```bash
git clone https://github.com/SAKETH070706/CODE_STORM.git
cd CODE_STORM
```

**Expected Output:**
```
Cloning into 'CODE_STORM'...
remote: Enumerating objects: ...
remote: Total ... (delta ...), reused ...
Receiving objects: 100% (...), done.
```

---

## 🐍 Step 3: Backend Setup (Python & FastAPI)

### 1. Open the backend folder:
```bash
cd backend
```

### 2. Create and activate a virtual environment:
* **Windows (PowerShell):**
  ```powershell
  python -m venv .venv
  .venv\Scripts\Activate.ps1
  ```
  *(If you get a script execution policy error on Windows, run: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` and then re-run the activate command).*

* **Mac / Linux:**
  ```bash
  python3 -m venv .venv
  source .venv/bin/activate
  ```

**Expected Terminal Prompt:**
Your command line prompt should now be prefixed with `(.venv)`.

### 3. Install Python dependencies:
```bash
pip install -r requirements.txt
```

**Expected Output:**
```
Successfully installed chromadb-0.5... fastapi-0.111... google-genai-0.1... groq-0.9... sentence-transformers-2.7...
```

### 4. Configure your `.env` file:
Copy the example file:
```bash
cp .env.example .env
```
Open `backend/.env` in VS Code or Notepad and paste your keys:
```ini
GROQ_API_KEY=gsk_your_actual_groq_key_here
GEMINI_API_KEY=AIzaSy_your_actual_gemini_key_here
```

### 5. Pre-cache the Local Embedding Model (Crucial for slow venue Wi-Fi):
Run this command once to download the 80MB embedding weights locally:
```bash
python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2'); print('Embedding ready!')"
```

**Expected Output:**
```
Embedding ready!
```

### 6. Verify Backend with Unit Tests:
Run the test suite:
```bash
pytest -v
```

**Expected Output:**
```
======================= 17 passed in 4.50s =======================
```
*(Runs tests for Schema Extraction, Groq/Gemini Cascade, ChromaDB RAG, Tier-0 Safety, and Voice Agent Engine).*

### 7. Start the FastAPI Backend Server:
```bash
uvicorn api.main:app --reload --port 8000
```

**Expected Output:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Application startup complete.
```
*(Leave this terminal window running!)*

---

## ⚛️ Step 4: Frontend Setup (React + Vite)

Open a **NEW terminal window** (keep the backend terminal open) and navigate to the frontend folder:

```bash
cd frontend
```

### 1. Install frontend packages:
```bash
npm install
```

**Expected Output:**
```
added ... packages in ...s
```

### 2. Start the Vite React development server:
```bash
npm run dev
```

**Expected Output:**
```
  VITE v6.x.x  ready in 180 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

---

## 🌐 Step 5: Test the Full Stack Application

1. Open your browser and navigate to: **`http://localhost:5173`**
2. In the top navbar, you should see a **green glowing badge: `Backend Connected`**.
3. **AI Copilot (`/chat`):** Type *"What is the dual-provider resilience architecture?"* and hit Send to test sub-second RAG response from local ChromaDB.
4. **Multimodal Studio (`/extract`):**
   - **Text Input Mode:** Paste unstructured notes or click preset to validate Pydantic output.
   - **Document Vision Mode:** Upload an invoice or scan image for vision schema parsing.
   - **Voice Agent & Audio Mode:** Test live microphone recording, drop an audio memo (.wav/.mp3), or click any Spoken Preset (*Sentinel Incident Dispatch*, *Clinical Telemetry*, *Adversarial Threat Test*) to test Groq Whisper transcription, neural TTS vocal response, and Tier-0 safety governor interception!
5. **Vector Vault (`/knowledge`):** Click *"Re-Index Knowledge Base Now"* to confirm local vector indexing works.
6. **Resilience & Governance (`/resilience`):** Inspect real-time provider fallback metrics and safety test harnesses.

---

## ⏱️ What We Do When Problem Statement is Announced

We do **not** touch the plumbing (Groq/Gemini fallback, Chroma embeddings, Voice Agent, or UI shell are already done). We only edit these 4 spots:

1. **Drop Domain Guidelines:** Place the hackathon problem statement documents (`.md` or `.txt`) into `backend/data/knowledge/` and click *"Re-Index"* in the UI.
2. **Set Security Keywords (`backend/core/safety_scaffold.py`):** Add 3–5 domain regex words into `DEFAULT_RED_FLAG_PATTERNS`.
3. **Set Extraction Fields (`backend/api/main.py` line 64):** Update `DefaultExtractSchema` with the JSON fields the problem statement needs.
4. **Tune Persona (`backend/api/main.py` line 144):** Update `system_prompt` to fit the domain's persona.
