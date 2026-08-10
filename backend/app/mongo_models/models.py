"""
MongoDB Document Schema Models for Prescripto
"""
from typing import List, Optional
from datetime import datetime, date
from pydantic import BaseModel, Field
from enum import Enum

class MongoUserRole(str, Enum):
    DOCTOR = "DOCTOR"
    PHARMACIST = "PHARMACIST"

class MongoGender(str, Enum):
    MALE = "MALE"
    FEMALE = "FEMALE"
    OTHER = "OTHER"

class MongoPrescriptionStatus(str, Enum):
    PENDING = "PENDING"
    DISPENSED = "DISPENSED"
    CANCELLED = "CANCELLED"

class ClinicDocument(BaseModel):
    id: str = Field(alias="_id")
    name: str
    address: str
    phone: Optional[str] = None
    email: Optional[str] = None
    registration_number: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserDocument(BaseModel):
    id: str = Field(alias="_id")
    clinic_id: str
    full_name: str
    email: str
    hashed_password: str
    role: MongoUserRole
    license_number: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PatientDocument(BaseModel):
    id: str = Field(alias="_id")
    clinic_id: str
    name: str
    village_location: str
    date_of_birth: date
    gender: MongoGender
    phone: Optional[str] = None
    medical_history: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class MedicineDocument(BaseModel):
    id: str = Field(alias="_id")
    clinic_id: str
    name: str
    category: str
    stock_quantity: int = Field(ge=0)
    price: float = Field(ge=0.0)
    expiry_date: date
    batch_number: str
    unit: str = "Tablets"
    min_stock_alert: int = 10
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class PrescriptionItemDocument(BaseModel):
    medicine_id: str
    medicine_name: str
    dosage: str
    frequency: str
    duration_days: int
    quantity_prescribed: int
    quantity_dispensed: int = 0
    instructions: Optional[str] = None

class PrescriptionDocument(BaseModel):
    id: str = Field(alias="_id")
    prescription_number: str
    clinic_id: str
    doctor_id: str
    doctor_name: str
    patient_id: str
    patient_name: str
    patient_village: str
    diagnosis: str
    notes: Optional[str] = None
    status: MongoPrescriptionStatus = MongoPrescriptionStatus.PENDING
    items: List[PrescriptionItemDocument] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    dispensed_at: Optional[datetime] = None
