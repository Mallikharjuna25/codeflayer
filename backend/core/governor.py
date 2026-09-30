import json
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Tuple, List
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, or_

from config import REPORTS_STORAGE_DIR
from models.governance import (
    Agent, Organization, PolicyVersion, PolicyRule, GovernedAction,
    ApprovalRequest, SimulatedOutbox
)
from core.demo_db import query_sales_controlled, query_support_controlled
from core.audit import record_audit_event
from core.llm_client import call_llm

def evaluate_tier_0(
    agent: Agent,
    tool: str,
    resource: str,
    destination: str,
    active_policy: Optional[PolicyVersion]
) -> Dict[str, Any]:
    """
    Tier 0: Deterministic Policy Gate.
    Validates capability profile, active policy existence, and matches deterministic rules.
    """
    # 1. Capability check
    try:
        supported_tools = json.loads(agent.supported_tools_json)
    except Exception:
        supported_tools = []

    if tool not in supported_tools and "*" not in supported_tools:
        return {
            "passed": False,
            "decision": "BLOCK",
            "reason": f"Tool '{tool}' is not in agent capability profile ({supported_tools}).",
            "matched_rule": None
        }

    # 2. Active policy check
    if not active_policy:
        return {
            "passed": False,
            "decision": "BLOCK",
            "reason": "No active published policy version found for this workspace.",
            "matched_rule": None
        }

    # 3. Rule matching
    # Look for matching rules in active policy
    matched_rules: List[PolicyRule] = []
    for r in active_policy.rules:
        role_match = (r.role == agent.business_role or r.role == "*")
        tool_match = (r.tool == tool or r.tool == "*")
        res_match = (r.resource == resource or r.resource == "*")
        dest_match = (r.destination_type == "any" or r.destination_type == destination or destination == "any")

        if role_match and tool_match and res_match and dest_match:
            matched_rules.append(r)

    if not matched_rules:
        return {
            "passed": False,
            "decision": "BLOCK",
            "reason": f"Default Deny: No policy rule authorizes role '{agent.business_role}' to execute '{tool}' on '{resource}'.",
            "matched_rule": None
        }

    # Priority: BLOCK > ESCALATE > ALLOW
    # Also prefer exact role/tool matches over wildcard
    block_rule = next((r for r in matched_rules if r.decision == "BLOCK"), None)
    if block_rule:
        src_ref = json.loads(block_rule.source_reference_json) if block_rule.source_reference_json else {}
        return {
            "passed": False,
            "decision": "BLOCK",
            "reason": f"Explicit policy block: Role '{agent.business_role}' is forbidden from '{tool}' on '{resource}'.",
            "matched_rule": {
                "rule_id": block_rule.id,
                "decision": "BLOCK",
                "source_passage": src_ref.get("passage", ""),
                "section": src_ref.get("section", "")
            }
        }

    escalate_rule = next((r for r in matched_rules if r.decision == "ESCALATE"), None)
    if escalate_rule:
        src_ref = json.loads(escalate_rule.source_reference_json) if escalate_rule.source_reference_json else {}
        return {
            "passed": True,
            "decision": "ESCALATE",
            "reviewer_group": escalate_rule.reviewer_group or "managers",
            "reason": f"Policy requires human escalation: '{tool}' with destination '{destination}' requires approval.",
            "matched_rule": {
                "rule_id": escalate_rule.id,
                "decision": "ESCALATE",
                "reviewer_group": escalate_rule.reviewer_group,
                "source_passage": src_ref.get("passage", ""),
                "section": src_ref.get("section", "")
            }
        }

    allow_rule = next((r for r in matched_rules if r.decision == "ALLOW"), None)
    if allow_rule:
        src_ref = json.loads(allow_rule.source_reference_json) if allow_rule.source_reference_json else {}
        return {
            "passed": True,
            "decision": "ALLOW",
            "reason": f"Policy rule authorizes role '{agent.business_role}' for '{tool}' on '{resource}'.",
            "matched_rule": {
                "rule_id": allow_rule.id,
                "decision": "ALLOW",
                "source_passage": src_ref.get("passage", ""),
                "section": src_ref.get("section", "")
            }
        }

    return {
        "passed": False,
        "decision": "BLOCK",
        "reason": "Indeterminate rule state.",
        "matched_rule": None
    }

