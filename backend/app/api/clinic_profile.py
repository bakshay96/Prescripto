"""
Clinic Profile API — manages prescription header data (hospital name, doctor details, facilities).
One profile per clinic, auto-created on first GET.
All data stored in MongoDB clinic_profiles collection.
"""
import uuid
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.database import get_db
from app.api.deps import get_current_user, get_clinic_id

router = APIRouter(prefix="/clinic-profile", tags=["Clinic Profile"])


# ─── Pydantic schemas ─────────────────────────────────────────────────────────

class ClinicProfileUpdate(BaseModel):
    hospital_name_en: Optional[str] = None
    hospital_name_mr: Optional[str] = None
    doctor_name_en: Optional[str] = None
    doctor_name_mr: Optional[str] = None
    qualifications: Optional[str] = None
    reg_number: Optional[str] = None
    specialties: Optional[str] = None
    clinic_hours: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    uhid_prefix: Optional[str] = None
    default_lang: Optional[str] = None
    facilities: Optional[List[str]] = None
    signature_data_url: Optional[str] = None


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _get_or_create_profile(clinic_id: str, db) -> dict:
    profile = db["clinic_profiles"].find_one({"clinic_id": clinic_id})
    if not profile:
        now = datetime.now(timezone.utc).isoformat()
        profile = {
            "_id": str(uuid.uuid4()),
            "clinic_id": clinic_id,
            "hospital_name_en": "",
            "hospital_name_mr": "",
            "doctor_name_en": "",
            "doctor_name_mr": "",
            "qualifications": "",
            "reg_number": "",
            "specialties": "",
            "clinic_hours": "",
            "address": "",
            "phone": "",
            "uhid_prefix": "U.H.I.D.",
            "default_lang": "en",
            "facilities": [],
            "signature_data_url": None,
            "created_at": now,
            "updated_at": now,
        }
        db["clinic_profiles"].insert_one(profile)
    return profile


def _format_profile(profile: dict) -> dict:
    return {
        "id": str(profile.get("_id", "")),
        "clinic_id": profile.get("clinic_id", ""),
        "hospital_name_en": profile.get("hospital_name_en", ""),
        "hospital_name_mr": profile.get("hospital_name_mr"),
        "doctor_name_en": profile.get("doctor_name_en", ""),
        "doctor_name_mr": profile.get("doctor_name_mr"),
        "qualifications": profile.get("qualifications"),
        "reg_number": profile.get("reg_number"),
        "specialties": profile.get("specialties"),
        "clinic_hours": profile.get("clinic_hours"),
        "address": profile.get("address"),
        "phone": profile.get("phone"),
        "uhid_prefix": profile.get("uhid_prefix"),
        "default_lang": profile.get("default_lang", "mr"),
        "facilities": profile.get("facilities", []),
        "signature_data_url": profile.get("signature_data_url"),
    }


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("")
def get_clinic_profile(current_user: dict = Depends(get_current_user)):
    """Get or auto-create the clinic's prescription profile."""
    db = get_db()
    clinic_id = get_clinic_id(current_user)
    profile = _get_or_create_profile(clinic_id, db)
    return _format_profile(profile)


@router.put("")
def update_clinic_profile(
    data: ClinicProfileUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update clinic prescription profile fields and sync across user & clinic records."""
    db = get_db()
    clinic_id = get_clinic_id(current_user)
    profile = _get_or_create_profile(clinic_id, db)

    updates = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    db["clinic_profiles"].update_one(
        {"clinic_id": clinic_id},
        {"$set": updates}
    )

    # Sync updated doctor name to users table
    if data.doctor_name_en and data.doctor_name_en.strip():
        db["users"].update_many(
            {"clinic_id": clinic_id, "role": {"$in": ["DOCTOR", "CLINIC_ADMIN"]}},
            {"$set": {"full_name": data.doctor_name_en, "name": data.doctor_name_en}}
        )
        if current_user.get("_id"):
            db["users"].update_one(
                {"_id": current_user["_id"]},
                {"$set": {"full_name": data.doctor_name_en, "name": data.doctor_name_en}}
            )

    # Sync updated hospital name & phone to clinics table
    clinic_updates = {}
    if data.hospital_name_en and data.hospital_name_en.strip():
        clinic_updates["name"] = data.hospital_name_en
        clinic_updates["hospital_name"] = data.hospital_name_en
    if data.doctor_name_en and data.doctor_name_en.strip():
        clinic_updates["owner_name"] = data.doctor_name_en
        clinic_updates["doctor_name"] = data.doctor_name_en
    if data.phone and data.phone.strip():
        clinic_updates["phone"] = data.phone

    if clinic_updates:
        db["clinics"].update_one(
            {"_id": clinic_id},
            {"$set": clinic_updates}
        )

    updated = db["clinic_profiles"].find_one({"clinic_id": clinic_id})
    return _format_profile(updated)
