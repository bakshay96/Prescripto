"""
Master Admin Router — /api/v1/admin
Restricted to MASTER_ADMIN role only.
Provides:
  - Hospital (Clinic) listing and block/unblock
  - Subscription management per clinic
  - Support query inbox and reply
  - Platform-wide analytics
"""
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.api.deps import get_current_user, require_master_admin
from app.models.user import User, UserRole
from app.models.clinic import Clinic
from app.models.subscription import Subscription, SubscriptionPlan
from app.models.support_query import SupportQuery, QueryStatus
from app.models.prescription import Prescription
from app.models.medicine import Medicine
from app.schemas.subscription import SubscriptionOut, SubscriptionUpdate
from app.schemas.support_query import SupportQueryOut, SupportQueryReply, SupportQueryCreate
from pydantic import BaseModel, ConfigDict

router = APIRouter(prefix="/admin", tags=["Master Admin"])


# ── Schemas ──
class ClinicAdminOut(BaseModel):
    id: str
    name: str
    address: str
    phone: str
    email: str
    registration_number: str
    is_active: bool = True
    doctor_count: int = 0
    subscription_plan: str = "FREE"

    model_config = ConfigDict(from_attributes=True)


class PlatformAnalytics(BaseModel):
    total_hospitals: int
    total_users: int
    total_prescriptions: int
    total_medicines: int
    open_queries: int
    active_subscriptions: int


# ════════════════════════════════════════════════
#  ANALYTICS
# ════════════════════════════════════════════════

@router.get("/analytics", response_model=PlatformAnalytics)
def get_platform_analytics(
    db: Session = Depends(get_db),
    _: User = Depends(require_master_admin)
):
    """Return platform-wide statistics for the master admin dashboard."""
    total_hospitals = db.query(func.count(Clinic.id)).scalar() or 0
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_prescriptions = db.query(func.count(Prescription.id)).scalar() or 0
    total_medicines = db.query(func.count(Medicine.id)).scalar() or 0
    open_queries = db.query(func.count(SupportQuery.id)).filter(SupportQuery.status == QueryStatus.OPEN).scalar() or 0
    active_subscriptions = db.query(func.count(Subscription.id)).filter(Subscription.is_active == True).scalar() or 0

    return PlatformAnalytics(
        total_hospitals=total_hospitals,
        total_users=total_users,
        total_prescriptions=total_prescriptions,
        total_medicines=total_medicines,
        open_queries=open_queries,
        active_subscriptions=active_subscriptions
    )


# ════════════════════════════════════════════════
#  HOSPITAL (CLINIC) MANAGEMENT
# ════════════════════════════════════════════════

@router.get("/hospitals", summary="List all registered hospitals")
def list_hospitals(
    search: Optional[str] = None,
    plan: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_master_admin)
):
    """Returns all clinics with their subscription plan info."""
    query = db.query(Clinic)
    if search:
        query = query.filter(
            Clinic.name.ilike(f"%{search}%") | Clinic.email.ilike(f"%{search}%")
        )
    clinics = query.all()
    result = []
    for clinic in clinics:
        sub = db.query(Subscription).filter(Subscription.clinic_id == clinic.id).first()
        doctor_count = db.query(func.count(User.id)).filter(User.clinic_id == clinic.id).scalar() or 0
        result.append({
            "id": clinic.id,
            "name": clinic.name,
            "address": clinic.address,
            "phone": clinic.phone,
            "email": clinic.email,
            "registration_number": clinic.registration_number,
            "doctor_count": doctor_count,
            "subscription_plan": sub.plan.value if sub else "FREE",
            "subscription_active": sub.is_active if sub else True,
            "subscription_valid_until": sub.valid_until.isoformat() if sub and sub.valid_until else None,
        })
    if plan:
        result = [h for h in result if h["subscription_plan"] == plan]
    return result


@router.post("/hospitals/{clinic_id}/block", summary="Block a hospital from accessing Prescripto")
def block_hospital(
    clinic_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_master_admin)
):
    """Blocks all users of a clinic by deactivating their accounts."""
    clinic = db.query(Clinic).filter(Clinic.id == clinic_id).first()
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found.")
    users = db.query(User).filter(User.clinic_id == clinic_id).all()
    for user in users:
        user.is_active = False
    db.commit()
    return {"message": f"All {len(users)} users of '{clinic.name}' have been deactivated."}


