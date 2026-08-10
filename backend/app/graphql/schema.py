import strawberry
from typing import List, Optional
from datetime import datetime, timezone

from app.core.database import SessionLocal
from app.models.clinic import Clinic
from app.models.patient import Patient, GenderEnum
from app.models.medicine import Medicine
from app.models.prescription import Prescription, PrescriptionItem, PrescriptionStatus
from app.models.stock_transaction import StockTransaction, TransactionType

from app.graphql.types import (
    ClinicType, PatientType, MedicineType, PrescriptionType, PrescriptionItemType,
    PatientInput, MedicineInput, PrescriptionInput
)

@strawberry.type
class Query:
    @strawberry.field
    def clinics(self) -> List[ClinicType]:
        db = SessionLocal()
        try:
            clinics = db.query(Clinic).all()
            return [
                ClinicType(
                    id=c.id, name=c.name, address=c.address,
                    phone=c.phone, email=c.email, registration_number=c.registration_number
                ) for c in clinics
            ]
        finally:
            db.close()

    @strawberry.field
    def patient(self, id: str) -> Optional[PatientType]:
        db = SessionLocal()
        try:
            p = db.query(Patient).filter(Patient.id == id).first()
            if not p:
                return None
            return PatientType(
                id=p.id, clinic_id=p.clinic_id, name=p.name,
                village_location=p.village_location, date_of_birth=p.date_of_birth,
                gender=p.gender.value, phone=p.phone, medical_history=p.medical_history
            )
        finally:
            db.close()

    @strawberry.field
    def patients(self, clinic_id: str, search: Optional[str] = None) -> List[PatientType]:
        db = SessionLocal()
        try:
            query = db.query(Patient).filter(Patient.clinic_id == clinic_id)
            if search:
                query = query.filter(Patient.name.ilike(f"%{search}%"))
            patients = query.all()
            return [
                PatientType(
                    id=p.id, clinic_id=p.clinic_id, name=p.name,
                    village_location=p.village_location, date_of_birth=p.date_of_birth,
                    gender=p.gender.value, phone=p.phone, medical_history=p.medical_history
                ) for p in patients
            ]
        finally:
            db.close()

    @strawberry.field
    def medicines(self, clinic_id: str, category: Optional[str] = None) -> List[MedicineType]:
        db = SessionLocal()
        try:
            query = db.query(Medicine).filter(Medicine.clinic_id == clinic_id)
            if category:
                query = query.filter(Medicine.category.ilike(f"%{category}%"))
            meds = query.all()
            return [
                MedicineType(
                    id=m.id, clinic_id=m.clinic_id, name=m.name, category=m.category,
                    stock_quantity=m.stock_quantity, price=float(m.price), expiry_date=m.expiry_date,
                    batch_number=m.batch_number, unit=m.unit, min_stock_alert=m.min_stock_alert,
                    is_low_stock=m.is_low_stock, is_expired=m.is_expired
                ) for m in meds
            ]
        finally:
            db.close()

    @strawberry.field
    def prescriptions(self, clinic_id: str, status: Optional[str] = None) -> List[PrescriptionType]:
        db = SessionLocal()
        try:
            query = db.query(Prescription).filter(Prescription.clinic_id == clinic_id)
            if status:
                query = query.filter(Prescription.status == status)
            rxs = query.all()
            results = []
            for rx in rxs:
                items = [
                    PrescriptionItemType(
                        id=it.id, medicine_id=it.medicine_id, dosage=it.dosage,
                        frequency=it.frequency, duration_days=it.duration_days,
                        quantity_prescribed=it.quantity_prescribed, quantity_dispensed=it.quantity_dispensed,
                        instructions=it.instructions
                    ) for it in rx.items
                ]
                results.append(
                    PrescriptionType(
                        id=rx.id, clinic_id=rx.clinic_id, prescription_number=rx.prescription_number,
                        doctor_id=rx.doctor_id, patient_id=rx.patient_id, diagnosis=rx.diagnosis,
                        notes=rx.notes, status=rx.status.value, created_at=rx.created_at,
                        dispensed_at=rx.dispensed_at, items=items
                    )
                )
            return results
        finally:
            db.close()

@strawberry.type
class Mutation:
    @strawberry.mutation
    def create_patient(self, input: PatientInput) -> PatientType:
        db = SessionLocal()
        try:
            patient = Patient(
                clinic_id=input.clinic_id,
                name=input.name,
                village_location=input.village_location,
                date_of_birth=input.date_of_birth,
                gender=GenderEnum(input.gender),
                phone=input.phone,
                medical_history=input.medical_history
            )
            db.add(patient)
            db.commit()
            db.refresh(patient)
            return PatientType(
                id=patient.id, clinic_id=patient.clinic_id, name=patient.name,
                village_location=patient.village_location, date_of_birth=patient.date_of_birth,
                gender=patient.gender.value, phone=patient.phone, medical_history=patient.medical_history
            )
        finally:
            db.close()

    @strawberry.mutation
    def add_medicine(self, input: MedicineInput) -> MedicineType:
        db = SessionLocal()
        try:
            med = Medicine(
                clinic_id=input.clinic_id,
                name=input.name,
                category=input.category,
                stock_quantity=input.stock_quantity,
                price=input.price,
                expiry_date=input.expiry_date,
                batch_number=input.batch_number,
                unit=input.unit
            )
            db.add(med)
            db.commit()
            db.refresh(med)
            return MedicineType(
                id=med.id, clinic_id=med.clinic_id, name=med.name, category=med.category,
                stock_quantity=med.stock_quantity, price=float(med.price), expiry_date=med.expiry_date,
                batch_number=med.batch_number, unit=med.unit, min_stock_alert=med.min_stock_alert,
                is_low_stock=med.is_low_stock, is_expired=med.is_expired
            )
        finally:
            db.close()

schema = strawberry.Schema(query=Query, mutation=Mutation)
