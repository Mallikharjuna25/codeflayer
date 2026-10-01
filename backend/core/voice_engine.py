import os
import io
import time
from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass, field

from config import (
    GROQ_API_KEY,
    GEMINI_API_KEY,
    GROQ_WHISPER_MODELS,
    GEMINI_MODELS,
    HTTP_TIMEOUT_SECONDS,
    logger
)
from core.safety_scaffold import scan_for_flags
from core.rag import retrieve
from core.llm_client import call_llm
from core.extraction import extract_structured_data

@dataclass
class VoiceTranscriptionResult:
    success: bool
    transcript: str
    provider_used: str = ""
    error: Optional[str] = None

@dataclass
class VoiceAgentResult:
    transcript: str
    spoken_response: str
    detailed_response: str
    extracted_data: Optional[Dict[str, Any]] = None
    is_flagged: bool = False
    safety_trigger: Optional[str] = None
    provider_used: str = ""
    sources: List[str] = field(default_factory=list)
    error: Optional[str] = None

def transcribe_audio(
    audio_bytes: bytes,
    filename: str = "recording.wav",
    mime_type: str = "audio/wav"
) -> VoiceTranscriptionResult:
    """
    Transcribes audio with automatic dual-provider fallback:
    Tier 1: Groq Whisper (lightning-fast whisper-large-v3-turbo / whisper-large-v3)
    Tier 2: Google Gemini Multimodal Audio
    """
    if not audio_bytes:
        return VoiceTranscriptionResult(
            success=False,
            transcript="",
            error="Empty audio data provided."
        )

    # 1. Tier 1: Groq Whisper Cascade
    if GROQ_API_KEY:
        try:
            from groq import Groq
            groq_client = Groq(api_key=GROQ_API_KEY, timeout=HTTP_TIMEOUT_SECONDS)

            for model_id in GROQ_WHISPER_MODELS:
                try:
                    file_tuple = (filename, audio_bytes, mime_type)
                    resp = groq_client.audio.transcriptions.create(
                        model=model_id,
                        file=file_tuple,
                        response_format="json"
                    )
                    transcript_text = (resp.text or "").strip()
                    logger.info(f"Audio successfully transcribed by Groq Whisper model: {model_id}")
                    return VoiceTranscriptionResult(
                        success=True,
                        transcript=transcript_text,
                        provider_used=f"groq/{model_id}"
                    )
                except Exception as err:
                    logger.warning(f"Groq Whisper model {model_id} failed: {err}. Attempting fallback...")
                    continue
        except Exception as client_err:
            logger.warning(f"Groq Whisper client init failed: {client_err}")

    # 2. Tier 2: Gemini Multimodal Audio Cascade
    if GEMINI_API_KEY:
        try:
            from google import genai
            from google.genai import types

            g_client = genai.Client(
                api_key=GEMINI_API_KEY,
                http_options={"timeout": int(HTTP_TIMEOUT_SECONDS * 1000)}
            )

            audio_models = [m for m in GEMINI_MODELS if "flash" in m] or ["gemini-2.5-flash", "gemini-3.5-flash"]
            for gem_model in audio_models:
                try:
                    contents = [
                        types.Part.from_bytes(data=audio_bytes, mime_type=mime_type),
                        "Transcribe the spoken audio in this file verbatim. "
                        "If the audio contains speech, return only the exact transcription text. "
                        "Do not include any quotes, markdown formatting, or preamble."
                    ]
                    config = types.GenerateContentConfig(
                        temperature=0.0,
                        max_output_tokens=500
                    )
                    g_resp = g_client.models.generate_content(
                        model=gem_model,
                        contents=contents,
                        config=config
                    )
                    transcript_text = (g_resp.text or "").strip()
                    logger.info(f"Audio successfully transcribed by Gemini Multimodal: {gem_model}")
                    return VoiceTranscriptionResult(
                        success=True,
                        transcript=transcript_text,
                        provider_used=f"gemini/{gem_model}"
                    )
                except Exception as gem_err:
                    logger.warning(f"Gemini Audio {gem_model} failed: {gem_err}. Retrying...")
                    continue
        except Exception as g_client_err:
            logger.warning(f"Gemini audio client init failed: {g_client_err}")

    return VoiceTranscriptionResult(
        success=False,
        transcript="",
        error="All audio transcription providers failed or are unconfigured."
    )

