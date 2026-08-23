"""
Full feature test for Prescripto backend on http://127.0.0.1:8000
Tests: Root, Login (all 3 roles), Patients, Inventory, Prescriptions, Clinic Profile, Admin
"""
import urllib.request, urllib.error, json, sys

BASE = "http://127.0.0.1:8000"
PASS = []
FAIL = []

def _req(method, path, data=None, token=None, form=False):
    url = BASE + path
    headers = {}
    body = None
    if data and form:
        body = urllib.parse.urlencode(data).encode()
        headers["Content-Type"] = "application/x-www-form-urlencoded"
    elif data:
        body = json.dumps(data).encode()
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        r = urllib.request.urlopen(req, timeout=10)
        return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read())
        except:
            return e.code, {}
    except Exception as e:
        return 0, {"error": str(e)}

import urllib.parse

def check(name, condition, detail=""):
    if condition:
        PASS.append(name)
        print(f"  [PASS] {name}" + (f" — {detail}" if detail else ""))
    else:
        FAIL.append(name)
        print(f"  [FAIL] {name}" + (f" — {detail}" if detail else ""))

print("\n" + "="*60)
print("  PRESCRIPTO BACKEND FULL FEATURE TEST")
print("  Target:", BASE)
print("="*60)

# ── 1. Root ──────────────────────────────────────────────────
print("\n[1] Root Endpoint")
status, body = _req("GET", "/")
check("Root /", status == 200, f"status={status}")
check("Root has message", "message" in body)

# ── 2. Auth — Doctor Login ───────────────────────────────────
print("\n[2] Authentication — Doctor")
status, body = _req("POST", "/api/v1/auth/login",
    {"username": "doctor@prescripto.com", "password": "doctor123"}, form=True)
check("Doctor login (200)", status == 200, f"status={status}, detail={body.get('detail','')}")
doctor_token = body.get("access_token", "")
doctor_role   = body.get("role", "")
check("Doctor role=DOCTOR", doctor_role == "DOCTOR", f"role={doctor_role}")
check("Doctor token issued", bool(doctor_token))

# ── 3. Auth — Pharmacist Login ───────────────────────────────
print("\n[3] Authentication — Pharmacist")
status, body = _req("POST", "/api/v1/auth/login",
    {"username": "pharma@prescripto.com", "password": "pharma123"}, form=True)
check("Pharma login (200)", status == 200, f"status={status}")
pharma_token = body.get("access_token", "")
check("Pharma role=PHARMACIST", body.get("role") == "PHARMACIST", f"role={body.get('role')}")
check("Pharma token issued", bool(pharma_token))

# ── 4. Auth — Admin Login ────────────────────────────────────
print("\n[4] Authentication — Master Admin")
status, body = _req("POST", "/api/v1/auth/login",
    {"username": "admin@prescripto.com", "password": "admin123"}, form=True)
check("Admin login (200)", status == 200, f"status={status}")
admin_token = body.get("access_token", "")
check("Admin role=MASTER_ADMIN", body.get("role") == "MASTER_ADMIN", f"role={body.get('role')}")
check("Admin token issued", bool(admin_token))

# ── 5. Auth — /me endpoint ───────────────────────────────────
print("\n[5] Auth /me — Token Verification")
status, body = _req("GET", "/api/v1/auth/me", token=doctor_token)
check("/me returns 200", status == 200, f"status={status}")
check("/me has email", "email" in body, f"keys={list(body.keys())[:5]}")

# ── 6. Patients API ──────────────────────────────────────────
print("\n[6] Patients API")
status, body = _req("GET", "/api/v1/patients", token=doctor_token)
check("GET /patients (200)", status == 200, f"status={status}")
check("GET /patients returns list", isinstance(body, list), f"type={type(body).__name__}")

# Create patient
status, body = _req("POST", "/api/v1/patients",
    {"name": "Test Patient Auto", "village_location": "Motala", "gender": "MALE",
     "date_of_birth": "1990-05-15", "phone": "9999999999"},
    token=doctor_token)
check("POST /patients creates patient", status in (200, 201), f"status={status}, {body.get('detail','')}")
patient_id = body.get("id", "")
check("New patient has id", bool(patient_id))

