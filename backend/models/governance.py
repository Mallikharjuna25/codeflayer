import uuid
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import (
    String, Boolean, Integer, Text, DateTime, ForeignKey, Index
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

def gen_uuid() -> str:
    return str(uuid.uuid4())

class Base(DeclarativeBase):
    pass

class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    memberships: Mapped[List["Membership"]] = relationship(back_populates="organization", cascade="all, delete-orphan")
    policies: Mapped[List["PolicyVersion"]] = relationship(back_populates="organization", cascade="all, delete-orphan")
    sources: Mapped[List["PolicySource"]] = relationship(back_populates="organization", cascade="all, delete-orphan")
    agents: Mapped[List["Agent"]] = relationship(back_populates="organization", cascade="all, delete-orphan")
    connectors: Mapped[List["Connector"]] = relationship(back_populates="organization", cascade="all, delete-orphan")
    actions: Mapped[List["GovernedAction"]] = relationship(back_populates="organization", cascade="all, delete-orphan")
    audit_events: Mapped[List["AuditEvent"]] = relationship(back_populates="organization", cascade="all, delete-orphan")

class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    memberships: Mapped[List["Membership"]] = relationship(back_populates="user", cascade="all, delete-orphan")

class Membership(Base):
    __tablename__ = "memberships"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    organization_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False)  # "company_admin", "security_manager", "employee"
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    user: Mapped["User"] = relationship(back_populates="memberships")
    organization: Mapped["Organization"] = relationship(back_populates="memberships")

    __table_args__ = (
        Index("ix_membership_user_org", "user_id", "organization_id", unique=True),
    )

class ReviewerGroup(Base):
    __tablename__ = "reviewer_groups"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    organization_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g., "managers", "security_team"
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

