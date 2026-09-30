import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import pytest
from core.rag import ingest_knowledge, retrieve, Chunk

def test_ingest_nonexistent_or_empty_folder(tmp_path):
    count_missing = ingest_knowledge(str(tmp_path / "does_not_exist"))
    assert count_missing == 0

    empty_dir = tmp_path / "empty_dir"
    empty_dir.mkdir()
    count_empty = ingest_knowledge(str(empty_dir))
    assert count_empty == 0

def test_retrieve_empty_query():
    assert retrieve("") == []
    assert retrieve("   ") == []

@patch("core.rag.get_chroma_collection")
def test_retrieve_max_distance_suppression(mock_get_collection):
    mock_coll = MagicMock()
    mock_coll.count.return_value = 5
    mock_coll.query.return_value = {
        "documents": [["Unrelated content about baking bread"]],
        "metadatas": [[{"source_file": "baking.txt"}]],
        "distances": [[0.85]]
    }
    mock_get_collection.return_value = mock_coll

    results = retrieve(query="quantum mechanics", max_distance=0.70)
    assert len(results) == 0
