from datetime import date
from app.models.patient import Patient, GenderEnum

def test_patient_age_calculation_exact_years():
    patient = Patient(
        name="John Doe",
        village_location="Green Valley",
        date_of_birth=date(1990, 5, 15),
        gender=GenderEnum.MALE
    )
    
    ref_date = date(2026, 5, 15)
    age_dict = patient.calculate_age(reference_date=ref_date)
    
    assert age_dict["years"] == 36
    assert age_dict["months"] == 0
    assert age_dict["days"] == 0
    assert age_dict["formatted"] == "36y 0m 0d"

def test_patient_age_property():
    patient = Patient(
        name="Baby Corp",
        village_location="North City",
        date_of_birth=date.today(),
        gender=GenderEnum.OTHER
    )
    
    assert patient.age["years"] == 0
    assert patient.age["months"] == 0
    assert patient.age["days"] == 0
