# Hackathon Starter Kit Configuration
# Secrets are loaded exclusively from .env - NEVER hardcode API keys or credentials.
import os
import logging
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

# ---------------------------------------------------------------------------
# Logging Setup (Centralized)
# ---------------------------------------------------------------------------
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("hackathon_kit")

# ---------------------------------------------------------------------------
# API Credentials
# ---------------------------------------------------------------------------
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "") or os.getenv("GOOGLE_API_KEY", "")

# ---------------------------------------------------------------------------
# Provider Model Cascades
# NOTE: Verify these IDs against provider docs before the hackathon starts.
# Free-tier model names update periodically; a stale model ID fails silently.
# ---------------------------------------------------------------------------
GROQ_MODELS = [
    "qwen/qwen3.8-27b",        # Fast, versatile, supports text + multimodal vision
    "openai/gpt-oss-120b",     # Heavy reasoning fallback
    "openai/gpt-oss-20b"       # Secondary lightweight fallback
]

GEMINI_MODELS = [
    "gemini-3.5-flash",        # Primary Google fast multimodal endpoint
    "gemini-flash-latest",     # Stable alias pointer
    "gemini-3.1-flash-lite",   # Low-latency speed tier
    "gemini-3.8-flash"         # Extended capabilities tier
]

# ---------------------------------------------------------------------------
# Resilience & Timeout Policies
# ---------------------------------------------------------------------------
HTTP_TIMEOUT_SECONDS = float(os.getenv("HTTP_TIMEOUT_SECONDS", "25.0"))
MAX_RETRIES_PER_MODEL = int(os.getenv("MAX_RETRIES_PER_MODEL", "2"))

# ---------------------------------------------------------------------------
# Local Storage & Vector Database
# ---------------------------------------------------------------------------
CHROMA_DIR = BASE_DIR / "chroma_store"
KNOWLEDGE_DIR = BASE_DIR / "data" / "knowledge"
CHROMA_COLLECTION_NAME = "hackathon_knowledge_base"
EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"
