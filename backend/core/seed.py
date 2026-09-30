import json
import hashlib
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from models.governance import (
    Organization, User, Membership, ReviewerGroup, ReviewerGroupMember,
    Connector, Agent, AgentKey, PolicySource, PolicyVersion, PolicyRule
)
from core.auth import hash_password, hash_agent_key
from core.demo_db import init_demo_db
from core.audit import record_audit_event

def seed_database(db: Session):
    """Seeds database with default demo organizations, users, roles, agents, and active policy."""
    # First, make sure synthetic demo db exists
    init_demo_db()

    # Check if Acme already exists
    acme = db.query(Organization).filter(Organization.slug == "acme").first()
    if acme:
        return  # Already seeded

    # 1. Create Organizations
    acme = Organization(
        id="org-acme-corp-001",
        name="Acme Corporation",
        slug="acme"
    )
    beta = Organization(
        id="org-beta-labs-002",
        name="Beta Labs",
        slug="beta"
    )
    db.add_all([acme, beta])
    db.flush()

    # 2. Create Users
    admin_user = User(
        id="usr-alice-admin-001",
        email="admin@acme.com",
        password_hash=hash_password("admin123"),
        full_name="Alice Administrator"
    )
    sec_user = User(
        id="usr-sam-security-002",
        email="security@acme.com",
        password_hash=hash_password("sec123"),
        full_name="Sam Security Manager"
    )
    analyst_user = User(
        id="usr-elena-analyst-003",
        email="analyst@acme.com",
        password_hash=hash_password("analyst123"),
        full_name="Elena Employee"
    )
    beta_admin = User(
        id="usr-bob-beta-004",
        email="admin@beta.com",
        password_hash=hash_password("beta123"),
        full_name="Bob Beta Admin"
    )
    db.add_all([admin_user, sec_user, analyst_user, beta_admin])
    db.flush()

    # 3. Memberships
    m_admin = Membership(
        user_id=admin_user.id,
        organization_id=acme.id,
        role="company_admin"
    )
    m_sec = Membership(
        user_id=sec_user.id,
        organization_id=acme.id,
        role="security_manager"
    )
    m_analyst = Membership(
        user_id=analyst_user.id,
        organization_id=acme.id,
        role="employee"
    )
    m_beta = Membership(
        user_id=beta_admin.id,
        organization_id=beta.id,
        role="company_admin"
    )
    db.add_all([m_admin, m_sec, m_analyst, m_beta])
    db.flush()

    # 4. Reviewer Groups
    grp_managers = ReviewerGroup(
        id="grp-managers-001",
        organization_id=acme.id,
        name="managers",
        description="Department Managers authorized to approve external report distributions"
    )
    grp_sec = ReviewerGroup(
        id="grp-security-002",
        organization_id=acme.id,
        name="security_team",
        description="DevSecOps & Data Privacy team"
    )
    db.add_all([grp_managers, grp_sec])
    db.flush()

    # Group members
    rgm_1 = ReviewerGroupMember(group_id=grp_managers.id, user_id=admin_user.id)
    rgm_2 = ReviewerGroupMember(group_id=grp_sec.id, user_id=sec_user.id)
    db.add_all([rgm_1, rgm_2])
    db.flush()

    # 5. Connectors
    c_db = Connector(
        id="conn-demo-sales-001",
        organization_id=acme.id,
        name="Demo Sales Database",
        resource_type="sqlite_db",
        config_json=json.dumps({"path": "data/demo_business.db", "tables": ["sales_summaries", "support_tickets"]}),
        is_connected=True
    )
    c_store = Connector(
        id="conn-report-storage-002",
        organization_id=acme.id,
        name="Protected Report Storage",
        resource_type="report_storage",
        config_json=json.dumps({"path": "data/reports"}),
        is_connected=True
    )
    c_outbox = Connector(
        id="conn-simulated-outbox-003",
        organization_id=acme.id,
        name="Simulated Delivery Outbox",
        resource_type="simulated_outbox",
        config_json=json.dumps({"type": "simulated_outbox"}),
        is_connected=True
    )
    db.add_all([c_db, c_store, c_outbox])
    db.flush()

    # 6. Agents & Pre-seeded Keys
    agent_analyst = Agent(
        id="agent-analyst-001",
        organization_id=acme.id,
        name="Monthly Sales Analyst",
        business_role="data_analyst",
        assigned_task="Prepare monthly sales report",
        supported_tools_json=json.dumps(["database.read", "report.create", "report.send"]),
        is_active=True
    )
    agent_support = Agent(
        id="agent-support-002",
        organization_id=acme.id,
        name="Customer Support Bot",
        business_role="customer_support",
        assigned_task="Triage and resolve customer tickets",
        supported_tools_json=json.dumps(["ticket.read", "ticket.update"]),
        is_active=True
    )
    db.add_all([agent_analyst, agent_support])
    db.flush()

    # Known keys for demo/playground & pytest
    demo_key_analyst = "halo_ak_live_demo_analyst_2026_codestorm"
    demo_key_support = "halo_ak_live_demo_support_2026_codestorm"

    key_record_1 = AgentKey(
        id="key-analyst-001",
        agent_id=agent_analyst.id,
        key_prefix="halo_ak_live_",
        key_hash=hash_agent_key(demo_key_analyst),
        is_revoked=False
    )
    key_record_2 = AgentKey(
        id="key-support-002",
        agent_id=agent_support.id,
        key_prefix="halo_ak_live_",
        key_hash=hash_agent_key(demo_key_support),
        is_revoked=False
    )
    db.add_all([key_record_1, key_record_2])
    db.flush()

    # 7. Policy Source & Initial Published Version
    sample_policy_text = (
        "Acme Corporate Data Governance Policy\n\n"
        "Section 1: Data Analysts\n"
        "1.1 Data Analysts are permitted to read regional sales summaries from demo-sales.\n"
        "1.2 Data Analysts are authorized to synthesize and create sales reports.\n"
        "1.3 Reports sent internally to company staff are permitted automatically.\n"
        "1.4 Reports sent outside the company (external destinations) require manager approval before release.\n\n"
        "Section 2: Customer Support\n"
        "2.1 Customer Support agents must not access sales data under any circumstance.\n"
        "2.2 Customer Support agents are permitted to read support tickets."
    )

    src = PolicySource(
        id="src-policy-001",
        organization_id=acme.id,
        title="Corporate Data Governance & Distribution Policy v1.0",
        source_type="markdown",
        file_path="data/policies/acme_policy_v1.md",
        content_hash=hashlib.sha256(sample_policy_text.encode("utf-8")).hexdigest(),
        revision=1,
        raw_text=sample_policy_text
    )
    db.add(src)
    db.flush()

    # Active Policy Version 1
    pv1 = PolicyVersion(
        id="pv-acme-v1",
        organization_id=acme.id,
        version_num=1,
        is_active=True,
        published_by=admin_user.id,
        change_summary="Initial published corporate governance rules."
    )
    db.add(pv1)
    db.flush()

    # Rules for Version 1
    rules_v1 = [
        PolicyRule(
            id="rule-v1-01",
            policy_version_id=pv1.id,
            role="data_analyst",
            tool="database.read",
            resource="demo-sales",
            destination_type="any",
            decision="ALLOW",
            source_reference_json=json.dumps({"source_id": src.id, "section": "1.1", "passage": "Data Analysts are permitted to read regional sales summaries from demo-sales."})
        ),
        PolicyRule(
            id="rule-v1-02",
            policy_version_id=pv1.id,
            role="data_analyst",
            tool="report.create",
            resource="sales_report",
            destination_type="any",
            decision="ALLOW",
            source_reference_json=json.dumps({"source_id": src.id, "section": "1.2", "passage": "Data Analysts are authorized to synthesize and create sales reports."})
        ),
        PolicyRule(
            id="rule-v1-03",
            policy_version_id=pv1.id,
            role="data_analyst",
            tool="report.send",
            resource="sales_report",
            destination_type="internal",
            decision="ALLOW",
            source_reference_json=json.dumps({"source_id": src.id, "section": "1.3", "passage": "Reports sent internally to company staff are permitted automatically."})
        ),
        PolicyRule(
            id="rule-v1-04",
            policy_version_id=pv1.id,
            role="data_analyst",
            tool="report.send",
            resource="sales_report",
            destination_type="external",
            decision="ESCALATE",
            reviewer_group="managers",
            source_reference_json=json.dumps({"source_id": src.id, "section": "1.4", "passage": "Reports sent outside the company (external destinations) require manager approval before release."})
        ),
        PolicyRule(
            id="rule-v1-05",
            policy_version_id=pv1.id,
            role="customer_support",
            tool="database.read",
            resource="demo-sales",
            destination_type="any",
            decision="BLOCK",
            source_reference_json=json.dumps({"source_id": src.id, "section": "2.1", "passage": "Customer Support agents must not access sales data under any circumstance."})
        ),
        PolicyRule(
            id="rule-v1-06",
            policy_version_id=pv1.id,
            role="customer_support",
            tool="ticket.read",
            resource="support_tickets",
            destination_type="any",
            decision="ALLOW",
            source_reference_json=json.dumps({"source_id": src.id, "section": "2.2", "passage": "Customer Support agents are permitted to read support tickets."})
        )
    ]
    db.add_all(rules_v1)
    db.flush()

    # Initial Audit Record
    record_audit_event(
        db=db,
        organization_id=acme.id,
        event_type="POLICY_PUBLISHED",
        actor_type="user",
        actor_id=admin_user.id,
        details={"version_num": 1, "policy_id": pv1.id, "rule_count": len(rules_v1)}
    )

    db.commit()
