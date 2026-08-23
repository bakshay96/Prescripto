from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.subscription import SubscriptionPlan


class SubscriptionOut(BaseModel):
    id: str
    clinic_id: str
    plan: SubscriptionPlan
    valid_until: Optional[date] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SubscriptionUpdate(BaseModel):
    plan: SubscriptionPlan
    valid_until: Optional[date] = None
    is_active: Optional[bool] = None
