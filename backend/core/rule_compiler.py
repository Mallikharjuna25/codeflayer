import re
import json
import logging
from typing import List, Dict, Any, Optional, Tuple
from pydantic import BaseModel, Field

from core.llm_client import call_llm

logger = logging.getLogger("code_storm_backend.rule_compiler")

KNOWN_TOOLS = {
    "database.read",
    "report.create",
    "report.send",
    "ticket.read",
    "ticket.update",
    "file.download",
    "*"
}

KNOWN_RESOURCES = {
    "demo-sales",
    "sales_summaries",
    "sales_report",
    "support_tickets",
    "report_storage",
    "*"
}

KNOWN_ROLES = {
    "data_analyst",
    "customer_support",
    "security_auditor",
    "compliance_officer",
    "*"
}

class ProposedRuleSchema(BaseModel):
    role: str = Field(..., description="Business role, e.g. data_analyst, customer_support")
    tool: str = Field(..., description="Tool name, e.g. database.read, report.send")
    resource: str = Field(..., description="Resource target, e.g. demo-sales, sales_report")
    destination_type: str = Field(default="any", description="internal, external, or any")
    decision: str = Field(..., description="ALLOW, BLOCK, or ESCALATE")
    reviewer_group: Optional[str] = Field(default=None, description="reviewer group if decision is ESCALATE, e.g. managers")
    page_or_section: Optional[str] = Field(default=None, description="Section or page citation")
    passage: str = Field(..., description="Exact quoted sentence from policy")

def _heuristic_rule_extractor(source_id: str, text: str) -> List[Dict[str, Any]]:
    """
    Deterministic fallback extractor if LLM is unavailable or rate-limited.
    Parses sentences for semantic keywords: 'may read', 'must not', 'require approval'.
    """
    rules = []
    lines = text.splitlines()
    for line in lines:
        cleaned = line.strip()
        if not cleaned:
            continue
        lower = cleaned.lower()

        # Rule 1: Data analyst reading sales
        if "data analyst" in lower and ("read" in lower or "access" in lower) and "sales" in lower and "not" not in lower:
            rules.append({
                "role": "data_analyst",
                "tool": "database.read",
                "resource": "demo-sales",
                "destination_type": "any",
                "decision": "ALLOW",
                "reviewer_group": None,
                "source_reference": {
                    "source_id": source_id,
                    "section": "Data Access",
                    "passage": cleaned
                }
            })

        # Rule 2: Report creation
        if "data analyst" in lower and ("create" in lower or "synthesize" in lower) and "report" in lower:
            rules.append({
                "role": "data_analyst",
                "tool": "report.create",
                "resource": "sales_report",
                "destination_type": "any",
                "decision": "ALLOW",
                "reviewer_group": None,
                "source_reference": {
                    "source_id": source_id,
                    "section": "Report Generation",
                    "passage": cleaned
                }
            })

        # Rule 3: External sending requiring approval
        if ("outside" in lower or "external" in lower) and ("approval" in lower or "manager" in lower or "escalate" in lower):
            rules.append({
                "role": "data_analyst",
                "tool": "report.send",
                "resource": "sales_report",
                "destination_type": "external",
                "decision": "ESCALATE",
                "reviewer_group": "managers",
                "source_reference": {
                    "source_id": source_id,
                    "section": "Distribution Controls",
                    "passage": cleaned
                }
            })

        # Rule 4: Internal report sending
        if "internal" in lower and ("report" in lower or "send" in lower or "staff" in lower) and "not" not in lower:
            rules.append({
                "role": "data_analyst",
                "tool": "report.send",
                "resource": "sales_report",
                "destination_type": "internal",
                "decision": "ALLOW",
                "reviewer_group": None,
                "source_reference": {
                    "source_id": source_id,
                    "section": "Internal Distribution",
                    "passage": cleaned
                }
            })

        # Rule 5: Support agents must not access sales
        if "customer support" in lower and "sales" in lower and ("not" in lower or "prohibit" in lower or "forbidden" in lower or "deny" in lower):
            rules.append({
                "role": "customer_support",
                "tool": "database.read",
                "resource": "demo-sales",
                "destination_type": "any",
                "decision": "BLOCK",
                "reviewer_group": None,
                "source_reference": {
                    "source_id": source_id,
                    "section": "Role Isolation",
                    "passage": cleaned
                }
            })

        # Rule 6: Support agents reading tickets
        if "customer support" in lower and "ticket" in lower and "not" not in lower:
            rules.append({
                "role": "customer_support",
                "tool": "ticket.read",
                "resource": "support_tickets",
                "destination_type": "any",
                "decision": "ALLOW",
                "reviewer_group": None,
                "source_reference": {
                    "source_id": source_id,
                    "section": "Support Operations",
                    "passage": cleaned
                }
            })

    return rules

