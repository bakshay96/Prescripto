"""
Medical Store Inventory API — Pure MongoDB Implementation.
Routes: /inventory/medicines  (same as before — frontend unchanged)
"""
import uuid
from typing import List, Optional
from datetime import date, datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

from app.core.database import get_db
from app.api.deps import get_current_user, get_current_user_optional, require_pharmacist, get_clinic_id

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


def _log_transaction(
    db, medicine_id: str, tx_type: str, qty_change: int,
    resulting_stock: int, user_id: str, prescription_id: Optional[str] = None, notes: Optional[str] = None
):
    db["stock_transactions"].insert_one({
        "_id": str(uuid.uuid4()),
        "medicine_id": medicine_id,
        "transaction_type": tx_type,
        "quantity": qty_change,
        "resulting_stock": resulting_stock,
        "performed_by_id": user_id,
        "prescription_id": prescription_id,
        "notes": notes,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })


def _is_low_stock(doc: dict) -> bool:
    if not doc:
        return False
    stock = doc.get("stock_quantity", 0)
    alert = doc.get("min_stock_alert", 10)
    return stock <= alert


def _format_medicine(doc: dict) -> dict:
    if not doc:
        return {}
    price = float(doc.get("price", 0.0))
    price_per_tab = float(doc.get("price_per_tab", price))
    tablets_per_strip = int(doc.get("tablets_per_strip", 10))
    price_per_strip = float(doc.get("price_per_strip", price_per_tab * tablets_per_strip))

    return {
        "id": str(doc.get("_id", "")),
        "clinic_id": doc.get("clinic_id", ""),
        "name": doc.get("name", ""),
        "generic_name": doc.get("generic_name", doc.get("name", "")),
        "manufacturer": doc.get("manufacturer", "Cipla Ltd"),
        "category": doc.get("category", "General"),
        "stock_quantity": doc.get("stock_quantity", 0),
        "price": price,
        "price_per_tab": price_per_tab,
        "price_per_strip": price_per_strip,
        "tablets_per_strip": tablets_per_strip,
        "expiry_date": doc.get("expiry_date", "2027-12-31"),
        "batch_number": doc.get("batch_number", "BATCH-01"),
        "unit": doc.get("unit", "Tablet"),
        "min_stock_alert": doc.get("min_stock_alert", 10),
        "is_low_stock": _is_low_stock(doc),
        "provider_name": doc.get("provider_name"),
        "provider_contact": doc.get("provider_contact"),
        "hsn_code": doc.get("hsn_code", "30049099"),
        "tax_gst_percent": float(doc.get("tax_gst_percent", 12.0)),
        "schedule_type": doc.get("schedule_type", "Schedule H"),
        "rack_location": doc.get("rack_location", "Rack A-01"),
        "created_at": doc.get("created_at"),
        "updated_at": doc.get("updated_at"),
    }


def _seed_initial_medicines_if_empty(db, clinic_id: str):
    """Seeds standard essential hospital medicines if inventory is empty."""
    count = db["medicines"].count_documents({"clinic_id": clinic_id})
    if count == 0:
        initial_list = [
            {"name": "Paracetamol 500mg", "category": "Tablet", "stock_quantity": 250, "price": 3.50, "price_per_tab": 3.50, "price_per_strip": 35.00, "tablets_per_strip": 10, "expiry_date": "2027-12-31", "batch_number": "PCM-2026-A1", "unit": "Tablet", "min_stock_alert": 30},
            {"name": "Amoxicillin 500mg", "category": "Capsule", "stock_quantity": 150, "price": 12.00, "price_per_tab": 12.00, "price_per_strip": 120.00, "tablets_per_strip": 10, "expiry_date": "2027-08-15", "batch_number": "AMX-2026-B2", "unit": "Capsule", "min_stock_alert": 20},
            {"name": "Azithromycin 500mg", "category": "Tablet", "stock_quantity": 80, "price": 24.50, "price_per_tab": 24.50, "price_per_strip": 122.50, "tablets_per_strip": 5, "expiry_date": "2027-10-20", "batch_number": "AZI-2026-C3", "unit": "Tablet", "min_stock_alert": 15},
            {"name": "Cetirizine 10mg", "category": "Tablet", "stock_quantity": 300, "price": 2.00, "price_per_tab": 2.00, "price_per_strip": 20.00, "tablets_per_strip": 10, "expiry_date": "2028-01-30", "batch_number": "CET-2026-D4", "unit": "Tablet", "min_stock_alert": 40},
            {"name": "Pantoprazole 40mg", "category": "Tablet", "stock_quantity": 200, "price": 7.50, "price_per_tab": 7.50, "price_per_strip": 112.50, "tablets_per_strip": 15, "expiry_date": "2027-11-12", "batch_number": "PAN-2026-E5", "unit": "Tablet", "min_stock_alert": 25},
            {"name": "Dextromethorphan Cough Syrup 100ml", "category": "Syrup", "stock_quantity": 60, "price": 85.00, "price_per_tab": 85.00, "price_per_strip": 85.00, "tablets_per_strip": 1, "expiry_date": "2027-06-30", "batch_number": "DEX-2026-S1", "unit": "Syrup", "min_stock_alert": 10},
            {"name": "Multivitamin Tonic 200ml", "category": "Syrup", "stock_quantity": 90, "price": 130.00, "price_per_tab": 130.00, "price_per_strip": 130.00, "tablets_per_strip": 1, "expiry_date": "2027-09-18", "batch_number": "MLT-2026-V2", "unit": "Syrup", "min_stock_alert": 15},
            {"name": "Diclofenac Pain Relief Gel 30g", "category": "Ointment", "stock_quantity": 45, "price": 65.00, "price_per_tab": 65.00, "price_per_strip": 65.00, "tablets_per_strip": 1, "expiry_date": "2027-07-22", "batch_number": "DIC-2026-G1", "unit": "Ointment", "min_stock_alert": 8},
            {"name": "Ceftriaxone 1g Injection", "category": "Injection", "stock_quantity": 40, "price": 95.00, "price_per_tab": 95.00, "price_per_strip": 95.00, "tablets_per_strip": 1, "expiry_date": "2027-05-10", "batch_number": "CTX-2026-I1", "unit": "Injection", "min_stock_alert": 10},
            {"name": "Insulin Glargine 100 IU/ml", "category": "Injection", "stock_quantity": 25, "price": 450.00, "price_per_tab": 450.00, "price_per_strip": 450.00, "tablets_per_strip": 1, "expiry_date": "2027-04-15", "batch_number": "INS-2026-I2", "unit": "Injection", "min_stock_alert": 5},
            {"name": "Metformin 500mg SR", "category": "Tablet", "stock_quantity": 180, "price": 4.00, "price_per_tab": 4.00, "price_per_strip": 60.00, "tablets_per_strip": 15, "expiry_date": "2028-02-28", "batch_number": "MET-2026-T1", "unit": "Tablet", "min_stock_alert": 30},
            {"name": "Atorvastatin 10mg", "category": "Tablet", "stock_quantity": 120, "price": 9.50, "price_per_tab": 9.50, "price_per_strip": 95.00, "tablets_per_strip": 10, "expiry_date": "2027-12-15", "batch_number": "ATV-2026-T2", "unit": "Tablet", "min_stock_alert": 20},
            {"name": "Omeprazole 20mg", "category": "Capsule", "stock_quantity": 160, "price": 5.50, "price_per_tab": 5.50, "price_per_strip": 82.50, "tablets_per_strip": 15, "expiry_date": "2027-11-30", "batch_number": "OMP-2026-C1", "unit": "Capsule", "min_stock_alert": 25},
            {"name": "Ciprofloxacin 0.3% Eye Drops 5ml", "category": "Drops", "stock_quantity": 55, "price": 42.00, "price_per_tab": 42.00, "price_per_strip": 42.00, "tablets_per_strip": 1, "expiry_date": "2027-08-20", "batch_number": "CIP-2026-D1", "unit": "Drops", "min_stock_alert": 10},
            {"name": "ORS Electrolyte Powder 21.8g Pouch", "category": "Pouch", "stock_quantity": 150, "price": 22.00, "price_per_tab": 22.00, "price_per_strip": 22.00, "tablets_per_strip": 1, "expiry_date": "2028-05-30", "batch_number": "ORS-2026-P1", "unit": "Pouch", "min_stock_alert": 25},
        ]
        now = datetime.now(timezone.utc).isoformat()
        docs = []
        for item in initial_list:
            item["_id"] = str(uuid.uuid4())
            item["clinic_id"] = clinic_id
            item["created_at"] = now
            item["updated_at"] = now
            docs.append(item)
        if docs:
            db["medicines"].insert_many(docs)


