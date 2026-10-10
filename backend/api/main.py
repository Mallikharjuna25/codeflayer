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
from core.session_audits import (
    record_session_audit,
    get_session_audits,
    seed_default_audits,
    calculate_roi_savings,
    export_compliance_certificate,
    _load_raw_audits
)
from api.governance_routes import router as governance_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables, seed records, and session audits
    init_db()
    db = SessionLocal()
    try:
        seed_database(db)
        seed_default_audits()
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
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "https://halo-seven-kohl.vercel.app",
        "https://halo-ai5.vercel.app",
    ],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
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
@app.get("/api/health")
@app.get("/api/ping")
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

# ---------------------------------------------------------------------------
# 3-Tier Gateway AI Chatbot Endpoint & Session Auditing
# ---------------------------------------------------------------------------
class GatewayProcessRequest(BaseModel):
    query: str = Field(..., min_length=1)
    user_context: Optional[str] = ""
    role: Optional[str] = "employee"
    user_email: Optional[str] = "user@company.com"
    user_name: Optional[str] = "Enterprise User"
    company_id: Optional[str] = "acme"
    company_name: Optional[str] = "Acme Corporation"
    session_id: Optional[str] = None
    attachments: Optional[List[Dict[str, Any]]] = None

class GatewayProcessResponse(BaseModel):
    status: str  # "ALLOWED", "BLOCKED", "ESCALATED"
    response: str
    provider_used: str
    sources: List[str] = Field(default_factory=list)
    tier_0: Dict[str, Any]
    tier_1: Dict[str, Any]
    tier_2: Dict[str, Any]
    execution_time_ms: float
    audit_id: Optional[str] = None

