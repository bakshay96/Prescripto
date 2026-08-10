from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr

class ClinicBase(BaseModel):
    name: str
    address: str
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    registration_number: Optional[str] = None

class ClinicCreate(ClinicBase):
    pass

class ClinicUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    registration_number: Optional[str] = None

class ClinicOut(ClinicBase):
    id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
