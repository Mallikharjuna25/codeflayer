import json
from typing import Type, TypeVar, Optional, Union
from pydantic import BaseModel, ValidationError
from dataclasses import dataclass

from core.llm_client import call_llm
from config import logger

T = TypeVar("T", bound=BaseModel)

@dataclass
class ExtractionResult:
    validated: Optional[BaseModel]
    raw_text: str
    success: bool
    error: Optional[str] = None

def extract_structured_data(
    schema: Type[T],
    text: Optional[str] = None,
    image_bytes: Optional[bytes] = None,
    mime_type: str = "image/png",
    custom_system_prompt: Optional[str] = None
) -> ExtractionResult:
    """Extracts structured data with 1-attempt validation feedback retry."""
    schema_json_desc = json.dumps(schema.model_json_schema(), indent=2)
    default_system = (
        "You are a strict data extraction engine. Extract information matching the following JSON schema:\n"
        f"{schema_json_desc}\n\n"
        "Output ONLY valid JSON matching this schema."
    )
    system_prompt = custom_system_prompt or default_system
    user_prompt = text or "Extract the required structured fields from the attached image strictly according to the schema."

    res1 = call_llm(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        json_mode=True,
        image_bytes=image_bytes,
        mime_type=mime_type
    )

    if not res1.success or not res1.parsed_json:
        return ExtractionResult(
            validated=None,
            raw_text=res1.text,
            success=False,
            error=res1.error or "LLM failed to return structured JSON."
        )

    last_val_err = ""
    try:
        validated_obj = schema.model_validate(res1.parsed_json)
        return ExtractionResult(
            validated=validated_obj,
            raw_text=res1.text,
            success=True
        )
    except ValidationError as val_err1:
        last_val_err = str(val_err1)
        logger.warning(f"Schema validation failed on attempt 1: {last_val_err}. Retrying once with error feedback...")

    retry_prompt = (
        f"{user_prompt}\n\n"
        "ATTENTION: Your previous JSON output was invalid according to the schema.\n"
        f"Validation Error: {last_val_err}\n"
        "Please fix the fields and output the corrected JSON object strictly."
    )

    res2 = call_llm(
        system_prompt=system_prompt,
        user_prompt=retry_prompt,
        json_mode=True,
        image_bytes=image_bytes,
        mime_type=mime_type
    )

    if res2.success and res2.parsed_json:
        try:
            validated_obj = schema.model_validate(res2.parsed_json)
            return ExtractionResult(
                validated=validated_obj,
                raw_text=res2.text,
                success=True
            )
        except ValidationError as val_err2:
            logger.warning(f"Schema validation failed on attempt 2: {val_err2}. Returning raw text fallback.")
            return ExtractionResult(
                validated=None,
                raw_text=res2.text,
                success=False,
                error=f"Schema validation error: {str(val_err2)}"
            )

    return ExtractionResult(
        validated=None,
        raw_text=res2.text or res1.text,
        success=False,
        error="Extraction retry failed to produce valid schema-compliant JSON."
    )
