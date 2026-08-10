from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from app.models.prescription import PrescriptionStatus
from app.schemas.patient import PatientOut
from app.schemas.medicine import MedicineOut

class PrescriptionItemCreate(BaseModel):
    medicine_id: str
    dosage: str = Field(..., json_schema_extra={"example": "500mg"})
    frequency: str = Field(..., json_schema_extra={"example": "1-0-1 after meals"})
    duration_days: int = Field(gt=0, json_schema_extra={"example": 5})
    quantity_prescribed: int = Field(gt=0, json_schema_extra={"example": 10})
    instructions: Optional[str] = None

class PrescriptionItemOut(BaseModel):
    id: str
    medicine_id: str
    dosage: str
    frequency: str
    duration_days: int
    quantity_prescribed: int
    quantity_dispensed: int
    instructions: Optional[str] = None
    medicine: Optional[MedicineOut] = None

    model_config = ConfigDict(from_attributes=True)

class PrescriptionCreate(BaseModel):
    patient_id: str
    diagnosis: str
    notes: Optional[str] = None
    items: List[PrescriptionItemCreate] = Field(..., min_length=1)

class PrescriptionOut(BaseModel):
    id: str
    clinic_id: str
    prescription_number: str
    doctor_id: str
    patient_id: str
    diagnosis: str
    notes: Optional[str] = None
    status: PrescriptionStatus
    created_at: datetime
    dispensed_at: Optional[datetime] = None
    patient: Optional[PatientOut] = None
    items: List[PrescriptionItemOut] = []

    model_config = ConfigDict(from_attributes=True)

class DispenseResponse(BaseModel):
    prescription_id: str
    prescription_number: str
    status: PrescriptionStatus
    dispensed_at: datetime
    message: str