def process_voice_agent_dialogue(
    transcript: str,
    user_context: Optional[str] = "",
    mode: str = "dialogue"  # "dialogue" | "extract" | "safety"
) -> VoiceAgentResult:
    """
    Processes spoken user input through the Voice Agent pipeline:
    1. Tier-0 Safety Scaffold Scan (sub-millisecond security intercept)
    2. Local Vector Vault Retrieval (ChromaDB knowledge grounding)
    3. Conversational Synthesis (Crisp spoken answer + detailed technical report)
    4. Optional Structured Pydantic Extraction
    """
    cleaned_transcript = (transcript or "").strip()
    if not cleaned_transcript:
        return VoiceAgentResult(
            transcript="",
            spoken_response="I didn't catch that. Could you please speak again or verify your microphone?",
            detailed_response="No voice input was detected.",
            is_flagged=False
        )

    # 1. Tier-0 Safety Scan
    is_flagged, trigger = scan_for_flags(cleaned_transcript)
    if is_flagged:
        spoken_warning = (
            f"Alert. Your voice query was intercepted by our Tier-0 safety governor. "
            f"A policy violation was triggered by: {trigger}. This request cannot be executed."
        )
        detailed_warning = (
            f"### 🛡️ Tier-0 Safety Governor Interception\n\n"
            f"- **Threat Trigger Detected:** `{trigger}`\n"
            f"- **Execution Intercepted:** Downstream LLM pipeline aborted.\n"
            f"- **Governance Rule:** Immediate block on unauthorized data exfiltration and credential manipulation."
        )
        return VoiceAgentResult(
            transcript=cleaned_transcript,
            spoken_response=spoken_warning,
            detailed_response=detailed_warning,
            is_flagged=True,
            safety_trigger=trigger,
            provider_used="Tier-0 Safety Scaffold"
        )

    # 2. Local Knowledge Vault Retrieval
    chunks = retrieve(cleaned_transcript, k=2, max_distance=0.75)
    context_str = "\n\n".join([f"[{c.source_file}]:\n{c.text}" for c in chunks]) if chunks else "No specific vault context."
    source_files = list(dict.fromkeys([c.source_file for c in chunks]))

    # 3. LLM Synthesis
    system_prompt = (
        "You are the Halo Enterprise AI Voice Agent, an authoritative, intelligent, and helpful vocal assistant.\n"
        "You must respond in valid JSON format with the following keys:\n"
        "{\n"
        '  "spoken_response": "A concise, natural spoken answer (1-3 sentences) suitable for text-to-speech audio synthesis. NO asterisks, NO markdown fences, NO bullet points.",\n'
        '  "detailed_response": "A complete, structured markdown explanation with technical context, details, and recommendations.",\n'
        '  "entity_name": "Name of the entity or subject mentioned (or General Query if none)",\n'
        '  "category": "Domain or operational category (e.g. Infrastructure, Security, Healthcare, Finance, Governance)",\n'
        '  "key_points": ["List of key points or extracted actionable decisions from the conversation"],\n'
        '  "confidence_score": 0.95\n'
        "}\n\n"
        f"KNOWLEDGE BASE CONTEXT:\n{context_str}\n\n"
        f"USER CONTEXT: {user_context or 'Enterprise Operator'}"
    )

    llm_res = call_llm(
        system_prompt=system_prompt,
        user_prompt=cleaned_transcript,
        json_mode=True,
        max_tokens=800
    )

    if not llm_res.success or not llm_res.parsed_json:
        # Fallback to direct conversational response
        fallback_prompt = (
            f"You are the Halo Enterprise AI Voice Agent. Answer this spoken query cleanly and concisely:\n{cleaned_transcript}"
        )
        plain_res = call_llm(system_prompt=fallback_prompt, user_prompt=cleaned_transcript, max_tokens=300)
        raw_text = plain_res.text or "I processed your request, but experienced a synthesis delay."
        return VoiceAgentResult(
            transcript=cleaned_transcript,
            spoken_response=raw_text[:200],
            detailed_response=raw_text,
            provider_used=plain_res.provider_used or "Groq/Gemini Cascade",
            sources=source_files
        )

    parsed = llm_res.parsed_json
    spoken = str(parsed.get("spoken_response") or "I processed your request successfully.")
    detailed = str(parsed.get("detailed_response") or spoken)

    # Format structured extracted data if present
    extracted_data = None
    if parsed.get("entity_name") or mode == "extract":
        key_pts = parsed.get("key_points")
        if not isinstance(key_pts, list):
            key_pts = [str(key_pts)] if key_pts else []
        
        extracted_data = {
            "entity_name": str(parsed.get("entity_name") or "Spoken Query Entity"),
            "category": str(parsed.get("category") or "Voice Operations"),
            "key_points": key_pts,
            "confidence_score": float(parsed.get("confidence_score") or 0.92)
        }

    return VoiceAgentResult(
        transcript=cleaned_transcript,
        spoken_response=spoken,
        detailed_response=detailed,
        extracted_data=extracted_data,
        is_flagged=False,
        provider_used=llm_res.provider_used,
        sources=source_files
    )
