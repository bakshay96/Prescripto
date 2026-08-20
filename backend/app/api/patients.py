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


class PatientQuickCreate(BaseModel):
    """Minimal form — used in prescription writer inline creation."""
    name: str
    village_location: str = ""
    date_of_birth: str = "1990-01-01"
    gender: str = "MALE"
    phone: Optional[str] = None


# ─── Helpers ─────────────────────────────────────────────────────────────────

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

    patient_id = str(uuid.uuid4())
    doc = {
        "_id": patient_id,
        "clinic_id": clinic_id,
        "name": patient_in.name.strip(),
        "village_location": (patient_in.village_location or "Motala").strip(),
        "date_of_birth": (patient_in.date_of_birth or "1990-01-01").split("T")[0],
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

    patient_id = str(uuid.uuid4())
    doc = {
        "_id": patient_id,
        "clinic_id": clinic_id,
        "name": name,
        "village_location": (patient_in.village_location or "Motala").strip(),
        "date_of_birth": (patient_in.date_of_birth or "1990-01-01").split("T")[0],
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
