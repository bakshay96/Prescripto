"""
Authentication & Authorization Dependencies.
All user lookups from MongoDB 'users' collection.
"""
from typing import Optional, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError

from app.core.config import settings
from app.core.database import get_db

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login",
    auto_error=False
)

# Known user roles
ROLE_DOCTOR = "DOCTOR"
ROLE_PHARMACIST = "PHARMACIST"
ROLE_MASTER_ADMIN = "MASTER_ADMIN"


def _decode_token(token: str) -> dict:
    """Decode JWT and return payload dict. Raises 401 on failure."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: Optional[str] = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        return payload
    except JWTError:
        raise credentials_exception


def get_current_user(
    header_token: Optional[str] = Depends(oauth2_scheme),
) -> dict:
    """
    Decodes JWT, loads user from MongoDB.
    Returns the user document as a dict.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not header_token:
        raise credentials_exception

    payload = _decode_token(header_token)
    user_id: str = payload["sub"]

    db = get_db()
    user = db["users"].find_one({"_id": user_id})
    if user is None:
        raise credentials_exception
    if not user.get("is_active", True):
        raise HTTPException(status_code=400, detail="Inactive user account")

    return user


def get_current_user_optional(
    header_token: Optional[str] = Depends(oauth2_scheme),
) -> Optional[dict]:
    """
    Returns user dict if authenticated, or None if no/invalid token.
    Used in routes that work for both authenticated and anonymous access.
    """
    if not header_token:
        return None
    try:
        return get_current_user(header_token=header_token)
    except HTTPException:
        return None


def require_doctor(current_user: dict = Depends(get_current_user)) -> dict:
    role = current_user.get("role", "")
    if role != ROLE_DOCTOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Doctor role required"
        )
    return current_user


def require_pharmacist(current_user: dict = Depends(get_current_user)) -> dict:
    role = current_user.get("role", "")
    if role not in (ROLE_PHARMACIST, ROLE_DOCTOR):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Pharmacist or Doctor role required"
        )
    return current_user


def require_master_admin(current_user: dict = Depends(get_current_user)) -> dict:
    role = current_user.get("role", "")
    if role != ROLE_MASTER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Master Admin role required"
        )
    return current_user


def require_any_role(current_user: dict = Depends(get_current_user)) -> dict:
    """Allows any authenticated user (Doctor, Pharmacist, or Master Admin)."""
    return current_user


def get_clinic_id(current_user: dict) -> str:
    """Extract clinic_id from user dict safely."""
    return current_user.get("clinic_id", "c1111111-1111-1111-1111-111111111111")
