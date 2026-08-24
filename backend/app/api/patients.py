"""
Patient API Router — Pure MongoDB Implementation.
Handles patient registration, listing, and retrieval for a clinic.
Routes: /patients  (same as before — frontend unchanged)
"""
import uuid
from typing import List, Optional
from datetime import date, datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.core.database import get_db
from app.api.deps import get_current_user, get_current_user_optional, get_clinic_id

router = APIRouter(prefix="/patients", tags=["Patient Entity"])


# ─── Pydantic schemas ─────────────────────────────────────────────────────────

class PatientCreate(BaseModel):
    name: str
    village_location: str = ""
    date_of_birth: str = "1990-01-01"
    age_years: Optional[int] = None
    age_months: Optional[int] = None
    gender: str = "MALE"
    phone: Optional[str] = None
    medical_history: Optional[str] = None


class PatientUpdate(BaseModel):
    name: Optional[str] = None
    village_location: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    medical_history: Optional[str] = None
    status: Optional[str] = None  # ACTIVE | BANNED | SUSPENDED
    is_banned: Optional[bool] = None
    ban_reason: Optional[str] = None


class PatientQuickCreate(BaseModel):
    """Minimal form — used in prescription writer inline creation."""
    name: str
    village_location: str = ""
    date_of_birth: Optional[str] = None
    age_years: Optional[int] = None
    age_months: Optional[int] = None
    gender: str = "MALE"
    phone: Optional[str] = None


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _derive_dob_from_age(age_years: Optional[int], age_months: Optional[int]) -> str:
    """Helper to convert direct age (e.g. 28 years 6 months) to DOB string YYYY-MM-DD."""
    today = date.today()
    y = age_years if (age_years is not None and age_years >= 0) else 30
    m = age_months if (age_months is not None and 0 <= age_months < 12) else 0
    dob_year = today.year - y
    dob_month = today.month - m
    if dob_month <= 0:
        dob_month += 12
        dob_year -= 1
    return f"{dob_year:04d}-{dob_month:02d}-01"

def _calc_age(dob_val) -> dict:
    if isinstance(dob_val, str):
        dob_str = dob_val.split("T")[0]
        try:
            dob = datetime.strptime(dob_str, "%Y-%m-%d").date()
        except Exception:
            dob = date(1990, 1, 1)
    elif isinstance(dob_val, date):
        dob = dob_val
    else:
        dob = date(1990, 1, 1)

    today = date.today()
    years = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    months = (today.month - dob.month) % 12
    return {
        "years": max(0, years),
        "months": max(0, months),
        "days": 0,
        "formatted": f"{max(0, years)}y {max(0, months)}m",
    }


