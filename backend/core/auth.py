import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Tuple, Dict, Any
import bcrypt
import jwt
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import select

from config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRY_MINUTES
from core.database import get_db
from models.governance import User, Membership, Agent, AgentKey, Organization

security_bearer = HTTPBearer(auto_error=False)

def hash_password(password: str) -> str:
    """Hash password using bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against bcrypt hash."""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Issue short-lived signed JWT access token."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=JWT_EXPIRY_MINUTES)
    to_encode.update({"exp": expire, "iat": now})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_access_token(token: str) -> Dict[str, Any]:
    """Decode and validate access token signature and expiration."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access token expired"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token"
        )

def generate_agent_key() -> Tuple[str, str, str]:
    """
    Generates a secure revocable agent key.
    Returns: (plain_key, key_hash, key_prefix)
    """
    token_entropy = secrets.token_hex(24)
    prefix = "halo_ak_live_"
    plain_key = f"{prefix}{token_entropy}"
    key_hash = hashlib.sha256(plain_key.encode("utf-8")).hexdigest()
    return plain_key, key_hash, prefix

def hash_agent_key(plain_key: str) -> str:
    """Calculates SHA-256 hash of agent key for lookup."""
    return hashlib.sha256(plain_key.strip().encode("utf-8")).hexdigest()

def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db)
) -> User:
    """Validates bearer token and returns authenticated human user."""
    if not auth or not auth.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    payload = decode_access_token(auth.credentials)
    user_id: Optional[str] = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user subject"
        )
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    return user

def require_membership(
    organization_id: str,
    user: User,
    db: Session,
    allowed_roles: Optional[List[str]] = None
) -> Membership:
    """
    Enforces multi-tenant workspace boundary.
    A workspace ID alone never grants access; membership is checked explicitly.
    """
    membership = db.query(Membership).filter(
        Membership.user_id == user.id,
        Membership.organization_id == organization_id
    ).first()

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this workspace organization"
        )

    if allowed_roles and membership.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Operation requires one of roles: {', '.join(allowed_roles)}. Your role is '{membership.role}'."
        )

    return membership

def authenticate_agent(
    x_agent_key: Optional[str] = Header(None, alias="X-Agent-Key"),
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db)
) -> Tuple[Agent, Organization]:
    """
    Authenticates an agent via revocable agent key.
    Checks revocations, expiration, and agent status.
    Returns: (Agent, Organization)
    """
    raw_key = x_agent_key
    if not raw_key and auth and auth.credentials:
        if auth.credentials.startswith("halo_ak_"):
            raw_key = auth.credentials

    if not raw_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Agent authentication key required via 'X-Agent-Key' header or Bearer halo_ak_..."
        )

    key_hash = hash_agent_key(raw_key)
    agent_key_record = db.query(AgentKey).filter(
        AgentKey.key_hash == key_hash
    ).first()

    if not agent_key_record or agent_key_record.is_revoked:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked agent key"
        )

    if agent_key_record.expires_at and agent_key_record.expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Agent key has expired"
        )

    agent = db.query(Agent).filter(Agent.id == agent_key_record.agent_id).first()
    if not agent or not agent.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Agent identity is disabled or inactive"
        )

    org = db.query(Organization).filter(Organization.id == agent.organization_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization for agent not found"
        )

    return agent, org