class BillItemInput(BaseModel):
    medicine_id: str
    medicine_name: str
    quantity: int = 1
    unit_price: float = 0.0
    unit_type: Optional[str] = "TAB"  # "TAB" (Single/Multiple Tablets) or "STRIP" (Full Strip/Pack)
    tablets_per_strip: Optional[int] = 10


class GenerateBillInput(BaseModel):
    prescription_id: Optional[str] = None
    patient_name: str
    items: List[BillItemInput]
    payment_mode: str = "CASH"
    discount_amount: float = 0.0
    tax_gst_percent: Optional[float] = 12.0


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
            "price": float(d.get("price_per_tab", d.get("price", 5.0))),
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

    # Ensure hospital has initial medicines seeded if empty
    _seed_initial_medicines_if_empty(db, clinic_id)

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


@router.post("/billing/generate-bill", summary="Generate Pharmacy Bill & Synchronously Deduct Stock")
def generate_pharmacy_bill(
    bill_in: GenerateBillInput,
    current_user: dict = Depends(get_current_user),
):
    """
    Generates a branded pharmacy tax invoice for a patient.
    Supports billing by Single Tablet ("TAB"), Multiple Tablets, or Full Strips ("STRIP").
    Synchronously deducts exact tablet count from MongoDB.
    """
    db = get_db()
    clinic_id = get_clinic_id(current_user)
    now_dt = datetime.now(timezone.utc)
    bill_id = f"bill_{uuid.uuid4().hex[:12]}"
    bill_number = f"BILL-RX-{int(now_dt.timestamp())}"

    # Get hospital/clinic branding profile
    clinic = db["clinics"].find_one({"_id": clinic_id}) or {}
    hospital_name = clinic.get("name", "Prescripto Healthcare Pharmacy")
    hospital_address = clinic.get("address", "Main Market, Motala, Buldhana, Maharashtra")
    hospital_phone = clinic.get("phone", "+91 98765 43210")
    hospital_gstin = clinic.get("gstin", "27AAAAA0000A1Z5")

    subtotal_amount = 0.0
    processed_items = []

    for item in bill_in.items:
        med = db["medicines"].find_one({"_id": item.medicine_id}) or db["medicines"].find_one({"clinic_id": clinic_id, "name": item.medicine_name})

        unit_type = (item.unit_type or "TAB").upper()
        tab_count_per_strip = item.tablets_per_strip or (med.get("tablets_per_strip", 10) if med else 10)

        if med:
            price_per_tab = float(med.get("price_per_tab", med.get("price", item.unit_price)))
            price_per_strip = float(med.get("price_per_strip", price_per_tab * tab_count_per_strip))
        else:
            price_per_tab = item.unit_price if item.unit_price > 0 else 5.0
            price_per_strip = price_per_tab * tab_count_per_strip

        if unit_type == "STRIP":
            effective_unit_price = price_per_strip
            tabs_to_deduct = item.quantity * tab_count_per_strip
            unit_label = f"{item.quantity} Strip ({tab_count_per_strip} tabs/strip)"
        else:
            effective_unit_price = price_per_tab
            tabs_to_deduct = item.quantity
            unit_label = f"{item.quantity} Tab(s)"

        item_subtotal = round(item.quantity * effective_unit_price, 2)
        subtotal_amount += item_subtotal

        # Synchronous stock deduction in MongoDB
        if med:
            curr_stock = med.get("stock_quantity", 0)
            new_stock = max(0, curr_stock - tabs_to_deduct)
            db["medicines"].update_one(
                {"_id": med["_id"]},
                {"$set": {"stock_quantity": new_stock, "updated_at": now_dt.isoformat()}}
            )
            # Log stock deduction transaction
            _log_transaction(
                db, str(med["_id"]), "DISPENSE", tabs_to_deduct,
                new_stock, str(current_user["_id"]),
                prescription_id=bill_in.prescription_id,
                notes=f"Pharmacy Bill #{bill_number} ({unit_label}) for {bill_in.patient_name}"
            )

        processed_items.append({
            "medicine_id": item.medicine_id,
            "medicine_name": item.medicine_name,
            "category": med.get("category", "General") if med else "General",
            "quantity": item.quantity,
            "unit_type": unit_type,
            "unit_label": unit_label,
            "unit_price": effective_unit_price,
            "subtotal": item_subtotal,
            "batch_number": med.get("batch_number", "BATCH-01") if med else "BATCH-01",
            "expiry_date": med.get("expiry_date", "2027-12-31") if med else "2027-12-31",
        })

    # Tax & Total calculation (Support customizable GST rate, default 12%)
    gst_rate = float(bill_in.tax_gst_percent) if bill_in.tax_gst_percent is not None else 12.0
    discount = max(0.0, bill_in.discount_amount)
    taxable_amount = max(0.0, subtotal_amount - discount)
    half_rate = (gst_rate / 2.0) / 100.0
    cgst_amount = round(taxable_amount * half_rate, 2)
    sgst_amount = round(taxable_amount * half_rate, 2)
    total_net_amount = round(taxable_amount + cgst_amount + sgst_amount, 2)

    bill_doc = {
        "_id": bill_id,
        "bill_number": bill_number,
        "clinic_id": clinic_id,
        "hospital_name": hospital_name,
        "hospital_address": hospital_address,
        "hospital_phone": hospital_phone,
        "hospital_gstin": hospital_gstin,
        "prescription_id": bill_in.prescription_id,
        "patient_name": bill_in.patient_name,
        "items": processed_items,
        "subtotal_amount": subtotal_amount,
        "discount_amount": discount,
        "cgst_amount": cgst_amount,
        "sgst_amount": sgst_amount,
        "total_amount": total_net_amount,
        "payment_mode": bill_in.payment_mode,
        "status": "PAID",
        "created_at": now_dt.isoformat(),
    }
    db["pharmacy_bills"].insert_one(bill_doc)

    return {
        "bill_id": bill_id,
        "bill_number": bill_number,
        "patient_name": bill_in.patient_name,
        "hospital_name": hospital_name,
        "hospital_address": hospital_address,
        "hospital_phone": hospital_phone,
        "hospital_gstin": hospital_gstin,
        "items": processed_items,
        "subtotal_amount": subtotal_amount,
        "discount_amount": discount,
        "cgst_amount": cgst_amount,
        "sgst_amount": sgst_amount,
        "total_amount": total_net_amount,
        "payment_mode": bill_in.payment_mode,
        "status": "PAID",
        "created_at": now_dt.isoformat(),
        "message": f"Branded Pharmacy Tax Invoice #{bill_number} generated successfully! Stock deducted in real time.",
    }


