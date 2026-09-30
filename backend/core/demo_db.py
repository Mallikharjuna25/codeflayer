import sqlite3
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from config import DEMO_DB_PATH

logger = logging.getLogger("code_storm_backend.demo_db")

def get_demo_connection() -> sqlite3.Connection:
    DEMO_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DEMO_DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def init_demo_db():
    """Initializes the demo SQLite database with synthetic sales and support records."""
    conn = get_demo_connection()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sales_summaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        region TEXT NOT NULL,
        month TEXT NOT NULL,
        revenue REAL NOT NULL,
        units_sold INTEGER NOT NULL,
        growth_rate REAL NOT NULL,
        confidential_notes TEXT
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS support_tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_name TEXT NOT NULL,
        priority TEXT NOT NULL,
        category TEXT NOT NULL,
        issue_description TEXT NOT NULL,
        status TEXT NOT NULL
    )
    """)

    # Check if sales_summaries has rows
    cursor.execute("SELECT COUNT(*) FROM sales_summaries")
    count = cursor.fetchone()[0]
    if count == 0:
        sample_sales = [
            ("North America", "2026-08", 2450000.0, 18500, 18.4, "Renewed 12 Fortune 500 contracts with 3-year term."),
            ("EMEA", "2026-08", 1820000.0, 14200, 12.1, "European expansion on track; GDPR governance suite launched."),
            ("APAC", "2026-08", 1340000.0, 9800, 24.6, "High adoption in Singapore and Tokyo financial institutions."),
            ("LATAM", "2026-08", 620000.0, 4600, 9.3, "Regional partner onboarding completed in Sao Paulo."),
            ("North America", "2026-07", 2280000.0, 17100, 15.2, "Enterprise pipeline conversion steady at 38%."),
            ("EMEA", "2026-07", 1690000.0, 13100, 10.8, "UK government public sector compliance approved."),
            ("APAC", "2026-07", 1190000.0, 8900, 21.0, "Signed flagship AI governance pilot with mega-bank."),
            ("North America", "2026-06", 2150000.0, 16300, 14.0, "Q2 target achieved at 104% of forecast.")
        ]
        cursor.executemany(
            "INSERT INTO sales_summaries (region, month, revenue, units_sold, growth_rate, confidential_notes) VALUES (?, ?, ?, ?, ?, ?)",
            sample_sales
        )
        logger.info("Inserted synthetic sales_summaries records.")

    # Check if support_tickets has rows
    cursor.execute("SELECT COUNT(*) FROM support_tickets")
    count_tix = cursor.fetchone()[0]
    if count_tix == 0:
        sample_tix = [
            ("Apex Global", "HIGH", "Connector", "Webhook latency exceeded SLA threshold", "RESOLVED"),
            ("Nova Retail", "MEDIUM", "Policy", "Rule syntax clarification for destination filter", "OPEN"),
            ("Vertex Tech", "URGENT", "Approval", "Manager escalation notification delay", "IN_PROGRESS"),
            ("Aegis Finance", "LOW", "Audit", "Export audit trail CSV format request", "RESOLVED")
        ]
        cursor.executemany(
            "INSERT INTO support_tickets (customer_name, priority, category, issue_description, status) VALUES (?, ?, ?, ?, ?)",
            sample_tix
        )
        logger.info("Inserted synthetic support_tickets records.")

    conn.commit()
    conn.close()

def query_sales_controlled(region: Optional[str] = None, limit: int = 10) -> List[Dict[str, Any]]:
    """Controlled adapter for sales data: safe template, parameters bounded, no arbitrary SQL."""
    conn = get_demo_connection()
    cursor = conn.cursor()
    safe_limit = max(1, min(limit, 100))
    if region:
        cursor.execute(
            "SELECT id, region, month, revenue, units_sold, growth_rate, confidential_notes FROM sales_summaries WHERE region = ? ORDER BY id DESC LIMIT ?",
            (region, safe_limit)
        )
    else:
        cursor.execute(
            "SELECT id, region, month, revenue, units_sold, growth_rate, confidential_notes FROM sales_summaries ORDER BY id DESC LIMIT ?",
            (safe_limit,)
        )
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def query_support_controlled(status: Optional[str] = None, limit: int = 10) -> List[Dict[str, Any]]:
    """Controlled adapter for support tickets."""
    conn = get_demo_connection()
    cursor = conn.cursor()
    safe_limit = max(1, min(limit, 100))
    if status:
        cursor.execute(
            "SELECT id, customer_name, priority, category, issue_description, status FROM support_tickets WHERE status = ? ORDER BY id DESC LIMIT ?",
            (status, safe_limit)
        )
    else:
        cursor.execute(
            "SELECT id, customer_name, priority, category, issue_description, status FROM support_tickets ORDER BY id DESC LIMIT ?",
            (safe_limit,)
        )
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows
