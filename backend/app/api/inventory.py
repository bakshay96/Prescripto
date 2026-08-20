"""
Medical Store Inventory API — Pure MongoDB Implementation.
Routes: /inventory/medicines  (same as before — frontend unchanged)
"""
import uuid
from typing import List, Optional
from datetime import date, datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.core.database import get_db
from app.api.deps import get_current_user, require_pharmacist, get_clinic_id

router = APIRouter(prefix="/inventory", tags=["Medical Store Inventory"])


# ─── Pydantic schemas ─────────────────────────────────────────────────────────

class MedicineCreate(BaseModel):
    name: str
    category: str = "General"
    stock_quantity: int = 0
    price: float = 0.0
    expiry_date: str = "2026-12-31"
    batch_number: str = ""
    unit: str = "Tablets"
    min_stock_alert: int = 10
    provider_name: Optional[str] = None
    provider_contact: Optional[str] = None
    hsn_code: Optional[str] = None
    rack_location: Optional[str] = None


class MedicineUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    stock_quantity: Optional[int] = None
    price: Optional[float] = None
    expiry_date: Optional[str] = None
    batch_number: Optional[str] = None
    unit: Optional[str] = None
    min_stock_alert: Optional[int] = None
    provider_name: Optional[str] = None
    provider_contact: Optional[str] = None
    hsn_code: Optional[str] = None
    rack_location: Optional[str] = None


class RestockInput(BaseModel):
    quantity: int
    notes: Optional[str] = None


class StockAdjustmentInput(BaseModel):
    quantity_change: int
    reason: Optional[str] = None


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _is_low_stock(doc: dict) -> bool:
    return doc.get("stock_quantity", 0) <= doc.get("min_stock_alert", 10)


def _is_expired(doc: dict) -> bool:
    expiry = doc.get("expiry_date", "")
    if not expiry:
        return False
    try:
        exp_date = datetime.strptime(str(expiry).split("T")[0], "%Y-%m-%d").date()
        return exp_date < date.today()
    except Exception:
        return False


def _format_medicine(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "clinic_id": doc.get("clinic_id", ""),
        "name": doc.get("name", ""),
        "category": doc.get("category", "General"),
        "stock_quantity": doc.get("stock_quantity", 0),
        "price": float(doc.get("price", 0.0)),
        "expiry_date": doc.get("expiry_date", ""),
        "batch_number": doc.get("batch_number", ""),
        "unit": doc.get("unit", "Tablets"),
        "min_stock_alert": doc.get("min_stock_alert", 10),
        "is_low_stock": _is_low_stock(doc),
        "is_expired": _is_expired(doc),
        "provider_name": doc.get("provider_name"),
        "provider_contact": doc.get("provider_contact"),
        "hsn_code": doc.get("hsn_code"),
        "rack_location": doc.get("rack_location"),
    }


