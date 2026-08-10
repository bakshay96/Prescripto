import uuid
from datetime import datetime, timezone, date
from sqlalchemy import Column, String, Integer, Numeric, Date, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Medicine(Base):
    __tablename__ = "medicines"
    __table_args__ = (
        CheckConstraint("stock_quantity >= 0", name="check_positive_stock"),
        CheckConstraint("price >= 0", name="check_positive_price"),
    )

    id = Column(String(36), primary_key=True, default=generate_uuid)
    clinic_id = Column(String(36), ForeignKey("clinics.id"), nullable=False)
    name = Column(String(150), index=True, nullable=False)
    category = Column(String(50), nullable=False)
    stock_quantity = Column(Integer, nullable=False, default=0)
    price = Column(Numeric(10, 2), nullable=False, default=0.00)
    expiry_date = Column(Date, index=True, nullable=False)
    batch_number = Column(String(50), nullable=False)
    unit = Column(String(20), nullable=False, default="Tablets")
    min_stock_alert = Column(Integer, nullable=False, default=10)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    clinic = relationship("Clinic", back_populates="medicines")
    prescription_items = relationship("PrescriptionItem", back_populates="medicine")
    stock_transactions = relationship("StockTransaction", back_populates="medicine", cascade="all, delete-orphan")

    @property
    def is_low_stock(self) -> bool:
        return self.stock_quantity <= self.min_stock_alert

    @property
    def is_expired(self) -> bool:
        return self.expiry_date < date.today()
