"""
Prescripto — Multi-Category Medicine Stock Generator & Seeder
Populates rich, diverse medicines across 10+ categories into MongoDB.
"""
import uuid
from datetime import datetime, timezone
from app.core.database import get_db

MEDICINE_CATALOG = [
    # TABLETS
    {"name": "Paracetamol 500mg", "generic_name": "Paracetamol IP 500mg", "manufacturer": "Cipla Ltd", "category": "Tablet", "stock_quantity": 250, "price": 3.50, "price_per_tab": 3.50, "price_per_strip": 35.00, "tablets_per_strip": 10, "expiry_date": "2027-12-31", "batch_number": "PCM-2026-A1", "unit": "Tablet", "min_stock_alert": 30, "hsn_code": "30049099", "tax_gst_percent": 12.0, "schedule_type": "OTC", "rack_location": "Rack A-01"},
    {"name": "Paracetamol 650mg (Dolo)", "generic_name": "Paracetamol IP 650mg", "manufacturer": "Micro Labs Ltd", "category": "Tablet", "stock_quantity": 320, "price": 4.20, "price_per_tab": 4.20, "price_per_strip": 63.00, "tablets_per_strip": 15, "expiry_date": "2028-02-15", "batch_number": "DOL-2026-A2", "unit": "Tablet", "min_stock_alert": 40, "hsn_code": "30049099", "tax_gst_percent": 12.0, "schedule_type": "OTC", "rack_location": "Rack A-02"},
    {"name": "Amoxicillin + Clavulanic Acid 625mg", "generic_name": "Amoxicillin 500mg + Potassium Clavulanate 125mg", "manufacturer": "GlaxoSmithKline", "category": "Tablet", "stock_quantity": 110, "price": 28.00, "price_per_tab": 28.00, "price_per_strip": 280.00, "tablets_per_strip": 10, "expiry_date": "2027-09-30", "batch_number": "AUG-2026-B3", "unit": "Tablet", "min_stock_alert": 15, "hsn_code": "30041010", "tax_gst_percent": 12.0, "schedule_type": "Schedule H", "rack_location": "Rack B-02"},
    {"name": "Azithromycin 500mg", "generic_name": "Azithromycin Dihydrate IP 500mg", "manufacturer": "Alembic Pharmaceuticals", "category": "Tablet", "stock_quantity": 80, "price": 24.50, "price_per_tab": 24.50, "price_per_strip": 122.50, "tablets_per_strip": 5, "expiry_date": "2027-10-20", "batch_number": "AZI-2026-C3", "unit": "Tablet", "min_stock_alert": 15, "hsn_code": "30042010", "tax_gst_percent": 12.0, "schedule_type": "Schedule H", "rack_location": "Rack B-03"},
    {"name": "Cefixime 200mg", "generic_name": "Cefixime Trihydrate IP 200mg", "manufacturer": "Alkem Laboratories", "category": "Tablet", "stock_quantity": 95, "price": 18.50, "price_per_tab": 18.50, "price_per_strip": 185.00, "tablets_per_strip": 10, "expiry_date": "2027-11-05", "batch_number": "CEF-2026-C4", "unit": "Tablet", "min_stock_alert": 15, "hsn_code": "30042010", "tax_gst_percent": 12.0, "schedule_type": "Schedule H", "rack_location": "Rack B-04"},
    {"name": "Cetirizine 10mg", "generic_name": "Cetirizine Hydrochloride IP 10mg", "manufacturer": "Dr. Reddy's Labs", "category": "Tablet", "stock_quantity": 300, "price": 2.00, "price_per_tab": 2.00, "price_per_strip": 20.00, "tablets_per_strip": 10, "expiry_date": "2028-01-30", "batch_number": "CET-2026-D4", "unit": "Tablet", "min_stock_alert": 40, "hsn_code": "30049099", "tax_gst_percent": 12.0, "schedule_type": "OTC", "rack_location": "Rack C-01"},
    {"name": "Levocetirizine 5mg", "generic_name": "Levocetirizine Dihydrochloride IP 5mg", "manufacturer": "Mankind Pharma", "category": "Tablet", "stock_quantity": 220, "price": 4.50, "price_per_tab": 4.50, "price_per_strip": 45.00, "tablets_per_strip": 10, "expiry_date": "2028-03-20", "batch_number": "LCT-2026-D5", "unit": "Tablet", "min_stock_alert": 30, "hsn_code": "30049099", "tax_gst_percent": 12.0, "schedule_type": "OTC", "rack_location": "Rack C-02"},
    {"name": "Pantoprazole 40mg", "generic_name": "Pantoprazole Sodium IP 40mg", "manufacturer": "Torrent Pharmaceuticals", "category": "Tablet", "stock_quantity": 200, "price": 7.50, "price_per_tab": 7.50, "price_per_strip": 112.50, "tablets_per_strip": 15, "expiry_date": "2027-11-12", "batch_number": "PAN-2026-E5", "unit": "Tablet", "min_stock_alert": 25, "hsn_code": "30049099", "tax_gst_percent": 12.0, "schedule_type": "Schedule H", "rack_location": "Rack D-01"},
    {"name": "Calcium + Vitamin D3 Tablets", "generic_name": "Calcium Carbonate 500mg + Vitamin D3 250 IU", "manufacturer": "Shelcal / Torrent", "category": "Tablet", "stock_quantity": 180, "price": 8.50, "price_per_tab": 8.50, "price_per_strip": 127.50, "tablets_per_strip": 15, "expiry_date": "2028-04-10", "batch_number": "CAL-2026-V3", "unit": "Tablet", "min_stock_alert": 25, "hsn_code": "30049099", "tax_gst_percent": 12.0, "schedule_type": "OTC", "rack_location": "Rack F-02"},
    {"name": "Metformin 500mg SR", "generic_name": "Metformin Hydrochloride Sustained Release 500mg", "manufacturer": "Glycomet / USV", "category": "Tablet", "stock_quantity": 180, "price": 4.00, "price_per_tab": 4.00, "price_per_strip": 60.00, "tablets_per_strip": 15, "expiry_date": "2028-02-28", "batch_number": "MET-2026-T1", "unit": "Tablet", "min_stock_alert": 30, "hsn_code": "30049099", "tax_gst_percent": 12.0, "schedule_type": "Schedule H", "rack_location": "Rack H-01"},
    {"name": "Atorvastatin 10mg", "generic_name": "Atorvastatin Calcium IP 10mg", "manufacturer": "Atorva / Zydus Cadila", "category": "Tablet", "stock_quantity": 120, "price": 9.50, "price_per_tab": 9.50, "price_per_strip": 95.00, "tablets_per_strip": 10, "expiry_date": "2027-12-15", "batch_number": "ATV-2026-T2", "unit": "Tablet", "min_stock_alert": 20, "hsn_code": "30049099", "tax_gst_percent": 12.0, "schedule_type": "Schedule H", "rack_location": "Rack H-02"},
    {"name": "Telmisartan 40mg", "generic_name": "Telmisartan IP 40mg", "manufacturer": "Telma / Glenmark", "category": "Tablet", "stock_quantity": 150, "price": 8.00, "price_per_tab": 8.00, "price_per_strip": 80.00, "tablets_per_strip": 10, "expiry_date": "2028-01-20", "batch_number": "TEL-2026-T3", "unit": "Tablet", "min_stock_alert": 25, "hsn_code": "30049099", "tax_gst_percent": 12.0, "schedule_type": "Schedule H", "rack_location": "Rack H-03"},

    # CAPSULES
    {"name": "Amoxicillin 500mg", "generic_name": "Amoxicillin Trihydrate IP 500mg", "manufacturer": "Sun Pharma", "category": "Capsule", "stock_quantity": 150, "price": 12.00, "price_per_tab": 12.00, "price_per_strip": 120.00, "tablets_per_strip": 10, "expiry_date": "2027-08-15", "batch_number": "AMX-2026-B2", "unit": "Capsule", "min_stock_alert": 20, "hsn_code": "30041010", "tax_gst_percent": 12.0, "schedule_type": "Schedule H", "rack_location": "Rack B-01"},
    {"name": "Omeprazole 20mg", "generic_name": "Omeprazole IP 20mg", "manufacturer": "Abbott India", "category": "Capsule", "stock_quantity": 160, "price": 5.50, "price_per_tab": 5.50, "price_per_strip": 82.50, "tablets_per_strip": 15, "expiry_date": "2027-11-30", "batch_number": "OMP-2026-C1", "unit": "Capsule", "min_stock_alert": 25, "hsn_code": "30049099", "tax_gst_percent": 12.0, "schedule_type": "Schedule H", "rack_location": "Rack D-02"},
    {"name": "Rabeprazole 20mg + Domperidone", "generic_name": "Rabeprazole 20mg + Domperidone 30mg SR", "manufacturer": "Lupin Ltd", "category": "Capsule", "stock_quantity": 140, "price": 11.00, "price_per_tab": 11.00, "price_per_strip": 110.00, "tablets_per_strip": 10, "expiry_date": "2027-10-15", "batch_number": "RAB-2026-E6", "unit": "Capsule", "min_stock_alert": 20, "hsn_code": "30049099", "tax_gst_percent": 12.0, "schedule_type": "Schedule H", "rack_location": "Rack D-03"},
    {"name": "Doxycycline 100mg", "generic_name": "Doxycycline Hyclate IP 100mg", "manufacturer": "Dr. Reddy's", "category": "Capsule", "stock_quantity": 115, "price": 9.00, "price_per_tab": 9.00, "price_per_strip": 90.00, "tablets_per_strip": 10, "expiry_date": "2027-12-10", "batch_number": "DOX-2026-C2", "unit": "Capsule", "min_stock_alert": 15, "hsn_code": "30042010", "tax_gst_percent": 12.0, "schedule_type": "Schedule H", "rack_location": "Rack B-05"},

    # SYRUPS
    {"name": "Dextromethorphan Cough Syrup 100ml", "generic_name": "Dextromethorphan HBr + Chlorpheniramine Maleate", "manufacturer": "Dabur India", "category": "Syrup", "stock_quantity": 60, "price": 85.00, "price_per_tab": 85.00, "price_per_strip": 85.00, "tablets_per_strip": 1, "expiry_date": "2027-06-30", "batch_number": "DEX-2026-S1", "unit": "Syrup", "min_stock_alert": 10, "hsn_code": "30049099", "tax_gst_percent": 12.0, "schedule_type": "OTC", "rack_location": "Rack E-01"},
    {"name": "Benadryl Cough Formula 100ml", "generic_name": "Diphenhydramine HCl + Ammonium Chloride", "manufacturer": "Johnson & Johnson", "category": "Syrup", "stock_quantity": 75, "price": 95.00, "price_per_tab": 95.00, "price_per_strip": 95.00, "tablets_per_strip": 1, "expiry_date": "2027-07-15", "batch_number": "BEN-2026-S2", "unit": "Syrup", "min_stock_alert": 12, "hsn_code": "30049099", "tax_gst_percent": 12.0, "schedule_type": "OTC", "rack_location": "Rack E-02"},
    {"name": "Multivitamin Tonic 200ml", "generic_name": "Multivitamins + Minerals Syrup", "manufacturer": "Pfizer India", "category": "Syrup", "stock_quantity": 90, "price": 130.00, "price_per_tab": 130.00, "price_per_strip": 130.00, "tablets_per_strip": 1, "expiry_date": "2027-09-18", "batch_number": "MLT-2026-V2", "unit": "Syrup", "min_stock_alert": 15, "hsn_code": "21069099", "tax_gst_percent": 18.0, "schedule_type": "OTC", "rack_location": "Rack F-01"},

    # INJECTIONS
    {"name": "Ceftriaxone 1g Injection", "generic_name": "Ceftriaxone Sodium Sterile 1g", "manufacturer": "Monocef / Aristo", "category": "Injection", "stock_quantity": 40, "price": 95.00, "price_per_tab": 95.00, "price_per_strip": 95.00, "tablets_per_strip": 1, "expiry_date": "2027-05-10", "batch_number": "CTX-2026-I1", "unit": "Injection", "min_stock_alert": 10, "hsn_code": "30042010", "tax_gst_percent": 12.0, "schedule_type": "Schedule H", "rack_location": "Cold Storage R-1"},
    {"name": "Insulin Glargine 100 IU/ml", "generic_name": "Recombinant Human Insulin Glargine 100 IU", "manufacturer": "Lantus / Sanofi", "category": "Injection", "stock_quantity": 25, "price": 450.00, "price_per_tab": 450.00, "price_per_strip": 450.00, "tablets_per_strip": 1, "expiry_date": "2027-04-15", "batch_number": "INS-2026-I2", "unit": "Injection", "min_stock_alert": 5, "hsn_code": "30043110", "tax_gst_percent": 5.0, "schedule_type": "Schedule H", "rack_location": "Cold Storage R-2"},
    {"name": "Diclofenac Sodium 75mg/1ml Injection", "generic_name": "Diclofenac Sodium IP 75mg Ampoule", "manufacturer": "Troikaa Pharma", "category": "Injection", "stock_quantity": 65, "price": 25.00, "price_per_tab": 25.00, "price_per_strip": 25.00, "tablets_per_strip": 1, "expiry_date": "2027-06-20", "batch_number": "DIC-2026-I3", "unit": "Injection", "min_stock_alert": 12, "hsn_code": "30049099", "tax_gst_percent": 12.0, "schedule_type": "Schedule H", "rack_location": "Cold Storage R-3"},

    # OINTMENTS & CREAMS
    {"name": "Diclofenac Pain Relief Gel 30g", "generic_name": "Diclofenac Diethylamine 1.16% w/w Gel", "manufacturer": "Volini / Ranbaxy", "category": "Ointment", "stock_quantity": 45, "price": 65.00, "price_per_tab": 65.00, "price_per_strip": 65.00, "tablets_per_strip": 1, "expiry_date": "2027-07-22", "batch_number": "DIC-2026-G1", "unit": "Ointment", "min_stock_alert": 8, "hsn_code": "30049099", "tax_gst_percent": 12.0, "schedule_type": "OTC", "rack_location": "Rack G-01"},
    {"name": "Clotrimazole Anti-Fungal Cream 15g", "generic_name": "Clotrimazole Cream IP 1% w/w", "manufacturer": "Candid / Glenmark", "category": "Ointment", "stock_quantity": 50, "price": 58.00, "price_per_tab": 58.00, "price_per_strip": 58.00, "tablets_per_strip": 1, "expiry_date": "2027-09-10", "batch_number": "CLO-2026-O1", "unit": "Ointment", "min_stock_alert": 10, "hsn_code": "30049099", "tax_gst_percent": 12.0, "schedule_type": "OTC", "rack_location": "Rack G-02"},
    {"name": "Mupirocin Ointment 2% 5g", "generic_name": "Mupirocin Ointment IP 2% w/w", "manufacturer": "Bactroban / GSK", "category": "Ointment", "stock_quantity": 35, "price": 115.00, "price_per_tab": 115.00, "price_per_strip": 115.00, "tablets_per_strip": 1, "expiry_date": "2027-08-30", "batch_number": "MUP-2026-O2", "unit": "Ointment", "min_stock_alert": 8, "hsn_code": "30049099", "tax_gst_percent": 12.0, "schedule_type": "Schedule H", "rack_location": "Rack G-03"},

    # DROPS
    {"name": "Ciprofloxacin 0.3% Eye Drops 5ml", "generic_name": "Ciprofloxacin Hydrochloride Ophthalmic Solution 0.3%", "manufacturer": "Cipla Eye Care", "category": "Drops", "stock_quantity": 55, "price": 42.00, "price_per_tab": 42.00, "price_per_strip": 42.00, "tablets_per_strip": 1, "expiry_date": "2027-08-20", "batch_number": "CIP-2026-D1", "unit": "Drops", "min_stock_alert": 10, "hsn_code": "30049099", "tax_gst_percent": 12.0, "schedule_type": "Schedule H", "rack_location": "Rack I-01"},
    {"name": "Tobramycin Eye Drops 5ml", "generic_name": "Tobramycin Ophthalmic Solution IP 0.3% w/v", "manufacturer": "Sunways India", "category": "Drops", "stock_quantity": 40, "price": 55.00, "price_per_tab": 55.00, "price_per_strip": 55.00, "tablets_per_strip": 1, "expiry_date": "2027-09-05", "batch_number": "TOB-2026-D2", "unit": "Drops", "min_stock_alert": 8, "hsn_code": "30049099", "tax_gst_percent": 12.0, "schedule_type": "Schedule H", "rack_location": "Rack I-02"},

    # POUCH & SACHETS
    {"name": "ORS Electrolyte Powder 21.8g Pouch", "generic_name": "Oral Rehydration Salts IP (WHO Formula)", "manufacturer": "Electral / FDC Ltd", "category": "Pouch", "stock_quantity": 150, "price": 22.00, "price_per_tab": 22.00, "price_per_strip": 22.00, "tablets_per_strip": 1, "expiry_date": "2028-05-30", "batch_number": "ORS-2026-P1", "unit": "Pouch", "min_stock_alert": 25, "hsn_code": "30049099", "tax_gst_percent": 12.0, "schedule_type": "OTC", "rack_location": "Rack P-01"},
    {"name": "Gelusil Antacid Sachet 10ml Pouch", "generic_name": "Aluminum Hydroxide + Magnesium Hydroxide + Simethicone", "manufacturer": "Pfizer / Gelusil", "category": "Pouch", "stock_quantity": 120, "price": 15.00, "price_per_tab": 15.00, "price_per_strip": 15.00, "tablets_per_strip": 1, "expiry_date": "2027-11-20", "batch_number": "GEL-2026-P2", "unit": "Pouch", "min_stock_alert": 20, "hsn_code": "30049099", "tax_gst_percent": 12.0, "schedule_type": "OTC", "rack_location": "Rack P-02"},
    {"name": "ENO Fruit Salt Fast Antacid 5g Pouch", "generic_name": "Svarjiksudara (Sodium Bicarbonate) + Nimbukamlam", "manufacturer": "GlaxoSmithKline Consumer", "category": "Pouch", "stock_quantity": 200, "price": 10.00, "price_per_tab": 10.00, "price_per_strip": 10.00, "tablets_per_strip": 1, "expiry_date": "2028-06-15", "batch_number": "ENO-2026-P3", "unit": "Pouch", "min_stock_alert": 30, "hsn_code": "30049099", "tax_gst_percent": 12.0, "schedule_type": "OTC", "rack_location": "Rack P-03"},
    {"name": "Vitamin D3 60,000 IU Granules 1g Pouch", "generic_name": "Cholecalciferol Granules 60000 IU", "manufacturer": "Calcirol / Cadila", "category": "Pouch", "stock_quantity": 85, "price": 35.00, "price_per_tab": 35.00, "price_per_strip": 35.00, "tablets_per_strip": 1, "expiry_date": "2027-10-31", "batch_number": "VD3-2026-P4", "unit": "Pouch", "min_stock_alert": 15, "hsn_code": "30049099", "tax_gst_percent": 12.0, "schedule_type": "OTC", "rack_location": "Rack P-04"},
]