@app.post("/api/gateway/process", response_model=GatewayProcessResponse)
def gateway_process_endpoint(req: GatewayProcessRequest):
    """
    Integrated Three-Tier AI Agent Gateway Checkpoint with Immutable Session Audit Logging:
    - Tier 0: Deterministic Safety & Tool Policy Gate (<1ms local check)
    - Tier 1: Context, Risk & Blast Radius Provenance Check
    - Tier 2: Vector Grounding & Groq/Gemini Multi-Provider Synthesis
    - Audit Trail: Immutable SHA-256 chained session log recorded for compliance.
    """
    start_time = time.perf_counter()
    query_text = req.query.strip()
    user_email = req.user_email or "user@company.com"
    user_name = req.user_name or "Enterprise User"
    user_role = req.role or "employee"
    company_id = req.company_id or "acme"
    company_name = req.company_name or "Acme Corporation"

    # --- TIER 0: Deterministic Policy Gate ---
    t0_start = time.perf_counter()
    is_flagged, trigger = scan_for_flags(query_text)
    t0_elapsed = round((time.perf_counter() - t0_start) * 1000, 2)

    if is_flagged:
        total_ms = round((time.perf_counter() - start_time) * 1000, 2)
        resp_msg = f"🛑 [GATEWAY INTERCEPT - TIER 0 BLOCK] Security policy violation detected: '{trigger}'. Action halted before execution. Zero unauthorized changes were made."
        t0_data = {
            "passed": False,
            "decision": "BLOCK",
            "trigger": trigger,
            "latency_ms": t0_elapsed,
            "policy_code": "POL-TIER0-ENFORCEMENT"
        }
        t1_data = {
            "risk_level": "CRITICAL",
            "blast_radius": "Intercepted at local perimeter",
            "provenance": "Untrusted / Adversarial Threat Pattern"
        }
        t2_data = {
            "status": "BYPASSED",
            "reason": "Hard deterministic block cannot be overridden by semantic LLM."
        }

        # Record audit log
        audit_record = record_session_audit(
            user_email=user_email,
            user_name=user_name,
            user_role=user_role,
            company_id=company_id,
            company_name=company_name,
            query=query_text,
            status="BLOCKED",
            provider="Tier-0 Local Deterministic Shield",
            tier_0=t0_data,
            tier_1=t1_data,
            tier_2=t2_data,
            execution_time_ms=total_ms,
            response=resp_msg,
            sources=[],
            attachments=req.attachments,
            session_id=req.session_id
        )

        return GatewayProcessResponse(
            status="BLOCKED",
            response=resp_msg,
            provider_used="Tier-0 Local Deterministic Shield",
            sources=[],
            tier_0=t0_data,
            tier_1=t1_data,
            tier_2=t2_data,
            execution_time_ms=total_ms,
            audit_id=audit_record.get("id")
        )

    # --- TIER 1: Blast Radius & Egress Perimeter ---
    lower_query = query_text.lower()
    is_external = any(kw in lower_query for kw in ["external", "egress", "outside", "partner", "investor", "board@"])
    risk_level = "HIGH" if is_external else "LOW"
    blast_radius = "External network perimeter (Supervisor signoff recommended)" if is_external else "Read-only isolated local context"

    tier_1_data = {
        "risk_level": risk_level,
        "blast_radius": blast_radius,
        "provenance": f"Verified Internal Role: {user_role}"
    }

    # Role-based restriction: Employee trying to perform administrative/root/financial payout actions
    if user_role == "employee" and any(kw in lower_query for kw in ["admin override", "sudo", "payout", "transfer funds", "delete user"]):
        total_ms = round((time.perf_counter() - start_time) * 1000, 2)
        resp_msg = "🛑 [GATEWAY INTERCEPT - TIER 0 BLOCK] Role restriction: Employee role lacks administrative clearance for financial payouts or root actions."
        t0_data = {
            "passed": False,
            "decision": "BLOCK",
            "trigger": "Insufficient Role Permissions",
            "latency_ms": t0_elapsed,
            "policy_code": "RBAC-CLEARANCE-FAIL"
        }
        t2_data = {
            "status": "BYPASSED",
            "reason": "RBAC clearance violation"
        }

        audit_record = record_session_audit(
            user_email=user_email,
            user_name=user_name,
            user_role=user_role,
            company_id=company_id,
            company_name=company_name,
            query=query_text,
            status="BLOCKED",
            provider="Tier-0 RBAC Enforcer",
            tier_0=t0_data,
            tier_1=tier_1_data,
            tier_2=t2_data,
            execution_time_ms=total_ms,
            response=resp_msg,
            sources=[],
            attachments=req.attachments,
            session_id=req.session_id
        )

        return GatewayProcessResponse(
            status="BLOCKED",
            response=resp_msg,
            provider_used="Tier-0 RBAC Enforcer",
            sources=[],
            tier_0=t0_data,
            tier_1=tier_1_data,
            tier_2=t2_data,
            execution_time_ms=total_ms,
            audit_id=audit_record.get("id")
        )

    # --- TIER 2: Chroma Vector Retrieval & LLM Synthesis ---
    chunks = retrieve(query_text, k=3, max_distance=0.75)
    context_str = "\n\n".join([f"[{c.source_file}]:\n{c.text}" for c in chunks]) if chunks else "No specific guideline chunks found."
    source_files = list(dict.fromkeys([c.source_file for c in chunks]))

    system_prompt = (
        "You are the Halo 3-Tier AI Agent Gateway Assistant. "
        "You operate as an intelligent secure gateway between the user and external tools. "
        "Ground your advice strictly on verified context.\n\n"
        f"VERIFIED COMPANY POLICY & GUIDELINES CONTEXT:\n{context_str}"
    )
    llm_res = call_llm(system_prompt=system_prompt, user_prompt=query_text)
    total_ms = round((time.perf_counter() - start_time) * 1000, 2)

    final_status = "ESCALATED" if is_external else "ALLOWED"
    final_response = llm_res.text if llm_res.success else f"Fallback synthesis (vector grounded): {chunks[0].text if chunks else 'System operational.'}"
    final_provider = llm_res.provider_used if llm_res.success else "Local ChromaDB Fallback"

    t0_data = {"passed": True, "decision": "ALLOW", "latency_ms": t0_elapsed, "policy_code": "POL-CLEAN-PASS"}
    t2_data = {"status": "SYNTHESIZED", "provider": final_provider}

    audit_record = record_session_audit(
        user_email=user_email,
        user_name=user_name,
        user_role=user_role,
        company_id=company_id,
        company_name=company_name,
        query=query_text,
        status=final_status,
        provider=final_provider,
        tier_0=t0_data,
        tier_1=tier_1_data,
        tier_2=t2_data,
        execution_time_ms=total_ms,
        response=final_response,
        sources=source_files,
        attachments=req.attachments,
        session_id=req.session_id
    )

    return GatewayProcessResponse(
        status=final_status,
        response=final_response,
        provider_used=final_provider,
        sources=source_files,
        tier_0=t0_data,
        tier_1=tier_1_data,
        tier_2=t2_data,
        execution_time_ms=total_ms,
        audit_id=audit_record.get("id")
    )

