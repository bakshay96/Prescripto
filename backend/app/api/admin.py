"""
Master Admin Router — /api/v1/admin
Restricted to MASTER_ADMIN role only.
Provides:
  - Hospital (Clinic) listing and block/unblock
  - Subscription management per clinic
  - Support query inbox and reply
  - Platform-wide analytics
All data stored in MongoDB.
"""
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict

from app.core.database import get_db
from app.api.deps import get_current_user, require_master_admin

router = APIRouter(prefix="/admin", tags=["Master Admin"])


# ─── Pydantic schemas ─────────────────────────────────────────────────────────

class PlatformAnalytics(BaseModel):
    total_hospitals: int
    total_users: int
    total_prescriptions: int
    total_medicines: int
    open_queries: int
    active_subscriptions: int


class SubscriptionUpdate(BaseModel):
    plan: str = "FREE"
    valid_until: Optional[str] = None
    is_active: Optional[bool] = True


class SupportQueryCreate(BaseModel):
    subject: str
    message: str


class SupportQueryReply(BaseModel):
    response: str


# ─── Analytics ────────────────────────────────────────────────────────────────

@router.get("/analytics", response_model=PlatformAnalytics)
def get_platform_analytics(_: dict = Depends(require_master_admin)):
    """Return platform-wide statistics for the master admin dashboard."""
    db = get_db()
    return PlatformAnalytics(
        total_hospitals=db["clinics"].count_documents({}),
        total_users=db["users"].count_documents({}),
        total_prescriptions=db["prescriptions"].count_documents({}),
        total_medicines=db["medicines"].count_documents({}),
        open_queries=db["support_queries"].count_documents({"status": "OPEN"}),
        active_subscriptions=db["subscriptions"].count_documents({"is_active": True}),
    )


# ─── Hospital (Clinic) Management ─────────────────────────────────────────────

