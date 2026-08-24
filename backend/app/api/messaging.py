"""
Patient WhatsApp & SMS Messaging API — /api/v1/messaging
Handles instant digital prescription delivery links via WhatsApp & SMS,
plus 24-hour automated and manual OPD follow-up appointment reminders.
Stored in MongoDB messaging_logs collection.
"""
import uuid
import urllib.parse
from typing import List, Optional
from datetime import datetime, date, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.core.database import get_db
from app.api.deps import get_current_user, get_clinic_id

router = APIRouter(prefix="/messaging", tags=["Patient WhatsApp & SMS Gateway"])


# ─── Pydantic Schemas ─────────────────────────────────────────────────────────

class WhatsAppSendRequest(BaseModel):
    prescription_id: str
    phone: str
    patient_name: str
    language: Optional[str] = "mr"


class FollowupReminderRequest(BaseModel):
    prescription_id: str
    phone: str
    patient_name: str
    followup_date: str
    language: Optional[str] = "mr"


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _clean_phone(phone_str: str) -> str:
    """Strip all non-digit characters and prepend 91 for India if needed."""
    digits = "".join(c for c in phone_str if c.isdigit())
    if len(digits) == 10:
        return f"91{digits}"
    if len(digits) == 12 and digits.startswith("91"):
        return digits
    return digits or "919876543210"


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/send-whatsapp", summary="Generate instant WhatsApp prescription link & log dispatch")
def send_whatsapp_prescription(
    data: WhatsAppSendRequest,
    current_user: dict = Depends(get_current_user),
):
    """Generates direct WhatsApp Web link (wa.me) with prescription details & digital link."""
    db = get_db()
    clinic_id = get_clinic_id(current_user)

    rx = db["prescriptions"].find_one({"_id": data.prescription_id, "clinic_id": clinic_id})
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription record not found.")

    prof = db["clinic_profiles"].find_one({"clinic_id": clinic_id}) or {}
    hosp_name = prof.get("hospital_name_en") or prof.get("hospital_name_mr") or "Prescripto OPD Clinic"
    doc_name = prof.get("doctor_name_en") or prof.get("doctor_name_mr") or current_user.get("full_name", "Doctor OPD")

    clean_num = _clean_phone(data.phone)
    rx_num = rx.get("prescription_number", "RX-1001")
    diagnosis = rx.get("diagnosis", "OPD Consultation")
    token = current_user.get("token") or "prescripto_access"

    # Construct multilingual message text
    if data.language == "mr":
        msg_text = (
            f"🏥 *{hosp_name}*\n"
            f"👨‍⚕️ डॉक्टर: *{doc_name}*\n\n"
            f"नमस्ते *{data.patient_name}*, तुमचे प्रिस्क्रिप्शन तयार आहे!\n"
            f"📋 प्रिस्क्रिप्शन क्र.: *{rx_num}*\n"
            f"🩺 निदान: *{diagnosis}*\n\n"
            f"📄 डिजिटल प्रिस्क्रिप्शन पाहण्यासाठी खालील लिंकवर क्लिक करा:\n"
            f"https://prescripto.netlify.app/prescription?id={data.prescription_id}\n\n"
            f"कृपया वेळेवर औषधे घ्या व काळजी घ्या! 🙏"
        )
    else:
        msg_text = (
            f"🏥 *{hosp_name}*\n"
            f"👨‍⚕️ Doctor: *{doc_name}*\n\n"
            f"Hello *{data.patient_name}*, your prescription is ready!\n"
            f"📋 Rx Number: *{rx_num}*\n"
            f"🩺 Diagnosis: *{diagnosis}*\n\n"
            f"📄 Click link to view digital prescription:\n"
            f"https://prescripto.netlify.app/prescription?id={data.prescription_id}\n\n"
            f"Take medicines on time and get well soon! 🙏"
        )

    encoded_text = urllib.parse.quote(msg_text)
    whatsapp_url = f"https://wa.me/{clean_num}?text={encoded_text}"

    # Log dispatch
    now_iso = datetime.now(timezone.utc).isoformat()
    log_doc = {
        "_id": str(uuid.uuid4()),
        "clinic_id": clinic_id,
        "prescription_id": data.prescription_id,
        "patient_name": data.patient_name,
        "phone": clean_num,
        "channel": "WHATSAPP",
        "type": "PRESCRIPTION_DIGITAL",
        "whatsapp_url": whatsapp_url,
        "message": msg_text,
        "status": "GENERATED",
        "created_at": now_iso,
    }
    db["messaging_logs"].insert_one(log_doc)

    return {
        "message": "WhatsApp prescription link generated successfully.",
        "whatsapp_url": whatsapp_url,
        "phone": clean_num,
        "prescription_number": rx_num,
        "log_id": log_doc["_id"],
    }