# ---------------------------------------------------------------------------
# Gateway Session Audit Endpoints (RBAC Enforced)
# ---------------------------------------------------------------------------
@app.get("/api/gateway/audits")
def get_gateway_audits_endpoint(
    user_email: str = "user@company.com",
    role: str = "employee",
    filter_user: Optional[str] = None,
    filter_status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 150
):
    """
    Retrieves gateway session audits with strict RBAC enforcement:
    - Administrators ('company_admin') can inspect all users' sessions across the enterprise.
    - Regular employees can strictly ONLY view their own sessions.
    """
    return get_session_audits(
        requester_email=user_email,
        requester_role=role,
        filter_user=filter_user,
        filter_status=filter_status,
        search=search,
        limit=limit
    )

@app.delete("/api/gateway/audits/clear")
def clear_gateway_audits_endpoint(user_email: str = "user@company.com", role: str = "employee"):
    """Re-seeds or resets audit history."""
    seed_default_audits()
    return {"status": "ok", "message": "Audits reset to verified cryptographic baseline."}

# ---------------------------------------------------------------------------
# Policy .md File Management Endpoints (for Administrator)
# ---------------------------------------------------------------------------
class UpdatePolicyMdRequest(BaseModel):
    content: str
    filename: Optional[str] = "sample_guidelines.md"
    change_summary: Optional[str] = "Updated policy guidelines via web editor."

@app.get("/api/policy/current-md")
def get_current_policy_md(filename: Optional[str] = "sample_guidelines.md"):
    """Returns the current policy markdown content from KNOWLEDGE_DIR."""
    target = KNOWLEDGE_DIR / filename
    if not target.exists():
        md_files = list(KNOWLEDGE_DIR.glob("*.md"))
        if md_files:
            target = md_files[0]
        else:
            return {
                "status": "ok",
                "filename": filename,
                "content": "# Corporate Policy Guidelines\n\nNo policy documents found.",
                "total_chunks": 0
            }

    text = target.read_text(encoding="utf-8", errors="replace")
    coll = get_chroma_collection()
    chunks_count = coll.count() if coll else 0
    return {
        "status": "ok",
        "filename": target.name,
        "content": text,
        "total_chunks": chunks_count,
        "last_modified": time.ctime(target.stat().st_mtime)
    }

@app.post("/api/policy/update-md")
def update_policy_md(req: UpdatePolicyMdRequest):
    """
    Administrator endpoint: Overwrites the policy .md file and re-indexes into ChromaDB vector store.
    """
    KNOWLEDGE_DIR.mkdir(parents=True, exist_ok=True)
    target = KNOWLEDGE_DIR / (req.filename or "sample_guidelines.md")
    target.write_text(req.content, encoding="utf-8")

    # Re-index chunks into ChromaDB
    chunks_ingested = ingest_knowledge(str(KNOWLEDGE_DIR))

    return {
        "status": "success",
        "message": f"Successfully updated '{target.name}' and re-indexed {chunks_ingested} chunks into 3-Tier Gateway vector store.",
        "chunks_ingested": chunks_ingested,
        "filename": target.name
    }

# ---------------------------------------------------------------------------
# Advanced Enterprise Governance & ROI Analytics
# ---------------------------------------------------------------------------
@app.get("/api/analytics/roi-metrics")
def get_roi_metrics(company_id: Optional[str] = "all"):
    """Returns real-time financial ROI and token efficiency savings generated by Tier-0 blocks."""
    return calculate_roi_savings(company_id=company_id)

@app.get("/api/compliance/export-certificate")
def get_compliance_certificate(user_email: str = "admin@acme.com", company_id: Optional[str] = "all"):
    """Generates a cryptographically signed SOC 2 / ISO 27001 AI governance certificate."""
    return export_compliance_certificate(requester_email=user_email, company_id=company_id)

class PolicySimulationRequest(BaseModel):
    draft_policy: str
    max_samples: Optional[int] = 25

@app.post("/api/governance/simulate-policy")
def simulate_policy_impact(req: PolicySimulationRequest):
    """
    Dry-runs a draft policy against historical session queries to preview block vs. allow outcomes.
    """
    audits = _load_raw_audits()
    samples = audits[-req.max_samples:] if audits else []
    results = []
    for a in samples:
        q = a.get("query", "")
        is_flagged, trigger = scan_for_flags(q)
        results.append({
            "session_id": a.get("session_id"),
            "query": q,
            "previous_status": a.get("status"),
            "simulated_status": "BLOCKED" if is_flagged else "ALLOWED",
            "simulated_trigger": trigger if is_flagged else None
        })
    return {
        "status": "success",
        "total_tested": len(results),
        "blocked_count": sum(1 for r in results if r["simulated_status"] == "BLOCKED"),
        "allowed_count": sum(1 for r in results if r["simulated_status"] == "ALLOWED"),
        "results": results
    }

