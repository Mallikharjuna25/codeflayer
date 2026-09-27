import sys
from pathlib import Path
from unittest.mock import patch
from pydantic import BaseModel, Field

KIT_DIR = Path(__file__).resolve().parent.parent
if str(KIT_DIR) not in sys.path:
    sys.path.insert(0, str(KIT_DIR))

import pytest
from core.extraction import extract_structured_data
from core.llm_client import LLMResult

class InvoiceItem(BaseModel):
    item_name: str
    price: float = Field(gt=0)
    quantity: int = Field(ge=1)

@patch("core.extraction.call_llm")
def test_extraction_success_on_first_attempt(mock_call_llm):
    """Verify clean extraction directly validates against Pydantic model."""
    mock_call_llm.return_value = LLMResult(
        success=True,
        text='{"item_name": "Keyboard", "price": 49.99, "quantity": 1}',
        parsed_json={"item_name": "Keyboard", "price": 49.99, "quantity": 1},
        provider_used="groq/test"
    )

    result = extract_structured_data(schema=InvoiceItem, text="Invoice with Keyboard for $49.99")
    assert result.success is True
    assert result.validated.item_name == "Keyboard"
    assert result.validated.price == 49.99
    assert mock_call_llm.call_count == 1

@patch("core.extraction.call_llm")
def test_extraction_validation_failure_triggers_one_retry_then_fallback(mock_call_llm):
    """Verify that a malformed output (price is negative or string) retries once and falls back gracefully."""
    # Attempt 1 returns invalid price
    bad_res1 = LLMResult(
        success=True,
        text='{"item_name": "Keyboard", "price": -10.0, "quantity": 1}',
        parsed_json={"item_name": "Keyboard", "price": -10.0, "quantity": 1},
        provider_used="groq/test"
    )
    # Attempt 2 still returns invalid price
    bad_res2 = LLMResult(
        success=True,
        text='{"item_name": "Keyboard", "price": -5.0, "quantity": 1}',
        parsed_json={"item_name": "Keyboard", "price": -5.0, "quantity": 1},
        provider_used="groq/test"
    )
    mock_call_llm.side_effect = [bad_res1, bad_res2]

    result = extract_structured_data(schema=InvoiceItem, text="Invoice details")
    assert result.success is False
    assert result.validated is None
    assert mock_call_llm.call_count == 2
    assert "Schema validation error" in result.error