@router.get("/hospitals", summary="List all registered hospitals")
def list_hospitals(
    search: Optional[str] = None,
    plan: Optional[str] = None,
    _: dict = Depends(require_master_admin),
):
    """Returns all clinics with their subscription plan info."""
    db = get_db()
    query_filter: dict = {}
    if search:
        query_filter["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]

    clinics = list(db["clinics"].find(query_filter))
    result = []
    for clinic in clinics:
        cid = str(clinic["_id"])
        sub = db["subscriptions"].find_one({"clinic_id": cid})
        doctor_count = db["users"].count_documents({"clinic_id": cid})
        row = {
            "id": cid,
            "name": clinic.get("name", ""),
            "address": clinic.get("address", ""),
            "phone": clinic.get("phone", ""),
            "email": clinic.get("email", ""),
            "registration_number": clinic.get("registration_number", ""),
            "doctor_count": doctor_count,
            "subscription_plan": sub.get("plan", "FREE") if sub else "FREE",
            "subscription_active": sub.get("is_active", True) if sub else True,
            "subscription_valid_until": sub.get("valid_until") if sub else None,
        }
        result.append(row)

    if plan:
        result = [h for h in result if h["subscription_plan"] == plan]
    return result


@router.post("/hospitals/{clinic_id}/block", summary="Block a hospital")
def block_hospital(clinic_id: str, _: dict = Depends(require_master_admin)):
    """Blocks all users of a clinic by deactivating their accounts."""
    db = get_db()
    clinic = db["clinics"].find_one({"_id": clinic_id})
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found.")
    result = db["users"].update_many({"clinic_id": clinic_id}, {"$set": {"is_active": False}})
    return {"message": f"All {result.modified_count} users of '{clinic.get('name', '')}' have been deactivated."}


@router.post("/hospitals/{clinic_id}/unblock", summary="Unblock a hospital")
def unblock_hospital(clinic_id: str, _: dict = Depends(require_master_admin)):
    db = get_db()
    clinic = db["clinics"].find_one({"_id": clinic_id})
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found.")
    result = db["users"].update_many({"clinic_id": clinic_id}, {"$set": {"is_active": True}})
    return {"message": f"All users of '{clinic.get('name', '')}' have been reactivated."}


# ─── Subscription Management ──────────────────────────────────────────────────

@router.get("/subscriptions")
def list_subscriptions(_: dict = Depends(require_master_admin)):
    """Returns all clinic subscriptions."""
    db = get_db()
    subs = list(db["subscriptions"].find())
    return [_format_sub(s) for s in subs]


@router.post("/subscriptions/{clinic_id}")
def upsert_subscription(
    clinic_id: str,
    payload: SubscriptionUpdate,
    _: dict = Depends(require_master_admin),
):
    """Create or update a clinic's subscription plan."""
    db = get_db()
    clinic = db["clinics"].find_one({"_id": clinic_id})
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found.")

    now = datetime.now(timezone.utc).isoformat()
    existing = db["subscriptions"].find_one({"clinic_id": clinic_id})
    if existing:
        db["subscriptions"].update_one(
            {"clinic_id": clinic_id},
            {"$set": {
                "plan": payload.plan,
                "valid_until": payload.valid_until,
                "is_active": payload.is_active if payload.is_active is not None else True,
                "updated_at": now,
            }}
        )
    else:
        db["subscriptions"].insert_one({
            "_id": str(uuid.uuid4()),
            "clinic_id": clinic_id,
            "plan": payload.plan,
            "valid_until": payload.valid_until,
            "is_active": payload.is_active if payload.is_active is not None else True,
            "created_at": now,
            "updated_at": now,
        })

    sub = db["subscriptions"].find_one({"clinic_id": clinic_id})
    return _format_sub(sub)


@router.patch("/subscriptions/{clinic_id}/toggle", summary="Toggle subscription active/inactive")
def toggle_subscription(clinic_id: str, _: dict = Depends(require_master_admin)):
    db = get_db()
    sub = db["subscriptions"].find_one({"clinic_id": clinic_id})
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found.")
    new_val = not sub.get("is_active", True)
    db["subscriptions"].update_one(
        {"clinic_id": clinic_id},
        {"$set": {"is_active": new_val, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"clinic_id": clinic_id, "is_active": new_val}


# ─── Support Queries ──────────────────────────────────────────────────────────

@router.get("/queries")
def list_queries(
    status_filter: Optional[str] = None,
    _: dict = Depends(require_master_admin),
):
    """List all support queries, optionally filtered by status."""
    db = get_db()
    query_filter: dict = {}
    if status_filter:
        query_filter["status"] = status_filter.upper()
    queries = list(db["support_queries"].find(query_filter).sort("created_at", -1))
    return [_format_query(q) for q in queries]


@router.post("/queries/{query_id}/respond")
def respond_to_query(
    query_id: str,
    payload: SupportQueryReply,
    _: dict = Depends(require_master_admin),
):
    """Master admin responds to a support query and marks it as RESOLVED."""
    db = get_db()
    query = db["support_queries"].find_one({"_id": query_id})
    if not query:
        raise HTTPException(status_code=404, detail="Query not found.")
    now = datetime.now(timezone.utc).isoformat()
    db["support_queries"].update_one(
        {"_id": query_id},
        {"$set": {"admin_response": payload.response, "status": "RESOLVED", "responded_at": now}}
    )
    updated = db["support_queries"].find_one({"_id": query_id})
    return _format_query(updated)


@router.post("/queries", status_code=status.HTTP_201_CREATED)
def submit_query(
    payload: SupportQueryCreate,
    current_user: dict = Depends(get_current_user),
):
    """Any authenticated user can submit a support query."""
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    query_id = str(uuid.uuid4())
    doc = {
        "_id": query_id,
        "from_user_id": str(current_user["_id"]),
        "clinic_id": current_user.get("clinic_id", ""),
        "subject": payload.subject,
        "message": payload.message,
        "status": "OPEN",
        "admin_response": None,
        "responded_at": None,
        "created_at": now,
    }
    db["support_queries"].insert_one(doc)
    return _format_query(doc)


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _format_sub(sub: dict) -> dict:
    return {
        "id": str(sub.get("_id", "")),
        "clinic_id": sub.get("clinic_id", ""),
        "plan": sub.get("plan", "FREE"),
        "valid_until": sub.get("valid_until"),
        "is_active": sub.get("is_active", True),
        "created_at": sub.get("created_at"),
        "updated_at": sub.get("updated_at"),
    }


def _format_query(q: dict) -> dict:
    return {
        "id": str(q.get("_id", "")),
        "from_user_id": q.get("from_user_id", ""),
        "clinic_id": q.get("clinic_id", ""),
        "subject": q.get("subject", ""),
        "message": q.get("message", ""),
        "status": q.get("status", "OPEN"),
        "admin_response": q.get("admin_response"),
        "responded_at": q.get("responded_at"),
        "created_at": q.get("created_at"),
    }