@router.get("/billing/history", summary="Get Medical Shop Billing History & All Generated Invoices")
def get_billing_history(
    search: Optional[str] = Query(None),
    payment_mode: Optional[str] = Query(None),
    current_user: Optional[dict] = Depends(get_current_user_optional),
):
    """Retrieves full billing history logged in MongoDB across doctor prescriptions and manual OTC counter sales."""
    db = get_db()
    clinic_id = get_clinic_id(current_user) if current_user else "c1111111-1111-1111-1111-111111111111"

    query_filter = {"clinic_id": clinic_id}
    if search:
        query_filter["$or"] = [
            {"bill_number": {"$regex": search, "$options": "i"}},
            {"patient_name": {"$regex": search, "$options": "i"}},
        ]
    if payment_mode and payment_mode != "ALL":
        query_filter["payment_mode"] = payment_mode.upper()

    bills = list(db["pharmacy_bills"].find(query_filter).sort("created_at", -1))

    # Seed if empty
    if len(bills) == 0:
        now_iso = datetime.now(timezone.utc).isoformat()
        mock_bills = [
            {
                "_id": "bill_demo_201",
                "bill_id": "bill_demo_201",
                "bill_number": "BILL-RX-17682910",
                "clinic_id": clinic_id,
                "hospital_name": "Shree Ganesha Medical & Surgical Store",
                "hospital_address": "Shop No. 4, Main Market, Motala, Buldhana",
                "hospital_phone": "+91 98221 44501",
                "hospital_gstin": "27AAAAA0000A1Z5",
                "prescription_id": "rx-demo-101",
                "bill_type": "OPD Doctor Rx",
                "patient_name": "Sunita Deshmukh",
                "items": [
                    {
                        "medicine_name": "Amoxicillin 500mg Capsule",
                        "category": "Capsule",
                        "batch_number": "AMX-88",
                        "expiry_date": "2027-10",
                        "quantity": 10,
                        "unit_price": 7.50,
                        "unit_type": "TAB",
                        "unit_label": "10 Tab(s)",
                        "subtotal": 75.00
                    },
                    {
                        "medicine_name": "Paracetamol 500mg Tablet",
                        "category": "Tablet",
                        "batch_number": "PCM-A1",
                        "expiry_date": "2027-12",
                        "quantity": 6,
                        "unit_price": 3.50,
                        "unit_type": "TAB",
                        "unit_label": "6 Tab(s)",
                        "subtotal": 21.00
                    }
                ],
                "subtotal_amount": 96.00,
                "discount_amount": 0.0,
                "cgst_amount": 5.76,
                "sgst_amount": 5.76,
                "total_amount": 107.52,
                "payment_mode": "UPI",
                "status": "PAID",
                "created_at": now_iso
            },
            {
                "_id": "bill_demo_202",
                "bill_id": "bill_demo_202",
                "bill_number": "BILL-RX-17682915",
                "clinic_id": clinic_id,
                "hospital_name": "Shree Ganesha Medical & Surgical Store",
                "hospital_address": "Shop No. 4, Main Market, Motala, Buldhana",
                "hospital_phone": "+91 98221 44501",
                "hospital_gstin": "27AAAAA0000A1Z5",
                "prescription_id": None,
                "bill_type": "OTC Counter Sale",
                "patient_name": "Rajesh Sharma",
                "items": [
                    {
                        "medicine_name": "ORS Electrolyte Powder Pouch",
                        "category": "Pouch",
                        "batch_number": "ORS-55",
                        "expiry_date": "2026-11",
                        "quantity": 4,
                        "unit_price": 22.00,
                        "unit_type": "STRIP",
                        "unit_label": "4 Pouch",
                        "subtotal": 88.00
                    }
                ],
                "subtotal_amount": 88.00,
                "discount_amount": 5.0,
                "cgst_amount": 4.98,
                "sgst_amount": 4.98,
                "total_amount": 92.96,
                "payment_mode": "CASH",
                "status": "PAID",
                "created_at": now_iso
            },
            {
                "_id": "bill_demo_203",
                "bill_id": "bill_demo_203",
                "bill_number": "BILL-RX-17682920",
                "clinic_id": clinic_id,
                "hospital_name": "Shree Ganesha Medical & Surgical Store",
                "hospital_address": "Shop No. 4, Main Market, Motala, Buldhana",
                "hospital_phone": "+91 98221 44501",
                "hospital_gstin": "27AAAAA0000A1Z5",
                "prescription_id": "rx-demo-103",
                "bill_type": "OPD Doctor Rx",
                "patient_name": "Amitabh Verma",
                "items": [
                    {
                        "medicine_name": "Amlodipine 5mg Tablet",
                        "category": "Tablet",
                        "batch_number": "AML-09",
                        "expiry_date": "2028-04",
                        "quantity": 15,
                        "unit_price": 4.20,
                        "unit_type": "TAB",
                        "unit_label": "15 Tab(s)",
                        "subtotal": 63.00
                    }
                ],
                "subtotal_amount": 63.00,
                "discount_amount": 0.0,
                "cgst_amount": 3.78,
                "sgst_amount": 3.78,
                "total_amount": 70.56,
                "payment_mode": "CARD",
                "status": "PAID",
                "created_at": now_iso
            }
        ]
        db["pharmacy_bills"].insert_many(mock_bills)
        bills = mock_bills

    formatted = []
    for b in bills:
        b_id = str(b.get("_id"))
        b["bill_id"] = b_id
        b.pop("_id", None)
        formatted.append(b)
    return formatted


