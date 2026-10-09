import re
import json
from typing import List, Tuple
from core.llm_client import call_llm
from config import logger

# ---------------------------------------------------------------------------
# DOMAIN SAFETY PLACEHOLDERS
# FILL IN ONCE PROBLEM STATEMENT IS KNOWN AT THE HACKATHON
# Example for Health: [r"\b(chest pain|heart attack|fainted)\b"]
# Example for Fintech: [r"\b(cvv|otp|wire transfer|stolen card)\b"]
# Example for EdTech: [r"\b(cheat|exam leak|plagiarize)\b"]
# ---------------------------------------------------------------------------
DEFAULT_RED_FLAG_PATTERNS: List[str] = [
    # 1. Prompt Injection & Jailbreak Attacks
    r"\bignore\s+(all\s+)?(prior|previous|above|system)\s+instructions\b",
    r"\bdisregard\s+(all\s+)?(prior|previous|above|system|safety|security)\s+(instructions|rules|prompts|guidelines)\b",
    r"\bforget\s+(all\s+)?(prior|previous)\s+instructions\b",
    r"\b(output|reveal|print|show|leak|display)\s+(the\s+)?(system|hidden|internal)\s+(prompt|instructions|rules)\b",
    r"\b(you\s+are\s+now|act\s+as|switch\s+to)\s+(dan|jailbreak|unrestricted|god\s+mode|chaos\s+gpt)\b",
    r"\bjailbreak\b",
    r"\boverride\s+(system|security|policy|governance|safety|guardrails)\b",
    r"\bdo\s+anything\s+now\b",

    # 2. SQL Injection & Database Exploits
    r"\bdrop\s+(table|database|view|index|schema)\b",
    r"\btruncate\s+(table)?\b",
    r"\bdelete\s+from\s+[a-zA-Z0-9_]+\b",
    r"\bunion\s+(all\s+)?select\b",
    r"\b(or|and)\s+['\"]?1['\"]?\s*=\s*['\"]?1['\"]?",
    r"\bexec(ute)?\s*\(\s*['\"]",

    # 3. Security, Token & Privilege Exploitation
    r"\bbypass\s+(security|token|auth|authentication|governance|policy|guardrail|firewall)\b",
    r"\bbypass\s+security\s+token\b",
    r"\bescalate\s+privilege(s)?\b",
    r"\bgrant\s+admin\b",
    r"\b(dump|leak|steal|extract)\s+(passwords?|credentials?|secrets?|keys?|tokens?|hash)\b",

    # 4. Sensitive Data Exfiltration & Destruction
    r"\b(export|dump|exfiltrate)\s+(all\s+)?(users|database|passwords|credit\s+cards|ssn|customer\s+pii|pii)\b",
    r"\b(export|leak|dump)\s+(customer\s+)?pii\b",
    r"\bapi[_-]?key\s*[:=]\s*['\"][a-zA-Z0-9_-]{16,}['\"]",
    r"\b(delete|destroy|wipe)\s+(all\s+)?(files|database|records|tables)\b",
    r"\brm\s+-(rf|fr|r)\b",
    r"\bchmod\s+777\b",
    r"\b/etc/passwd\b",
    r"\b\.env\b",
]

DEFAULT_CLASSIFICATION_PROMPT = """You are a real-time safety and triage classifier.
Analyze the user's input for severe policy violations, emergencies, or high-risk requests.
# FILL IN DOMAIN SPECIFIC SAFETY RULES ONCE PROBLEM STATEMENT IS KNOWN

Respond ONLY with a JSON object:
{
  "is_flagged": true or false,
  "reason": "short explanation under 10 words"
}"""

def scan_for_flags(text: str, patterns: List[str] = None) -> Tuple[bool, str]:
    """Tier 0 Deterministic Safety Check (<5ms regex scan)."""
    active_patterns = patterns if patterns is not None else DEFAULT_RED_FLAG_PATTERNS
    if not text or not active_patterns:
        return False, ""

    normalized = text.lower().strip()
    for pattern in active_patterns:
        match = re.search(pattern, normalized, re.IGNORECASE)
        if match:
            trigger = match.group(0)
            logger.warning(f"Tier 0 Safety Flag triggered: '{trigger}'")
            return True, trigger

    return False, ""

def semantic_check(
    text: str,
    classification_prompt: str = DEFAULT_CLASSIFICATION_PROMPT
) -> Tuple[bool, str]:
    """Tier 1 Semantic Safety Check via LLM JSON mode."""
    if not text or len(text.strip()) < 3:
        return False, ""

    res = call_llm(
        system_prompt=classification_prompt,
        user_prompt=f"User input: {text}",
        json_mode=True,
        temperature=0.0,
        max_tokens=150
    )

    if not res.success:
        if res.error == "SERVICE_UNAVAILABLE":
            logger.critical("Tier 1 safety check unreachable: SERVICE_UNAVAILABLE")
            return False, "SERVICE_UNAVAILABLE"
        return False, f"SAFETY_CHECK_ERROR: {res.error}"

    parsed = res.parsed_json or {}
    is_flagged = bool(parsed.get("is_flagged", False))
    reason = str(parsed.get("reason", ""))
    if is_flagged:
        logger.warning(f"Tier 1 Semantic Safety Flag triggered: {reason}")
    return is_flagged, reason
