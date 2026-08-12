import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Text, ForeignKey, Enum
from app.core.database import Base


def generate_uuid():
    return str(uuid.uuid4())


class QueryStatus(str, enum.Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"


class SupportQuery(Base):
    """Support queries submitted by doctors/pharmacists to Master Admin."""
    __tablename__ = "support_queries"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    from_user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    clinic_id = Column(String(36), ForeignKey("clinics.id"), nullable=False, index=True)
    subject = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    status = Column(Enum(QueryStatus), nullable=False, default=QueryStatus.OPEN)
    admin_response = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    responded_at = Column(DateTime, nullable=True)