def _log_transaction(db, medicine_id: str, txn_type: str, quantity: int,
                     resulting_stock: int, performed_by_id: str,
                     prescription_id: Optional[str] = None, notes: Optional[str] = None):
    db["stock_transactions"].insert_one({
        "_id": str(uuid.uuid4()),
        "medicine_id": medicine_id,
        "transaction_type": txn_type,
        "quantity": quantity,
        "resulting_stock": resulting_stock,
        "performed_by_id": performed_by_id,
        "prescription_id": prescription_id,
        "notes": notes,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/medicines", status_code=status.HTTP_201_CREATED)
def add_medicine(
    medicine_in: MedicineCreate,
    current_user: dict = Depends(require_pharmacist),
):
    """Pharmacist-only: add a new medicine to the clinic's inventory."""
    db = get_db()
    clinic_id = get_clinic_id(current_user)
    medicine_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    doc = {
        "_id": medicine_id,
        "clinic_id": clinic_id,
        "name": medicine_in.name.strip(),
        "category": medicine_in.category,
        "stock_quantity": medicine_in.stock_quantity,
        "price": medicine_in.price,
        "expiry_date": medicine_in.expiry_date,
        "batch_number": medicine_in.batch_number,
        "unit": medicine_in.unit,
        "min_stock_alert": medicine_in.min_stock_alert,
        "provider_name": medicine_in.provider_name,
        "provider_contact": medicine_in.provider_contact,
        "hsn_code": medicine_in.hsn_code,
        "rack_location": medicine_in.rack_location,
        "created_at": now,
        "updated_at": now,
    }
    db["medicines"].insert_one(doc)

    if medicine_in.stock_quantity > 0:
        _log_transaction(
            db, medicine_id, "RESTOCK", medicine_in.stock_quantity,
            medicine_in.stock_quantity, str(current_user["_id"]),
            notes="Initial stock entry"
        )

    return _format_medicine(doc)


@router.get("/medicines/autocomplete")
def autocomplete_medicines(
    q: str = Query("", description="Search term"),
    limit: int = Query(20, le=100),
    current_user: dict = Depends(get_current_user),
):
    """Lightweight search for prescription writer medicine dropdown."""
    db = get_db()
    clinic_id = get_clinic_id(current_user)

    query_filter: dict = {"clinic_id": clinic_id}
    if q:
        query_filter["name"] = {"$regex": q, "$options": "i"}

    docs = list(db["medicines"].find(query_filter).sort("name", 1).limit(limit))
    return [
        {
            "id": str(d["_id"]),
            "name": d.get("name", ""),
            "category": d.get("category", ""),
            "unit": d.get("unit", "Tablets"),
            "stock_quantity": d.get("stock_quantity", 0),
            "is_low_stock": _is_low_stock(d),
        }
        for d in docs
    ]


@router.get("/medicines")
def list_medicines(
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    clinic_id = get_clinic_id(current_user)

    query_filter: dict = {"clinic_id": clinic_id}
    if category:
        query_filter["category"] = {"$regex": category, "$options": "i"}
    if search:
        query_filter["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"batch_number": {"$regex": search, "$options": "i"}},
        ]

    docs = list(db["medicines"].find(query_filter).sort("name", 1))
    return [_format_medicine(d) for d in docs]


@router.get("/medicines/{medicine_id}")
def get_medicine(
    medicine_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    clinic_id = get_clinic_id(current_user)
    doc = db["medicines"].find_one({"_id": medicine_id, "clinic_id": clinic_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Medicine not found")
    return _format_medicine(doc)


@router.put("/medicines/{medicine_id}")
def update_medicine(
    medicine_id: str,
    medicine_in: MedicineUpdate,
    current_user: dict = Depends(require_pharmacist),
):
    db = get_db()
    clinic_id = get_clinic_id(current_user)
    doc = db["medicines"].find_one({"_id": medicine_id, "clinic_id": clinic_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Medicine not found")

    updates = {k: v for k, v in medicine_in.model_dump(exclude_unset=True).items() if v is not None}
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    db["medicines"].update_one({"_id": medicine_id}, {"$set": updates})

    updated = db["medicines"].find_one({"_id": medicine_id})
    return _format_medicine(updated)


@router.post("/medicines/{medicine_id}/restock")
def restock_medicine(
    medicine_id: str,
    restock_in: RestockInput,
    current_user: dict = Depends(require_pharmacist),
):
    db = get_db()
    clinic_id = get_clinic_id(current_user)
    doc = db["medicines"].find_one({"_id": medicine_id, "clinic_id": clinic_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Medicine not found")

    new_qty = doc["stock_quantity"] + restock_in.quantity
    db["medicines"].update_one(
        {"_id": medicine_id},
        {"$set": {"stock_quantity": new_qty, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    _log_transaction(
        db, medicine_id, "RESTOCK", restock_in.quantity,
        new_qty, str(current_user["_id"]), notes=restock_in.notes
    )

    updated = db["medicines"].find_one({"_id": medicine_id})
    return _format_medicine(updated)


@router.post("/medicines/{medicine_id}/adjust")
def adjust_stock(
    medicine_id: str,
    adjust_in: StockAdjustmentInput,
    current_user: dict = Depends(require_pharmacist),
):
    db = get_db()
    clinic_id = get_clinic_id(current_user)
    doc = db["medicines"].find_one({"_id": medicine_id, "clinic_id": clinic_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Medicine not found")

    new_qty = doc["stock_quantity"] + adjust_in.quantity_change
    if new_qty < 0:
        raise HTTPException(status_code=400, detail="Stock quantity cannot be negative")

    db["medicines"].update_one(
        {"_id": medicine_id},
        {"$set": {"stock_quantity": new_qty, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    _log_transaction(
        db, medicine_id, "ADJUSTMENT", adjust_in.quantity_change,
        new_qty, str(current_user["_id"]), notes=adjust_in.reason
    )

    updated = db["medicines"].find_one({"_id": medicine_id})
    return _format_medicine(updated)


@router.get("/alerts/low-stock")
def get_low_stock_alerts(current_user: dict = Depends(get_current_user)):
    db = get_db()
    clinic_id = get_clinic_id(current_user)
    docs = list(db["medicines"].find({
        "clinic_id": clinic_id,
        "$expr": {"$lte": ["$stock_quantity", "$min_stock_alert"]}
    }))
    return [_format_medicine(d) for d in docs]


@router.get("/alerts/expiring")
def get_expiring_alerts(
    days_threshold: int = Query(30),
    current_user: dict = Depends(get_current_user),
):
    from datetime import timedelta
    db = get_db()
    clinic_id = get_clinic_id(current_user)
    cutoff = (date.today() + timedelta(days=days_threshold)).isoformat()

    docs = list(db["medicines"].find({
        "clinic_id": clinic_id,
        "expiry_date": {"$lte": cutoff}
    }).sort("expiry_date", 1))
    return [_format_medicine(d) for d in docs]
