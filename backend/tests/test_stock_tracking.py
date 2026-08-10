from datetime import date, timedelta
from app.models.medicine import Medicine

def test_medicine_low_stock_and_expired_flags():
    med = Medicine(
        clinic_id="clinic-1",
        name="Paracetamol 500mg",
        category="Analgesic",
        stock_quantity=5,
        price=2.50,
        expiry_date=date.today() - timedelta(days=1),
        batch_number="BATCH-001",
        min_stock_alert=10
    )

    assert med.is_low_stock is True
    assert med.is_expired is True
