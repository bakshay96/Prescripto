"""
Authentication and Authorization API Routes.
All data stored in MongoDB. Supports demo logins that auto-seed on first use.
"""
import uuid
from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr

from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Auth & Users"])

# ─── Pydantic schemas ─────────────────────────────────────────────────────────

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: str


class UserOut(BaseModel):
    id: str
    clinic_id: str
    full_name: str
    email: str
    role: str
    license_number: Optional[str] = None
    is_active: bool = True


class UserCreate(BaseModel):
    clinic_id: str
    full_name: str
    email: EmailStr
    password: str
    role: str = "DOCTOR"
    license_number: Optional[str] = None


class HospitalRegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    license_number: Optional[str] = None
    clinic_name: str
    clinic_address: Optional[str] = None
    clinic_phone: Optional[str] = None
    clinic_registration_number: Optional[str] = None


class HospitalRegisterResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: str
    clinic_id: str
    clinic_name: str
    doctor_name: str


# ─── Demo Seed Helper ─────────────────────────────────────────────────────────

_DEMO_PASSWORDS = {
    # New canonical emails (used in frontend login.tsx)
    "doctor@prescripto.com":  "doctor123",
    "pharma@prescripto.com":  "pharma123",
    "admin@prescripto.com":   "admin123",
    # Legacy fallback emails (backward compat)
    "doctor@suyog.com":       "doctor123",
    "pharmacist@suyog.com":   "pharmacist123",
}

_DEMO_ROLES = {
    "doctor@prescripto.com":  "DOCTOR",
    "pharma@prescripto.com":  "PHARMACIST",
    "admin@prescripto.com":   "MASTER_ADMIN",
    "doctor@suyog.com":       "DOCTOR",
    "pharmacist@suyog.com":   "PHARMACIST",
}

_DEMO_NAMES = {
    "doctor@prescripto.com":  "Dr. Vikas Va. Karande",
    "pharma@prescripto.com":  "Suyog Pharmacy Admin",
    "admin@prescripto.com":   "System Admin",
    "doctor@suyog.com":       "Dr. Vikas Va. Karande",
    "pharmacist@suyog.com":   "Suyog Pharmacy Admin",
}

_UID_MAP = {
    "doctor@prescripto.com":  "u-doctor-demo-001",
    "pharma@prescripto.com":  "u-pharmacist-demo-001",
    "admin@prescripto.com":   "u-admin-demo-001",
    "doctor@suyog.com":       "u-doctor-demo-001",
    "pharmacist@suyog.com":   "u-pharmacist-demo-001",
}

_DEFAULT_CLINIC_ID = "c1111111-1111-1111-1111-111111111111"


