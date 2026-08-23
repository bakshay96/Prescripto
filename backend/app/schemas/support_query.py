from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.support_query import QueryStatus


class SupportQueryCreate(BaseModel):
    subject: str
    message: str


class SupportQueryOut(BaseModel):
    id: str
    from_user_id: str
    clinic_id: str
    subject: str
    message: str
    status: QueryStatus
    admin_response: Optional[str] = None
    created_at: datetime
    responded_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class SupportQueryReply(BaseModel):
    response: str
