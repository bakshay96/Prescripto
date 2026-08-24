"""
Doctor & Pharmacy Communication API — /api/v1/communication
Manages real-time messages, stock queries, and prescription notes between Doctor OPD and Medical Shop.
Data stored in MongoDB communication_messages collection.
"""
import uuid
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.database import get_db
from app.api.deps import get_current_user, get_clinic_id

router = APIRouter(prefix="/communication", tags=["Doctor-Pharmacy Communication"])


# ─── Pydantic Schemas ─────────────────────────────────────────────────────────

class MessageCreate(BaseModel):
    message: str
    recipient_role: Optional[str] = "PHARMACIST"  # PHARMACIST or DOCTOR
    prescription_id: Optional[str] = None
    patient_name: Optional[str] = None
    priority: Optional[str] = "NORMAL"  # NORMAL, URGENT, EMERGENCY


class MessageOut(BaseModel):
    id: str
    clinic_id: str
    sender_id: str
    sender_name: str
    sender_role: str
    recipient_role: str
    message: str
    prescription_id: Optional[str] = None
    patient_name: Optional[str] = None
    priority: str
    created_at: str


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/messages")
def list_messages(current_user: dict = Depends(get_current_user)):
    """Returns clinic communication thread between Doctor OPD and Medical Shop."""
    db = get_db()
    clinic_id = get_clinic_id(current_user)
    
    msgs = list(
        db["communication_messages"]
        .find({"clinic_id": clinic_id})
        .sort("created_at", -1)
        .limit(100)
    )

    result = []
    for m in msgs:
        result.append({
            "id": str(m.get("_id", "")),
            "clinic_id": m.get("clinic_id", ""),
            "sender_id": m.get("sender_id", ""),
            "sender_name": m.get("sender_name", "Doctor / Pharmacist"),
            "sender_role": m.get("sender_role", "DOCTOR"),
            "recipient_role": m.get("recipient_role", "PHARMACIST"),
            "message": m.get("message", ""),
            "prescription_id": m.get("prescription_id"),
            "patient_name": m.get("patient_name"),
            "priority": m.get("priority", "NORMAL"),
            "created_at": m.get("created_at", datetime.now(timezone.utc).isoformat()),
        })
    return result


import asyncio
from app.core.websocket import ws_manager


@router.post("/messages")
def send_message(data: MessageCreate, current_user: dict = Depends(get_current_user)):
    """Send a new message between Doctor OPD and Medical Shop."""
    if not data.message.strip():
        raise HTTPException(status_code=400, detail="Message content cannot be empty.")

    db = get_db()
    clinic_id = get_clinic_id(current_user)
    now = datetime.now(timezone.utc).isoformat()

    msg_doc = {
        "_id": str(uuid.uuid4()),
        "clinic_id": clinic_id,
        "sender_id": str(current_user.get("_id", "")),
        "sender_name": current_user.get("full_name") or current_user.get("name") or "Doctor / Pharmacist",
        "sender_role": current_user.get("role", "DOCTOR"),
        "recipient_role": data.recipient_role or ("PHARMACIST" if current_user.get("role") == "DOCTOR" else "DOCTOR"),
        "message": data.message.strip(),
        "prescription_id": data.prescription_id,
        "patient_name": data.patient_name,
        "priority": data.priority or "NORMAL",
        "created_at": now,
    }

    db["communication_messages"].insert_one(msg_doc)

    # Trigger real-time WebSocket broadcast to all active clinic clients
    try:
        ws_payload = {
            "event": "chat_message",
            "title": f"💬 Message from {msg_doc['sender_name']}",
            "message": msg_doc["message"],
            "target_clinic_id": clinic_id,
            "priority": msg_doc["priority"],
        }
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(ws_manager.broadcast(ws_payload))
        except RuntimeError:
            asyncio.run(ws_manager.broadcast(ws_payload))
    except Exception:
        pass

    return {
        "id": msg_doc["_id"],
        "clinic_id": clinic_id,
        "sender_id": msg_doc["sender_id"],
        "sender_name": msg_doc["sender_name"],
        "sender_role": msg_doc["sender_role"],
        "recipient_role": msg_doc["recipient_role"],
        "message": msg_doc["message"],
        "prescription_id": msg_doc["prescription_id"],
        "patient_name": msg_doc["patient_name"],
        "priority": msg_doc["priority"],
        "created_at": now,
    }


@router.delete("/messages")
def clear_all_messages(current_user: dict = Depends(get_current_user)):
    """Clear all chat messages for the clinic."""
    db = get_db()
    clinic_id = get_clinic_id(current_user)
    result = db["communication_messages"].delete_many({"clinic_id": clinic_id})
    return {"message": "Chat history cleared successfully.", "deleted_count": result.deleted_count}


@router.delete("/messages/{message_id}")
def delete_single_message(message_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a single chat message."""
    db = get_db()
    clinic_id = get_clinic_id(current_user)
    res = db["communication_messages"].delete_one({"_id": message_id, "clinic_id": clinic_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Message not found.")
    return {"message": "Message deleted successfully."}
