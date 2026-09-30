import os
import json
import hashlib
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Header
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import desc

from config import POLICIES_STORAGE_DIR
from core.database import get_db
from models.governance import (
    Organization, User, Membership, ReviewerGroup, Connector, Agent,
    AgentKey, PolicySource, PolicyVersion, PolicyRule, GovernedAction,
    ApprovalRequest, SimulatedOutbox, AuditEvent
)
from core.auth import (
    verify_password, create_access_token, get_current_user,
    require_membership, authenticate_agent, generate_agent_key, hash_agent_key
)
from core.policy_parser import parse_pdf, parse_markdown_or_text, fetch_and_parse_url
from core.vector_store import index_policy_chunks, search_policy_passages
from core.rule_compiler import compile_policy_rules, validate_rules
from core.governor import run_governor_cascade
from core.approval_engine import list_pending_approvals, resolve_approval_request
from core.audit import record_audit_event, verify_audit_chain

router = APIRouter(prefix="/api", tags=["Governance"])

# ---------------------------------------------------------------------------
# Pydantic Request & Response Schemas
# ---------------------------------------------------------------------------
class LoginRequest(BaseModel):
    email: str
    password: str

class UrlUploadRequest(BaseModel):
    title: str
    url: str

class RuleInput(BaseModel):
    role: str
    tool: str
    resource: str
    destination_type: str = "any"
    decision: str  # ALLOW, BLOCK, ESCALATE
    reviewer_group: Optional[str] = None
    source_reference: Optional[Dict[str, Any]] = None
    conditions: Optional[Dict[str, Any]] = None

class PublishPolicyRequest(BaseModel):
    source_id: Optional[str] = None
    change_summary: str = "Updated company governance rules."
    rules: List[RuleInput]

class RegisterAgentRequest(BaseModel):
    name: str
    business_role: str
    assigned_task: str
    supported_tools: List[str]

class ProposeActionRequest(BaseModel):
    task_id: str
    tool: str
    resource: str
    destination: str = "internal"  # internal or external
    arguments: Dict[str, Any] = Field(default_factory=dict)

class ResolveApprovalRequest(BaseModel):
    approve: bool
    notes: Optional[str] = None

