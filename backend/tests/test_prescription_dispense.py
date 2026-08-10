from datetime import date
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.database import Base, get_db
from app.models.clinic import Clinic
from app.models.user import User, UserRole
from app.models.patient import Patient, GenderEnum
from app.models.medicine import Medicine
from app.models.prescription import Prescription, PrescriptionItem, PrescriptionStatus
from app.core.security import get_password_hash, create_access_token

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_prescripto.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

def setup_module(module):
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

def test_full_prescription_dispense_workflow():
    db = TestingSessionLocal()

    clinic = Clinic(name="City Health Clinic", address="Main Street 101")
    db.add(clinic)
    db.commit()

    doctor = User(
        clinic_id=clinic.id,
        full_name="Dr. Alice Smith",
        email="doctor@clinic.com",
        hashed_password=get_password_hash("doctor123"),
        role=UserRole.DOCTOR
    )
    pharmacist = User(
        clinic_id=clinic.id,
        full_name="Pharma Bob",
        email="pharmacist@clinic.com",
        hashed_password=get_password_hash("pharma123"),
        role=UserRole.PHARMACIST
    )
    db.add_all([doctor, pharmacist])
    db.commit()

    patient = Patient(
        clinic_id=clinic.id,
        name="Charlie Brown",
        village_location="East Village",
        date_of_birth=date(1995, 4, 10),
        gender=GenderEnum.MALE
    )
    db.add(patient)
    db.commit()

    med = Medicine(
        clinic_id=clinic.id,
        name="Ibuprofen 400mg",
        category="Analgesic",
        stock_quantity=50,
        price=5.00,
        expiry_date=date(2027, 12, 31),
        batch_number="B101",
        unit="Tablets"
    )
    db.add(med)
    db.commit()

    doctor_token = create_access_token(subject=doctor.id, role=UserRole.DOCTOR.value)
    pharma_token = create_access_token(subject=pharmacist.id, role=UserRole.PHARMACIST.value)

    rx_payload = {
        "patient_id": patient.id,
        "diagnosis": "Acute Back Pain",
        "notes": "Take after food",
        "items": [
            {
                "medicine_id": med.id,
                "dosage": "400mg",
                "frequency": "1-0-1",
                "duration_days": 5,
                "quantity_prescribed": 10,
                "instructions": "With warm water"
            }
        ]
    }
    rx_resp = client.post(
        "/api/v1/prescriptions",
        json=rx_payload,
        headers={"Authorization": f"Bearer {doctor_token}"}
    )
    assert rx_resp.status_code == 201
    rx_data = rx_resp.json()
    assert rx_data["status"] == "PENDING"
    rx_id = rx_data["id"]

    dispense_resp = client.post(
        f"/api/v1/prescriptions/{rx_id}/dispense",
        headers={"Authorization": f"Bearer {pharma_token}"}
    )
    assert dispense_resp.status_code == 200
    disp_data = dispense_resp.json()
    assert disp_data["status"] == "DISPENSED"

    db.refresh(med)
    assert med.stock_quantity == 40
    db.close()
