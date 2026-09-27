import os
import glob
import hashlib
import logging
from pathlib import Path
from typing import List
from dataclasses import dataclass

import chromadb
from chromadb.utils import embedding_functions

from config import (
    CHROMA_DIR,
    CHROMA_COLLECTION_NAME,
    EMBEDDING_MODEL_NAME,
    logger
)

@dataclass
class Chunk:
    text: str
    source_file: str
    distance: float

def get_chroma_collection():
    """Initializes and returns the persistent Chroma collection with local embeddings."""
    try:
        CHROMA_DIR.mkdir(parents=True, exist_ok=True)
        client = chromadb.PersistentClient(path=str(CHROMA_DIR))
        emb_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name=EMBEDDING_MODEL_NAME
        )
        return client.get_or_create_collection(
            name=CHROMA_COLLECTION_NAME,
            embedding_function=emb_fn,
            metadata={"hnsw:space": "cosine"}
        )
    except Exception as e:
        logger.warning(f"Could not initialize Chroma collection: {e}")
        return None

def _chunk_text(content: str, filename: str, chunk_size: int = 600, overlap: int = 90) -> List[dict]:
    """Chunks by markdown H2 headings if present; falls back to sliding window chunking."""
    chunks = []
    if "## " in content:
        sections = content.split("\n## ")
        for i, sec in enumerate(sections):
            text = ("## " + sec if i > 0 else sec).strip()
            if len(text) > 20:
                chunks.append({"source_file": filename, "text": text})
        return chunks

    # Sliding window fallback for plain text or unstructured docs
    start = 0
    while start < len(content):
        end = min(start + chunk_size, len(content))
        piece = content[start:end].strip()
        if piece:
            chunks.append({"source_file": filename, "text": piece})
        start += (chunk_size - overlap)
    return chunks

def ingest_knowledge(folder_path: str) -> int:
    """
    Reads all .md and .txt documents from the folder, chunks, and upserts idempotently.
    Returns total chunks ingested. Never crashes on unreadable or empty paths.
    """
    folder = Path(folder_path)
    if not folder.exists() or not folder.is_dir():
        logger.warning(f"Knowledge folder does not exist: {folder_path}")
        return 0

    files = glob.glob(str(folder / "*.md")) + glob.glob(str(folder / "*.txt"))
    if not files:
        logger.info(f"No .md or .txt files found in {folder_path}. Ingestion skipped.")
        return 0

    all_chunks = []
    for fpath in files:
        try:
            with open(fpath, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if content:
                    all_chunks.extend(_chunk_text(content, Path(fpath).name))
        except Exception as e:
            logger.warning(f"Skipping unreadable file {fpath}: {e}")

    if not all_chunks:
        return 0

    collection = get_chroma_collection()
    if collection is None:
        logger.warning("Chroma collection unavailable; ingestion aborted.")
        return 0

    ids, docs, metas = [], [], []
    for c in all_chunks:
        unique_key = f"{c['source_file']}_{c['text']}"
        chunk_id = hashlib.sha256(unique_key.encode("utf-8")).hexdigest()[:16]
        ids.append(chunk_id)
        docs.append(c["text"])
        metas.append({"source_file": c["source_file"]})

    collection.upsert(ids=ids, documents=docs, metadatas=metas)
    logger.info(f"Ingested {len(ids)} unique chunks into Chroma collection '{CHROMA_COLLECTION_NAME}'.")
    return len(ids)

def retrieve(query: str, k: int = 4, max_distance: float = 0.70) -> List[Chunk]:
    """
    Queries Chroma for relevant chunks.
    NOTE on distance metric: Chroma with hnsw:space='cosine' returns cosine distance.
    Distance = 1.0 - cosine_similarity.
    LOWER = MORE SIMILAR (0.0 = identical, 1.0 = orthogonal).
    Returns an empty list if the best match exceeds max_distance (prevents false matches).
    """
    clean_q = query.strip()
    if not clean_q:
        return []

    collection = get_chroma_collection()
    if collection is None or collection.count() == 0:
        logger.info("Chroma collection is empty or uninitialized. Returning zero chunks.")
        return []

    try:
        res = collection.query(
            query_texts=[clean_q],
            n_results=k,
            include=["documents", "metadatas", "distances"]
        )
    except Exception as e:
        logger.warning(f"Chroma query failed: {e}")
        return []

    docs = res.get("documents", [[]])[0]
    metas = res.get("metadatas", [[]])[0]
    dists = res.get("distances", [[]])[0]

    if not docs:
        return []

    # If even the top/closest match exceeds max_distance, refuse to return weak hallucinations
    if dists[0] > max_distance:
        logger.info(f"Best match distance ({dists[0]:.3f}) exceeds threshold ({max_distance}). Suppressing.")
        return []

    results = []
    for doc, meta, dist in zip(docs, metas, dists):
        if dist <= max_distance:
            results.append(Chunk(
                text=doc,
                source_file=meta.get("source_file", "unknown"),
                distance=round(float(dist), 4)
            ))
    return results
