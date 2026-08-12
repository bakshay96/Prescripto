from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.user import User, UserRole
from app.models.clinic import Clinic
from app.schemas.user import UserCreate, UserOut, Token
from app.schemas.clinic import ClinicCreate
from app.api.deps import get_current_user
from pydantic import BaseModel, EmailStr
from typing import Optional
import uuid

router = APIRouter(prefix="/auth", tags=["Auth & Users"])


class HospitalRegisterRequest(BaseModel):
    """One-shot registration: creates both the Clinic and the Doctor account."""
    full_name: str
    email: EmailStr
    password: str
    license_number: Optional[str] = None
    clinic_name: str
    clinic_address: Optional[str] = None
    clinic_phone: Optional[str] = None
    clinic_registration_number: Optional[str] = None


class HospitalRegisterResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: str
    clinic_id: str
    clinic_name: str
    doctor_name: str


@router.post(
    "/hospital-register",
    response_model=HospitalRegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new hospital + doctor account in one step"
)
def hospital_register(data: HospitalRegisterRequest, db: Session = Depends(get_db)):
    """
    Registers a new Clinic and its Doctor account atomically.
    Returns a JWT token so the frontend can log in immediately.
    """
    # Check duplicate email
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered.")

    # Create clinic
    clinic = Clinic(
        id=str(uuid.uuid4()),
        name=data.clinic_name,
        address=data.clinic_address or "",
        phone=data.clinic_phone or "",
        email=data.email,
        registration_number=data.clinic_registration_number or f"CL-{uuid.uuid4().hex[:8].upper()}"
    )
    db.add(clinic)
    db.flush()  # get the clinic.id before committing

    # Create doctor user
    user = User(
        id=str(uuid.uuid4()),
        clinic_id=clinic.id,
        full_name=data.full_name,
        email=data.email,
        hashed_password=get_password_hash(data.password),
        role=UserRole.DOCTOR,
        license_number=data.license_number,
        is_store_admin=False
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.refresh(clinic)

    token = create_access_token(subject=user.id, role=user.role.value)
    return HospitalRegisterResponse(
        access_token=token,
        role=user.role.value,
        user_id=user.id,
        clinic_id=clinic.id,
        clinic_name=clinic.name,
        doctor_name=user.full_name
    )


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register_user(user_in: UserCreate, db: Session = Depends(get_db)):
    """Register a user under an existing clinic (e.g. add a pharmacist)."""
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    hashed_pw = get_password_hash(user_in.password)
    new_user = User(
        clinic_id=user_in.clinic_id,
        full_name=user_in.full_name,
        email=user_in.email,
        hashed_password=hashed_pw,
        role=user_in.role,
        license_number=user_in.license_number,
        is_store_admin=(user_in.role == UserRole.PHARMACIST)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token(subject=user.id, role=user.role.value)
    return Token(access_token=token, role=user.role.value, user_id=user.id)


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
