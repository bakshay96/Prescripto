import uuid
import enum
from datetime import datetime, date, timezone
from sqlalchemy import Column, String, Date, Text, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class GenderEnum(str, enum.Enum):
    MALE = "MALE"
    FEMALE = "FEMALE"
    OTHER = "OTHER"

class Patient(Base):
    __tablename__ = "patients"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    clinic_id = Column(String(36), ForeignKey("clinics.id"), nullable=False)
    name = Column(String(120), index=True, nullable=False)
    village_location = Column(String(150), nullable=False)
    date_of_birth = Column(Date, nullable=False)
    gender = Column(Enum(GenderEnum), nullable=False, default=GenderEnum.MALE)
    phone = Column(String(20), nullable=True)
    medical_history = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    clinic = relationship("Clinic", back_populates="patients")
    prescriptions = relationship("Prescription", back_populates="patient", cascade="all, delete-orphan")

    @property
    def age(self) -> dict:
        """
        Dynamic property that calculates current age from date_of_birth relative to today.
        """
        return self.calculate_age()

    def calculate_age(self, reference_date: date = None) -> dict:
        """
        Dynamically calculates age in years, months, and days from date_of_birth.
        """
        if reference_date is None:
            reference_date = date.today()
        
        dob = self.date_of_birth
        years = reference_date.year - dob.year
        months = reference_date.month - dob.month
        days = reference_date.day - dob.day

        if days < 0:
            months -= 1
            prev_month = reference_date.month - 1 if reference_date.month > 1 else 12
            prev_year = reference_date.year if reference_date.month > 1 else reference_date.year - 1
            import calendar
            days_in_prev_month = calendar.monthrange(prev_year, prev_month)[1]
            days += days_in_prev_month

        if months < 0:
            years -= 1
            months += 12

        return {
            "years": max(0, years),
            "months": max(0, months),
            "days": max(0, days),
            "formatted": f"{max(0, years)}y {max(0, months)}m {max(0, days)}d"
        }
