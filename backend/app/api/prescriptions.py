"""
Prescriptions API — Pure MongoDB Implementation.
All prescription data is stored in MongoDB with embedded medication items.
Routes remain identical to the previous version.
"""
import uuid
import random
from typing import List, Optional
from datetime import datetime, date, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

from app.core.database import get_db
from app.api.deps import get_current_user, get_current_user_optional, require_doctor, require_pharmacist, get_clinic_id

router = APIRouter(prefix="/prescriptions", tags=["Prescription & Dispensing"])


# ─── Schemas ─────────────────────────────────────────────────────────────────

class PrescriptionItemCreateV2(BaseModel):
    medicine_id: Optional[str] = None
    medicine_name: Optional[str] = None
    dosage: str = "500mg"
    frequency: str = "1-0-1 after meals"
    duration_days: int = 3
    quantity_prescribed: int = 6
    instructions: Optional[str] = None
    is_custom: bool = False


class QuickPatientCreate(BaseModel):
    name: str
    village_location: str = ""
    date_of_birth: str = "1990-01-01"
    gender: str = "MALE"
    phone: Optional[str] = None


class PrescriptionCreateV2(BaseModel):
    patient_id: Optional[str] = None
    new_patient: Optional[QuickPatientCreate] = None
    diagnosis: str
    notes: Optional[str] = None
    items: List[PrescriptionItemCreateV2]


class PrescriptionCreate(BaseModel):
    """Legacy v1 create schema."""
    patient_id: str
    diagnosis: str
    notes: Optional[str] = None
    items: List[PrescriptionItemCreateV2]


# ─── Helpers ─────────────────────────────────────────────────────────────────

def generate_prescription_number() -> str:
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    return f"RX-{timestamp}-{random.randint(100, 999)}"


def _calc_age(dob_val) -> dict:
    try:
        if isinstance(dob_val, str):
            dob = datetime.strptime(dob_val.split("T")[0], "%Y-%m-%d").date()
        elif isinstance(dob_val, date):
            dob = dob_val
        else:
            dob = date(1990, 1, 1)
        today = date.today()
        years = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        months = (today.month - dob.month) % 12
        return {"years": max(0, years), "months": max(0, months), "days": 0,
                "formatted": f"{max(0, years)}y {max(0, months)}m"}
    except Exception:
        return {"years": 0, "months": 0, "days": 0, "formatted": ""}


def _format_patient(doc: dict) -> dict:
    if not doc:
        return None
    return {
        "id": str(doc.get("_id", "")),
        "name": doc.get("name", ""),
        "village_location": doc.get("village_location", ""),
        "gender": doc.get("gender", "MALE"),
        "phone": doc.get("phone"),
        "date_of_birth": doc.get("date_of_birth", "1990-01-01"),
        "age": _calc_age(doc.get("date_of_birth", "1990-01-01")),
    }


def _format_medicine(doc: dict) -> Optional[dict]:
    if not doc:
        return None
    return {
        "id": str(doc.get("_id", "")),
        "name": doc.get("name", ""),
        "category": doc.get("category", ""),
        "unit": doc.get("unit", "Tablets"),
        "stock_quantity": doc.get("stock_quantity", 0),
        "price": float(doc.get("price", 0.0)),
        "expiry_date": doc.get("expiry_date", ""),
        "batch_number": doc.get("batch_number", ""),
        "min_stock_alert": doc.get("min_stock_alert", 10),
        "is_low_stock": doc.get("stock_quantity", 0) <= doc.get("min_stock_alert", 10),
        "provider_name": doc.get("provider_name"),
        "provider_contact": doc.get("provider_contact"),
        "hsn_code": doc.get("hsn_code"),
        "rack_location": doc.get("rack_location"),
    }