def _ensure_default_clinic(db) -> str:
    """Ensure the default demo clinic exists in MongoDB."""
    existing = db["clinics"].find_one({"_id": _DEFAULT_CLINIC_ID})
    if not existing:
        db["clinics"].insert_one({
            "_id": _DEFAULT_CLINIC_ID,
            "name": "Suyog Hospital",
            "address": "Tahsil Samore, Buldhana Road, Motala",
            "phone": "7757003800",
            "email": "info@suyog.com",
            "registration_number": "CL-SUYOG-001",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    return _DEFAULT_CLINIC_ID


def _seed_demo_user(email: str, db) -> dict:
    """Auto-seed a demo account in MongoDB if it doesn't exist."""
    _ensure_default_clinic(db)
    user = db["users"].find_one({"email": email})
    if user:
        return user

    role = _DEMO_ROLES[email]
    full_name = _DEMO_NAMES[email]
    password = _DEMO_PASSWORDS[email]
    uid = _UID_MAP.get(email, str(uuid.uuid4()))

    user_doc = {
        "_id": uid,
        "clinic_id": _DEFAULT_CLINIC_ID,
        "full_name": full_name,
        "email": email,
        "hashed_password": get_password_hash(password),
        "role": role,
        "license_number": "MH-DOC-12345" if role == "DOCTOR" else None,
        "is_active": True,
        "is_store_admin": (role == "PHARMACIST"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        db["users"].insert_one(user_doc)
    except Exception:
        user_doc = db["users"].find_one({"email": email}) or user_doc
    return user_doc


# ─── Routes ──────────────────────────────────────────────────────────────────

@router.post(
    "/hospital-register",
    response_model=HospitalRegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new hospital + doctor account in one step",
)
def hospital_register(data: HospitalRegisterRequest):
    db = get_db()

    if db["users"].find_one({"email": data.email}):
        raise HTTPException(status_code=400, detail="Email already registered.")

    clinic_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    clinic_doc = {
        "_id": clinic_id,
        "name": data.clinic_name,
        "address": data.clinic_address or "",
        "phone": data.clinic_phone or "",
        "email": data.email,
        "registration_number": data.clinic_registration_number or f"CL-{uuid.uuid4().hex[:8].upper()}",
        "is_active": True,
        "created_at": now,
    }
    db["clinics"].insert_one(clinic_doc)

    user_id = str(uuid.uuid4())
    user_doc = {
        "_id": user_id,
        "clinic_id": clinic_id,
        "full_name": data.full_name,
        "email": data.email,
        "hashed_password": get_password_hash(data.password),
        "role": "DOCTOR",
        "license_number": data.license_number,
        "is_active": True,
        "is_store_admin": False,
        "created_at": now,
    }
    db["users"].insert_one(user_doc)

    token = create_access_token(subject=user_id, role="DOCTOR")
    return HospitalRegisterResponse(
        access_token=token,
        role="DOCTOR",
        user_id=user_id,
        clinic_id=clinic_id,
        clinic_name=data.clinic_name,
        doctor_name=data.full_name,
    )


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register_user(user_in: UserCreate):
    db = get_db()

    if db["users"].find_one({"email": user_in.email}):
        raise HTTPException(status_code=400, detail="User with this email already exists")

    user_id = str(uuid.uuid4())
    user_doc = {
        "_id": user_id,
        "clinic_id": user_in.clinic_id,
        "full_name": user_in.full_name,
        "email": user_in.email,
        "hashed_password": get_password_hash(user_in.password),
        "role": user_in.role.upper(),
        "license_number": user_in.license_number,
        "is_active": True,
        "is_store_admin": (user_in.role.upper() == "PHARMACIST"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    db["users"].insert_one(user_doc)
    return _user_to_out(user_doc)


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    db = get_db()
    email = form_data.username.strip().lower()
    password = form_data.password.strip()

    user = db["users"].find_one({"email": email})

    # Auto-seed demo accounts on first login attempt
    if not user and email in _DEMO_PASSWORDS:
        user = _seed_demo_user(email, db)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify password — for demo accounts, also accept known demo passwords
    is_demo = email in _DEMO_PASSWORDS
    pw_ok = verify_password(password, user.get("hashed_password", ""))

    if not pw_ok and is_demo and password == _DEMO_PASSWORDS[email]:
        # Update the stored hash to the correct password
        new_hash = get_password_hash(password)
        db["users"].update_one({"_id": user["_id"]}, {"$set": {"hashed_password": new_hash}})
        pw_ok = True

    if not pw_ok:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.get("is_active", True):
        raise HTTPException(status_code=400, detail="Account is inactive")

    role = user.get("role", "DOCTOR")
    token = create_access_token(subject=str(user["_id"]), role=role)
    return Token(access_token=token, role=role, user_id=str(user["_id"]))


@router.get("/me", response_model=UserOut)
def get_me(current_user: dict = Depends(get_current_user)):
    return _user_to_out(current_user)


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _user_to_out(user: dict) -> dict:
    return {
        "id": str(user.get("_id", "")),
        "clinic_id": user.get("clinic_id", ""),
        "full_name": user.get("full_name", ""),
        "email": user.get("email", ""),
        "role": user.get("role", ""),
        "license_number": user.get("license_number"),
        "is_active": user.get("is_active", True),
    }
