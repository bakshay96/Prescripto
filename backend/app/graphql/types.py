import strawberry
from typing import List, Optional
from datetime import date, datetime

@strawberry.type
class AgeType:
    years: int
    months: int
    days: int
    formatted: str

@strawberry.type
class ClinicType:
    id: str
    name: str
    address: str
    phone: Optional[str]
    email: Optional[str]
    registration_number: Optional[str]

@strawberry.type
class PatientType:
    id: str
    clinic_id: str
    name: str
    village_location: str
    date_of_birth: date
    gender: str
    phone: Optional[str]
    medical_history: Optional[str]

    @strawberry.field
    def age(self) -> AgeType:
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

        return AgeType(
            years=max(0, years),
            months=max(0, months),
            days=max(0, days),
            formatted=f"{max(0, years)}y {max(0, months)}m {max(0, days)}d"
        )

@strawberry.type
class MedicineType:
    id: str
    clinic_id: str
    name: str
    category: str
    stock_quantity: int
    price: float
    expiry_date: date
    batch_number: str
    unit: str
    min_stock_alert: int
    is_low_stock: bool
    is_expired: bool

@strawberry.type
class PrescriptionItemType:
    id: str
    medicine_id: str
    dosage: str
    frequency: str
    duration_days: int
    quantity_prescribed: int
    quantity_dispensed: int
    instructions: Optional[str]

@strawberry.type
class PrescriptionType:
    id: str
    clinic_id: str
    prescription_number: str
    doctor_id: str
    patient_id: str
    diagnosis: str
    notes: Optional[str]
    status: str
    created_at: datetime
    dispensed_at: Optional[datetime]
    items: List[PrescriptionItemType]

@strawberry.input
class PatientInput:
    clinic_id: str
    name: str
    village_location: str
    date_of_birth: date
    gender: str = "MALE"
    phone: Optional[str] = None
    medical_history: Optional[str] = None

@strawberry.input
class MedicineInput:
    clinic_id: str
    name: str
    category: str
    stock_quantity: int
    price: float
    expiry_date: date
    batch_number: str
    unit: str = "Tablets"

@strawberry.input
class PrescriptionItemInput:
    medicine_id: str
    dosage: str
    frequency: str
    duration_days: int
    quantity_prescribed: int
    instructions: Optional[str] = None

@strawberry.input
class PrescriptionInput:
    clinic_id: str
    doctor_id: str
    patient_id: str
    diagnosis: str
    notes: Optional[str] = None
    items: List[PrescriptionItemInput]