def _format_rx(rx: dict, db) -> dict:
    """Format a prescription document with denormalized patient + medicine data."""
    # Load patient
    patient_doc = None
    if rx.get("patient_id"):
        patient_doc = db["patients"].find_one({"_id": rx["patient_id"]})

    # Format items with medicine names resolved
    formatted_items = []
    for item in rx.get("items", []):
        med_doc = None
        if item.get("medicine_id"):
            med_doc = db["medicines"].find_one({"_id": item["medicine_id"]})
        formatted_items.append({
            "id": str(item.get("_id", str(uuid.uuid4()))),
            "medicine_id": item.get("medicine_id"),
            "dosage": item.get("dosage", ""),
            "frequency": item.get("frequency", ""),
            "duration_days": item.get("duration_days", 1),
            "quantity_prescribed": item.get("quantity_prescribed", 1),
            "quantity_dispensed": item.get("quantity_dispensed", 0),
            "instructions": item.get("instructions"),
            "medicine": _format_medicine(med_doc),
        })

    return {
        "id": str(rx["_id"]),
        "prescription_number": rx.get("prescription_number", ""),
        "clinic_id": rx.get("clinic_id", ""),
        "doctor_id": rx.get("doctor_id", ""),
        "patient_id": rx.get("patient_id", ""),
        "diagnosis": rx.get("diagnosis", ""),
        "notes": rx.get("notes"),
        "status": rx.get("status", "PENDING"),
        "created_at": rx.get("created_at", datetime.now(timezone.utc).isoformat()),
        "dispensed_at": rx.get("dispensed_at"),
        "patient": _format_patient(patient_doc),
        "items": formatted_items,
    }


