import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class TransactionType(str, enum.Enum):
    RESTOCK = "RESTOCK"
    DISPENSED = "DISPENSED"
    ADJUSTMENT = "ADJUSTMENT"
    EXPIRED_REMOVAL = "EXPIRED_REMOVAL"

class StockTransaction(Base):
    __tablename__ = "stock_transactions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    medicine_id = Column(String(36), ForeignKey("medicines.id"), nullable=False)
    transaction_type = Column(Enum(TransactionType), nullable=False)
    quantity = Column(Integer, nullable=False)
    resulting_stock = Column(Integer, nullable=False)
    performed_by_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    prescription_id = Column(String(36), ForeignKey("prescriptions.id"), nullable=True)
    notes = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    medicine = relationship("Medicine", back_populates="stock_transactions")
    performed_by = relationship("User", back_populates="transactions")
    prescription = relationship("Prescription", back_populates="stock_transactions")