# ---------------------------------------------------------------------------
# 1. Authentication & Workspaces
# ---------------------------------------------------------------------------
@router.post("/auth/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """Authenticates human user and returns access token + organizations."""
    user = db.query(User).filter(User.email == req.email.strip().lower()).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Collect workspaces and user role in each
    memberships = db.query(Membership).filter(Membership.user_id == user.id).all()
    workspaces = []
    for m in memberships:
        org = db.query(Organization).filter(Organization.id == m.organization_id).first()
        if org:
            workspaces.append({
                "id": org.id,
                "name": org.name,
                "slug": org.slug,
                "role": m.role
            })

    token = create_access_token(data={"sub": user.id, "email": user.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name
        },
        "workspaces": workspaces
    }

@router.get("/auth/demo-accounts")
def get_demo_accounts(db: Session = Depends(get_db)):
    """Returns demo organizations and their members for rapid UI switching and testing."""
    known_passwords = {
        "admin@acme.com": "admin123",
        "security@acme.com": "sec123",
        "analyst@acme.com": "analyst123",
        "admin@beta.com": "beta123"
    }

    role_meta = {
        "company_admin": {
            "label": "Company Admin",
            "badge_color": "purple",
            "description": "Full workspace control, policy publishing & agent key provisioning"
        },
        "security_manager": {
            "label": "Security Manager",
            "badge_color": "amber",
            "description": "DevSecOps gatekeeper, human approval reviewer & cryptographic audit verification"
        },
        "employee": {
            "label": "Business Analyst",
            "badge_color": "cyan",
            "description": "Standard business employee, executes governed agent actions"
        }
    }

    orgs = db.query(Organization).all()
    results = []
    for org in orgs:
        memberships = db.query(Membership).filter(Membership.organization_id == org.id).all()
        users_list = []
        for m in memberships:
            u = db.query(User).filter(User.id == m.user_id).first()
            if u:
                meta = role_meta.get(m.role, {
                    "label": m.role.replace("_", " ").title(),
                    "badge_color": "blue",
                    "description": "Authenticated organization member"
                })
                # Initials for avatar
                parts = u.full_name.split()
                initials = "".join([p[0].upper() for p in parts[:2]]) if parts else "US"
                users_list.append({
                    "id": u.id,
                    "email": u.email,
                    "full_name": u.full_name,
                    "role": m.role,
                    "role_label": meta["label"],
                    "badge_color": meta["badge_color"],
                    "description": meta["description"],
                    "initials": initials,
                    "demo_password": known_passwords.get(u.email, "")
                })
        results.append({
            "id": org.id,
            "name": org.name,
            "slug": org.slug,
            "users": users_list
        })
    return {"companies": results}

@router.get("/workspaces")
def get_user_workspaces(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Returns organizations the authenticated user belongs to."""
    memberships = db.query(Membership).filter(Membership.user_id == user.id).all()
    workspaces = []
    for m in memberships:
        org = db.query(Organization).filter(Organization.id == m.organization_id).first()
        if org:
            workspaces.append({
                "id": org.id,
                "name": org.name,
                "slug": org.slug,
                "role": m.role
            })
    return {"workspaces": workspaces}

@router.get("/workspaces/{org_id}/overview")
def get_workspace_overview(
    org_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns workspace setup checklist, active policy, agents, connectors, and decision stats."""
    require_membership(org_id, user, db)

    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Workspace not found")

    # Counts
    agent_count = db.query(Agent).filter(Agent.organization_id == org_id).count()
    connector_count = db.query(Connector).filter(Connector.organization_id == org_id).count()
    source_count = db.query(PolicySource).filter(PolicySource.organization_id == org_id).count()
    pending_approvals = db.query(ApprovalRequest).filter(
        ApprovalRequest.organization_id == org_id,
        ApprovalRequest.status == "PENDING"
    ).count()

    # Active Policy
    active_policy = db.query(PolicyVersion).filter(
        PolicyVersion.organization_id == org_id,
        PolicyVersion.is_active == True
    ).first()

    # Decision metrics from GovernedAction
    actions = db.query(GovernedAction).filter(GovernedAction.organization_id == org_id).all()
    allowed_count = sum(1 for a in actions if a.decision == "ALLOW")
    escalated_count = sum(1 for a in actions if a.decision == "ESCALATE")
    blocked_count = sum(1 for a in actions if a.decision == "BLOCK")

    # Checklist calculation
    has_members = db.query(Membership).filter(Membership.organization_id == org_id).count() > 0
    has_policy_source = source_count > 0
    has_published_policy = active_policy is not None
    has_agent = agent_count > 0
    has_connector = connector_count > 0
    has_run_action = len(actions) > 0

    checklist = [
        {"step": 1, "title": "Add company members and reviewer groups", "completed": has_members},
        {"step": 2, "title": "Upload a policy source", "completed": has_policy_source},
        {"step": 3, "title": "Review and publish the policy", "completed": has_published_policy},
        {"step": 4, "title": "Register an agent", "completed": has_agent},
        {"step": 5, "title": "Assign its role and task", "completed": has_agent},
        {"step": 6, "title": "Connect a supported resource", "completed": has_connector},
        {"step": 7, "title": "Run a governed action", "completed": has_run_action}
    ]

    return {
        "organization": {"id": org.id, "name": org.name, "slug": org.slug},
        "checklist": checklist,
        "metrics": {
            "total_actions": len(actions),
            "allowed": allowed_count,
            "escalated": escalated_count,
            "blocked": blocked_count,
            "pending_approvals": pending_approvals,
            "agent_count": agent_count,
            "connector_count": connector_count,
            "policy_sources": source_count
        },
        "active_policy": {
            "id": active_policy.id,
            "version_num": active_policy.version_num,
            "rule_count": len(active_policy.rules),
            "published_at": active_policy.published_at.isoformat(),
            "change_summary": active_policy.change_summary
        } if active_policy else None
    }

# ---------------------------------------------------------------------------
# 2. Policy Ingestion & Publishing
# ---------------------------------------------------------------------------
@router.post("/workspaces/{org_id}/policies/upload")
def upload_policy_document(
    org_id: str,
    file: Optional[UploadFile] = File(None),
    title: Optional[str] = Form(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Uploads a PDF, Markdown, or text document into protected storage,
    preserves references, indexes in ChromaDB, and compiles draft rules.
    """
    require_membership(org_id, user, db, allowed_roles=["company_admin", "security_manager"])

    if not file:
        raise HTTPException(status_code=400, detail="Document file required.")

    file_bytes = file.file.read()
    filename = file.filename or "policy.md"
    doc_title = title or Path(filename).stem.replace("_", " ").title()

    # Determine type
    lower_name = filename.lower()
    if lower_name.endswith(".pdf"):
        source_type = "pdf"
        full_text, chunks = parse_pdf(file_bytes)
    else:
        source_type = "markdown" if lower_name.endswith(".md") else "text"
        raw_str = file_bytes.decode("utf-8", errors="replace")
        full_text, chunks = parse_markdown_or_text(raw_str)

    if not full_text.strip():
        raise HTTPException(status_code=400, detail="Could not extract readable text from document.")

    # Protected storage write
    org_dir = POLICIES_STORAGE_DIR / org_id
    org_dir.mkdir(parents=True, exist_ok=True)
    content_hash = hashlib.sha256(full_text.encode("utf-8")).hexdigest()
    safe_filename = f"{content_hash[:16]}_{Path(filename).name}"
    saved_path = org_dir / safe_filename
    with open(saved_path, "wb") as f:
        f.write(file_bytes)

    # Revision calculation
    prev_sources = db.query(PolicySource).filter(
        PolicySource.organization_id == org_id,
        PolicySource.title == doc_title
    ).count()
    revision = prev_sources + 1

    source_record = PolicySource(
        organization_id=org_id,
        title=doc_title,
        source_type=source_type,
        file_path=str(saved_path.relative_to(POLICIES_STORAGE_DIR.parent)),
        content_hash=content_hash,
        revision=revision,
        raw_text=full_text
    )
    db.add(source_record)
    db.flush()

    # Index chunks in ChromaDB scoped to organization
    index_policy_chunks(
        organization_id=org_id,
        source_id=source_record.id,
        title=doc_title,
        chunks=chunks
    )

    # Compile draft rules
    draft_rules = compile_policy_rules(source_id=source_record.id, raw_text=full_text)

    # Validate draft rules against existing reviewer groups
    groups = [g.name for g in db.query(ReviewerGroup).filter(ReviewerGroup.organization_id == org_id).all()]
    validation = validate_rules(draft_rules, groups)

    record_audit_event(
        db=db,
        organization_id=org_id,
        event_type="POLICY_SOURCE_UPLOADED",
        actor_type="user",
        actor_id=user.id,
        details={"source_id": source_record.id, "title": doc_title, "revision": revision}
    )
    db.commit()

    return {
        "status": "success",
        "source": {
            "id": source_record.id,
            "title": source_record.title,
            "source_type": source_record.source_type,
            "revision": source_record.revision,
            "content_hash": source_record.content_hash,
            "chunks_count": len(chunks),
            "raw_text": full_text
        },
        "draft_rules": draft_rules,
        "validation": validation
    }

@router.post("/workspaces/{org_id}/policies/url")
def ingest_policy_url(
    org_id: str,
    req: UrlUploadRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Safely ingests policy from an HTTPS URL with SSRF protection."""
    require_membership(org_id, user, db, allowed_roles=["company_admin", "security_manager"])

    try:
        full_text, chunks = fetch_and_parse_url(req.url)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch policy URL: {e}")

    content_hash = hashlib.sha256(full_text.encode("utf-8")).hexdigest()
    source_record = PolicySource(
        organization_id=org_id,
        title=req.title,
        source_type="url",
        file_path=req.url,
        content_hash=content_hash,
        revision=1,
        raw_text=full_text
    )
    db.add(source_record)
    db.flush()

    index_policy_chunks(
        organization_id=org_id,
        source_id=source_record.id,
        title=req.title,
        chunks=chunks
    )

    draft_rules = compile_policy_rules(source_id=source_record.id, raw_text=full_text)
    groups = [g.name for g in db.query(ReviewerGroup).filter(ReviewerGroup.organization_id == org_id).all()]
    validation = validate_rules(draft_rules, groups)

    record_audit_event(
        db=db,
        organization_id=org_id,
        event_type="POLICY_URL_INGESTED",
        actor_type="user",
        actor_id=user.id,
        details={"source_id": source_record.id, "url": req.url}
    )
    db.commit()

    return {
        "status": "success",
        "source": {
            "id": source_record.id,
            "title": source_record.title,
            "source_type": "url",
            "revision": 1,
            "raw_text": full_text
        },
        "draft_rules": draft_rules,
        "validation": validation
    }

@router.get("/workspaces/{org_id}/policies/sources")
def list_policy_sources(
    org_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_membership(org_id, user, db)
    sources = db.query(PolicySource).filter(PolicySource.organization_id == org_id).order_by(desc(PolicySource.created_at)).all()
    return {
        "sources": [
            {
                "id": s.id,
                "title": s.title,
                "source_type": s.source_type,
                "revision": s.revision,
                "content_hash": s.content_hash,
                "created_at": s.created_at.isoformat(),
                "raw_text": s.raw_text
            }
            for s in sources
        ]
    }

@router.get("/workspaces/{org_id}/policies/versions")
def list_policy_versions(
    org_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_membership(org_id, user, db)
    versions = db.query(PolicyVersion).filter(
        PolicyVersion.organization_id == org_id
    ).order_by(desc(PolicyVersion.version_num)).all()

    out = []
    for v in versions:
        rules = [
            {
                "id": r.id,
                "role": r.role,
                "tool": r.tool,
                "resource": r.resource,
                "destination_type": r.destination_type,
                "decision": r.decision,
                "reviewer_group": r.reviewer_group,
                "source_reference": json.loads(r.source_reference_json) if r.source_reference_json else {}
            }
            for r in v.rules
        ]
        out.append({
            "id": v.id,
            "version_num": v.version_num,
            "is_active": v.is_active,
            "published_at": v.published_at.isoformat(),
            "change_summary": v.change_summary,
            "rules": rules
        })
    return {"versions": out}

@router.post("/workspaces/{org_id}/policies/publish")
def publish_policy_version(
    org_id: str,
    req: PublishPolicyRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Validates and publishes a new immutable policy version.
    Atomically updates active policy flag and writes audit event.
    """
    require_membership(org_id, user, db, allowed_roles=["company_admin"])

    if not req.rules:
        raise HTTPException(status_code=400, detail="Cannot publish an empty policy without rules.")

    # Validate rules
    groups = [g.name for g in db.query(ReviewerGroup).filter(ReviewerGroup.organization_id == org_id).all()]
    rule_dicts = [r.model_dump() for r in req.rules]
    val = validate_rules(rule_dicts, groups)
    if not val["is_valid"]:
        raise HTTPException(
            status_code=400,
            detail=f"Rule validation failed: {val['conflicts'] or val['warnings']}"
        )

    # Determine version number
    latest_ver = db.query(PolicyVersion).filter(
        PolicyVersion.organization_id == org_id
    ).order_by(desc(PolicyVersion.version_num)).first()
    next_ver_num = (latest_ver.version_num + 1) if latest_ver else 1

    # Deactivate current active version
    db.query(PolicyVersion).filter(
        PolicyVersion.organization_id == org_id,
        PolicyVersion.is_active == True
    ).update({"is_active": False})

    # Create new PolicyVersion
    new_version = PolicyVersion(
        organization_id=org_id,
        version_num=next_ver_num,
        is_active=True,
        published_by=user.id,
        change_summary=req.change_summary
    )
    db.add(new_version)
    db.flush()

    # Create immutable PolicyRules
    db_rules = []
    for r in req.rules:
        p_rule = PolicyRule(
            policy_version_id=new_version.id,
            role=r.role.strip().lower(),
            tool=r.tool.strip().lower(),
            resource=r.resource.strip().lower(),
            destination_type=r.destination_type.strip().lower(),
            decision=r.decision.strip().upper(),
            reviewer_group=r.reviewer_group,
            source_reference_json=json.dumps(r.source_reference) if r.source_reference else None,
            conditions_json=json.dumps(r.conditions) if r.conditions else None
        )
        db_rules.append(p_rule)

    db.add_all(db_rules)
    db.flush()

    record_audit_event(
        db=db,
        organization_id=org_id,
        event_type="POLICY_PUBLISHED",
        actor_type="user",
        actor_id=user.id,
        details={
            "policy_version_id": new_version.id,
            "version_num": next_ver_num,
            "rule_count": len(db_rules),
            "change_summary": req.change_summary
        }
    )
    db.commit()

    return {
        "status": "success",
        "message": f"Policy Version {next_ver_num} published successfully.",
        "policy_version": {
            "id": new_version.id,
            "version_num": new_version.version_num,
            "is_active": new_version.is_active,
            "published_at": new_version.published_at.isoformat(),
            "rule_count": len(db_rules)
        }
    }

# ---------------------------------------------------------------------------
# 3. Agents & Tools Management
# ---------------------------------------------------------------------------
@router.get("/workspaces/{org_id}/agents")
def list_agents(
    org_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_membership(org_id, user, db)
    agents = db.query(Agent).filter(Agent.organization_id == org_id).all()
    results = []
    for a in agents:
        keys = db.query(AgentKey).filter(AgentKey.agent_id == a.id, AgentKey.is_revoked == False).all()
        results.append({
            "id": a.id,
            "name": a.name,
            "business_role": a.business_role,
            "assigned_task": a.assigned_task,
            "supported_tools": json.loads(a.supported_tools_json),
            "is_active": a.is_active,
            "active_key_count": len(keys),
            "created_at": a.created_at.isoformat()
        })
    return {"agents": results}

@router.post("/workspaces/{org_id}/agents")
def register_agent(
    org_id: str,
    req: RegisterAgentRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Registers a new agent and issues a separate revocable agent API key.
    The plain key is returned once in this response.
    """
    require_membership(org_id, user, db, allowed_roles=["company_admin", "security_manager"])

    new_agent = Agent(
        organization_id=org_id,
        name=req.name,
        business_role=req.business_role.strip().lower(),
        assigned_task=req.assigned_task,
        supported_tools_json=json.dumps(req.supported_tools),
        is_active=True
    )
    db.add(new_agent)
    db.flush()

    plain_key, key_hash, prefix = generate_agent_key()
    key_record = AgentKey(
        agent_id=new_agent.id,
        key_prefix=prefix,
        key_hash=key_hash,
        is_revoked=False
    )
    db.add(key_record)
    db.flush()

    record_audit_event(
        db=db,
        organization_id=org_id,
        event_type="AGENT_REGISTERED",
        actor_type="user",
        actor_id=user.id,
        details={
            "agent_id": new_agent.id,
            "name": new_agent.name,
            "business_role": new_agent.business_role,
            "key_prefix": prefix
        }
    )
    db.commit()

    return {
        "status": "success",
        "agent": {
            "id": new_agent.id,
            "name": new_agent.name,
            "business_role": new_agent.business_role,
            "assigned_task": new_agent.assigned_task,
            "supported_tools": req.supported_tools
        },
        "agent_key": plain_key,
        "warning": "Save this agent key now. It will never be shown again."
    }

@router.post("/workspaces/{org_id}/agents/{agent_id}/revoke-keys")
def revoke_agent_keys(
    org_id: str,
    agent_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_membership(org_id, user, db, allowed_roles=["company_admin", "security_manager"])
    db.query(AgentKey).filter(AgentKey.agent_id == agent_id).update({"is_revoked": True})
    record_audit_event(
        db=db,
        organization_id=org_id,
        event_type="AGENT_KEYS_REVOKED",
        actor_type="user",
        actor_id=user.id,
        details={"agent_id": agent_id}
    )
    db.commit()
    return {"status": "success", "message": "All keys for agent revoked."}

@router.get("/workspaces/{org_id}/connectors")
def list_connectors(
    org_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_membership(org_id, user, db)
    connectors = db.query(Connector).filter(Connector.organization_id == org_id).all()
    return {
        "connectors": [
            {
                "id": c.id,
                "name": c.name,
                "resource_type": c.resource_type,
                "config": json.loads(c.config_json),
                "is_connected": c.is_connected
            }
            for c in connectors
        ]
    }

# ---------------------------------------------------------------------------
# 4. Agent Action Execution Governor API
# ---------------------------------------------------------------------------
@router.post("/governor/propose-action")
def propose_governed_action(
    req: ProposeActionRequest,
    agent_tuple: Tuple[Agent, Organization] = Depends(authenticate_agent),
    db: Session = Depends(get_db)
):
    """
    Autonomous Agent Action Entry Point.
    Authenticated via separate revocable agent key.
    Runs Tier 0 (Deterministic Gate), Tier 1 (Context/Risk/Provenance),
    Tier 2 (Semantic Assessment), Tier 3 (Controlled Adapter Execution).
    Returns ALLOW, BLOCK, or ESCALATE.
    """
    agent, org = agent_tuple

    return run_governor_cascade(
        db=db,
        agent=agent,
        org=org,
        task_id=req.task_id,
        tool=req.tool,
        resource=req.resource,
        destination=req.destination,
        arguments=req.arguments
    )

# ---------------------------------------------------------------------------
# 5. Human Approvals & Safe Resumption
# ---------------------------------------------------------------------------
@router.get("/workspaces/{org_id}/approvals")
def get_pending_approvals(
    org_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lists paused actions waiting for supervisor review with rich telemetry."""
    require_membership(org_id, user, db)
    pending = list_pending_approvals(db, org_id)
    return {"pending_approvals": pending}

@router.post("/workspaces/{org_id}/approvals/{approval_id}/resolve")
def resolve_approval(
    org_id: str,
    approval_id: str,
    req: ResolveApprovalRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Approves or rejects a paused action.
    Re-validates against current active policy before dispatching to simulated outbox.
    """
    require_membership(org_id, user, db, allowed_roles=["company_admin", "security_manager"])

    res = resolve_approval_request(
        db=db,
        approval_id=approval_id,
        reviewer=user,
        approve=req.approve,
        review_notes=req.notes
    )
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error", "Approval resolution failed."))

    return res

# ---------------------------------------------------------------------------
# 6. Activity, Simulated Outbox, & Cryptographic Audit
# ---------------------------------------------------------------------------
@router.get("/workspaces/{org_id}/activity")
def get_live_activity(
    org_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_membership(org_id, user, db)
    actions = db.query(GovernedAction).filter(
        GovernedAction.organization_id == org_id
    ).order_by(desc(GovernedAction.created_at)).limit(50).all()

    out = []
    for a in actions:
        agent = db.query(Agent).filter(Agent.id == a.agent_id).first()
        out.append({
            "id": a.id,
            "created_at": a.created_at.isoformat(),
            "agent_name": agent.name if agent else "Unknown Agent",
            "business_role": agent.business_role if agent else "Unknown Role",
            "task_id": a.task_id,
            "tool": a.tool,
            "resource": a.resource,
            "decision": a.decision,
            "status": a.status,
            "arguments": json.loads(a.arguments_json) if a.arguments_json else {},
            "tier_details": json.loads(a.tier_details_json) if a.tier_details_json else {},
            "execution_result": json.loads(a.execution_result_json) if a.execution_result_json else None
        })
    return {"activity": out}

@router.get("/workspaces/{org_id}/outbox")
def get_simulated_outbox(
    org_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_membership(org_id, user, db)
    records = db.query(SimulatedOutbox).filter(
        SimulatedOutbox.organization_id == org_id
    ).order_by(desc(SimulatedOutbox.delivered_at)).all()

    return {
        "outbox": [
            {
                "id": r.id,
                "action_id": r.action_id,
                "recipient": r.recipient,
                "destination_type": r.destination_type,
                "payload_summary": r.payload_summary,
                "delivered_at": r.delivered_at.isoformat()
            }
            for r in records
        ]
    }

@router.get("/workspaces/{org_id}/audit")
def get_audit_trail(
    org_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_membership(org_id, user, db)
    events = db.query(AuditEvent).filter(
        AuditEvent.organization_id == org_id
    ).order_by(desc(AuditEvent.timestamp)).limit(100).all()

    return {
        "events": [
            {
                "id": e.id,
                "timestamp": e.timestamp.isoformat(),
                "event_type": e.event_type,
                "actor_type": e.actor_type,
                "actor_id": e.actor_id,
                "action_id": e.action_id,
                "details": json.loads(e.details_json) if e.details_json else {},
                "prev_hash": e.prev_hash,
                "current_hash": e.current_hash
            }
            for e in events
        ]
    }

@router.get("/workspaces/{org_id}/audit/verify")
def verify_audit_ledger(
    org_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cryptographically verifies SHA-256 hash chains across all audit events."""
    require_membership(org_id, user, db)
    is_valid, count, errors = verify_audit_chain(db, org_id)
    return {
        "is_valid": is_valid,
        "verified_event_count": count,
        "errors": errors,
        "status": "TAMPER_FREE_VERIFIED" if is_valid else "COMPROMISED"
    }

# ---------------------------------------------------------------------------
# 7. Demo Playground & End-to-End Test Orchestrator
# ---------------------------------------------------------------------------
@router.post("/workspaces/{org_id}/demo/run-scenario")
def run_demo_step(
    org_id: str,
    step: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Executes specific steps of the 9-step demonstration from the specification.
    """
    require_membership(org_id, user, db)

    org = db.query(Organization).filter(Organization.id == org_id).first()
    analyst_agent = db.query(Agent).filter(
        Agent.organization_id == org_id,
        Agent.business_role == "data_analyst"
    ).first()

    if step == 3:
        # Step 3: Analyst agent reads sales data (ALLOW)
        res = run_governor_cascade(
            db=db,
            agent=analyst_agent,
            org=org,
            task_id="monthly-sales-report",
            tool="database.read",
            resource="demo-sales",
            destination="internal",
            arguments={"limit": 5}
        )
        return {"step": 3, "description": "Analyst reads sales data successfully", "result": res}

    elif step == 4:
        # Step 4: Analyst creates report from authorized data (ALLOW)
        res = run_governor_cascade(
            db=db,
            agent=analyst_agent,
            org=org,
            task_id="monthly-sales-report",
            tool="report.create",
            resource="sales_report",
            destination="internal",
            arguments={"title": "Q3 Executive Performance Briefing"}
        )
        return {"step": 4, "description": "Analyst creates report from authorized data", "result": res}

    elif step == 5:
        # Step 5: External sharing triggers human review (ESCALATE)
        # Find latest created report if available
        last_action = db.query(GovernedAction).filter(
            GovernedAction.organization_id == org_id,
            GovernedAction.tool == "report.create",
            GovernedAction.status == "EXECUTED"
        ).order_by(desc(GovernedAction.created_at)).first()

        rep_id = "rep_demo_01"
        if last_action and last_action.execution_result_json:
            rep_id = json.loads(last_action.execution_result_json).get("report_id", rep_id)

        res = run_governor_cascade(
            db=db,
            agent=analyst_agent,
            org=org,
            task_id="monthly-sales-report",
            tool="report.send",
            resource="sales_report",
            destination="external",
            arguments={"report_id": rep_id, "recipient": "board@investor-partners.com"}
        )
        return {"step": 5, "description": "External report sharing triggers human review", "result": res}

    elif step == 6:
        # Step 6: Manager approves it
        pending_app = db.query(ApprovalRequest).filter(
            ApprovalRequest.organization_id == org_id,
            ApprovalRequest.status == "PENDING"
        ).order_by(desc(ApprovalRequest.id)).first()

        if not pending_app:
            raise HTTPException(status_code=400, detail="No pending approval to approve. Run step 5 first.")

        res = resolve_approval_request(
            db=db,
            approval_id=pending_app.id,
            reviewer=user,
            approve=True,
            review_notes="Approved for board distribution."
        )
        return {"step": 6, "description": "Manager approves external distribution", "result": res}

    elif step == 8:
        # Step 8: Administrator publishes a new policy blocking that destination
        # Create Policy Version 2 where report.send to external is explicitly BLOCK!
        latest_ver = db.query(PolicyVersion).filter(
            PolicyVersion.organization_id == org_id
        ).order_by(desc(PolicyVersion.version_num)).first()
        v2_num = (latest_ver.version_num + 1) if latest_ver else 2

        db.query(PolicyVersion).filter(
            PolicyVersion.organization_id == org_id,
            PolicyVersion.is_active == True
        ).update({"is_active": False})

        pv2 = PolicyVersion(
            organization_id=org_id,
            version_num=v2_num,
            is_active=True,
            published_by=user.id,
            change_summary="Strict data lockdown: External report distribution is now strictly BLOCKED."
        )
        db.add(pv2)
        db.flush()

        rules_v2 = [
            PolicyRule(
                policy_version_id=pv2.id,
                role="data_analyst",
                tool="database.read",
                resource="demo-sales",
                destination_type="any",
                decision="ALLOW",
                source_reference_json=json.dumps({"section": "1.1", "passage": "Data analysts may read sales summaries."})
            ),
            PolicyRule(
                policy_version_id=pv2.id,
                role="data_analyst",
                tool="report.create",
                resource="sales_report",
                destination_type="any",
                decision="ALLOW",
                source_reference_json=json.dumps({"section": "1.2", "passage": "Report synthesis permitted."})
            ),
            PolicyRule(
                policy_version_id=pv2.id,
                role="data_analyst",
                tool="report.send",
                resource="sales_report",
                destination_type="internal",
                decision="ALLOW",
                source_reference_json=json.dumps({"section": "1.3", "passage": "Internal delivery permitted."})
            ),
            PolicyRule(
                policy_version_id=pv2.id,
                role="data_analyst",
                tool="report.send",
                resource="sales_report",
                destination_type="external",
                decision="BLOCK",  # NOW EXPLICITLY BLOCKED!
                source_reference_json=json.dumps({"section": "1.4", "passage": "External report distribution is strictly prohibited under zero-trust policy."})
            )
        ]
        db.add_all(rules_v2)
        db.flush()

        record_audit_event(
            db=db,
            organization_id=org_id,
            event_type="POLICY_PUBLISHED",
            actor_type="user",
            actor_id=user.id,
            details={"version_num": v2_num, "summary": "Zero-trust external distribution lockdown."}
        )
        db.commit()
        return {
            "step": 8,
            "description": f"Published Policy v{v2_num} strictly BLOCKING external report distribution",
            "version": v2_num
        }

    elif step == 9:
        # Step 9: The same proposed sharing action is now BLOCKED!
        res = run_governor_cascade(
            db=db,
            agent=analyst_agent,
            org=org,
            task_id="monthly-sales-report",
            tool="report.send",
            resource="sales_report",
            destination="external",
            arguments={"report_id": "rep_demo_01", "recipient": "board@investor-partners.com"}
        )
        return {
            "step": 9,
            "description": "Same sharing action proposed under Policy v2 is now BLOCKED",
            "result": res,
            "governance_proven": res["decision"] == "BLOCK"
        }

    else:
        raise HTTPException(status_code=400, detail=f"Unsupported demo step {step}")