def _get_or_create_patient_inline(new_patient: QuickPatientCreate, clinic_id: str, db) -> str:
    """Create a patient inline and return the patient_id."""
    patient_id = str(uuid.uuid4())
    doc = {
        "_id": patient_id,
        "clinic_id": clinic_id,
        "name": new_patient.name.strip(),
        "village_location": (new_patient.village_location or "Motala").strip(),
        "date_of_birth": (new_patient.date_of_birth or "1990-01-01").split("T")[0],
        "gender": (new_patient.gender or "MALE").upper(),
        "phone": new_patient.phone,
        "medical_history": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    db["patients"].insert_one(doc)
    return patient_id


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/v2", status_code=status.HTTP_201_CREATED)
def create_prescription_v2(
    prescription_in: PrescriptionCreateV2,
    current_user: dict = Depends(require_doctor),
):
    """
    Create a prescription with optional inline patient creation.
    medicine_id can be None for custom drugs.
    """
    db = get_db()
    clinic_id = get_clinic_id(current_user)

    # Resolve patient
    patient_id = prescription_in.patient_id
    if not patient_id:
        if not prescription_in.new_patient:
            raise HTTPException(status_code=400, detail="Either patient_id or new_patient is required.")
        patient_id = _get_or_create_patient_inline(prescription_in.new_patient, clinic_id, db)
    else:
        patient = db["patients"].find_one({"_id": patient_id, "clinic_id": clinic_id})
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found in this clinic")

    rx_number = generate_prescription_number()
    now = datetime.now(timezone.utc).isoformat()

    # Build embedded items
    items = []
    for item in prescription_in.items:
        # Resolve medicine name
        med_name = item.medicine_name
        if item.medicine_id and not item.is_custom:
            med = db["medicines"].find_one({"_id": item.medicine_id, "clinic_id": clinic_id})
            if not med:
                raise HTTPException(
                    status_code=404,
                    detail=f"Medicine ID {item.medicine_id} not found in inventory"
                )
            med_name = med_name or med.get("name", "")
            instructions = item.instructions
        else:
            # Custom drug
            instructions = f"[CUSTOM: {item.medicine_name}] {item.instructions or ''}".strip()

        items.append({
            "_id": str(uuid.uuid4()),
            "medicine_id": item.medicine_id if not item.is_custom else None,
            "medicine_name": med_name or item.medicine_name or "Custom Drug",
            "dosage": item.dosage,
            "frequency": item.frequency,
            "duration_days": item.duration_days,
            "quantity_prescribed": item.quantity_prescribed,
            "quantity_dispensed": 0,
            "instructions": instructions,
        })

    rx_doc = {
        "_id": str(uuid.uuid4()),
        "prescription_number": rx_number,
        "clinic_id": clinic_id,
        "doctor_id": str(current_user["_id"]),
        "patient_id": patient_id,
        "diagnosis": prescription_in.diagnosis,
        "notes": prescription_in.notes,
        "status": "PENDING",
        "items": items,
        "created_at": now,
        "dispensed_at": None,
    }
    db["prescriptions"].insert_one(rx_doc)
    return _format_rx(rx_doc, db)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_prescription(
    prescription_in: PrescriptionCreate,
    current_user: dict = Depends(require_doctor),
):
    """Legacy v1 create — uses the same MongoDB backend."""
    db = get_db()
    clinic_id = get_clinic_id(current_user)

    patient = db["patients"].find_one({"_id": prescription_in.patient_id, "clinic_id": clinic_id})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found in this clinic")

    rx_number = generate_prescription_number()
    now = datetime.now(timezone.utc).isoformat()

    items = []
    for item in prescription_in.items:
        med = db["medicines"].find_one({"_id": item.medicine_id, "clinic_id": clinic_id})
        if not med:
            raise HTTPException(
                status_code=404,
                detail=f"Medicine ID {item.medicine_id} not found in inventory"
            )
        items.append({
            "_id": str(uuid.uuid4()),
            "medicine_id": item.medicine_id,
            "medicine_name": med.get("name", ""),
            "dosage": item.dosage,
            "frequency": item.frequency,
            "duration_days": item.duration_days,
            "quantity_prescribed": item.quantity_prescribed,
            "quantity_dispensed": 0,
            "instructions": item.instructions,
        })

    rx_doc = {
        "_id": str(uuid.uuid4()),
        "prescription_number": rx_number,
        "clinic_id": clinic_id,
        "doctor_id": str(current_user["_id"]),
        "patient_id": prescription_in.patient_id,
        "diagnosis": prescription_in.diagnosis,
        "notes": prescription_in.notes,
        "status": "PENDING",
        "items": items,
        "created_at": now,
        "dispensed_at": None,
    }
    db["prescriptions"].insert_one(rx_doc)
    return _format_rx(rx_doc, db)


@router.get("")
def list_prescriptions(
    status_filter: Optional[str] = Query(None, alias="status"),
    patient_id: Optional[str] = Query(None),
    doctor_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    clinic_id = get_clinic_id(current_user)

    query_filter: dict = {"clinic_id": clinic_id}
    if status_filter:
        query_filter["status"] = status_filter.upper()
    if patient_id:
        query_filter["patient_id"] = patient_id
    if doctor_id:
        query_filter["doctor_id"] = doctor_id

    rxs = list(db["prescriptions"].find(query_filter).sort("created_at", -1))
    return [_format_rx(rx, db) for rx in rxs]


@router.get("/search/{query}", summary="Search prescription by RX Number, Patient Name, or Village Name")
def search_prescription_by_query(
    query: str,
    current_user: Optional[dict] = Depends(get_current_user_optional),
):
    """
    Finds prescriptions matching RX number, prescription ID, patient name, village location, or diagnosis.
    Returns a list of matching formatted prescriptions.
    """
    db = get_db()
    q = query.strip()
    if not q:
        return []

    # 1. Match patient IDs by name or village location
    matching_patients = list(db["patients"].find({
        "$or": [
            {"name": {"$regex": q, "$options": "i"}},
            {"village_location": {"$regex": q, "$options": "i"}},
        ]
    }))
    patient_ids = [p["_id"] for p in matching_patients]

    # 2. Build multi-field prescription search query
    rx_filter: dict = {
        "$or": [
            {"_id": q},
            {"prescription_number": {"$regex": q, "$options": "i"}},
            {"diagnosis": {"$regex": q, "$options": "i"}},
        ]
    }
    if patient_ids:
        rx_filter["$or"].append({"patient_id": {"$in": patient_ids}})

    rxs = list(db["prescriptions"].find(rx_filter).sort("created_at", -1).limit(20))

    if not rxs:
        raise HTTPException(status_code=404, detail=f"No prescription found matching '{query}'")

    return [_format_rx(rx, db) for rx in rxs]


@router.get("/{prescription_id}")
def get_prescription(
    prescription_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    clinic_id = get_clinic_id(current_user)
    rx = db["prescriptions"].find_one({"_id": prescription_id, "clinic_id": clinic_id})
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")
    return _format_rx(rx, db)


@router.get("/{prescription_id}/print-html", response_class=HTMLResponse)
def print_prescription_html(
    prescription_id: str,
    lang: str = Query("mr", description="Language: en | mr | hi"),
    current_user: Optional[dict] = Depends(get_current_user_optional),
):
    """
    Returns a self-contained HTML prescription for print.
    Opening this URL in a new browser tab gives a print-ready page.
    """
    db = get_db()
    rx = db["prescriptions"].find_one({"_id": prescription_id})
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")

    # Load clinic profile for header data
    profile = db["clinic_profiles"].find_one({"clinic_id": rx.get("clinic_id", "")})

    # Load patient and items
    patient_doc = db["patients"].find_one({"_id": rx.get("patient_id", "")})
    doctor_doc = db["users"].find_one({"_id": rx.get("doctor_id", "")})

    # Resolve medicine names in items
    items_with_meds = []
    for item in rx.get("items", []):
        med_doc = None
        if item.get("medicine_id"):
            med_doc = db["medicines"].find_one({"_id": item["medicine_id"]})
        items_with_meds.append({**item, "_medicine_doc": med_doc})

    html = _render_html_from_mongo(rx, patient_doc, doctor_doc, items_with_meds, profile, lang)
    return HTMLResponse(content=html, status_code=200)


@router.post("/{prescription_id}/dispense")
def dispense_prescription(
    prescription_id: str,
    current_user: dict = Depends(require_pharmacist),
):
    db = get_db()
    clinic_id = get_clinic_id(current_user)

    rx = db["prescriptions"].find_one({"_id": prescription_id, "clinic_id": clinic_id})
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")
    if rx.get("status") != "PENDING":
        raise HTTPException(
            status_code=400,
            detail=f"Prescription cannot be dispensed. Current status: {rx.get('status')}"
        )

    # Check stock sufficiency (skip custom drugs)
    insufficient = []
    for item in rx.get("items", []):
        if item.get("instructions", "").startswith("[CUSTOM:"):
            continue
        med_id = item.get("medicine_id")
        if not med_id:
            continue
        med = db["medicines"].find_one({"_id": med_id})
        qty_needed = item.get("quantity_prescribed", 1)
        if not med or med.get("stock_quantity", 0) < qty_needed:
            avail = med.get("stock_quantity", 0) if med else 0
            insufficient.append(
                f"{med.get('name', 'Unknown') if med else 'Unknown'}: Needed {qty_needed}, Available {avail}"
            )

    if insufficient:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient stock: {'; '.join(insufficient)}"
        )

    now = datetime.now(timezone.utc).isoformat()

    # Deduct stock and log transactions
    for item in rx.get("items", []):
        if item.get("instructions", "").startswith("[CUSTOM:"):
            continue
        med_id = item.get("medicine_id")
        if not med_id:
            continue
        med = db["medicines"].find_one({"_id": med_id})
        if med:
            qty = item.get("quantity_prescribed", 1)
            new_stock = med.get("stock_quantity", 0) - qty
            db["medicines"].update_one(
                {"_id": med_id},
                {"$set": {"stock_quantity": new_stock, "updated_at": now}}
            )
            db["stock_transactions"].insert_one({
                "_id": str(uuid.uuid4()),
                "medicine_id": med_id,
                "transaction_type": "DISPENSED",
                "quantity": -qty,
                "resulting_stock": new_stock,
                "performed_by_id": str(current_user["_id"]),
                "prescription_id": prescription_id,
                "notes": f"Dispensed for Prescription {rx.get('prescription_number', '')}",
                "created_at": now,
            })

    # Mark as dispensed — also update item quantity_dispensed
    updated_items = []
    for item in rx.get("items", []):
        updated_item = dict(item)
        if not updated_item.get("instructions", "").startswith("[CUSTOM:"):
            updated_item["quantity_dispensed"] = updated_item.get("quantity_prescribed", 0)
        updated_items.append(updated_item)

    db["prescriptions"].update_one(
        {"_id": prescription_id},
        {"$set": {"status": "DISPENSED", "dispensed_at": now, "items": updated_items}}
    )

    return {
        "prescription_id": prescription_id,
        "prescription_number": rx.get("prescription_number"),
        "status": "DISPENSED",
        "dispensed_at": now,
        "message": "Prescription successfully dispensed and inventory updated.",
    }


@router.post("/{prescription_id}/cancel")
def cancel_prescription(
    prescription_id: str,
    current_user: dict = Depends(require_doctor),
):
    db = get_db()
    clinic_id = get_clinic_id(current_user)
    rx = db["prescriptions"].find_one({"_id": prescription_id, "clinic_id": clinic_id})
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")
    if rx.get("status") == "DISPENSED":
        raise HTTPException(status_code=400, detail="Cannot cancel an already dispensed prescription")

    db["prescriptions"].update_one(
        {"_id": prescription_id},
        {"$set": {"status": "CANCELLED"}}
    )
    updated = db["prescriptions"].find_one({"_id": prescription_id})
    return _format_rx(updated, db)


# ─── HTML Renderer (MongoDB dict-based) ──────────────────────────────────────

def _render_html_from_mongo(rx: dict, patient: dict, doctor: dict,
                             items_with_meds: list, profile: dict, lang: str) -> str:
    """Generate print-ready HTML prescription from MongoDB dicts."""
    from app.api.prescription_html import LABELS, CSS, _parse_frequency, _active, _med_type_from_dosage, _facilities_html

    if lang not in LABELS:
        lang = "mr"
    t = LABELS[lang]

    # Profile defaults
    hos_name = (profile.get("hospital_name_mr") if lang == "mr" and profile else None) or \
               (profile.get("hospital_name_en") if profile else "") or ""
    doc_name = (profile.get("doctor_name_mr") if lang == "mr" and profile else None) or \
               (profile.get("doctor_name_en") if profile else
                (doctor.get("full_name") if doctor else "Doctor"))
    quals = (profile.get("qualifications") if profile else None) or ""
    reg = (profile.get("reg_number") if profile else None) or ""
    spec = (profile.get("specialties") if profile else None) or ""
    hours = (profile.get("clinic_hours") if profile else None) or ""
    address = (profile.get("address") if profile else None) or ""
    phone = (profile.get("phone") if profile else None) or ""
    uhid_prefix = (profile.get("uhid_prefix") if profile else None) or "U.H.I.D."
    sig_url = profile.get("signature_data_url") if profile else None
    facilities = (profile.get("facilities") if profile else None) or \
                 ["हृदय रोग", "ब्लड प्रेशर", "दमा", "टि.बी.", "छातीचे विकार",
                  "मधुमेह", "एड्स सहा", "नेफ्युलायझेशन",
                  "त्वचारोग विषयक सहा", "आहार विषयक सहा",
                  "आलेरग्णो विभाग (भरतीची व्यवस्था)"]

    # Patient info
    pat_name = (patient.get("name", "PATIENT") if patient else "PATIENT").upper()
    pat_village = (patient.get("village_location", "") if patient else "").upper()
    pat_dob = patient.get("date_of_birth", "1990-01-01") if patient else "1990-01-01"
    pat_age = _calc_age(pat_dob).get("formatted", "")

    # Date
    created_at = rx.get("created_at", "")
    try:
        if isinstance(created_at, str):
            rx_date = datetime.fromisoformat(created_at.replace("Z", "+00:00")).strftime("%d-%m-%Y")
        else:
            rx_date = datetime.now().strftime("%d-%m-%Y")
    except Exception:
        rx_date = datetime.now().strftime("%d-%m-%Y")

    # Medicine rows
    med_rows_html = ""
    for idx, item in enumerate(items_with_meds):
        med_doc = item.get("_medicine_doc")
        med_name = (med_doc.get("name") if med_doc else None) or item.get("medicine_name") or \
                   (item.get("instructions") or "Custom Drug").replace("[CUSTOM:", "").rstrip("]").strip()
        med_type = _med_type_from_dosage(item.get("dosage", ""))
        total = item.get("quantity_prescribed", 0)

        freq = _parse_frequency(item.get("frequency", "1-0-1"))
        m_on = _active(freq["morning"])
        a_on = _active(freq["afternoon"])
        n_on = _active(freq["night"])

        timing_key = freq.get("timing", "after_meal") or "after_meal"
        timing_lbl = t.get(timing_key, t["after_meal"])

        dose_val = freq["morning"] if m_on else (freq["afternoon"] if a_on else freq["night"])
        try:
            dose_display = "½" if float(dose_val) == 0.5 else (
                str(int(float(dose_val))) if float(dose_val) == int(float(dose_val)) else dose_val
            )
        except Exception:
            dose_display = dose_val or "1"

        unit = t["dose_unit"].get(med_type, "dose")
        sep = '<hr class="ms">' if idx < len(items_with_meds) - 1 else ""

        med_rows_html += f"""
<div class="med">
  <div class="med-r1">
    <span class="mtype">{med_type}.</span>
    <span class="mname">{med_name} {item.get('dosage', '')}</span>
    <span class="mtotal">{total}</span>
  </div>
  <div class="med-r2">
    <span class="mtiming">{timing_lbl}</span>
    <span class="mdose">{dose_display}&nbsp;{unit}</span>
    <span class="mslot{' on' if m_on else ''}">{t["morning"]}</span>
    <span class="mslot{' on' if a_on else ''}">{t["afternoon"]}</span>
    <span class="mslot{' on' if n_on else ''}">{t["night"]}</span>
    <span class="mdur">{item.get('duration_days', 1)}&nbsp;{t["days"]}</span>
  </div>
</div>{sep}"""

    notes_html = (rx.get("notes") or "").replace("\n", "<br>") or "&nbsp;"
    facilities_html = _facilities_html(facilities)
    sig_html = (f'<img src="{sig_url}" alt="Signature" style="max-width:160px;max-height:60px;object-fit:contain;display:block;margin:0 auto 4px;">'
                if sig_url else '<div class="sig-mark">)</div>')

    return f"""<!DOCTYPE html>
<html lang="{lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Prescription — {rx.get('prescription_number', '')}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700;800;900&family=Noto+Serif+Devanagari:wght@700;900&display=swap" rel="stylesheet">
<style>{CSS}</style>
</head>
<body>
<button class="print-btn no-print" onclick="window.print()">🖨 Print</button>
<div class="rx">
  <!-- HEADER -->
  <div class="hdr">
    <div class="hosp">
      <div class="hname">{hos_name}</div>
      <svg class="ecg" viewBox="0 0 320 22" xmlns="http://www.w3.org/2000/svg">
        <polyline points="0,11 55,11 65,4 70,18 75,2 81,20 87,11 200,11 210,5 218,17 222,11 320,11"
          fill="none" stroke="#c41e3a" stroke-width="1.8" stroke-linejoin="round"/>
      </svg>
    </div>
    <div class="doc">
      <div class="dname">{doc_name}</div>
      {f'<div class="dqual">{quals}</div>' if quals else ''}
      {f'<div class="dreg">Reg. No. {reg}</div>' if reg else ''}
      {f'<div class="dspec">{spec}</div>' if spec else ''}
    </div>
  </div>
  <!-- BODY -->
  <div class="body">
    <!-- SIDEBAR -->
    <div class="sb">
      <div class="sb-title">✦ {t["services"]} ✦</div>
      <ul class="sb-list">{facilities_html}</ul>
      {f'<div class="sb-time">☸ {t["hours"]} ☸<br>{hours}</div>' if hours else ''}
      <div class="sb-sun">{t["sunday"]}</div>
    </div>
    <!-- MAIN RX -->
    <div class="main">
      <span class="rxsym">R<sub style="font-size:18px">x</sub></span>
      <div class="pat">
        <span class="pl">{t["pname"]}</span>
        <span class="pn">{pat_name}</span>
        <span class="pv">{pat_village}</span>
        <span class="pd">{t["date_lbl"]} : &nbsp;{rx_date}</span>
      </div>
      <div class="uhid">
        {uhid_prefix} :&nbsp;<strong>{rx.get('prescription_number', '')}</strong>
        {f'&nbsp;&nbsp;Age: {pat_age}' if pat_age else ''}
      </div>
      {med_rows_html}
      <div class="adv">
        <div class="adv-en">{t["advice"]}</div>
        <div class="adv-mr">{t["suchna"]} :</div>
        <div class="adv-txt">{notes_html}</div>
      </div>
      <div class="sig">
        {sig_html}
        <div class="sig-line"></div>
        <div class="sig-name">{doc_name}</div>
        <div class="sig-lbl">{t["sig"]}</div>
      </div>
    </div>
  </div>
  <!-- FOOTER -->
  <div class="ftr">
    <div class="ft-addr">📍 {address}</div>
    <div class="ft-phone">मोबा. नं. {phone}</div>
  </div>
</div>
<script>
document.addEventListener('DOMContentLoaded', function() {{
  if (document.fonts && document.fonts.ready) {{
    document.fonts.ready.then(function() {{
      setTimeout(function() {{ window.print(); }}, 800);
    }});
  }} else {{
    setTimeout(function() {{ window.print(); }}, 1500);
  }}
}});
</script>
</body>
</html>"""
