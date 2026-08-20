import strawberry
from typing import List, Optional
from datetime import date, datetime

from app.core.database import get_db
# Pure MongoDB schema — no SQLAlchemy dependencies
from app.graphql.types import (
    ClinicType, PatientType, MedicineType, PrescriptionType, PrescriptionItemType,
    PatientInput, MedicineInput
)


@strawberry.type
class Query:
    @strawberry.field
    def clinics(self) -> List[ClinicType]:
        db = get_db()
        clinics = list(db["clinics"].find())
        return [
            ClinicType(
                id=str(c["_id"]), name=c.get("name", ""), address=c.get("address", ""),
                phone=c.get("phone"), email=c.get("email"),
                registration_number=c.get("registration_number")
            ) for c in clinics
        ]

    @strawberry.field
    def patient(self, id: str) -> Optional[PatientType]:
        db = get_db()
        p = db["patients"].find_one({"_id": id})
        if not p:
            return None
        dob_str = p.get("date_of_birth", "1990-01-01").split("T")[0]
        try:
            dob = datetime.strptime(dob_str, "%Y-%m-%d").date()
        except Exception:
            dob = date(1990, 1, 1)
        return PatientType(
            id=str(p["_id"]), clinic_id=p.get("clinic_id", ""), name=p.get("name", ""),
            village_location=p.get("village_location", ""), date_of_birth=dob,
            gender=p.get("gender", "MALE"), phone=p.get("phone"),
            medical_history=p.get("medical_history")
        )

    @strawberry.field
    def patients(self, clinic_id: str, search: Optional[str] = None) -> List[PatientType]:
        db = get_db()
        query_filter: dict = {"clinic_id": clinic_id}
        if search:
            query_filter["name"] = {"$regex": search, "$options": "i"}
        patients = list(db["patients"].find(query_filter))
        result = []
        for p in patients:
            dob_str = p.get("date_of_birth", "1990-01-01").split("T")[0]
            try:
                dob = datetime.strptime(dob_str, "%Y-%m-%d").date()
            except Exception:
                dob = date(1990, 1, 1)
            result.append(PatientType(
                id=str(p["_id"]), clinic_id=p.get("clinic_id", ""), name=p.get("name", ""),
                village_location=p.get("village_location", ""), date_of_birth=dob,
                gender=p.get("gender", "MALE"), phone=p.get("phone"),
                medical_history=p.get("medical_history")
            ))
        return result

    @strawberry.field
    def medicines(self, clinic_id: str, category: Optional[str] = None) -> List[MedicineType]:
        db = get_db()
        query_filter: dict = {"clinic_id": clinic_id}
        if category:
            query_filter["category"] = {"$regex": category, "$options": "i"}
        meds = list(db["medicines"].find(query_filter))
        result = []
        for m in meds:
            exp_str = m.get("expiry_date", "2099-12-31").split("T")[0]
            try:
                exp_date = datetime.strptime(exp_str, "%Y-%m-%d").date()
            except Exception:
                exp_date = date(2099, 12, 31)
            is_expired = exp_date < date.today()
            is_low = m.get("stock_quantity", 0) <= m.get("min_stock_alert", 10)
            result.append(MedicineType(
                id=str(m["_id"]), clinic_id=m.get("clinic_id", ""), name=m.get("name", ""),
                category=m.get("category", ""), stock_quantity=m.get("stock_quantity", 0),
                price=float(m.get("price", 0.0)), expiry_date=exp_date,
                batch_number=m.get("batch_number", ""), unit=m.get("unit", "Tablets"),
                min_stock_alert=m.get("min_stock_alert", 10),
                is_low_stock=is_low, is_expired=is_expired
            ))
        return result

    @strawberry.field
    def prescriptions(self, clinic_id: str, status: Optional[str] = None) -> List[PrescriptionType]:
        db = get_db()
        query_filter: dict = {"clinic_id": clinic_id}
        if status:
            query_filter["status"] = status.upper()
        rxs = list(db["prescriptions"].find(query_filter))
        results = []
        for rx in rxs:
            created_at = rx.get("created_at", "")
            dispensed_at = rx.get("dispensed_at")
            try:
                if isinstance(created_at, str):
                    created_dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                else:
                    created_dt = datetime.now()
            except Exception:
                created_dt = datetime.now()
            try:
                dispensed_dt = datetime.fromisoformat(dispensed_at.replace("Z", "+00:00")) if dispensed_at else None
            except Exception:
                dispensed_dt = None

            items = [
                PrescriptionItemType(
                    id=str(it.get("_id", "")),
                    medicine_id=it.get("medicine_id", ""),
                    dosage=it.get("dosage", ""),
                    frequency=it.get("frequency", ""),
                    duration_days=it.get("duration_days", 1),
                    quantity_prescribed=it.get("quantity_prescribed", 0),
                    quantity_dispensed=it.get("quantity_dispensed", 0),
                    instructions=it.get("instructions")
                ) for it in rx.get("items", [])
            ]
            results.append(PrescriptionType(
                id=str(rx["_id"]), clinic_id=rx.get("clinic_id", ""),
                prescription_number=rx.get("prescription_number", ""),
                doctor_id=rx.get("doctor_id", ""), patient_id=rx.get("patient_id", ""),
                diagnosis=rx.get("diagnosis", ""), notes=rx.get("notes"),
                status=rx.get("status", "PENDING"),
                created_at=created_dt, dispensed_at=dispensed_dt, items=items
            ))
        return results


@strawberry.type
class Mutation:
    @strawberry.mutation
    def create_patient(self, input: PatientInput) -> PatientType:
        import uuid
        from datetime import timezone
        db = get_db()
        patient_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        dob = input.date_of_birth
        doc = {
            "_id": patient_id,
            "clinic_id": input.clinic_id,
            "name": input.name,
            "village_location": input.village_location,
            "date_of_birth": dob.isoformat() if hasattr(dob, "isoformat") else str(dob),
            "gender": (input.gender or "MALE").upper(),
            "phone": input.phone,
            "medical_history": input.medical_history,
            "created_at": now,
        }
        db["patients"].insert_one(doc)
        return PatientType(
            id=patient_id, clinic_id=input.clinic_id, name=input.name,
            village_location=input.village_location, date_of_birth=dob,
            gender=input.gender or "MALE", phone=input.phone,
            medical_history=input.medical_history
        )

    @strawberry.mutation
    def add_medicine(self, input: MedicineInput) -> MedicineType:
        import uuid
        from datetime import timezone
        db = get_db()
        medicine_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        exp_date = input.expiry_date
        exp_str = exp_date.isoformat() if hasattr(exp_date, "isoformat") else str(exp_date)
        is_expired = exp_date < date.today() if isinstance(exp_date, date) else False
        is_low = input.stock_quantity <= 10
        doc = {
            "_id": medicine_id,
            "clinic_id": input.clinic_id,
            "name": input.name,
            "category": input.category,
            "stock_quantity": input.stock_quantity,
            "price": input.price,
            "expiry_date": exp_str,
            "batch_number": input.batch_number,
            "unit": input.unit,
            "min_stock_alert": 10,
            "created_at": now,
            "updated_at": now,
        }
        db["medicines"].insert_one(doc)
        return MedicineType(
            id=medicine_id, clinic_id=input.clinic_id, name=input.name,
            category=input.category, stock_quantity=input.stock_quantity,
            price=float(input.price), expiry_date=exp_date,
            batch_number=input.batch_number, unit=input.unit,
            min_stock_alert=10, is_low_stock=is_low, is_expired=is_expired
        )


schema = strawberry.Schema(query=Query, mutation=Mutation)