def update_existing_db_categories():
    """Migrates all existing medicine documents in MongoDB to form-based categories: Tablet, Capsule, Syrup, Injection, Ointment, Drops, Pouch."""
    db = get_db()
    cursor = db["medicines"].find()
    updated_count = 0

    for doc in cursor:
        unit = str(doc.get("unit", "")).lower()
        name = str(doc.get("name", "")).lower()
        old_cat = doc.get("category", "")

        new_cat = old_cat
        if "pouch" in name or "sachet" in name or "powder" in name or "eno" in name or "ors" in name or unit in ["pouch", "sachet", "powder"]:
            new_cat = "Pouch"
        elif "injection" in name or "inj" in name or "insulin" in name or unit in ["injection", "inj", "ampoule", "vial"]:
            new_cat = "Injection"
        elif "syrup" in name or "syp" in name or "tonic" in name or "benadryl" in name or unit in ["syrup", "bottle", "ml"]:
            new_cat = "Syrup"
        elif "drop" in name or "ophthalmic" in name or unit in ["drops", "drop"]:
            new_cat = "Drops"
        elif "ointment" in name or "cream" in name or "gel" in name or unit in ["ointment", "cream", "gel", "tube"]:
            new_cat = "Ointment"
        elif "capsule" in name or "cap" in name or unit in ["capsule", "cap", "capsules"]:
            new_cat = "Capsule"
        else:
            new_cat = "Tablet"

        if new_cat != old_cat or old_cat not in ["Tablet", "Capsule", "Syrup", "Injection", "Ointment", "Drops", "Pouch"]:
            db["medicines"].update_one(
                {"_id": doc["_id"]},
                {"$set": {"category": new_cat}}
            )
            updated_count += 1

    print(f"MIGRATION: Updated categories for {updated_count} existing medicines in MongoDB database.")


