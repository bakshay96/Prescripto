"""
Clinic / Hospital Entity API — Pure MongoDB Implementation.
Routes: /clinic/me
"""
import uuid
from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.database import get_db
from app.api.deps import get_current_user, require_doctor, get_clinic_id

router = APIRouter(prefix="/clinic", tags=["Clinic / Hospital Entity"])


# ─── Pydantic schemas ─────────────────────────────────────────────────────────

class ClinicCreate(BaseModel):
    name: str
    address: str = ""
    phone: str = ""
    email: str = ""
    registration_number: Optional[str] = None


class ClinicUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    registration_number: Optional[str] = None


def _format_clinic(doc: dict) -> dict:
    return {
        "id": str(doc.get("_id", "")),
        "name": doc.get("name", ""),
        "address": doc.get("address", ""),
        "phone": doc.get("phone", ""),
        "email": doc.get("email", ""),
        "registration_number": doc.get("registration_number", ""),
        "is_active": doc.get("is_active", True),
    }


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("", status_code=status.HTTP_201_CREATED)
def create_clinic(clinic_in: ClinicCreate):
    db = get_db()
    clinic_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "_id": clinic_id,
        "name": clinic_in.name,
        "address": clinic_in.address,
        "phone": clinic_in.phone,
        "email": clinic_in.email,
        "registration_number": clinic_in.registration_number or f"CL-{uuid.uuid4().hex[:8].upper()}",
        "is_active": True,
        "created_at": now,
    }
    db["clinics"].insert_one(doc)
    return _format_clinic(doc)


@router.get("/me")
def get_my_clinic(current_user: dict = Depends(get_current_user)):
    db = get_db()
    clinic_id = get_clinic_id(current_user)
    clinic = db["clinics"].find_one({"_id": clinic_id})
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
    return _format_clinic(clinic)


@router.put("/me")
def update_my_clinic(
    clinic_in: ClinicUpdate,
    current_user: dict = Depends(require_doctor),
):
    db = get_db()
    clinic_id = get_clinic_id(current_user)
    clinic = db["clinics"].find_one({"_id": clinic_id})
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")

    updates = {k: v for k, v in clinic_in.model_dump(exclude_unset=True).items() if v is not None}
    if updates:
        db["clinics"].update_one({"_id": clinic_id}, {"$set": updates})

    updated = db["clinics"].find_one({"_id": clinic_id})
    return _format_clinic(updated)