# ── 7. MongoDB Patients Compat ───────────────────────────────
print("\n[7] MongoDB Patients Shim (/mongo/patients)")
status, body = _req("GET", "/api/v1/mongo/patients")
check("GET /mongo/patients (no auth)", status == 200, f"status={status}")

# ── 8. Inventory / Medicines ─────────────────────────────────
print("\n[8] Inventory API")
status, body = _req("GET", "/api/v1/inventory/medicines", token=pharma_token)
check("GET /medicines (200)", status == 200, f"status={status}")
check("GET /medicines returns list", isinstance(body, list))

# Add a medicine
status, body = _req("POST", "/api/v1/inventory/medicines",
    {"name": "Paracetamol 500mg", "category": "Tablet", "unit": "Tablet",
     "price": 2.5, "stock_quantity": 100, "min_stock_alert": 10,
     "expiry_date": "2027-12-31", "batch_number": "B-TEST-001"},
    token=pharma_token)
check("POST /medicines adds medicine", status in (200, 201), f"status={status}, {body.get('detail','')}")
med_id = body.get("id", "")
check("New medicine has id", bool(med_id))

# Autocomplete
status, body = _req("GET", "/api/v1/inventory/medicines/autocomplete?q=Para", token=doctor_token)
check("GET /medicines/autocomplete", status == 200, f"status={status}")

# ── 9. Prescriptions ─────────────────────────────────────────
print("\n[9] Prescriptions API")
status, body = _req("GET", "/api/v1/prescriptions", token=doctor_token)
check("GET /prescriptions (200)", status == 200, f"status={status}")

# Create prescription
rx_payload = {
    "patient_id": patient_id if patient_id else None,
    "new_patient": None if patient_id else {"name": "Inline Patient", "village_location": "Test"},
    "diagnosis": "Viral Fever",
    "notes": "Rest and fluids",
    "items": [{"medicine_name": "Paracetamol 500mg", "dosage": "1 tablet",
               "frequency": "TDS", "duration_days": 5,
               "quantity_prescribed": 15, "is_custom": True}]
}
status, body = _req("POST", "/api/v1/prescriptions/v2", rx_payload, token=doctor_token)
check("POST /prescriptions/v2 creates Rx", status in (200, 201), f"status={status}, {body.get('detail','')}")
rx_id = body.get("id", "")
check("New Rx has id", bool(rx_id))

# ── 10. Clinic Profile ───────────────────────────────────────
print("\n[10] Clinic Profile API")
status, body = _req("GET", "/api/v1/clinic-profile", token=doctor_token)
check("GET /clinic-profile (200)", status == 200, f"status={status}")

# Update clinic profile
update_data = {"hospital_name_en": "Suyog Hospital", "doctor_name_en": "Dr. Vikas V. Karande",
               "qualifications": "MBBS, MD", "phone": "7757003800"}
status, body = _req("PUT", "/api/v1/clinic-profile", update_data, token=doctor_token)
check("PUT /clinic-profile saves", status == 200, f"status={status}")

# ── 11. Admin Analytics ──────────────────────────────────────
print("\n[11] Admin Analytics API")
status, body = _req("GET", "/api/v1/admin/analytics", token=admin_token)
check("GET /admin/analytics (200)", status == 200, f"status={status}")
check("Analytics has total_hospitals", "total_hospitals" in body)
check("Analytics has total_prescriptions", "total_prescriptions" in body)

# ── 12. Role Protection ──────────────────────────────────────
print("\n[12] Role Protection Tests")
status, body = _req("GET", "/api/v1/admin/analytics", token=doctor_token)
check("Doctor blocked from /admin/analytics (403)", status == 403, f"status={status}")
status, body = _req("GET", "/api/v1/patients", token=None)
check("Unauthenticated blocked from /patients (401)", status == 401, f"status={status}")

# ── Summary ──────────────────────────────────────────────────
print("\n" + "="*60)
print(f"  RESULTS: {len(PASS)} passed, {len(FAIL)} failed")
if FAIL:
    print("\n  FAILED TESTS:")
    for f in FAIL:
        print(f"    - {f}")
else:
    print("  ALL TESTS PASSED!")
print("="*60 + "\n")
sys.exit(0 if not FAIL else 1)
