import urllib.request
import urllib.parse
import json

BASE_URL = "http://127.0.0.1:8085/api/v1"

def req(path, method="GET", body=None, token=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    data = json.dumps(body).encode("utf-8") if body else None
    if method == "POST_FORM":
        headers["Content-Type"] = "application/x-www-form-urlencoded"
        data = urllib.parse.urlencode(body).encode("utf-8")
        method = "POST"
        
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request) as response:
            res_body = response.read().decode("utf-8")
            if "application/json" in response.headers.get("Content-Type", ""):
                return json.loads(res_body)
            return res_body
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code} on {path}: {e.read().decode('utf-8')}")
        raise e

print("=== STARTING END-TO-END V3 INTEGRATION TEST ===")

# 1. Login Doctor
doc_login = req("/auth/login", method="POST_FORM", body={"username": "doctor@suyog.com", "password": "doctor123"})
doc_token = doc_login["access_token"]
print("1. Doctor Login OK:", doc_token[:15] + "...")

# 2. Login Pharmacist
pharm_login = req("/auth/login", method="POST_FORM", body={"username": "pharmacist@suyog.com", "password": "pharmacist123"})
pharm_token = pharm_login["access_token"]
print("2. Pharmacist Login OK:", pharm_token[:15] + "...")

# 3. Quick Patient Create
patient = req("/patients/quick", method="POST", body={
    "name": "Sanjay Vaidya",
    "village_location": "Motala",
    "date_of_birth": "1988-04-12",
    "gender": "MALE",
    "phone": "9988776655"
}, token=doc_token)
print("3. Quick Patient Create OK:", patient["id"], patient["name"])

# 4. Medicine Autocomplete
meds = req("/inventory/medicines/autocomplete?q=Cyra", method="GET", token=doc_token)
print("4. Medicine Autocomplete OK:", len(meds), "found:", meds[0]["name"] if meds else "None")

# 5. Create Prescription with ½ Dose
rx = req("/prescriptions/v2", method="POST", body={
    "patient_id": patient["id"],
    "diagnosis": "Severe Gastritis & Viral Fever",
    "notes": "पुरेसे गरम पाणी प्या. तळलेले व तिखट पदार्थ टाळा.",
    "items": [
        {
            "medicine_name": "Cyra-D",
            "dosage": "20mg",
            "frequency": "1-0-1 after meals",
            "duration_days": 5,
            "quantity_prescribed": 10,
            "is_custom": False
        },
        {
            "medicine_name": "Paracetamol ½ Dose",
            "dosage": "500mg",
            "frequency": "½-0-½ after meals",
            "duration_days": 3,
            "quantity_prescribed": 3,
            "is_custom": True
        }
    ]
}, token=doc_token)
print("5. Prescription v2 Created OK:", rx["prescription_number"], "ID:", rx["id"])

# 6. Fetch Server Print HTML
print_html = req(f"/prescriptions/{rx['id']}/print-html?lang=mr", method="GET")
assert "Suyog Hospital" in print_html or "सुयोग हॉस्पिटल" in print_html
assert rx["prescription_number"] in print_html
print("6. Prescription Server HTML Print OK:", len(print_html), "bytes returned")

print("=== ALL END-TO-END TESTS PASSED SUCCESSFULLY! ===")