@router.post("/hospitals/{clinic_id}/unblock", summary="Unblock a hospital")
def unblock_hospital(
    clinic_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_master_admin)
):
    clinic = db.query(Clinic).filter(Clinic.id == clinic_id).first()
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found.")
    users = db.query(User).filter(User.clinic_id == clinic_id).all()
    for user in users:
        user.is_active = True
    db.commit()
    return {"message": f"All users of '{clinic.name}' have been reactivated."}


# ════════════════════════════════════════════════
#  SUBSCRIPTION MANAGEMENT
# ════════════════════════════════════════════════

@router.get("/subscriptions", response_model=List[SubscriptionOut])
def list_subscriptions(
    db: Session = Depends(get_db),
    _: User = Depends(require_master_admin)
):
    """Returns all clinic subscriptions."""
    return db.query(Subscription).all()


@router.post("/subscriptions/{clinic_id}", response_model=SubscriptionOut)
def upsert_subscription(
    clinic_id: str,
    payload: SubscriptionUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_master_admin)
):
    """Create or update a clinic's subscription plan."""
    clinic = db.query(Clinic).filter(Clinic.id == clinic_id).first()
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found.")

    sub = db.query(Subscription).filter(Subscription.clinic_id == clinic_id).first()
    if sub:
        sub.plan = payload.plan
        if payload.valid_until is not None:
            sub.valid_until = payload.valid_until
        if payload.is_active is not None:
            sub.is_active = payload.is_active
        sub.updated_at = datetime.now(timezone.utc)
    else:
        sub = Subscription(
            clinic_id=clinic_id,
            plan=payload.plan,
            valid_until=payload.valid_until,
            is_active=payload.is_active if payload.is_active is not None else True
        )
        db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


@router.patch("/subscriptions/{clinic_id}/toggle", summary="Toggle subscription active/inactive")
def toggle_subscription(
    clinic_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_master_admin)
):
    sub = db.query(Subscription).filter(Subscription.clinic_id == clinic_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found.")
    sub.is_active = not sub.is_active
    sub.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"clinic_id": clinic_id, "is_active": sub.is_active}


# ════════════════════════════════════════════════
#  SUPPORT QUERIES
# ════════════════════════════════════════════════

@router.get("/queries", response_model=List[SupportQueryOut])
def list_queries(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_master_admin)
):
    """List all support queries, optionally filtered by status."""
    q = db.query(SupportQuery)
    if status_filter:
        try:
            q = q.filter(SupportQuery.status == QueryStatus(status_filter))
        except ValueError:
            pass
    return q.order_by(SupportQuery.created_at.desc()).all()


@router.post("/queries/{query_id}/respond", response_model=SupportQueryOut)
def respond_to_query(
    query_id: str,
    payload: SupportQueryReply,
    db: Session = Depends(get_db),
    _: User = Depends(require_master_admin)
):
    """Master admin responds to a support query and marks it as RESOLVED."""
    query = db.query(SupportQuery).filter(SupportQuery.id == query_id).first()
    if not query:
        raise HTTPException(status_code=404, detail="Query not found.")
    query.admin_response = payload.response
    query.status = QueryStatus.RESOLVED
    query.responded_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(query)
    return query


# ════════════════════════════════════════════════
#  SUPPORT QUERY — Submit (Doctor / Pharmacist)
# ════════════════════════════════════════════════

@router.post("/queries", response_model=SupportQueryOut, status_code=status.HTTP_201_CREATED)
def submit_query(
    payload: SupportQueryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Any authenticated user can submit a support query."""
    sq = SupportQuery(
        from_user_id=current_user.id,
        clinic_id=current_user.clinic_id or "",
        subject=payload.subject,
        message=payload.message,
        status=QueryStatus.OPEN
    )
    db.add(sq)
    db.commit()
    db.refresh(sq)
    return sq