def _find_bill_by_any_id(db, bill_id: str):
    if not bill_id:
        return None

    def _search(target_id):
        doc = db["pharmacy_bills"].find_one({"_id": target_id})
        if doc:
            return doc
        doc = db["pharmacy_bills"].find_one({"bill_id": target_id})
        if doc:
            return doc
        doc = db["pharmacy_bills"].find_one({"bill_number": target_id})
        if doc:
            return doc
        doc = db["pharmacy_bills"].find_one({"id": target_id})
        if doc:
            return doc
        doc = db["pharmacy_bills"].find_one({
            "$or": [
                {"bill_number": {"$regex": f"^{target_id}$", "$options": "i"}},
                {"bill_id": {"$regex": f"^{target_id}$", "$options": "i"}},
                {"_id": {"$regex": f"^{target_id}$", "$options": "i"}}
            ]
        })
        if doc:
            return doc
        try:
            from bson import ObjectId
            if len(target_id) == 24:
                doc = db["pharmacy_bills"].find_one({"_id": ObjectId(target_id)})
                if doc:
                    return doc
        except Exception:
            pass
        return None

    res = _search(bill_id)
    if res:
        return res

    # Seed mock bills if empty and retry search
    try:
        get_billing_history()
        res = _search(bill_id)
        if res:
            return res
    except Exception:
        pass

    return None


