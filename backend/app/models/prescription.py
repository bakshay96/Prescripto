import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Numeric, Text, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class PrescriptionStatus(str, enum.Enum):
    PENDING = "PENDING"
    DISPENSED = "DISPENSED"
    CANCELLED = "CANCELLED"

class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    clinic_id = Column(String(36), ForeignKey("clinics.id"), nullable=False)
    prescription_number = Column(String(30), unique=True, index=True, nullable=False)
    doctor_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    patient_id = Column(String(36), ForeignKey("patients.id"), nullable=False)
    diagnosis = Column(Text, nullable=False)
    notes = Column(Text, nullable=True)
    status = Column(Enum(PrescriptionStatus), nullable=False, default=PrescriptionStatus.PENDING)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    dispensed_at = Column(DateTime, nullable=True)

    # Relationships
    clinic = relationship("Clinic", back_populates="prescriptions")
    doctor = relationship("User", back_populates="doctor_prescriptions", foreign_keys=[doctor_id])
    patient = relationship("Patient", back_populates="prescriptions")
    items = relationship("PrescriptionItem", back_populates="prescription", cascade="all, delete-orphan")
    stock_transactions = relationship("StockTransaction", back_populates="prescription")

class PrescriptionItem(Base):
    __tablename__ = "prescription_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    prescription_id = Column(String(36), ForeignKey("prescriptions.id"), nullable=False)
    medicine_id = Column(String(36), ForeignKey("medicines.id"), nullable=False)
    dosage = Column(String(50), nullable=False)
    frequency = Column(String(50), nullable=False)
    duration_days = Column(Integer, nullable=False)
    quantity_prescribed = Column(Integer, nullable=False)
    quantity_dispensed = Column(Integer, nullable=False, default=0)
    instructions = Column(Text, nullable=True)

    # Relationships
    prescription = relationship("Prescription", back_populates="items")
    medicine = relationship("Medicine", back_populates="prescription_items")
