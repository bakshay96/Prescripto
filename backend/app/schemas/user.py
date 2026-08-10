from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr
from app.models.user import UserRole

class UserBase(BaseModel):
    full_name: str
    email: EmailStr
    role: UserRole
    license_number: Optional[str] = None

class UserCreate(UserBase):
    clinic_id: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: str

class UserOut(UserBase):
    id: str
    clinic_id: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
