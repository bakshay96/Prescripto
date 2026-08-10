from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.patient import Patient
from app.models.user import User
from app.schemas.patient import PatientCreate, PatientUpdate, PatientOut
from app.api.deps import get_current_user

router = APIRouter(prefix="/patients", tags=["Patient Entity"])

@router.post("", response_model=PatientOut, status_code=status.HTTP_201_CREATED)
def create_patient(
    patient_in: PatientCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    patient = Patient(
        clinic_id=current_user.clinic_id,
        **patient_in.model_dump()
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient

@router.get("", response_model=List[PatientOut])
def list_patients(
    search: Optional[str] = Query(None, description="Search by patient name or village/location"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Patient).filter(Patient.clinic_id == current_user.clinic_id)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Patient.name.ilike(search_pattern)) | (Patient.village_location.ilike(search_pattern))
        )
    return query.order_by(Patient.created_at.desc()).all()

@router.get("/{patient_id}", response_model=PatientOut)
def get_patient(
    patient_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    patient = db.query(Patient).filter(
        Patient.id == patient_id,
        Patient.clinic_id == current_user.clinic_id
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient

@router.put("/{patient_id}", response_model=PatientOut)
def update_patient(
    patient_id: str,
    patient_in: PatientUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    patient = db.query(Patient).filter(
        Patient.id == patient_id,
        Patient.clinic_id == current_user.clinic_id
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    update_data = patient_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(patient, field, value)

    db.commit()
    db.refresh(patient)
    return patient
