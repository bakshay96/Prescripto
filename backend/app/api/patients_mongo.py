"""
Compatibility stub — /api/v1/mongo/patients
Forwards to the same MongoDB backend as /api/v1/patients.
Kept so the frontend's quickCreatePatient() calls still work.
"""
import uuid
from typing import Optional, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.core.database import get_db
from app.api.deps import get_current_user_optional, get_clinic_id
from app.api.patients import _format_patient, _calc_age, PatientQuickCreate

router = APIRouter(prefix="/mongo/patients", tags=["Patients (MongoDB)"])


@router.post("", status_code=201)
def create_patient_mongo_compat(
    patient_in: PatientQuickCreate,
    current_user: Optional[dict] = Depends(get_current_user_optional),
):
    """Compat route — same as /patients/quick. Used by frontend quickCreatePatient()."""
    db = get_db()
    clinic_id = get_clinic_id(current_user) if current_user else "c1111111-1111-1111-1111-111111111111"

    name = patient_in.name.strip()
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
def list_patients_mongo_compat(
    search: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    current_user: Optional[dict] = Depends(get_current_user_optional),
):
    """Compat route — same as GET /patients."""
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
