from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.medicine import Medicine
from app.models.stock_transaction import StockTransaction, TransactionType
from app.models.user import User
from app.schemas.medicine import MedicineCreate, MedicineUpdate, MedicineOut, RestockInput, StockAdjustmentInput
from app.api.deps import get_current_user, require_pharmacist

router = APIRouter(prefix="/inventory", tags=["Medical Store Inventory"])

@router.post("/medicines", response_model=MedicineOut, status_code=status.HTTP_201_CREATED)
def add_medicine(
    medicine_in: MedicineCreate,
    current_user: User = Depends(require_pharmacist),
    db: Session = Depends(get_db)
):
    medicine = Medicine(
        clinic_id=current_user.clinic_id,
        **medicine_in.model_dump()
    )
    db.add(medicine)
    db.commit()
    db.refresh(medicine)

    if medicine.stock_quantity > 0:
        log = StockTransaction(
            medicine_id=medicine.id,
            transaction_type=TransactionType.RESTOCK,
            quantity=medicine.stock_quantity,
            resulting_stock=medicine.stock_quantity,
            performed_by_id=current_user.id,
            notes="Initial stock entry"
        )
        db.add(log)
        db.commit()

    return medicine

@router.get("/medicines", response_model=List[MedicineOut])
def list_medicines(
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search by medicine name or batch number"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Medicine).filter(Medicine.clinic_id == current_user.clinic_id)
    if category:
        query = query.filter(Medicine.category.ilike(f"%{category}%"))
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Medicine.name.ilike(search_pattern)) | (Medicine.batch_number.ilike(search_pattern))
        )
    return query.order_by(Medicine.name.asc()).all()

@router.get("/medicines/{medicine_id}", response_model=MedicineOut)
def get_medicine(
    medicine_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    medicine = db.query(Medicine).filter(
        Medicine.id == medicine_id,
        Medicine.clinic_id == current_user.clinic_id
    ).first()
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found in inventory")
    return medicine

@router.put("/medicines/{medicine_id}", response_model=MedicineOut)
def update_medicine(
    medicine_id: str,
    medicine_in: MedicineUpdate,
    current_user: User = Depends(require_pharmacist),
    db: Session = Depends(get_db)
):
    medicine = db.query(Medicine).filter(
        Medicine.id == medicine_id,
        Medicine.clinic_id == current_user.clinic_id
    ).first()
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")

    update_data = medicine_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(medicine, field, value)

    db.commit()
    db.refresh(medicine)
    return medicine

@router.post("/medicines/{medicine_id}/restock", response_model=MedicineOut)
def restock_medicine(
    medicine_id: str,
    restock_in: RestockInput,
    current_user: User = Depends(require_pharmacist),
    db: Session = Depends(get_db)
):
    medicine = db.query(Medicine).filter(
        Medicine.id == medicine_id,
        Medicine.clinic_id == current_user.clinic_id
    ).with_for_update().first()
    
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")

    medicine.stock_quantity += restock_in.quantity
    
    log = StockTransaction(
        medicine_id=medicine.id,
        transaction_type=TransactionType.RESTOCK,
        quantity=restock_in.quantity,
        resulting_stock=medicine.stock_quantity,
        performed_by_id=current_user.id,
        notes=restock_in.notes
    )
    db.add(log)
    db.commit()
    db.refresh(medicine)
    return medicine

@router.post("/medicines/{medicine_id}/adjust", response_model=MedicineOut)
def adjust_stock(
    medicine_id: str,
    adjust_in: StockAdjustmentInput,
    current_user: User = Depends(require_pharmacist),
    db: Session = Depends(get_db)
):
    medicine = db.query(Medicine).filter(
        Medicine.id == medicine_id,
        Medicine.clinic_id == current_user.clinic_id
    ).with_for_update().first()
    
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")

    new_stock = medicine.stock_quantity + adjust_in.quantity_change
    if new_stock < 0:
        raise HTTPException(status_code=400, detail="Stock quantity cannot be negative")

    medicine.stock_quantity = new_stock
    
    log = StockTransaction(
        medicine_id=medicine.id,
        transaction_type=TransactionType.ADJUSTMENT,
        quantity=adjust_in.quantity_change,
        resulting_stock=medicine.stock_quantity,
        performed_by_id=current_user.id,
        notes=adjust_in.reason
    )
    db.add(log)
    db.commit()
    db.refresh(medicine)
    return medicine

@router.get("/alerts/low-stock", response_model=List[MedicineOut])
def get_low_stock_alerts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    medicines = db.query(Medicine).filter(
        Medicine.clinic_id == current_user.clinic_id,
        Medicine.stock_quantity <= Medicine.min_stock_alert
    ).all()
    return medicines

@router.get("/alerts/expiring", response_model=List[MedicineOut])
def get_expiring_alerts(
    days_threshold: int = Query(30, description="Alert if expiring within N days"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cutoff_date = date.today()
    target_date = date.fromordinal(cutoff_date.toordinal() + days_threshold)
    
    medicines = db.query(Medicine).filter(
        Medicine.clinic_id == current_user.clinic_id,
        Medicine.expiry_date <= target_date
    ).order_by(Medicine.expiry_date.asc()).all()
    return medicines
