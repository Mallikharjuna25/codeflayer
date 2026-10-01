import sys
import time
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple
from pydantic import BaseModel, Field

# Ensure backend root is on sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

from config import KNOWLEDGE_DIR
from core.llm_client import call_llm
from core.rag import retrieve, ingest_knowledge, get_chroma_collection
from core.extraction import extract_structured_data
from core.safety_scaffold import scan_for_flags
from core.database import init_db, SessionLocal
from core.seed import seed_database
from core.voice_engine import transcribe_audio, process_voice_agent_dialogue
from api.governance_routes import router as governance_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables and seed records
    init_db()
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield

app = FastAPI(
    title="Halo AI Governance Platform API",
    version="2.0.0",
    description="Enterprise company policy dashboard connected to an autonomous agent execution governor.",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(governance_router)

class QueryRequest(BaseModel):
    query: str = Field(..., min_length=1, description="User query or task")
    user_context: Optional[str] = ""

class QueryResponse(BaseModel):
    status: str
    response: str
    provider_used: str
    sources: List[str] = Field(default_factory=list)

class DefaultExtractSchema(BaseModel):
    entity_name: str
    category: str
    key_points: List[str]
    confidence_score: float

class ExtractRequest(BaseModel):
    text: str = Field(..., min_length=3)

class ExtractResponse(BaseModel):
    status: str
    extracted: Optional[Dict[str, Any]] = None
    transcript: Optional[str] = None
    provider_used: Optional[str] = None
    error: Optional[str] = None

class VoiceAgentRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Voice query or transcript")
    user_context: Optional[str] = ""
    mode: Optional[str] = "dialogue"

class VoiceAgentResponse(BaseModel):
    status: str
    transcript: str
    spoken_response: str
    detailed_response: str
    extracted_data: Optional[Dict[str, Any]] = None
    is_flagged: bool = False
    safety_trigger: Optional[str] = None
    provider_used: str = ""
    sources: List[str] = Field(default_factory=list)
    error: Optional[str] = None

class VoiceTranscribeResponse(BaseModel):
    status: str
    transcript: str
    provider_used: str = ""
    error: Optional[str] = None

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "code_storm_backend"}

class SafetyScanRequest(BaseModel):
    query: str = Field(..., min_length=1)

class SafetyScanResponse(BaseModel):
    is_flagged: bool
    trigger: Optional[str] = None
    category: Optional[str] = None
    execution_time_ms: float
    message: str

@app.post("/api/safety/scan", response_model=SafetyScanResponse)
def safety_scan_endpoint(req: SafetyScanRequest):
    """Direct, sub-millisecond Tier 0 safety scan without running downstream LLMs."""
    start_time = time.perf_counter()
    is_flagged, trigger = scan_for_flags(req.query)
    elapsed_ms = round((time.perf_counter() - start_time) * 1000, 3)

    if is_flagged:
        return SafetyScanResponse(
            is_flagged=True,
            trigger=trigger,
            category="Threat Intercepted at Tier-0",
            execution_time_ms=elapsed_ms,
            message=f"Security/Policy violation triggered: '{trigger}'"
        )
    return SafetyScanResponse(
        is_flagged=False,
        trigger=None,
        category="Clean",
        execution_time_ms=elapsed_ms,
        message="Clean prompt. Tier-0 scan passed successfully."
    )

@app.post("/api/process", response_model=QueryResponse)
def process_user_query(req: QueryRequest):
    """Tier 0 safety scan, Chroma vector retrieval, and LLM synthesis."""
    # 1. Tier 0 Safety Scan
    is_flagged, trigger = scan_for_flags(req.query)
    if is_flagged:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Security/Policy violation triggered: '{trigger}'"
        )

    # 2. Vector Retrieval
    chunks = retrieve(req.query, k=3, max_distance=0.70)
    context_str = "\n\n".join([f"[{c.source_file}]:\n{c.text}" for c in chunks]) if chunks else "No relevant context found."
    source_files = list(dict.fromkeys([c.source_file for c in chunks]))

    # 3. LLM Call
    system_prompt = (
        "You are an intelligent hackathon solution assistant. "
        "Ground your advice strictly on verified context.\n\n"
        f"VERIFIED CONTEXT:\n{context_str}"
    )
    result = call_llm(system_prompt=system_prompt, user_prompt=req.query)

    if not result.success:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI service temporarily unavailable: {result.error}"
        )

    return QueryResponse(
        status="ok",
        response=result.text,
        provider_used=result.provider_used,
        sources=source_files
    )

@app.post("/api/extract", response_model=ExtractResponse)
def extract_fields_endpoint(req: ExtractRequest):
    """Generic structured extraction endpoint from text with feedback retry."""
    res = extract_structured_data(schema=DefaultExtractSchema, text=req.text)
    if res.success and res.validated:
        return ExtractResponse(status="success", extracted=res.validated.model_dump())
    return ExtractResponse(status="failed", error=res.error)

MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB file safety limit

def _read_bounded_file(file: UploadFile, default_mime: str, max_bytes: int = MAX_UPLOAD_SIZE_BYTES) -> Tuple[bytes, str, str]:
    """Reads uploaded file with size capping, MIME normalization, and filename sanitization."""
    raw = file.file.read(max_bytes + 1)
    if len(raw) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Uploaded file exceeds maximum allowed size of {max_bytes // (1024 * 1024)}MB."
        )
    raw_mime = (file.content_type or default_mime).split(";")[0].strip() or default_mime
    safe_name = Path(file.filename or "recording.wav").name
    return raw, raw_mime, safe_name

