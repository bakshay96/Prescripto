import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Clinic(Base):
    __tablename__ = "clinics"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(150), nullable=False)
    address = Column(Text, nullable=False)
    phone = Column(String(20), nullable=True)
    email = Column(String(100), nullable=True)
    registration_number = Column(String(50), unique=True, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    users = relationship("User", back_populates="clinic", cascade="all, delete-orphan")
    patients = relationship("Patient", back_populates="clinic", cascade="all, delete-orphan")
    medicines = relationship("Medicine", back_populates="clinic", cascade="all, delete-orphan")
    prescriptions = relationship("Prescription", back_populates="clinic", cascade="all, delete-orphan")
