import sys
from pathlib import Path

# Ensure starter kit root is on sys.path
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

import streamlit as st
from pydantic import BaseModel, Field
from typing import Optional, List

from config import (
    GROQ_MODELS,
    GEMINI_MODELS,
    KNOWLEDGE_DIR,
    CHROMA_DIR
)
from core.llm_client import call_llm
from core.rag import ingest_knowledge, retrieve, get_chroma_collection
from core.extraction import extract_structured_data
from core.safety_scaffold import scan_for_flags, semantic_check

st.set_page_config(
    page_title="GenAI Hackathon Starter Shell",
    page_icon="⚡",
    layout="wide"
)

# ---------------------------------------------------------------------------
# Sidebar: System Controls & Diagnostics
# ---------------------------------------------------------------------------
with st.sidebar:
    st.header("⚡ System Diagnostics")
    st.caption("Domain-Agnostic GenAI Plumbing")
    
    collection = get_chroma_collection()
    chunk_count = collection.count() if collection else 0
    st.metric("Vector DB Chunks", chunk_count)
    
    st.divider()
    st.subheader("Configured Models")
    st.write(f"**Groq Primary:** `{GROQ_MODELS[0]}`")
    st.write(f"**Gemini Fallback:** `{GEMINI_MODELS[0]}`")
    
    st.divider()
    if st.button("🔄 Ingest / Refresh Knowledge Base"):
        with st.spinner("Embedding files from data/knowledge..."):
            count = ingest_knowledge(str(KNOWLEDGE_DIR))
            st.success(f"Ingested {count} chunks!")
            st.rerun()

st.title("🚀 GenAI Hackathon Application")
st.caption("Multi-Provider Fallback | Local Chroma RAG | Multimodal Extraction | Two-Tier Guardrails")

tab_chat, tab_extract, tab_knowledge = st.tabs([
    "💬 AI Assistant (RAG)",
    "📷 Document / Image Extraction",
    "📚 Knowledge Management"
])

# ---------------------------------------------------------------------------
# TAB 1: RAG & Chat Shell
# ---------------------------------------------------------------------------
with tab_chat:
    st.subheader("Query Assistant")
    user_query = st.text_input("Enter your question or task:", placeholder="Ask anything about the ingested documents...")
    
    if st.button("Run Query", type="primary"):
        if not user_query.strip():
            st.warning("Please enter a query.")
        else:
            # 1. Tier 0 Deterministic Safety Scan
            t0_flag, t0_trigger = scan_for_flags(user_query)
            if t0_flag:
                st.error(f"⚠️ Flagged by Tier 0 Security Filter: '{t0_trigger}'")
                st.stop()

            # 2. Vector Retrieval (Chroma)
            with st.spinner("Retrieving verified context from ChromaDB..."):
                chunks = retrieve(user_query, k=3, max_distance=0.70)
                
            context_text = "\n\n".join([f"[{c.source_file}]:\n{c.text}" for c in chunks]) if chunks else "No relevant context found."
            
            # 3. LLM Call
            with st.spinner("Synthesizing answer with multi-provider cascade..."):
                # DOMAIN SYSTEM PROMPT: EDIT ONCE PROBLEM STATEMENT IS KNOWN
                system_prompt = (
                    "You are a helpful, factual hackathon assistant. "
                    "Ground your answers strictly on the provided context if available.\n\n"
                    f"VERIFIED CONTEXT:\n{context_text}"
                )
                res = call_llm(
                    system_prompt=system_prompt,
                    user_prompt=user_query,
                    temperature=0.1
                )

            if res.success:
                st.markdown("### Response")
                st.markdown(res.text)
                st.caption(f"⚡ *Served by: {res.provider_used}*")
                
                if chunks:
                    with st.expander("📚 Retrieved Knowledge Chunks"):
                        for idx, c in enumerate(chunks):
                            st.markdown(f"**Chunk {idx+1} ({c.source_file}, distance: {c.distance})**")
                            st.write(c.text)
            else:
                st.error(f"Execution Error: {res.error}")

# ---------------------------------------------------------------------------
# TAB 2: Structured Extraction (Text or Image)
# ---------------------------------------------------------------------------
with tab_extract:
    st.subheader("Multimodal Structured Data Extraction")
    st.caption("Passes input directly to Pydantic schema validation with automatic feedback retry.")

    # Generic Starter Schema - EDIT/REPLACE ONCE PROBLEM STATEMENT IS KNOWN
    class GenericItemSchema(BaseModel):
        title: str = Field(description="Title or main entity name")
        category: str = Field(description="Category or classification")
        summary: str = Field(description="2-sentence summary of the content")
        tags: List[str] = Field(default_factory=list, description="Relevant keyword tags")

    extract_mode = st.radio("Input Type", ["Text", "Image"], horizontal=True)

    if extract_mode == "Text":
        raw_input = st.text_area("Paste unstructured text to parse:", height=150)
        if st.button("Extract Data from Text"):
            with st.spinner("Extracting with schema validation..."):
                result = extract_structured_data(schema=GenericItemSchema, text=raw_input)
                if result.success and result.validated:
                    st.success("Extraction Succeeded!")
                    st.json(result.validated.model_dump())
                else:
                    st.error(f"Extraction Failed: {result.error}")
                    st.text_area("Raw LLM Text", result.raw_text)
    else:
        uploaded_img = st.file_uploader("Upload an image (PNG/JPG)", type=["png", "jpg", "jpeg"])
        if uploaded_img:
            st.image(uploaded_img, width=300)
            if st.button("Extract Data from Image"):
                with st.spinner("Processing multimodal image extraction..."):
                    img_bytes = uploaded_img.getvalue()
                    mime_type = uploaded_img.type or "image/png"
                    result = extract_structured_data(
                        schema=GenericItemSchema,
                        image_bytes=img_bytes,
                        mime_type=mime_type
                    )
                    if result.success and result.validated:
                        st.success("Multimodal Extraction Succeeded!")
                        st.json(result.validated.model_dump())
                    else:
                        st.error(f"Extraction Failed: {result.error}")
                        st.text_area("Raw LLM Text", result.raw_text)

# ---------------------------------------------------------------------------
# TAB 3: Knowledge Management
# ---------------------------------------------------------------------------
with tab_knowledge:
    st.subheader("Local Knowledge Store")
    st.markdown(f"Knowledge files are loaded from: `{KNOWLEDGE_DIR}`")
    st.markdown("""
    **How to add domain knowledge on the day:**
    1. Drop `.md` or `.txt` guidelines/policies/manuals into `data/knowledge/`
    2. Click **'Ingest / Refresh Knowledge Base'** in the sidebar
    3. All chunks are immediately searchable via ChromaDB!
    """)
