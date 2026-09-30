# Sample Knowledge Guidelines

## Architecture Overview
CODE_STORM is a resilient GenAI hackathon architecture built with FastAPI, React (Vite + Vanilla CSS), local ChromaDB embeddings, and a dual-provider LLM cascade.

## Multi-Provider Resilience
The system uses Groq for high-speed sub-second inference with automatic failover to Google Gemini on any 429/503 errors. All embeddings are processed locally via sentence-transformers, guaranteeing zero downtime even during intermittent network drops.

## Hackathon Pitch Strategy
When presenting to judges:
1. Emphasize that the system runs live and never crashes due to the multi-provider cascade.
2. Demonstrate real-time multimodal extraction from images.
3. Show local vector search running without external cloud dependencies.
