import os
import logging
from pathlib import Path
from typing import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from config import DATABASE_URL, BASE_DIR
from models.governance import Base

logger = logging.getLogger("code_storm_backend.database")

# Ensure backend/data directory exists
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

def _get_engine():
    target_url = DATABASE_URL
    # Check if target is postgres
    if target_url.startswith("postgresql://") or target_url.startswith("postgres://"):
        # Normalize driver for psycopg 3 if not specified
        if not target_url.startswith("postgresql+"):
            target_url = target_url.replace("postgresql://", "postgresql+psycopg://").replace("postgres://", "postgresql+psycopg://")
        try:
            eng = create_engine(target_url, pool_pre_ping=True)
            with eng.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info(f"Connected successfully to PostgreSQL at {target_url.split('@')[-1] if '@' in target_url else 'target'}")
            return eng
        except Exception as e:
            logger.warning(f"PostgreSQL connection failed ({e}). Falling back to local SQLite governance database.")
            sqlite_url = f"sqlite:///{DATA_DIR / 'governance.db'}"
            return create_engine(sqlite_url, connect_args={"check_same_thread": False})
    else:
        # Default SQLite
        return create_engine(target_url, connect_args={"check_same_thread": False})

engine = _get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    """Create all tables defined in Base metadata."""
    Base.metadata.create_all(bind=engine)
    logger.info("Governance database tables verified/created.")

def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency for database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