@router.get("/upcoming-followups", summary="Get patients due for follow-up in next 24-48 hours")
def list_upcoming_followups(current_user: dict = Depends(get_current_user)):
    """Returns prescriptions with follow-up dates due within the next 48 hours."""
    db = get_db()
    clinic_id = get_clinic_id(current_user)

    today = date.today()
    tomorrow = today + timedelta(days=1)
    day_after = today + timedelta(days=2)

    today_str = today.isoformat()
    tomorrow_str = tomorrow.isoformat()
    day_after_str = day_after.isoformat()

    rxs = list(
        db["prescriptions"].find({
            "clinic_id": clinic_id,
            "followup_date": {"$in": [today_str, tomorrow_str, day_after_str]}
        }).sort("followup_date", 1)
    )

    result = []
    for rx in rxs:
        patient_id = rx.get("patient_id")
        patient = db["patients"].find_one({"_id": patient_id}) if patient_id else None
        p_name = patient.get("name") if patient else rx.get("patient_name", "Patient")
        p_phone = patient.get("phone") if patient else "9876543210"

        f_date = rx.get("followup_date")
        is_today = f_date == today_str

        result.append({
            "prescription_id": str(rx.get("_id")),
            "prescription_number": rx.get("prescription_number", "RX-1001"),
            "patient_name": p_name,
            "phone": p_phone,
            "diagnosis": rx.get("diagnosis", ""),
            "followup_date": f_date,
            "is_due_today": is_today,
            "status": rx.get("status", "ACTIVE"),
        })
    return result


@router.post("/send-followup-reminder", summary="Send 24-Hour WhatsApp Follow-up Reminder")
def send_followup_reminder(
    data: FollowupReminderRequest,
    current_user: dict = Depends(get_current_user),
):
    """Sends automated or manual WhatsApp 24-hour follow-up appointment reminder."""
    db = get_db()
    clinic_id = get_clinic_id(current_user)

    prof = db["clinic_profiles"].find_one({"clinic_id": clinic_id}) or {}
    hosp_name = prof.get("hospital_name_en") or prof.get("hospital_name_mr") or "Prescripto OPD Clinic"
    doc_name = prof.get("doctor_name_en") or prof.get("doctor_name_mr") or current_user.get("full_name", "Doctor OPD")

    clean_num = _clean_phone(data.phone)

    if data.language == "mr":
        msg_text = (
            f"🏥 *{hosp_name}* - फॉलो-अप स्मरणपत्र 🔔\n\n"
            f"नमस्ते *{data.patient_name}*,\n"
            f"तुमचा डॉक्टर *{doc_name}* यांच्यासोबतचा OPD फॉलो-अप उद्या *{data.followup_date}* रोजी आहे.\n"
            f"कृपया वेळोवेळी क्लिनिकला भेट द्या.\n\n"
            f"आरोग्याची काळजी घ्या! 🙏"
        )
    else:
        msg_text = (
            f"🏥 *{hosp_name}* - Follow-up Reminder 🔔\n\n"
            f"Hello *{data.patient_name}*,\n"
            f"This is a gentle reminder that your OPD follow-up with *{doc_name}* is scheduled for *{data.followup_date}*.\n"
            f"Please visit the clinic on time.\n\n"
            f"Take care of your health! 🙏"
        )

    encoded_text = urllib.parse.quote(msg_text)
    whatsapp_url = f"https://wa.me/{clean_num}?text={encoded_text}"

    now_iso = datetime.now(timezone.utc).isoformat()
    log_doc = {
        "_id": str(uuid.uuid4()),
        "clinic_id": clinic_id,
        "prescription_id": data.prescription_id,
        "patient_name": data.patient_name,
        "phone": clean_num,
        "channel": "WHATSAPP",
        "type": "FOLLOWUP_REMINDER",
        "whatsapp_url": whatsapp_url,
        "message": msg_text,
        "status": "SENT",
        "created_at": now_iso,
    }
    db["messaging_logs"].insert_one(log_doc)

    return {
        "message": f"Follow-up reminder generated for {data.patient_name}.",
        "whatsapp_url": whatsapp_url,
        "phone": clean_num,
        "followup_date": data.followup_date,
    }
