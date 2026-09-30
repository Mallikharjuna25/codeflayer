import json
import hashlib
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Tuple, List
from sqlalchemy.orm import Session
from sqlalchemy import select, desc
from models.governance import AuditEvent

GENESIS_HASH = "0" * 64

def format_ts(dt: datetime) -> str:
    """Consistently formats datetime across SQLite and Postgres drivers."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

def compute_event_hash(
    prev_hash: str,
    org_id: str,
    event_type: str,
    actor_type: str,
    actor_id: str,
    details_json: str,
    timestamp_iso: str
) -> str:
    """Calculates SHA-256 tamper-evident hash for an audit record."""
    payload = f"{prev_hash}|{org_id}|{event_type}|{actor_type}|{actor_id}|{details_json}|{timestamp_iso}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()

def record_audit_event(
    db: Session,
    organization_id: str,
    event_type: str,
    actor_type: str,
    actor_id: str,
    details: Dict[str, Any],
    action_id: Optional[str] = None
) -> AuditEvent:
    """
    Appends an immutable, hash-chained audit event for the specified organization.
    Ensures cryptographic tamper-evidence across decisions, approvals, and policy changes.
    """
    latest = db.query(AuditEvent).filter(
        AuditEvent.organization_id == organization_id
    ).order_by(desc(AuditEvent.timestamp), desc(AuditEvent.id)).first()

    prev_hash = latest.current_hash if latest else GENESIS_HASH
    now = datetime.now(timezone.utc)
    ts_str = format_ts(now)
    details_str = json.dumps(details, sort_keys=True)
    current_hash = compute_event_hash(
        prev_hash=prev_hash,
        org_id=organization_id,
        event_type=event_type,
        actor_type=actor_type,
        actor_id=actor_id,
        details_json=details_str,
        timestamp_iso=ts_str
    )

    audit_entry = AuditEvent(
        organization_id=organization_id,
        event_type=event_type,
        action_id=action_id,
        actor_type=actor_type,
        actor_id=actor_id,
        details_json=details_str,
        prev_hash=prev_hash,
        current_hash=current_hash,
        timestamp=now
    )
    db.add(audit_entry)
    db.flush()
    return audit_entry

def verify_audit_chain(db: Session, organization_id: str) -> Tuple[bool, int, List[str]]:
    """
    Verifies the cryptographic integrity of the entire audit chain for an organization.
    Returns: (is_valid, verified_count, error_messages)
    """
    events = db.query(AuditEvent).filter(
        AuditEvent.organization_id == organization_id
    ).order_by(AuditEvent.timestamp.asc(), AuditEvent.id.asc()).all()

    if not events:
        return True, 0, []

    expected_prev = GENESIS_HASH
    errors = []

    for idx, ev in enumerate(events):
        if ev.prev_hash != expected_prev:
            errors.append(f"Chain broken at record #{idx} ({ev.id}): expected prev_hash {expected_prev[:12]}..., found {ev.prev_hash[:12]}...")
            return False, idx, errors

        recomputed = compute_event_hash(
            prev_hash=ev.prev_hash,
            org_id=ev.organization_id,
            event_type=ev.event_type,
            actor_type=ev.actor_type,
            actor_id=ev.actor_id,
            details_json=ev.details_json,
            timestamp_iso=format_ts(ev.timestamp)
        )

        if recomputed != ev.current_hash:
            errors.append(f"Tamper detected at record #{idx} ({ev.id}): hash mismatch {recomputed[:12]}... != {ev.current_hash[:12]}...")
            return False, idx, errors

        expected_prev = ev.current_hash

    return True, len(events), []

