import random
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from app.core.database import get_db
from app.models.prescription import Prescription, PrescriptionItem, PrescriptionStatus
from app.models.medicine import Medicine
from app.models.patient import Patient
from app.models.stock_transaction import StockTransaction, TransactionType
from app.models.user import User, UserRole
from app.schemas.prescription import PrescriptionCreate, PrescriptionOut, DispenseResponse
from app.api.deps import get_current_user, require_doctor, require_pharmacist

router = APIRouter(prefix="/prescriptions", tags=["Prescription & Dispensing"])

def generate_prescription_number() -> str:
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    random_digits = random.randint(100, 999)
    return f"RX-{timestamp}-{random_digits}"

@router.post("", response_model=PrescriptionOut, status_code=status.HTTP_201_CREATED)
def create_prescription(
    prescription_in: PrescriptionCreate,
    current_user: User = Depends(require_doctor),
    db: Session = Depends(get_db)
):
    patient = db.query(Patient).filter(
        Patient.id == prescription_in.patient_id,
        Patient.clinic_id == current_user.clinic_id
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found in this clinic")

    rx_number = generate_prescription_number()
    prescription = Prescription(
        clinic_id=current_user.clinic_id,
        prescription_number=rx_number,
        doctor_id=current_user.id,
        patient_id=prescription_in.patient_id,
        diagnosis=prescription_in.diagnosis,
        notes=prescription_in.notes,
        status=PrescriptionStatus.PENDING
    )
    db.add(prescription)
    db.flush()

    for item in prescription_in.items:
        med = db.query(Medicine).filter(
            Medicine.id == item.medicine_id,
            Medicine.clinic_id == current_user.clinic_id
        ).first()
        if not med:
            db.rollback()
            raise HTTPException(status_code=404, detail=f"Medicine ID {item.medicine_id} not found in inventory")
        
        rx_item = PrescriptionItem(
            prescription_id=prescription.id,
            medicine_id=item.medicine_id,
            dosage=item.dosage,
            frequency=item.frequency,
            duration_days=item.duration_days,
            quantity_prescribed=item.quantity_prescribed,
            quantity_dispensed=0,
            instructions=item.instructions
        )
        db.add(rx_item)

    db.commit()
    db.refresh(prescription)
    return db.query(Prescription).options(
        joinedload(Prescription.patient),
        joinedload(Prescription.items).joinedload(PrescriptionItem.medicine)
    ).filter(Prescription.id == prescription.id).first()

@router.get("", response_model=List[PrescriptionOut])
def list_prescriptions(
    status_filter: Optional[PrescriptionStatus] = Query(None, alias="status"),
    patient_id: Optional[str] = Query(None),
    doctor_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Prescription).options(
        joinedload(Prescription.patient),
        joinedload(Prescription.items).joinedload(PrescriptionItem.medicine)
    ).filter(Prescription.clinic_id == current_user.clinic_id)

    if status_filter:
        query = query.filter(Prescription.status == status_filter)
    if patient_id:
        query = query.filter(Prescription.patient_id == patient_id)
    if doctor_id:
        query = query.filter(Prescription.doctor_id == doctor_id)

    return query.order_by(Prescription.created_at.desc()).all()

@router.get("/{prescription_id}", response_model=PrescriptionOut)
def get_prescription(
    prescription_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    rx = db.query(Prescription).options(
        joinedload(Prescription.patient),
        joinedload(Prescription.items).joinedload(PrescriptionItem.medicine)
    ).filter(
        Prescription.id == prescription_id,
        Prescription.clinic_id == current_user.clinic_id
    ).first()

    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")
    return rx

@router.post("/{prescription_id}/dispense", response_model=DispenseResponse)
def dispense_prescription(
    prescription_id: str,
    current_user: User = Depends(require_pharmacist),
    db: Session = Depends(get_db)
):
    rx = db.query(Prescription).options(
        joinedload(Prescription.items)
    ).filter(
        Prescription.id == prescription_id,
        Prescription.clinic_id == current_user.clinic_id
    ).with_for_update().first()

    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")

    if rx.status != PrescriptionStatus.PENDING:
        raise HTTPException(status_code=400, detail=f"Prescription cannot be dispensed. Current status: {rx.status}")

    insufficient_items = []
    for item in rx.items:
        med = db.query(Medicine).filter(Medicine.id == item.medicine_id).with_for_update().first()
        if not med or med.stock_quantity < item.quantity_prescribed:
            avail = med.stock_quantity if med else 0
            insufficient_items.append(f"{med.name if med else 'Unknown'}: Needed {item.quantity_prescribed}, Available {avail}")

    if insufficient_items:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient stock to dispense prescription: {'; '.join(insufficient_items)}"
        )

    now = datetime.now(timezone.utc)
    for item in rx.items:
        med = db.query(Medicine).filter(Medicine.id == item.medicine_id).first()
        med.stock_quantity -= item.quantity_prescribed
        item.quantity_dispensed = item.quantity_prescribed

        log = StockTransaction(
            medicine_id=med.id,
            transaction_type=TransactionType.DISPENSED,
            quantity=-item.quantity_prescribed,
            resulting_stock=med.stock_quantity,
            performed_by_id=current_user.id,
            prescription_id=rx.id,
            notes=f"Dispensed for Prescription {rx.prescription_number}"
        )
        db.add(log)

    rx.status = PrescriptionStatus.DISPENSED
    rx.dispensed_at = now

    db.commit()

    return DispenseResponse(
        prescription_id=rx.id,
        prescription_number=rx.prescription_number,
        status=rx.status,
        dispensed_at=now,
        message="Prescription successfully dispensed and inventory updated."
    )

@router.post("/{prescription_id}/cancel", response_model=PrescriptionOut)
def cancel_prescription(
    prescription_id: str,
    current_user: User = Depends(require_doctor),
    db: Session = Depends(get_db)
):
    rx = db.query(Prescription).filter(
        Prescription.id == prescription_id,
        Prescription.clinic_id == current_user.clinic_id
    ).first()

    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")

    if rx.status == PrescriptionStatus.DISPENSED:
        raise HTTPException(status_code=400, detail="Cannot cancel an already dispensed prescription")

    rx.status = PrescriptionStatus.CANCELLED
    db.commit()
    db.refresh(rx)
    return rx
