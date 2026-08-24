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
from datetime import datetime, timezone, timedelta
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


class TrialRequest(BaseModel):
    trial_days: int = 14


class BroadcastMessageCreate(BaseModel):
    target_group: str = "ALL"  # ALL, DOCTORS, PHARMACISTS, HOSPITALS, SPECIFIC
    target_clinic_id: Optional[str] = None
    target_user_id: Optional[str] = None
    subject: str
    message: str
    priority: str = "INFO"  # INFO, WARNING, CRITICAL_ALERT


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

@router.get("/hospitals", summary="List all registered hospitals with medical stats")
def list_hospitals(
    search: Optional[str] = None,
    plan: Optional[str] = None,
    _: dict = Depends(require_master_admin),
):
    """Returns all clinics with detailed medical stats, doctors list, and subscription plan info."""
    db = get_db()
    query_filter: dict = {}
    if search:
        query_filter["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]

    clinics = list(db["clinics"].find(query_filter))
    result = []
    now_dt = datetime.now(timezone.utc)

    for clinic in clinics:
        cid = str(clinic["_id"])
        sub = db["subscriptions"].find_one({"clinic_id": cid})

        doctor_count = db["users"].count_documents({"clinic_id": cid, "role": {"$in": ["DOCTOR", "CLINIC_ADMIN"]}})
        pharmacist_count = db["users"].count_documents({"clinic_id": cid, "role": "PHARMACIST"})
        prescription_count = db["prescriptions"].count_documents({"clinic_id": cid})
        patient_count = db["patients"].count_documents({"clinic_id": cid})
        medicine_count = db["medicines"].count_documents({"clinic_id": cid})
        bill_count = db["pharmacy_bills"].count_documents({"clinic_id": cid})

        # Calculate revenue
        bills = list(db["pharmacy_bills"].find({"clinic_id": cid}))
        total_revenue = sum(float(b.get("grand_total", b.get("total_amount", 0))) for b in bills)

        # Clinic Profile info
        prof = db["clinic_profiles"].find_one({"clinic_id": cid})

        # Owner user info
        owner = db["users"].find_one({"clinic_id": cid, "role": {"$in": ["CLINIC_ADMIN", "DOCTOR"]}}) or db["users"].find_one({"clinic_id": cid})
        owner_name = (prof.get("doctor_name_en") if prof and prof.get("doctor_name_en") else None) or (owner.get("full_name") if owner else None) or (owner.get("name") if owner else None) or clinic.get("owner_name", "Doctor / Admin")
        hospital_name = (prof.get("hospital_name_en") if prof and prof.get("hospital_name_en") else None) or clinic.get("name", "Hospital")

        owner_info = None
        if owner or prof:
            owner_info = {
                "name": owner_name,
                "email": (owner.get("email") if owner else None) or clinic.get("email", ""),
                "phone": (prof.get("phone") if prof and prof.get("phone") else None) or (owner.get("phone") if owner else None) or clinic.get("phone", ""),
                "role": owner.get("role", "DOCTOR") if owner else "DOCTOR",
                "registration_number": (prof.get("reg_number") if prof and prof.get("reg_number") else None) or clinic.get("registration_number", ""),
            }

        # Calculate dates
        created_at_str = clinic.get("created_at") or (sub.get("created_at") if sub else None) or now_dt.isoformat()
        active_from_str = (sub.get("updated_at") if sub else None) or (sub.get("created_at") if sub else None) or created_at_str

        # Calculate trial remaining days
        valid_until_str = sub.get("valid_until") if sub else None
        trial_days_left = 0
        if valid_until_str:
            try:
                valid_dt = datetime.fromisoformat(valid_until_str.replace("Z", "+00:00"))
                diff = (valid_dt - now_dt).days
                trial_days_left = max(0, diff)
            except Exception:
                trial_days_left = 0

        row = {
            "id": cid,
            "name": hospital_name,
            "name_mr": (prof.get("hospital_name_mr") if prof else None) or clinic.get("name_mr", ""),
            "address": (prof.get("address") if prof and prof.get("address") else None) or clinic.get("address", ""),
            "phone": clinic.get("phone", ""),
            "email": clinic.get("email", ""),
            "registration_number": clinic.get("registration_number", ""),
            "created_at": created_at_str,
            "active_from": active_from_str,
            "doctor_count": doctor_count,
            "pharmacist_count": pharmacist_count,
            "prescription_count": prescription_count,
            "patient_count": patient_count,
            "medicine_count": medicine_count,
            "bill_count": bill_count,
            "total_revenue": total_revenue,
            "subscription_plan": sub.get("plan", "FREE") if sub else "FREE",
            "subscription_active": sub.get("is_active", True) if sub else True,
            "subscription_valid_until": valid_until_str,
            "trial_days_remaining": trial_days_left,
            "custom_price_inr": sub.get("custom_price_inr") if sub else None,
            "owner_info": owner_info,
            "facilities": clinic.get("facilities", ["General Medicine", "ICU & OPD", "Laboratory"]),
            "clinic_hours": clinic.get("clinic_hours", "Morning 9 to 1 | Evening 5 to 9"),
        }
        result.append(row)

    if plan:
        result = [h for h in result if h["subscription_plan"] == plan]
    return result


@router.post("/hospitals/{clinic_id}/trial", summary="Grant subscription trial to a hospital")
def grant_subscription_trial(
    clinic_id: str,
    payload: TrialRequest,
    _: dict = Depends(require_master_admin),
):
    """Extends or sets a hospital's subscription trial by N days."""
    db = get_db()
    clinic = db["clinics"].find_one({"_id": clinic_id})
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found.")

    from datetime import timedelta
    now_dt = datetime.now(timezone.utc)
    valid_until_dt = now_dt + timedelta(days=payload.trial_days)
    valid_until_str = valid_until_dt.isoformat()

    db["subscriptions"].update_one(
        {"clinic_id": clinic_id},
        {
            "$set": {
                "plan": "TRIAL",
                "valid_until": valid_until_str,
                "is_active": True,
                "updated_at": now_dt.isoformat(),
            }
        },
        upsert=True,
    )
    return {
        "message": f"Successfully granted {payload.trial_days}-day trial to '{clinic.get('name', '')}'.",
        "clinic_id": clinic_id,
        "plan": "TRIAL",
        "valid_until": valid_until_str,
        "trial_days_remaining": payload.trial_days,
    }


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


# ─── Broadcast Messaging ──────────────────────────────────────────────────────

@router.post("/messages/broadcast", summary="Send broadcast message to single or multi-users")
def send_broadcast_message(
    payload: BroadcastMessageCreate,
    current_user: dict = Depends(require_master_admin),
):
    """Sends a system-wide or targeted notification message to users/hospitals."""
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    msg_id = str(uuid.uuid4())

    doc = {
        "_id": msg_id,
        "sender_id": str(current_user["_id"]),
        "sender_name": "Master Admin",
        "target_group": payload.target_group,
        "target_clinic_id": payload.target_clinic_id,
        "target_user_id": payload.target_user_id,
        "subject": payload.subject,
        "message": payload.message,
        "priority": payload.priority,
        "created_at": now,
    }
    db["broadcast_messages"].insert_one(doc)
    return {
        "message": f"Broadcast message sent to target group '{payload.target_group}' successfully!",
        "id": msg_id,
        "doc": doc,
    }


@router.get("/messages", summary="List sent broadcast messages")
def list_broadcast_messages(_: dict = Depends(require_master_admin)):
    """Returns all broadcast messages sent by Master Admin."""
    db = get_db()
    msgs = list(db["broadcast_messages"].find().sort("created_at", -1))
    result = []
    for m in msgs:
        result.append({
            "id": str(m.get("_id", "")),
            "sender_id": m.get("sender_id", ""),
            "sender_name": m.get("sender_name", "Master Admin"),
            "target_group": m.get("target_group", "ALL"),
            "target_clinic_id": m.get("target_clinic_id"),
            "target_user_id": m.get("target_user_id"),
            "subject": m.get("subject", ""),
            "message": m.get("message", ""),
            "priority": m.get("priority", "INFO"),
            "created_at": m.get("created_at"),
        })
    return result


# ─── Subscription Plan & Custom Pricing Management (Master Admin) ─────────────

class PlanConfigInput(BaseModel):
    plan_key: str
    label: str
    amount_inr: float
    duration_days: int = 30
    features: List[str] = []
    is_active: bool = True


class CustomHospitalSubInput(BaseModel):
    plan: str
    custom_price_inr: float
    duration_days: int = 30
    notes: Optional[str] = None


@router.get("/plans", summary="Master Admin: List all configurable subscription plans")
def get_admin_plans(_: dict = Depends(require_master_admin)):
    """Returns all subscription plans and prices configured in MongoDB."""
    db = get_db()
    plans = list(db["subscription_plans"].find())
    if not plans:
        # Seed defaults
        defaults = [
            {"_id": "TRIAL_7D", "plan_key": "TRIAL_7D", "label": "7-Day Free Trial", "amount": 0, "currency": "INR", "duration_days": 7, "features": ["OPD Prescription Writer", "7-Day Access"], "is_active": True},
            {"_id": "PRO", "plan_key": "PRO", "label": "PRO Plan (Monthly)", "amount": 99900, "currency": "INR", "duration_days": 30, "features": ["Unlimited Prescriptions", "Medical Inventory Sync", "WhatsApp & SMS"], "is_active": True},
            {"_id": "ENTERPRISE", "plan_key": "ENTERPRISE", "label": "ENTERPRISE Plan (Monthly)", "amount": 249900, "currency": "INR", "duration_days": 30, "features": ["Multi-Doctor Sync", "Patient History Analytics", "Priority Support"], "is_active": True},
        ]
        for d in defaults:
            db["subscription_plans"].update_one({"_id": d["_id"]}, {"$set": d}, upsert=True)
        plans = defaults

    res = []
    for p in plans:
        amt = float(p.get("amount", 0))
        res.append({
            "plan_key": p.get("plan_key", "").upper(),
            "label": p.get("label", ""),
            "amount_inr": amt / 100.0 if amt > 0 else 0,
            "amount_paise": int(amt),
            "currency": p.get("currency", "INR"),
            "duration_days": int(p.get("duration_days", 30)),
            "features": p.get("features", []),
            "is_active": bool(p.get("is_active", True)),
        })
    return res


@router.post("/plans", summary="Master Admin: Create or update a subscription plan & price")
def save_admin_plan(
    payload: PlanConfigInput,
    _: dict = Depends(require_master_admin),
):
    """Creates a new plan or updates existing plan price, duration, and features."""
    db = get_db()
    plan_key = payload.plan_key.strip().upper()
    amount_paise = int(payload.amount_inr * 100)
    now = datetime.now(timezone.utc).isoformat()

    doc = {
        "_id": plan_key,
        "plan_key": plan_key,
        "label": payload.label.strip(),
        "amount": amount_paise,
        "currency": "INR",
        "duration_days": payload.duration_days,
        "features": payload.features,
        "is_active": payload.is_active,
        "updated_at": now,
    }

    db["subscription_plans"].update_one({"_id": plan_key}, {"$set": doc}, upsert=True)
    return {
        "message": f"Subscription plan '{plan_key}' configured successfully! Price set to ₹{payload.amount_inr}",
        "plan": doc,
    }


@router.post("/hospitals/{clinic_id}/custom-subscription", summary="Master Admin: Override & set custom subscription plan and price for a hospital")
def set_custom_hospital_subscription(
    clinic_id: str,
    payload: CustomHospitalSubInput,
    _: dict = Depends(require_master_admin),
):
    """Sets a custom subscription plan, custom price, and validity duration directly for a specific hospital user."""
    db = get_db()
    now_dt = datetime.now(timezone.utc)
    valid_until_dt = now_dt + timedelta(days=payload.duration_days)
    valid_until_str = valid_until_dt.isoformat()

    sub_doc = {
        "clinic_id": clinic_id,
        "plan": payload.plan.upper(),
        "custom_price_inr": payload.custom_price_inr,
        "valid_until": valid_until_str,
        "is_active": True,
        "notes": payload.notes,
        "updated_at": now_dt.isoformat(),
    }
    db["subscriptions"].update_one({"clinic_id": clinic_id}, {"$set": sub_doc}, upsert=True)

    # Log payment record for auditing
    db["payment_records"].insert_one({
        "_id": str(uuid.uuid4()),
        "clinic_id": clinic_id,
        "user_id": "MASTER_ADMIN",
        "order_id": f"admin_custom_{uuid.uuid4().hex[:8]}",
        "payment_id": f"admin_grant_{uuid.uuid4().hex[:8]}",
        "plan": payload.plan.upper(),
        "amount": payload.custom_price_inr,
        "currency": "INR",
        "status": "MASTER_ADMIN_GRANTED",
        "verified_at": now_dt.isoformat(),
    })

    return {
        "message": f"Custom subscription plan '{payload.plan}' (Price: ₹{payload.custom_price_inr}) assigned to hospital successfully until {valid_until_str[:10]}!",
        "subscription": sub_doc,
    }


# ─── User Accounts & Login Vitals ─────────────────────────────────────────────

@router.get("/users", summary="Master Admin: List all platform users with login vitals and hospital mapping")
def list_admin_users(
    search: Optional[str] = None,
    role: Optional[str] = None,
    _: dict = Depends(require_master_admin),
):
    """Returns all platform users across hospitals with detailed login vitals, online status, platform, and last login time."""
    db = get_db()
    query_filter: dict = {}
    if search:
        query_filter["$or"] = [
            {"full_name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]
    if role:
        query_filter["role"] = role.upper()

    users = list(db["users"].find(query_filter).sort("created_at", -1))
    result = []
    now_dt = datetime.now(timezone.utc)

    for u in users:
        uid = str(u["_id"])
        cid = u.get("clinic_id", "")
        clinic = db["clinics"].find_one({"_id": cid}) if cid else None

        last_login_str = u.get("last_login_at") or u.get("created_at") or now_dt.isoformat()
        is_online = False
        if last_login_str:
            try:
                login_dt = datetime.fromisoformat(last_login_str.replace("Z", "+00:00"))
                # Consider online if logged in within last 120 minutes
                if (now_dt - login_dt).total_seconds() < 7200:
                    is_online = True
            except Exception:
                is_online = False

        result.append({
            "id": uid,
            "full_name": u.get("full_name", "Unknown User"),
            "email": u.get("email", ""),
            "role": u.get("role", "DOCTOR"),
            "clinic_id": cid,
            "hospital_name": clinic.get("name", "Suyog Hospital Motala") if clinic else "Suyog Hospital Motala",
            "is_active": u.get("is_active", True),
            "license_number": u.get("license_number"),
            "last_login_at": last_login_str,
            "last_platform": u.get("last_platform", "Desktop Web (Chrome / Windows)"),
            "last_ip": u.get("last_ip", "127.0.0.1 (Local / Maharashtra)"),
            "is_online": is_online,
            "created_at": u.get("created_at") or now_dt.isoformat(),
        })

    return result


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