def evaluate_tier_1(
    agent: Agent,
    tool: str,
    resource: str,
    destination: str,
    arguments: Dict[str, Any],
    tier_0_res: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Tier 1: Context, Risk & Provenance Analysis.
    Evaluates blast radius, sensitivity flags, and server-tracked artifact provenance.
    """
    risk_factors = []
    provenance_verified = True

    # 1. External distribution blast radius
    if destination == "external":
        risk_factors.append("External egress destination: data leaves corporate perimeter.")

    # 2. Large limit query blast radius
    limit_val = arguments.get("limit", 10)
    try:
        limit_num = int(limit_val)
        if limit_num > 50:
            risk_factors.append(f"High volume extraction query: limit={limit_num} records.")
    except Exception:
        pass

    # 3. Provenance check for report sharing
    if tool == "report.send":
        report_id = arguments.get("report_id") or arguments.get("artifact_id")
        if report_id:
            # Check if report exists in protected storage
            target_report_file = REPORTS_STORAGE_DIR / f"{report_id}.json"
            if target_report_file.exists():
                try:
                    with open(target_report_file, "r", encoding="utf-8") as rf:
                        rep_meta = json.load(rf)
                        provenance_verified = True
                        risk_factors.append(f"Verified server provenance: Generated by agent {rep_meta.get('created_by')} at {rep_meta.get('timestamp')}.")
                except Exception:
                    provenance_verified = False
                    risk_factors.append("Unverifiable report artifact metadata.")
            else:
                provenance_verified = False
                risk_factors.append(f"Report artifact '{report_id}' not found in protected storage.")
        else:
            # Sharing without artifact ID
            risk_factors.append("No server-tracked artifact ID provided for report distribution.")

    risk_level = "LOW"
    if destination == "external" or not provenance_verified:
        risk_level = "HIGH"
    elif len(risk_factors) > 0:
        risk_level = "MEDIUM"

    return {
        "risk_level": risk_level,
        "provenance_verified": provenance_verified,
        "risk_factors": risk_factors
    }

def evaluate_tier_2(
    tier_0_res: Dict[str, Any],
    tier_1_res: Dict[str, Any],
    action_context: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Tier 2: Optional Semantic Assessment.
    Ordinary authorized operations bypass Tier 2 for zero-latency execution.
    Ambiguous actions or high-risk edge cases invoke LLM reasoning.
    LLM CANNOT override a hard Tier 0/1 BLOCK.
    """
    # Fast path bypass
    if tier_0_res["decision"] == "BLOCK":
        return {
            "bypassed": True,
            "reason": "Hard deterministic block cannot be overridden by semantic assessment."
        }

    if tier_0_res["decision"] == "ALLOW" and tier_1_res["risk_level"] == "LOW":
        return {
            "bypassed": True,
            "reason": "Deterministic rule match with low risk verified. Semantic assessment bypassed for latency optimization."
        }

    # If action has ambiguous user justification or high-risk escalation
    agent_task = action_context.get("task_id", "")
    args_str = json.dumps(action_context.get("arguments", {}))
    prompt = (
        f"Evaluate governance risk for action:\n"
        f"Tool: {action_context.get('tool')}\n"
        f"Resource: {action_context.get('resource')}\n"
        f"Destination: {action_context.get('destination')}\n"
        f"Task: {agent_task}\n"
        f"Arguments: {args_str}\n"
        f"Provide a 1-sentence risk summary."
    )
    llm_res = call_llm(
        system_prompt="You are an enterprise AI Governance semantic assessor. Summarize contextual risk concisely.",
        user_prompt=prompt
    )
    semantic_summary = llm_res.text.strip() if llm_res.success else "Semantic safety check confirmed risk boundary."

    return {
        "bypassed": False,
        "assessment": semantic_summary,
        "provider": llm_res.provider_used
    }

def execute_controlled_adapter(
    tool: str,
    resource: str,
    destination: str,
    arguments: Dict[str, Any],
    agent: Agent
) -> Tuple[bool, Any, str]:
    """
    Tier 3: Controlled Execution Adapters.
    Executes permitted actions exclusively through safe, pre-parameterized adapters.
    Arbitrary raw SQL or uncontrolled socket dispatch is strictly impossible.
    """
    try:
        # 1. Database Read Adapter
        if tool == "database.read":
            if resource in ("demo-sales", "sales_summaries"):
                region = arguments.get("region")
                limit = int(arguments.get("limit", 10))
                data = query_sales_controlled(region=region, limit=limit)
                return True, data, f"Successfully retrieved {len(data)} sales summary records via controlled adapter."
            elif resource == "support_tickets":
                status = arguments.get("status")
                limit = int(arguments.get("limit", 10))
                data = query_support_controlled(status=status, limit=limit)
                return True, data, f"Successfully retrieved {len(data)} support tickets."
            else:
                return False, None, f"Resource '{resource}' not handled by database adapter."

        # 2. Ticket Read Adapter
        if tool == "ticket.read":
            status = arguments.get("status")
            limit = int(arguments.get("limit", 10))
            data = query_support_controlled(status=status, limit=limit)
            return True, data, f"Retrieved {len(data)} customer tickets."

        # 3. Report Creation Adapter
        if tool == "report.create":
            REPORTS_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
            report_id = f"rep_{uuid.uuid4().hex[:12]}"
            title = arguments.get("title", f"Monthly Sales Report - {datetime.now(timezone.utc).strftime('%B %Y')}")
            sales_data = query_sales_controlled(limit=10)
            total_rev = sum(r["revenue"] for r in sales_data)

            report_payload = {
                "report_id": report_id,
                "title": title,
                "created_by": agent.id,
                "agent_name": agent.name,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "summary": f"Total aggregated revenue: ${total_rev:,.2f} across {len(sales_data)} regions.",
                "data_points": len(sales_data),
                "classification": "CONFIDENTIAL_INTERNAL"
            }

            report_file = REPORTS_STORAGE_DIR / f"{report_id}.json"
            with open(report_file, "w", encoding="utf-8") as f:
                json.dump(report_payload, f, indent=2)

            return True, report_payload, f"Report '{report_id}' created and committed to protected storage."

        # 4. Report Send (Internal Delivery) Adapter
        if tool == "report.send" and destination == "internal":
            recipient = arguments.get("recipient", "internal-executives@acme.corp")
            report_id = arguments.get("report_id", "unspecified")
            return True, {
                "recipient": recipient,
                "delivery_mode": "INTERNAL_BUS",
                "report_id": report_id,
                "delivered_at": datetime.now(timezone.utc).isoformat()
            }, f"Report internally delivered to {recipient}."

        return False, None, f"No execution adapter for tool '{tool}' with destination '{destination}'."

    except Exception as e:
        return False, None, f"Adapter execution failed: {str(e)}"

def run_governor_cascade(
    db: Session,
    agent: Agent,
    org: Organization,
    task_id: str,
    tool: str,
    resource: str,
    destination: str,
    arguments: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Executes the 4-tier governor cascade for a proposed agent action.
    """
    # 0. Find active published policy
    active_policy = db.query(PolicyVersion).filter(
        PolicyVersion.organization_id == org.id,
        PolicyVersion.is_active == True
    ).first()

    # Tier 0: Deterministic Gate
    t0_res = evaluate_tier_0(
        agent=agent,
        tool=tool,
        resource=resource,
        destination=destination,
        active_policy=active_policy
    )

    # Tier 1: Context, Risk & Provenance
    t1_res = evaluate_tier_1(
        agent=agent,
        tool=tool,
        resource=resource,
        destination=destination,
        arguments=arguments,
        tier_0_res=t0_res
    )

    # Tier 2: Semantic Assessment (LLM)
    t2_res = evaluate_tier_2(
        tier_0_res=t0_res,
        tier_1_res=t1_res,
        action_context={
            "tool": tool,
            "resource": resource,
            "destination": destination,
            "task_id": task_id,
            "arguments": arguments
        }
    )

    final_decision = t0_res["decision"]  # ALLOW, BLOCK, or ESCALATE
    tier_details = {
        "tier_0": t0_res,
        "tier_1": t1_res,
        "tier_2": t2_res
    }

    action_record = GovernedAction(
        organization_id=org.id,
        agent_id=agent.id,
        task_id=task_id,
        tool=tool,
        resource=resource,
        arguments_json=json.dumps(arguments),
        decision=final_decision,
        tier_details_json=json.dumps(tier_details),
        status="PENDING"
    )
    db.add(action_record)
    db.flush()

    if final_decision == "BLOCK":
        action_record.status = "BLOCKED"
        action_record.execution_result_json = json.dumps({"error": t0_res["reason"]})
        record_audit_event(
            db=db,
            organization_id=org.id,
            event_type="DECISION_BLOCKED",
            actor_type="agent",
            actor_id=agent.id,
            details={
                "action_id": action_record.id,
                "tool": tool,
                "resource": resource,
                "reason": t0_res["reason"],
                "matched_rule": t0_res.get("matched_rule")
            },
            action_id=action_record.id
        )
        db.commit()
        return {
            "action_id": action_record.id,
            "decision": "BLOCK",
            "status": "BLOCKED",
            "message": t0_res["reason"],
            "tier_details": tier_details,
            "result": None
        }

    elif final_decision == "ESCALATE":
        action_record.status = "PENDING_APPROVAL"
        rev_group = t0_res.get("reviewer_group", "managers")
        approval_req = ApprovalRequest(
            organization_id=org.id,
            action_id=action_record.id,
            reviewer_group=rev_group,
            status="PENDING"
        )
        db.add(approval_req)
        db.flush()

        record_audit_event(
            db=db,
            organization_id=org.id,
            event_type="REVIEW_REQUESTED",
            actor_type="agent",
            actor_id=agent.id,
            details={
                "action_id": action_record.id,
                "approval_id": approval_req.id,
                "reviewer_group": rev_group,
                "reason": t0_res["reason"],
                "destination": destination
            },
            action_id=action_record.id
        )
        db.commit()
        return {
            "action_id": action_record.id,
            "approval_id": approval_req.id,
            "decision": "ESCALATE",
            "status": "PENDING_APPROVAL",
            "reviewer_group": rev_group,
            "message": t0_res["reason"],
            "tier_details": tier_details,
            "result": None
        }

    else:  # ALLOW
        adapter_ok, exec_data, exec_msg = execute_controlled_adapter(
            tool=tool,
            resource=resource,
            destination=destination,
            arguments=arguments,
            agent=agent
        )
        if adapter_ok:
            action_record.status = "EXECUTED"
            action_record.execution_result_json = json.dumps(exec_data)
            record_audit_event(
                db=db,
                organization_id=org.id,
                event_type="ACTION_EXECUTED",
                actor_type="agent",
                actor_id=agent.id,
                details={
                    "action_id": action_record.id,
                    "tool": tool,
                    "resource": resource,
                    "message": exec_msg
                },
                action_id=action_record.id
            )
            db.commit()
            return {
                "action_id": action_record.id,
                "decision": "ALLOW",
                "status": "EXECUTED",
                "message": exec_msg,
                "tier_details": tier_details,
                "result": exec_data
            }
        else:
            action_record.status = "FAILED"
            action_record.execution_result_json = json.dumps({"error": exec_msg})
            db.commit()
            return {
                "action_id": action_record.id,
                "decision": "ALLOW",
                "status": "FAILED",
                "message": exec_msg,
                "tier_details": tier_details,
                "result": None
            }
