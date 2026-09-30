import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select, and_

from models.governance import (
    ApprovalRequest, GovernedAction, Agent, User, PolicyVersion,
    SimulatedOutbox
)
from core.audit import record_audit_event
from core.governor import evaluate_tier_0

def list_pending_approvals(db: Session, organization_id: str) -> List[Dict[str, Any]]:
    """
    Returns pending approval requests for an organization with rich contextual telemetry.
    """
    requests = db.query(ApprovalRequest).filter(
        ApprovalRequest.organization_id == organization_id,
        ApprovalRequest.status == "PENDING"
    ).all()

    results = []
    for req in requests:
        action = db.query(GovernedAction).filter(GovernedAction.id == req.action_id).first()
        if not action:
            continue
        agent = db.query(Agent).filter(Agent.id == action.agent_id).first()

        tier_details = json.loads(action.tier_details_json) if action.tier_details_json else {}
        args = json.loads(action.arguments_json) if action.arguments_json else {}
        matched_rule = tier_details.get("tier_0", {}).get("matched_rule", {})
        risk_factors = tier_details.get("tier_1", {}).get("risk_factors", [])

        results.append({
            "id": req.id,
            "action_id": action.id,
            "reviewer_group": req.reviewer_group,
            "status": req.status,
            "created_at": action.created_at.isoformat() if action.created_at else None,
            "agent": {
                "id": agent.id if agent else "unknown",
                "name": agent.name if agent else "Unknown Agent",
                "business_role": agent.business_role if agent else "unknown",
                "assigned_task": agent.assigned_task if agent else "unknown"
            },
            "action": {
                "tool": action.tool,
                "resource": action.resource,
                "destination": args.get("destination", "external"),
                "arguments": args
            },
            "governance": {
                "matched_rule_id": matched_rule.get("rule_id"),
                "source_passage": matched_rule.get("source_passage"),
                "section": matched_rule.get("section"),
                "risk_factors": risk_factors,
                "tier_details": tier_details
            }
        })

    return results

def resolve_approval_request(
    db: Session,
    approval_id: str,
    reviewer: User,
    approve: bool,
    review_notes: Optional[str] = None
) -> Dict[str, Any]:
    """
    Safely resolves a human approval request with re-validation against active policy version.
    Guarantees: If policy changed to block that action in the interim, the approval is refused!
    """
    approval_req = db.query(ApprovalRequest).filter(ApprovalRequest.id == approval_id).first()
    if not approval_req:
        return {"success": False, "error": "Approval request not found."}

    if approval_req.status != "PENDING":
        return {"success": False, "error": f"Request has already been resolved as {approval_req.status}."}

    action = db.query(GovernedAction).filter(GovernedAction.id == approval_req.action_id).first()
    if not action:
        return {"success": False, "error": "Associated governed action not found."}

    agent = db.query(Agent).filter(Agent.id == action.agent_id).first()
    args = json.loads(action.arguments_json) if action.arguments_json else {}
    destination = args.get("destination", "external")
    now = datetime.now(timezone.utc)

    if not approve:
        approval_req.status = "REJECTED"
        approval_req.reviewer_id = reviewer.id
        approval_req.review_notes = review_notes or "Rejected by supervisor."
        approval_req.reviewed_at = now

        action.status = "REJECTED"
        action.execution_result_json = json.dumps({"rejected_by": reviewer.email, "notes": review_notes})

        record_audit_event(
            db=db,
            organization_id=approval_req.organization_id,
            event_type="ACTION_REJECTED",
            actor_type="user",
            actor_id=reviewer.id,
            details={
                "approval_id": approval_req.id,
                "action_id": action.id,
                "reviewer": reviewer.email,
                "notes": review_notes
            },
            action_id=action.id
        )
        db.commit()
        return {
            "success": True,
            "status": "REJECTED",
            "message": "Action rejected by human reviewer."
        }

    # Safe Resumption Check: Re-validate against currently active published policy!
    active_policy = db.query(PolicyVersion).filter(
        PolicyVersion.organization_id == approval_req.organization_id,
        PolicyVersion.is_active == True
    ).first()

    reval_t0 = evaluate_tier_0(
        agent=agent,
        tool=action.tool,
        resource=action.resource,
        destination=destination,
        active_policy=active_policy
    )

    if reval_t0["decision"] == "BLOCK":
        # Policy changed while pending review!
        approval_req.status = "REJECTED"
        approval_req.reviewer_id = reviewer.id
        approval_req.review_notes = f"Approval invalidated: Active policy updated to version {active_policy.version_num if active_policy else 'none'} which strictly blocks this action."
        approval_req.reviewed_at = now

        action.status = "BLOCKED"
        action.decision = "BLOCK"
        action.execution_result_json = json.dumps({"blocked_by_updated_policy": reval_t0["reason"]})

        record_audit_event(
            db=db,
            organization_id=approval_req.organization_id,
            event_type="APPROVAL_OVERRIDDEN_BY_NEW_POLICY",
            actor_type="system",
            actor_id="halo_governor",
            details={
                "approval_id": approval_req.id,
                "action_id": action.id,
                "override_reason": reval_t0["reason"]
            },
            action_id=action.id
        )
        db.commit()
        return {
            "success": False,
            "status": "BLOCKED",
            "error": f"Policy Changed: Current active policy version strictly blocks this action ({reval_t0['reason']}). Approval refused."
        }

    # Approved & Permitted: Execute simulated outbox delivery
    approval_req.status = "APPROVED"
    approval_req.reviewer_id = reviewer.id
    approval_req.review_notes = review_notes or "Approved by supervisor."
    approval_req.reviewed_at = now

    action.status = "EXECUTED"

    recipient = args.get("recipient", "external-partner@acme-external.org")
    report_id = args.get("report_id", "unspecified_report")
    payload_summary = f"External distribution of '{report_id}' authorized by {reviewer.full_name} ({reviewer.email}) for recipient {recipient}."

    outbox = SimulatedOutbox(
        organization_id=approval_req.organization_id,
        action_id=action.id,
        recipient=recipient,
        destination_type="external",
        payload_summary=payload_summary,
        delivered_at=now
    )
    db.add(outbox)
    db.flush()

    action.execution_result_json = json.dumps({
        "outbox_id": outbox.id,
        "recipient": recipient,
        "payload_summary": payload_summary,
        "delivered_at": now.isoformat()
    })

    record_audit_event(
        db=db,
        organization_id=approval_req.organization_id,
        event_type="ACTION_APPROVED_AND_DELIVERED",
        actor_type="user",
        actor_id=reviewer.id,
        details={
            "approval_id": approval_req.id,
            "action_id": action.id,
            "outbox_id": outbox.id,
            "recipient": recipient,
            "reviewer": reviewer.email
        },
        action_id=action.id
    )

    db.commit()
    return {
        "success": True,
        "status": "APPROVED",
        "outbox_id": outbox.id,
        "recipient": recipient,
        "message": f"Action approved and safely dispatched to simulated outbox ({recipient})."
    }
