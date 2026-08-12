import uuid
import enum
from datetime import datetime, date, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Date, ForeignKey, Enum
from app.core.database import Base


def generate_uuid():
    return str(uuid.uuid4())


class SubscriptionPlan(str, enum.Enum):
    FREE = "FREE"
    BASIC = "BASIC"
    PRO = "PRO"


class Subscription(Base):
    """Tracks the subscription plan for each registered clinic/hospital."""
    __tablename__ = "subscriptions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    clinic_id = Column(String(36), ForeignKey("clinics.id"), nullable=False, unique=True, index=True)
    plan = Column(Enum(SubscriptionPlan), nullable=False, default=SubscriptionPlan.FREE)
    valid_until = Column(Date, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