@router.get("/billing/details/{bill_id}", summary="Get Single Generated Pharmacy Bill Details")
def get_single_bill_details(
    bill_id: str,
    current_user: Optional[dict] = Depends(get_current_user_optional),
):
    db = get_db()
    bill = _find_bill_by_any_id(db, bill_id)
    if not bill:
        raise HTTPException(status_code=404, detail="Pharmacy bill not found")

    bill["bill_id"] = str(bill.get("_id"))
    bill.pop("_id", None)
    return bill


@router.get("/analytics/stats", summary="Get Medical Shop Stock & Billing Analytics")
def get_inventory_analytics_stats(
    current_user: Optional[dict] = Depends(get_current_user_optional),
):
    """Computes comprehensive analytics: stock levels, valuation, bills, and attended vs unattended prescriptions."""
    db = get_db()
    clinic_id = get_clinic_id(current_user) if current_user else "c1111111-1111-1111-1111-111111111111"

    # Seed if empty
    _seed_initial_medicines_if_empty(db, clinic_id)

    meds = list(db["medicines"].find({"clinic_id": clinic_id}))
    total_items = len(meds)
    low_stock = sum(1 for m in meds if _is_low_stock(m))
    out_of_stock = sum(1 for m in meds if m.get("stock_quantity", 0) == 0)
    total_valuation = sum(m.get("stock_quantity", 0) * float(m.get("price", 0)) for m in meds)

    # Bills analytics
    bills = list(db["pharmacy_bills"].find({"clinic_id": clinic_id}))
    total_bills = len(bills)
    total_revenue = sum(float(b.get("total_amount", 0)) for b in bills)

    # Prescription attendance analytics
    rx_docs = list(db["prescriptions"].find({"clinic_id": clinic_id}))
    attended_count = sum(1 for r in rx_docs if r.get("status") == "DISPENSED")
    unattended_count = sum(1 for r in rx_docs if r.get("status") != "DISPENSED")
    total_rxs = len(rx_docs)
    attendance_rate = round((attended_count / total_rxs * 100), 1) if total_rxs > 0 else 100.0

    return {
        "total_medicines": total_items,
        "low_stock_count": low_stock,
        "out_of_stock_count": out_of_stock,
        "total_valuation_inr": total_valuation,
        "total_bills_generated": total_bills,
        "total_revenue_inr": total_revenue,
        "attended_prescriptions": attended_count,
        "unattended_prescriptions": unattended_count,
        "attendance_rate_pct": attendance_rate,
    }


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


