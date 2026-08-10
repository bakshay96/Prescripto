from typing import Optional
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, computed_field
from app.models.patient import GenderEnum

class AgeDetail(BaseModel):
    years: int
    months: int
    days: int
    formatted: str

class PatientBase(BaseModel):
    name: str
    village_location: str
    date_of_birth: date
    gender: GenderEnum = GenderEnum.MALE
    phone: Optional[str] = None
    medical_history: Optional[str] = None

class PatientCreate(PatientBase):
    pass

class PatientUpdate(BaseModel):
    name: Optional[str] = None
    village_location: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[GenderEnum] = None
    phone: Optional[str] = None
    medical_history: Optional[str] = None

class PatientOut(PatientBase):
    id: str
    clinic_id: str
    created_at: datetime

    @computed_field
    def age(self) -> AgeDetail:
        """
        Dynamically calculates current age from date_of_birth at output time.
        """
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

        return AgeDetail(
            years=max(0, years),
            months=max(0, months),
            days=max(0, days),
            formatted=f"{max(0, years)}y {max(0, months)}m {max(0, days)}d"
        )

    model_config = ConfigDict(from_attributes=True)