class ReviewerGroupMember(Base):
    __tablename__ = "reviewer_group_members"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    group_id: Mapped[str] = mapped_column(String(36), ForeignKey("reviewer_groups.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

class PolicySource(Base):
    __tablename__ = "policy_sources"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    organization_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    source_type: Mapped[str] = mapped_column(String(20), nullable=False)  # "pdf", "markdown", "text", "url"
    file_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    revision: Mapped[int] = mapped_column(Integer, default=1)
    raw_text: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    organization: Mapped["Organization"] = relationship(back_populates="sources")

class PolicyVersion(Base):
    __tablename__ = "policy_versions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    organization_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    version_num: Mapped[int] = mapped_column(Integer, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    published_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    change_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    organization: Mapped["Organization"] = relationship(back_populates="policies")
    rules: Mapped[List["PolicyRule"]] = relationship(back_populates="policy_version", cascade="all, delete-orphan")

class PolicyRule(Base):
    __tablename__ = "policy_rules"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    policy_version_id: Mapped[str] = mapped_column(String(36), ForeignKey("policy_versions.id", ondelete="CASCADE"), nullable=False)
    role: Mapped[str] = mapped_column(String(100), nullable=False)  # "data_analyst", "customer_support", "*"
    tool: Mapped[str] = mapped_column(String(100), nullable=False)  # "database.read", "report.send", "*"
    resource: Mapped[str] = mapped_column(String(100), nullable=False)  # "sales_report", "demo-sales", "*"
    destination_type: Mapped[str] = mapped_column(String(50), default="any")  # "internal", "external", "any"
    decision: Mapped[str] = mapped_column(String(20), nullable=False)  # "ALLOW", "BLOCK", "ESCALATE"
    reviewer_group: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # "managers", "security_team"
    source_reference_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # {"source_id": "...", "page": 2, "passage": "..."}
    conditions_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    policy_version: Mapped["PolicyVersion"] = relationship(back_populates="rules")

class Agent(Base):
    __tablename__ = "agents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    organization_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    business_role: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g., "data_analyst", "customer_support"
    assigned_task: Mapped[str] = mapped_column(String(255), nullable=False)
    supported_tools_json: Mapped[str] = mapped_column(Text, default="[]")  # ["database.read", "report.create", "report.send"]
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    organization: Mapped["Organization"] = relationship(back_populates="agents")
    keys: Mapped[List["AgentKey"]] = relationship(back_populates="agent", cascade="all, delete-orphan")
    actions: Mapped[List["GovernedAction"]] = relationship(back_populates="agent")

class AgentKey(Base):
    __tablename__ = "agent_keys"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    agent_id: Mapped[str] = mapped_column(String(36), ForeignKey("agents.id", ondelete="CASCADE"), nullable=False)
    key_prefix: Mapped[str] = mapped_column(String(20), nullable=False)  # e.g. "halo_ak_live_"
    key_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)  # SHA-256 of key
    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    agent: Mapped["Agent"] = relationship(back_populates="keys")

class Connector(Base):
    __tablename__ = "connectors"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    organization_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    resource_type: Mapped[str] = mapped_column(String(50), nullable=False)  # "sqlite_db", "report_storage", "simulated_outbox"
    config_json: Mapped[str] = mapped_column(Text, default="{}")
    is_connected: Mapped[bool] = mapped_column(Boolean, default=True)

    organization: Mapped["Organization"] = relationship(back_populates="connectors")

class GovernedAction(Base):
    __tablename__ = "governed_actions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    organization_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    agent_id: Mapped[str] = mapped_column(String(36), ForeignKey("agents.id", ondelete="CASCADE"), nullable=False)
    task_id: Mapped[str] = mapped_column(String(100), nullable=False)
    tool: Mapped[str] = mapped_column(String(100), nullable=False)
    resource: Mapped[str] = mapped_column(String(100), nullable=False)
    arguments_json: Mapped[str] = mapped_column(Text, nullable=False)  # json string of arguments
    decision: Mapped[str] = mapped_column(String(20), nullable=False)  # "ALLOW", "BLOCK", "ESCALATE"
    tier_details_json: Mapped[str] = mapped_column(Text, default="{}")  # breakdown of tier 0, 1, 2
    status: Mapped[str] = mapped_column(String(30), nullable=False)  # "EXECUTED", "BLOCKED", "PENDING_APPROVAL", "REJECTED"
    execution_result_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    organization: Mapped["Organization"] = relationship(back_populates="actions")
    agent: Mapped["Agent"] = relationship(back_populates="actions")
    approval_request: Mapped[Optional["ApprovalRequest"]] = relationship(back_populates="action", uselist=False, cascade="all, delete-orphan")
    outbox_record: Mapped[Optional["SimulatedOutbox"]] = relationship(back_populates="action", uselist=False, cascade="all, delete-orphan")

class ApprovalRequest(Base):
    __tablename__ = "approval_requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    organization_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    action_id: Mapped[str] = mapped_column(String(36), ForeignKey("governed_actions.id", ondelete="CASCADE"), nullable=False, unique=True)
    reviewer_group: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="PENDING")  # "PENDING", "APPROVED", "REJECTED"
    reviewer_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    review_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    action: Mapped["GovernedAction"] = relationship(back_populates="approval_request")

class SimulatedOutbox(Base):
    __tablename__ = "simulated_outbox"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    organization_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    action_id: Mapped[str] = mapped_column(String(36), ForeignKey("governed_actions.id", ondelete="CASCADE"), nullable=False, unique=True)
    recipient: Mapped[str] = mapped_column(String(255), nullable=False)
    destination_type: Mapped[str] = mapped_column(String(50), default="external")
    payload_summary: Mapped[str] = mapped_column(Text, nullable=False)
    delivered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    action: Mapped["GovernedAction"] = relationship(back_populates="outbox_record")

class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    organization_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)  # "ACTION_PROPOSED", "DECISION_MADE", "ACTION_EXECUTED", "REVIEW_REQUESTED", "ACTION_APPROVED", "ACTION_REJECTED", "POLICY_PUBLISHED"
    action_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    actor_type: Mapped[str] = mapped_column(String(50), nullable=False)  # "agent", "user", "system"
    actor_id: Mapped[str] = mapped_column(String(100), nullable=False)
    details_json: Mapped[str] = mapped_column(Text, nullable=False)
    prev_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    current_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    organization: Mapped["Organization"] = relationship(back_populates="audit_events")