@router.get("/billing/{bill_id}/print", response_class=HTMLResponse, summary="Backend Standalone 1-Page Printable Invoice")
def print_pharmacy_bill_html(bill_id: str):
    db = get_db()
    bill = _find_bill_by_any_id(db, bill_id)
    if not bill:
        raise HTTPException(status_code=404, detail="Pharmacy bill not found")

    items_html = ""
    for idx, item in enumerate(bill.get("items", []), start=1):
        items_html += f"""
        <tr style="border-bottom: 1px solid #cbd5e1;">
            <td style="padding: 8px; text-align: center;">{idx}</td>
            <td style="padding: 8px;">
                <strong>{item.get('medicine_name', 'Medicine')}</strong>
                <div style="font-size: 10px; color: #64748b;">🏷️ Category: {item.get('category', 'General')}</div>
            </td>
            <td style="padding: 8px; font-family: monospace; font-size: 11px;">{item.get('batch_number', 'BATCH-01')}</td>
            <td style="padding: 8px; font-size: 11px;">{item.get('expiry_date', '2027-12-31')}</td>
            <td style="padding: 8px; text-align: center; font-size: 11px;">{item.get('unit_label', item.get('unit_type', 'TAB'))}</td>
            <td style="padding: 8px; text-align: right;">₹{float(item.get('unit_price', 0)):.2f}</td>
            <td style="padding: 8px; text-align: right; font-weight: bold;">{item.get('quantity', 1)}</td>
            <td style="padding: 8px; text-align: right; font-weight: bold;">₹{float(item.get('subtotal', 0)):.2f}</td>
        </tr>
        """

    subtotal = float(bill.get("subtotal_amount", bill.get("total_amount", 0)))
    cgst = float(bill.get("cgst_amount", 0))
    sgst = float(bill.get("sgst_amount", 0))
    discount = float(bill.get("discount_amount", 0))
    total = float(bill.get("total_amount", 0))

    html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Pharmacy Tax Invoice #{bill.get('bill_number')}</title>
    <style>
        @page {{ size: A4 portrait; margin: 8mm; }}
        body {{
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            font-size: 12px;
            color: #0f172a;
            margin: 0;
            padding: 0;
            background: #ffffff;
        }}
        .invoice-card {{
            max-width: 800px;
            margin: 0 auto;
            border: 1px solid #cbd5e1;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: none;
        }}
        .header {{
            background: #064e3b;
            color: #ffffff;
            padding: 16px 20px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
        }}
        .table {{
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
        }}
        .table th {{
            background: #f1f5f9;
            color: #334155;
            font-weight: 800;
            text-transform: uppercase;
            font-size: 10px;
            padding: 8px;
            border-bottom: 2px solid #cbd5e1;
        }}
        @media print {{
            body {{ background: none; }}
            .no-print {{ display: none !important; }}
            .invoice-card {{ border: none; max-height: 100vh; overflow: hidden; page-break-inside: avoid !important; }}
        }}
    </style>
