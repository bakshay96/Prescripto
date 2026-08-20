from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

accounts = [
    ("DOCTOR", "doctor@suyog.com", "doctor123"),
    ("PHARMACIST", "pharmacist@suyog.com", "pharmacist123"),
    ("ADMIN", "admin@prescripto.com", "admin123"),
]

for role, email, password in accounts:
    response = client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    if response.status_code == 200:
        data = response.json()
        print(f"[SUCCESS] {role} Login: user_id={data.get('user_id')}, role={data.get('role')}")
    else:
        print(f"[FAIL] {role} Login: {response.status_code} - {response.text}")
