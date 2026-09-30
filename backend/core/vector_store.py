import hashlib
import logging
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.utils import embedding_functions

from config import CHROMA_DIR, EMBEDDING_MODEL_NAME

logger = logging.getLogger("code_storm_backend.vector_store")

_POLICY_COLLECTION_NAME = "halo_policy_vault"
_client: Optional[chromadb.PersistentClient] = None
_collection = None

def get_policy_collection():
    """Initializes and returns the persistent Chroma collection for policy passages."""
    global _client, _collection
    if _collection is not None:
        return _collection
    try:
        CHROMA_DIR.mkdir(parents=True, exist_ok=True)
        _client = chromadb.PersistentClient(path=str(CHROMA_DIR))
        emb_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name=EMBEDDING_MODEL_NAME
        )
        _collection = _client.get_or_create_collection(
            name=_POLICY_COLLECTION_NAME,
            embedding_function=emb_fn,
            metadata={"hnsw:space": "cosine"}
        )
        return _collection
    except Exception as e:
        logger.warning(f"Could not initialize Chroma policy vault: {e}")
        return None

def index_policy_chunks(
    organization_id: str,
    source_id: str,
    title: str,
    chunks: List[Dict[str, Any]]
) -> int:
    """
    Indexes policy passages into Chroma scoped by organization_id.
    Each chunk dict must contain: {'text': str, 'page_or_section': str}.
    """
    coll = get_policy_collection()
    if not coll or not chunks:
        return 0

    ids: List[str] = []
    documents: List[str] = []
    metadatas: List[Dict[str, Any]] = []

    for idx, c in enumerate(chunks):
        text = c["text"].strip()
        if not text:
            continue
        p_or_s = str(c.get("page_or_section", f"Chunk {idx + 1}"))
        chunk_hash = hashlib.sha256(f"{organization_id}_{source_id}_{idx}_{text}".encode("utf-8")).hexdigest()[:16]
        chunk_id = f"pol_{source_id}_{idx}_{chunk_hash}"

        ids.append(chunk_id)
        documents.append(text)
        metadatas.append({
            "organization_id": organization_id,
            "source_id": source_id,
            "title": title,
            "page_or_section": p_or_s
        })

    if ids:
        coll.upsert(ids=ids, documents=documents, metadatas=metadatas)
        logger.info(f"Indexed {len(ids)} policy passages for source {source_id} in org {organization_id}")

    return len(ids)

def search_policy_passages(
    organization_id: str,
    query: str,
    k: int = 3
) -> List[Dict[str, Any]]:
    """
    Finds relevant policy passages strictly scoped by organization_id.
    """
    clean_q = query.strip()
    if not clean_q:
        return []

    coll = get_policy_collection()
    if not coll:
        return []

    try:
        res = coll.query(
            query_texts=[clean_q],
            n_results=k,
            where={"organization_id": organization_id},
            include=["documents", "metadatas", "distances"]
        )
    except Exception as e:
        logger.warning(f"Chroma search failed: {e}")
        return []

    docs = res.get("documents", [[]])[0]
    metas = res.get("metadatas", [[]])[0]
    dists = res.get("distances", [[]])[0]

    results = []
    for doc, meta, dist in zip(docs, metas, dists):
        results.append({
            "text": doc,
            "source_id": meta.get("source_id"),
            "title": meta.get("title"),
            "page_or_section": meta.get("page_or_section"),
            "similarity_score": round(1.0 - float(dist), 4)
        })

    return results