</head>
<body onload="window.print()">
    <div class="no-print" style="background: #0f172a; color: #fff; padding: 10px 20px; text-align: right;">
        <button onclick="window.print()" style="background: #10b981; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer;">🖨️ Print Invoice Now</button>
    </div>

    <div class="invoice-card">
        <div class="header">
            <div>
                <div style="font-size: 9px; font-weight: 800; letter-spacing: 1px; color: #a7f3d0; text-transform: uppercase;">OFFICIAL PHARMACY TAX INVOICE</div>
                <h1 style="font-size: 18px; margin: 4px 0 2px 0;">{bill.get('hospital_name', 'Shree Ganesha Medical & Surgical Store')}</h1>
                <div style="font-size: 11px; color: #d1fae5;">{bill.get('hospital_address', 'Shop No. 4, Main Market, Motala, Buldhana')}</div>
                <div style="font-size: 10px; color: #a7f3d0; margin-top: 4px; font-family: monospace;">
                    <span>GSTIN: {bill.get('hospital_gstin', '27AAAAA0000A1Z5')}</span> | 
                    <span>DL: Form 20B/21B MH-AKL-882910</span>
                </div>
            </div>
            <div style="text-align: right;">
                <div style="font-size: 16px; font-weight: 900; color: #fef08a;">{bill.get('bill_number')}</div>
                <div style="font-size: 11px; margin-top: 2px;">Date: {bill.get('created_at', '')[:10]}</div>
                <div style="font-size: 11px; margin-top: 2px;">Patient: <strong>{bill.get('patient_name')}</strong></div>
            </div>
        </div>

        <div style="padding: 16px;">
            <table class="table">
                <thead>
                    <tr>
                        <th style="width: 30px;">#</th>
                        <th style="text-align: left;">Item Description</th>
                        <th>Batch</th>
                        <th>Expiry</th>
                        <th>Unit</th>
                        <th style="text-align: right;">Rate (₹)</th>
                        <th style="text-align: right;">Qty</th>
                        <th style="text-align: right;">Amount (₹)</th>
                    </tr>
                </thead>
                <tbody>
                    {items_html}
                </tbody>
            </table>

            <div style="margin-top: 16px; display: flex; justify-content: space-between; border-top: 1px solid #cbd5e1; padding-top: 12px;">
                <div style="font-size: 10px; color: #64748b; width: 55%;">
                    <div>• Goods once sold will be accepted under warranty returns.</div>
                    <div>• Inclusive of CGST 6% + SGST 6% Tax Rules.</div>
                    <div style="margin-top: 20px; font-weight: bold; color: #334155;">Authorized Registered Pharmacist Signature &amp; Seal</div>
                    <div style="width: 180px; border-bottom: 1px dashed #94a3b8; margin-top: 30px;"></div>
                </div>

                <div style="width: 40%; text-align: right;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <span>Subtotal:</span>
                        <strong>₹{subtotal:.2f}</strong>
                    </div>
                    {f'<div style="display: flex; justify-content: space-between; color: #059669; margin-bottom: 4px;"><span>Discount:</span><span>-₹{discount:.2f}</span></div>' if discount > 0 else ''}
                    <div style="display: flex; justify-content: space-between; color: #64748b; font-size: 11px; margin-bottom: 2px;">
                        <span>CGST (6%):</span>
                        <span>₹{cgst:.2f}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; color: #64748b; font-size: 11px; margin-bottom: 4px;">
                        <span>SGST (6%):</span>
                        <span>₹{sgst:.2f}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: 900; color: #047857; border-top: 2px solid #0f172a; padding-top: 4px;">
                        <span>Grand Total:</span>
                        <span>₹{total:.2f}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>"""
    return HTMLResponse(content=html)
