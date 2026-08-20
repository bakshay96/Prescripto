import urllib.request
import json

base_url = "http://127.0.0.1:8085/api/v1"

print("--- Testing MongoDB / Patients endpoint ---")
try:
    req = urllib.request.Request(
        f"{base_url}/mongo/patients",
        data=json.dumps({
            "name": "Test Patient Mongo",
            "village_location": "Buldhana",
            "date_of_birth": "1995-05-15",
            "gender": "MALE",
            "phone": "9876543210"
        }).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        print("Mongo patient create response:", resp.read().decode("utf-8"))
except Exception as e:
    print("Mongo patient endpoint test error:", e)

print("--- Testing Patients List ---")
try:
    req = urllib.request.Request(f"{base_url}/patients")
    with urllib.request.urlopen(req) as resp:
        print("SQLite Patients list response (first 2):", json.loads(resp.read().decode("utf-8"))[:2])
except Exception as e:
    print("Patients list error:", e)
