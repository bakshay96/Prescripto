"""
System Notifications & Alerts API — /api/v1/notifications
Manages notifications, announcements, pricing updates, and feature alerts for Master Admin, Doctors, and Medical Stores.
Stored in MongoDB notifications collection.
"""
import uuid
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.database import get_db
from app.api.deps import get_current_user, require_master_admin, get_clinic_id

router = APIRouter(prefix="/notifications", tags=["Notifications & Alerts"])


# ─── Pydantic Schemas ─────────────────────────────────────────────────────────

class NotificationCreate(BaseModel):
    category: str = "SYSTEM"  # PRICING, FEATURE_ALERT, BROADCAST, MESSAGE, SYSTEM
    title: str
    message: str
    target_role: Optional[str] = "ALL"  # ALL, DOCTOR, PHARMACIST, MASTER_ADMIN
    target_clinic_id: Optional[str] = None
    priority: Optional[str] = "INFO"  # INFO, WARNING, CRITICAL
    expiry_hours: Optional[int] = 168  # default 7 days (168 hours), 0 = never expire


@router.get("", summary="Get notifications for current user")
def list_user_notifications(current_user: dict = Depends(get_current_user)):
    """Returns persistent notifications matching user role and clinic."""
    db = get_db()
    role = current_user.get("role", "DOCTOR")
    clinic_id = current_user.get("clinic_id")

    query = {
        "$or": [
            {"target_role": "ALL"},
            {"target_role": role},
            {"target_user_id": str(current_user.get("_id"))},
        ]
    }

    if clinic_id:
        query["$or"].append({"target_clinic_id": clinic_id})

    docs = list(db["notifications"].find(query).sort("created_at", -1).limit(50))

    user_id = str(current_user.get("_id"))
    now_iso = datetime.now(timezone.utc).isoformat()
    result = []
    for d in docs:
        expires_at = d.get("expires_at")
        if expires_at and expires_at < now_iso:
            continue  # Filter out expired messages

        read_list = d.get("read_by", [])
        result.append({
            "id": str(d.get("_id", "")),
            "category": d.get("category", "SYSTEM"),
            "title": d.get("title", ""),
            "message": d.get("message", ""),
            "target_role": d.get("target_role", "ALL"),
            "target_clinic_id": d.get("target_clinic_id"),
            "priority": d.get("priority", "INFO"),
            "read": user_id in read_list,
            "expires_at": expires_at,
            "reping_count": d.get("reping_count", 0),
            "created_at": d.get("created_at", now_iso),
        })
    return result


@router.post("/mark-read")
def mark_notifications_read(current_user: dict = Depends(get_current_user)):
    """Mark all notifications as read for current user."""
    db = get_db()
    user_id = str(current_user.get("_id"))
    db["notifications"].update_many(
        {},
        {"$addToSet": {"read_by": user_id}}
    )
    return {"message": "All notifications marked as read."}


@router.post("/broadcast", summary="Master Admin Broadcast Notification")
def create_broadcast_notification(
    data: NotificationCreate,
    current_user: dict = Depends(require_master_admin),
):
    """Master Admin endpoint to send notifications/alerts to Doctors, Medical Stores, or All Hospitals."""
    db = get_db()
    now_dt = datetime.now(timezone.utc)
    now_iso = now_dt.isoformat()

    expires_at = None
    if data.expiry_hours and data.expiry_hours > 0:
        expires_at = (now_dt + timedelta(hours=data.expiry_hours)).isoformat()

    doc = {
        "_id": str(uuid.uuid4()),
        "category": data.category or "BROADCAST",
        "title": data.title.strip(),
        "message": data.message.strip(),
        "target_role": data.target_role or "ALL",
        "target_clinic_id": data.target_clinic_id,
        "priority": data.priority or "INFO",
        "expires_at": expires_at,
        "reping_count": 0,
        "read_by": [],
        "created_at": now_iso,
    }
    db["notifications"].insert_one(doc)
    return {
        "message": "Notification broadcasted successfully to target portal users.",
        "id": doc["_id"],
        "notification": doc,
    }


@router.post("/{notification_id}/reping", summary="Master Admin Re-Ping Notification")
def reping_notification(
    notification_id: str,
    current_user: dict = Depends(require_master_admin),
):
    """Re-ping an existing broadcast notification to re-trigger live audio sound and alert toast on user screens."""
    db = get_db()
    notif = db["notifications"].find_one({"_id": notification_id})
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found.")

    now_iso = datetime.now(timezone.utc).isoformat()
    db["notifications"].update_one(
        {"_id": notification_id},
        {
            "$inc": {"reping_count": 1},
            "$set": {"repinged_at": now_iso, "read_by": []}  # Reset read status so it pops up again
        }
    )

    return {
        "message": f"Re-pinged notification '{notif.get('title')}' successfully to active users!",
        "notification_id": notification_id,
        "reping_count": notif.get("reping_count", 0) + 1,
    }
