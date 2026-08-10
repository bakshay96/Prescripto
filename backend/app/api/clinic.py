from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.clinic import Clinic
from app.models.user import User
from app.schemas.clinic import ClinicCreate, ClinicUpdate, ClinicOut
from app.api.deps import get_current_user, require_doctor

router = APIRouter(prefix="/clinic", tags=["Clinic / Hospital Entity"])

@router.post("", response_model=ClinicOut, status_code=status.HTTP_201_CREATED)
def create_clinic(clinic_in: ClinicCreate, db: Session = Depends(get_db)):
    clinic = Clinic(**clinic_in.model_dump())
    db.add(clinic)
    db.commit()
    db.refresh(clinic)
    return clinic

@router.get("/me", response_model=ClinicOut)
def get_my_clinic(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    clinic = db.query(Clinic).filter(Clinic.id == current_user.clinic_id).first()
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
    return clinic

@router.put("/me", response_model=ClinicOut)
def update_my_clinic(
    clinic_in: ClinicUpdate,
    current_user: User = Depends(require_doctor),
    db: Session = Depends(get_db)
):
    clinic = db.query(Clinic).filter(Clinic.id == current_user.clinic_id).first()
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")

    update_data = clinic_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(clinic, field, value)

    db.commit()
    db.refresh(clinic)
    return clinic
