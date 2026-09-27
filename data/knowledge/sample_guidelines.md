# Starter Sample Guideline

## Project Overview
This repository is a domain-agnostic GenAI & LLM Hackathon Starter Kit. It provides multi-provider fallbacks across Groq and Gemini, local vector embeddings with ChromaDB, structured data extraction, and a two-tier guardrail system.

## Deployment & Running
To run the web interface, execute:
streamlit run app.py

To run the REST API backend, execute:
uvicorn api.main:app --reload

## Hackathon Pitch Advice
Highlight the resilience architecture during the live pitch:
1. Explain that Groq provides sub-second latency for real-time interaction.
2. If network or rate limits occur, Gemini acts as an automatic fallback.
3. Local ChromaDB ensures that document retrieval never fails even if external APIs have delays.