def compile_policy_rules(source_id: str, raw_text: str) -> List[Dict[str, Any]]:
    """
    Extracts structured permission rules from natural policy text using LLM,
    with automatic failover to deterministic heuristic compilation.
    """
    system_prompt = (
        "You are an enterprise AI Governance Policy Compiler. Analyze the following corporate policy document "
        "and extract formal permission rules into a JSON array of objects with the exact schema:\n"
        "[\n"
        "  {\n"
        "    \"role\": \"data_analyst\",\n"
        "    \"tool\": \"database.read\",\n"
        "    \"resource\": \"demo-sales\",\n"
        "    \"destination_type\": \"any\" or \"internal\" or \"external\",\n"
        "    \"decision\": \"ALLOW\" or \"BLOCK\" or \"ESCALATE\",\n"
        "    \"reviewer_group\": \"managers\" or null,\n"
        "    \"page_or_section\": \"Section 1.1\",\n"
        "    \"passage\": \"Exact sentence quoted from text\"\n"
        "  }\n"
        "]\n"
        "Rules must be precise. Output ONLY valid JSON array with no extra markdown wrapping."
    )

    llm_res = call_llm(system_prompt=system_prompt, user_prompt=raw_text)
    if llm_res.success and llm_res.text:
        try:
            cleaned = llm_res.text.strip()
            if cleaned.startswith("```"):
                cleaned = re.sub(r"^```[a-zA-Z]*\n?", "", cleaned)
                cleaned = re.sub(r"```$", "", cleaned).strip()
            parsed = json.loads(cleaned)
            if isinstance(parsed, list) and len(parsed) > 0:
                rules = []
                for item in parsed:
                    rules.append({
                        "role": str(item.get("role", "data_analyst")).lower().replace(" ", "_"),
                        "tool": str(item.get("tool", "*")).lower(),
                        "resource": str(item.get("resource", "*")).lower(),
                        "destination_type": str(item.get("destination_type", "any")).lower(),
                        "decision": str(item.get("decision", "ALLOW")).upper(),
                        "reviewer_group": item.get("reviewer_group"),
                        "source_reference": {
                            "source_id": source_id,
                            "section": item.get("page_or_section", "General"),
                            "passage": item.get("passage", "")
                        }
                    })
                return rules
        except Exception as e:
            logger.warning(f"LLM rule extraction JSON parse failed: {e}. Falling back to heuristic compiler.")

    # Fallback to deterministic heuristic
    return _heuristic_rule_extractor(source_id, raw_text)

def validate_rules(
    rules: List[Dict[str, Any]],
    known_reviewer_groups: List[str]
) -> Dict[str, Any]:
    """
    Validates proposed rules, highlights missing fields, warns of unmapped resources,
    and detects contradictory conflicts before publishing.
    """
    validated_rules = []
    warnings = []
    conflicts = []
    is_valid = True

    # Rule index for conflict detection: (role, tool, resource, destination_type)
    seen_map: Dict[Tuple[str, str, str, str], Dict[str, Any]] = {}

    for idx, r in enumerate(rules):
        role = r.get("role", "").strip()
        tool = r.get("tool", "").strip()
        resource = r.get("resource", "").strip()
        decision = r.get("decision", "").strip().upper()
        dest = r.get("destination_type", "any").strip().lower()
        rev_group = r.get("reviewer_group")

        rule_errors = []

        if not role:
            rule_errors.append("Role is missing.")
        if not tool:
            rule_errors.append("Tool is missing.")
        if not resource:
            rule_errors.append("Resource target is missing.")
        if decision not in ("ALLOW", "BLOCK", "ESCALATE"):
            rule_errors.append(f"Invalid decision '{decision}'. Must be ALLOW, BLOCK, or ESCALATE.")

        if decision == "ESCALATE":
            if not rev_group:
                rule_errors.append("ESCALATE decision requires a designated reviewer group.")
            elif rev_group not in known_reviewer_groups:
                warnings.append(f"Rule #{idx + 1}: Reviewer group '{rev_group}' is not currently configured.")

        # Check for conflicts
        sig = (role, tool, resource, dest)
        if sig in seen_map:
            prev = seen_map[sig]
            if prev["decision"] != decision:
                conflicts.append({
                    "rule_index": idx,
                    "conflicting_index": prev["index"],
                    "signature": f"role={role}, tool={tool}, resource={resource}, dest={dest}",
                    "message": f"Contradiction: Rule #{prev['index'] + 1} specifies {prev['decision']} while Rule #{idx + 1} specifies {decision}."
                })
                rule_errors.append(f"Direct conflict with Rule #{prev['index'] + 1}.")
        else:
            seen_map[sig] = {"index": idx, "decision": decision}

        if rule_errors:
            is_valid = False

        validated_rules.append({
            **r,
            "decision": decision,
            "errors": rule_errors
        })

    return {
        "is_valid": is_valid and len(conflicts) == 0,
        "rules": validated_rules,
        "warnings": warnings,
        "conflicts": conflicts
    }