def seed_medicines_for_all_clinics():
    db = get_db()
    clinics = list(db["clinics"].find())
    clinic_ids = [str(c["_id"]) for c in clinics] if clinics else []
    if "c1111111-1111-1111-1111-111111111111" not in clinic_ids:
        clinic_ids.append("c1111111-1111-1111-1111-111111111111")

    now = datetime.now(timezone.utc).isoformat()
    total_seeded = 0

    for cid in clinic_ids:
        for item in MEDICINE_CATALOG:
            doc = {
                "clinic_id": cid,
                "name": item["name"],
                "generic_name": item.get("generic_name", item["name"]),
                "manufacturer": item.get("manufacturer", "Cipla Ltd"),
                "category": item["category"],
                "stock_quantity": item["stock_quantity"],
                "price": item["price"],
                "price_per_tab": item.get("price_per_tab", item["price"]),
                "price_per_strip": item.get("price_per_strip", item["price"] * 10),
                "tablets_per_strip": item.get("tablets_per_strip", 10),
                "expiry_date": item["expiry_date"],
                "batch_number": item["batch_number"],
                "unit": item["unit"],
                "min_stock_alert": item["min_stock_alert"],
                "hsn_code": item.get("hsn_code", "30049099"),
                "tax_gst_percent": item.get("tax_gst_percent", 12.0),
                "schedule_type": item.get("schedule_type", "Schedule H"),
                "rack_location": item.get("rack_location", "Rack A-01"),
                "updated_at": now,
            }
            db["medicines"].update_one(
                {"clinic_id": cid, "name": item["name"]},
                {"$set": doc, "$setOnInsert": {"_id": str(uuid.uuid4()), "created_at": now}},
                upsert=True,
            )
            total_seeded += 1

    print(f"SUCCESS: Seeded {total_seeded} medicines across {len(clinic_ids)} clinics with form-based categories (Tablet, Capsule, Syrup, Injection, Ointment, Drops, Pouch).")
    update_existing_db_categories()


if __name__ == "__main__":
    seed_medicines_for_all_clinics()