@app.post("/api/extract/image", response_model=ExtractResponse)
def extract_image_endpoint(file: UploadFile = File(...)):
    """Multimodal extraction from uploaded image using schema validation with retry."""
    file_bytes, mime_type, _ = _read_bounded_file(file, default_mime="image/png")
    res = extract_structured_data(
        schema=DefaultExtractSchema,
        image_bytes=file_bytes,
        mime_type=mime_type
    )
    if res.success and res.validated:
        return ExtractResponse(status="success", extracted=res.validated.model_dump())
    return ExtractResponse(status="failed", error=res.error)

@app.post("/api/extract/audio", response_model=ExtractResponse)
def extract_audio_endpoint(file: UploadFile = File(...)):
    """Multimodal extraction from uploaded or recorded speech audio with Groq/Gemini transcription."""
    file_bytes, mime_type, filename = _read_bounded_file(file, default_mime="audio/wav")

    # Step 1: Transcribe audio using dual cascade (Groq Whisper / Gemini)
    trans_res = transcribe_audio(audio_bytes=file_bytes, filename=filename, mime_type=mime_type)
    if not trans_res.success or not trans_res.transcript.strip():
        return ExtractResponse(
            status="failed",
            error=trans_res.error or "Audio transcription failed or no speech detected."
        )

    # Step 2: Extract structured data from transcript
    res = extract_structured_data(schema=DefaultExtractSchema, text=trans_res.transcript)
    if res.success and res.validated:
        return ExtractResponse(
            status="success",
            extracted=res.validated.model_dump(),
            transcript=trans_res.transcript,
            provider_used=trans_res.provider_used
        )
    return ExtractResponse(
        status="failed",
        transcript=trans_res.transcript,
        provider_used=trans_res.provider_used,
        error=res.error or "Extracted fields failed schema validation."
    )

@app.post("/api/voice/agent", response_model=VoiceAgentResponse)
def voice_agent_endpoint(req: VoiceAgentRequest):
    """Interactive conversational Voice Agent with safety scanning, RAG retrieval, and speech-ready synthesis."""
    res = process_voice_agent_dialogue(
        transcript=req.query,
        user_context=req.user_context,
        mode=req.mode or "dialogue"
    )
    return VoiceAgentResponse(
        status="ok",
        transcript=res.transcript,
        spoken_response=res.spoken_response,
        detailed_response=res.detailed_response,
        extracted_data=res.extracted_data,
        is_flagged=res.is_flagged,
        safety_trigger=res.safety_trigger,
        provider_used=res.provider_used,
        sources=res.sources,
        error=res.error
    )

@app.post("/api/voice/interact-audio", response_model=VoiceAgentResponse)
def voice_interact_audio_endpoint(file: UploadFile = File(...)):
    """Direct end-to-end voice loop: receives audio, transcribes it, and responds as the Voice Agent."""
    file_bytes, mime_type, filename = _read_bounded_file(file, default_mime="audio/wav")

    trans_res = transcribe_audio(audio_bytes=file_bytes, filename=filename, mime_type=mime_type)
    if not trans_res.success:
        return VoiceAgentResponse(
            status="failed",
            transcript="",
            spoken_response="Sorry, I could not decipher the audio speech. Please try speaking again.",
            detailed_response="Audio transcription failed. Error: " + (trans_res.error or "Unknown"),
            error=trans_res.error
        )

    res = process_voice_agent_dialogue(transcript=trans_res.transcript)
    return VoiceAgentResponse(
        status="ok",
        transcript=res.transcript,
        spoken_response=res.spoken_response,
        detailed_response=res.detailed_response,
        extracted_data=res.extracted_data,
        is_flagged=res.is_flagged,
        safety_trigger=res.safety_trigger,
        provider_used=f"{trans_res.provider_used} + {res.provider_used}",
        sources=res.sources,
        error=res.error
    )

@app.post("/api/voice/transcribe", response_model=VoiceTranscribeResponse)
def voice_transcribe_endpoint(file: UploadFile = File(...)):
    """Fast speech-to-text endpoint powered by Groq Whisper cascade."""
    file_bytes, mime_type, filename = _read_bounded_file(file, default_mime="audio/wav")

    trans_res = transcribe_audio(audio_bytes=file_bytes, filename=filename, mime_type=mime_type)
    if trans_res.success:
        return VoiceTranscribeResponse(
            status="ok",
            transcript=trans_res.transcript,
            provider_used=trans_res.provider_used
        )
    return VoiceTranscribeResponse(
        status="failed",
        transcript="",
        error=trans_res.error or "Transcription failed."
    )

@app.post("/api/rag/ingest")
def trigger_rag_ingest():
    """Triggers re-indexing of data/knowledge/ documents into local ChromaDB."""
    count = ingest_knowledge(str(KNOWLEDGE_DIR))
    return {"status": "success", "chunks_ingested": count}

@app.get("/api/rag/stats")
def get_rag_stats():
    """Returns vector store metrics and count of indexed chunks."""
    coll = get_chroma_collection()
    count = coll.count() if coll else 0
    return {"status": "ok", "total_chunks": count}