def _format_patient(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "clinic_id": doc.get("clinic_id", ""),
        "name": doc.get("name", ""),
        "village_location": doc.get("village_location", ""),
        "gender": doc.get("gender", "MALE"),
        "phone": doc.get("phone"),
        "date_of_birth": doc.get("date_of_birth", "1990-01-01"),
        "medical_history": doc.get("medical_history"),
        "status": doc.get("status", "ACTIVE"),
        "is_banned": bool(doc.get("is_banned", False) or doc.get("status") == "BANNED"),
        "ban_reason": doc.get("ban_reason"),
        "age": _calc_age(doc.get("date_of_birth", "1990-01-01")),
    }


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("", status_code=status.HTTP_201_CREATED)
def create_patient(
    patient_in: PatientCreate,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    clinic_id = get_clinic_id(current_user)

    dob = (
        _derive_dob_from_age(patient_in.age_years, patient_in.age_months)
        if patient_in.age_years is not None
        else (patient_in.date_of_birth or "1990-01-01").split("T")[0]
    )

    patient_id = str(uuid.uuid4())
    doc = {
        "_id": patient_id,
        "clinic_id": clinic_id,
        "name": patient_in.name.strip(),
        "village_location": (patient_in.village_location or "Motala").strip(),
        "date_of_birth": dob,
        "gender": (patient_in.gender or "MALE").upper(),
        "phone": patient_in.phone,
        "medical_history": patient_in.medical_history,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    db["patients"].insert_one(doc)
    return _format_patient(doc)


@router.post("/quick", status_code=status.HTTP_201_CREATED)
def quick_create_patient(
    patient_in: PatientQuickCreate,
    current_user: Optional[dict] = Depends(get_current_user_optional),
):
    """Inline quick-create for use in the prescription writer dropdown."""
    db = get_db()
    clinic_id = get_clinic_id(current_user) if current_user else "c1111111-1111-1111-1111-111111111111"

    name = patient_in.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Patient name cannot be empty")

    dob = (
        _derive_dob_from_age(patient_in.age_years, patient_in.age_months)
        if patient_in.age_years is not None
        else (patient_in.date_of_birth or "1990-01-01").split("T")[0]
    )

    patient_id = str(uuid.uuid4())
    doc = {
        "_id": patient_id,
        "clinic_id": clinic_id,
        "name": name,
        "village_location": (patient_in.village_location or "Motala").strip(),
        "date_of_birth": dob,
        "gender": (patient_in.gender or "MALE").upper(),
        "phone": patient_in.phone,
        "medical_history": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    db["patients"].insert_one(doc)
    return _format_patient(doc)


@router.get("", response_model=List[dict])
def list_patients(
    search: Optional[str] = Query(None, description="Search by name or village"),
    limit: int = Query(50, le=200),
    current_user: Optional[dict] = Depends(get_current_user_optional),
):
    db = get_db()
    clinic_id = get_clinic_id(current_user) if current_user else "c1111111-1111-1111-1111-111111111111"

    query_filter: dict = {"clinic_id": clinic_id}
    if search:
        query_filter["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"village_location": {"$regex": search, "$options": "i"}},
        ]

    docs = list(db["patients"].find(query_filter).sort("name", 1).limit(limit))
    return [_format_patient(d) for d in docs]


@router.get("/{patient_id}")
def get_patient(
    patient_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    clinic_id = get_clinic_id(current_user)
    doc = db["patients"].find_one({"_id": patient_id, "clinic_id": clinic_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Patient not found")
    return _format_patient(doc)


@router.get("/{patient_id}/history", summary="Get complete patient medical & diagnosis history")
def get_patient_history(
    patient_id: str,
    current_user: Optional[dict] = Depends(get_current_user_optional),
):
    """Returns patient details along with all past OPD visits, diagnoses, and prescriptions."""
    db = get_db()
    patient = db["patients"].find_one({"_id": patient_id})
    if not patient:
        # Fallback search by ID as string or name match
        patient = db["patients"].find_one({"name": {"$regex": patient_id, "$options": "i"}})

    if not patient:
        raise HTTPException(status_code=404, detail="Patient record not found")

    p_data = _format_patient(patient)

    # Fetch past prescriptions for this patient
    prescriptions_raw = list(
        db["prescriptions"]
        .find({"$or": [{"patient_id": patient_id}, {"patient_name": patient["name"]}]})
        .sort("created_at", -1)
    )

    history = []
    for rx in prescriptions_raw:
        history.append({
            "id": str(rx.get("_id", "")),
            "prescription_number": rx.get("prescription_number", "RX-PREVIEW"),
            "doctor_name": rx.get("doctor_name", "Doctor"),
            "diagnosis": rx.get("diagnosis", rx.get("chief_complaints", "General OPD Consultation")),
            "chief_complaints": rx.get("chief_complaints", ""),
            "vitals": rx.get("vitals", {}),
            "medicines": rx.get("items", rx.get("medicines", [])),
            "advice": rx.get("advice", rx.get("instructions", "")),
            "date": rx.get("created_at", datetime.now(timezone.utc).isoformat()),
        })

    return {
        "patient": p_data,
        "total_visits": len(history),
        "history": history,
    }


@router.put("/{patient_id}")
def update_patient(
    patient_id: str,
    patient_in: PatientUpdate,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    clinic_id = get_clinic_id(current_user)
    doc = db["patients"].find_one({"_id": patient_id, "clinic_id": clinic_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Patient not found")

    updates = {k: v for k, v in patient_in.model_dump(exclude_unset=True).items() if v is not None}
    if "gender" in updates:
        updates["gender"] = updates["gender"].upper()
    if updates:
        db["patients"].update_one({"_id": patient_id}, {"$set": updates})

    updated = db["patients"].find_one({"_id": patient_id})
    return _format_patient(updated)


@router.post("/{patient_id}/ban", summary="Ban/Suspend Patient from OPD services")
def ban_patient(
    patient_id: str,
    reason: Optional[str] = Query("Violated hospital OPD rules"),
    current_user: dict = Depends(get_current_user),
):
    """Bans/suspends patient from receiving OPD prescriptions and services."""
    db = get_db()
    clinic_id = get_clinic_id(current_user)
    doc = db["patients"].find_one({"_id": patient_id, "clinic_id": clinic_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Patient not found")

    db["patients"].update_one(
        {"_id": patient_id},
        {"$set": {"status": "BANNED", "is_banned": True, "ban_reason": reason}}
    )
    updated = db["patients"].find_one({"_id": patient_id})
    return {
        "message": f"Patient '{doc.get('name')}' has been banned from OPD services.",
        "patient": _format_patient(updated)
    }


@router.post("/{patient_id}/unban", summary="Unban/Restore Patient to OPD services")
def unban_patient(
    patient_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Restores banned patient back to ACTIVE OPD status."""
    db = get_db()
    clinic_id = get_clinic_id(current_user)
    doc = db["patients"].find_one({"_id": patient_id, "clinic_id": clinic_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Patient not found")

    db["patients"].update_one(
        {"_id": patient_id},
        {"$set": {"status": "ACTIVE", "is_banned": False, "ban_reason": None}}
    )
    updated = db["patients"].find_one({"_id": patient_id})
    return {
        "message": f"Patient '{doc.get('name')}' status restored to ACTIVE.",
        "patient": _format_patient(updated)
    }


@router.delete("/{patient_id}", summary="Delete Patient Record & All Associated Data")
def delete_patient(
    patient_id: str,
    delete_prescriptions: bool = Query(True, description="Whether to also delete all past prescriptions"),
    current_user: dict = Depends(get_current_user),
):
    """Permanently deletes patient record and optionally all prescription history."""
    db = get_db()
    clinic_id = get_clinic_id(current_user)
    doc = db["patients"].find_one({"_id": patient_id, "clinic_id": clinic_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Patient record not found")

    # Delete patient document
    db["patients"].delete_one({"_id": patient_id})

    # Optionally delete prescriptions
    deleted_rxs = 0
    if delete_prescriptions:
        res = db["prescriptions"].delete_many({"$or": [{"patient_id": patient_id}, {"patient_name": doc.get("name")}]})
        deleted_rxs = res.deleted_count

    return {
        "message": f"Patient '{doc.get('name')}' and {deleted_rxs} prescription record(s) permanently deleted.",
        "deleted_patient_id": patient_id,
        "deleted_prescriptions_count": deleted_rxs,
    }


@router.delete("/{patient_id}/history", summary="Clear/Delete Patient History Logs")
def delete_patient_history(
    patient_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Deletes all past OPD visit logs and prescriptions for a patient without deleting the patient profile."""
    db = get_db()
    clinic_id = get_clinic_id(current_user)
    doc = db["patients"].find_one({"_id": patient_id, "clinic_id": clinic_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Patient record not found")

    res = db["prescriptions"].delete_many({"$or": [{"patient_id": patient_id}, {"patient_name": doc.get("name")}]})

    return {
        "message": f"Cleared {res.deleted_count} visit history record(s) for patient '{doc.get('name')}'.",
        "deleted_count": res.deleted_count,
    }
